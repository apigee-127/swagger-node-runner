/****************************************************************************
 The MIT License (MIT)

 Copyright (c) 2015 Apigee Corporation

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
'use strict';

var debug = require('debug')('swagger');
var utility = require('./utility');

module.exports = init;

function init(runner) {
  return new Hapi(runner);
}

function Hapi(runner) {
  this.runner = runner;
  this.config = runner.config;
  this.sysConfig = runner.config.swagger;

  // todo: figure out error handling
  if (this.config.swagger.mapErrorsToJson) {
    debug('mapErrorsToJson option not currently available in Hapi. Ignoring.');
  }

  var connectMiddleware = runner.connectMiddleware();
  var chain = utility.createChain(connectMiddleware.stack(false));

  this.register = function(app, cb) {
    app.register(this.plugin, cb);
  };

  this.plugin = {
    register: function(server, options, next) {

      server.ext('onRequest', function(request, reply) {

        var req = request.raw.req;
        var res = newResponse(reply);

        chain(req, res, function(err) {
          if (err) { return reply(err); }
          reply.continue();
        });
      });

      server.on('request-error', function (request, err) {
        debug('Request: %s error: %s', request.id, err.stack);
      });

      next();
    }
  };
  this.plugin.register.attributes = { name: 'swagger-node-runner', version: version() };
}

function version() {
  return require('../package.json').version;
}

function newResponse(reply) {
  var status = 200;
  var headers = {};
  var res = {
    getHeader: function(name) {
      return headers[name.toLowerCase()];
    },
    setHeader: function(name, value) {
      headers[name.toLowerCase()] = value;
    },
    end: function(string) {
      var res = reply(string);
      res.code(status);
      for (var header in headers) {
        res.header(header, headers[header]);
      }
    }
  };
  return res;
}
