'use strict';

var debug = require('debug')('swagger');

module.exports = init;

function init(runner) {
  return new Hapi(runner);
}

function Hapi(runner) {
  this.runner = runner;
  this.config = runner.config;
  this.sysConfig = runner.config.swagger;

  var connectMiddleware = runner.connectMiddleware();
  var chain = connectMiddleware.middleware();

  this.register = function(app, cb) {
    app.register(this.plugin, cb);
  };

  this.plugin = {
    register: function(server, options, next) {

      server.ext('onRequest', function(request, reply) {

        var req = request.raw.req;
        var res = newResponse(reply);

        chain(req, res, function(err) {
          if (err) { return next(err); }
          res.finish();
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
  var res;
  return {
    getHeader: function(name) {
      return headers[name.toLowerCase()];
    },
    setHeader: function(name, value) {
      headers[name.toLowerCase()] = value;
    },
    end: function(string) {
      res = reply(string);
      res.code(status);
      for (var header in headers) {
        res.header(header, headers[header]);
      }
    },
    finish: function() {
      if (!res) {
        reply.continue();
      }
    }
  };
}
