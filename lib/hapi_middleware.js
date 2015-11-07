'use strict';

module.exports = init;

var debug = require('debug')('swagger:hapi_middleware');

function init(runner) {
  return new Hapi(runner);
}

function Hapi(runner) {
  this.runner = runner;
  this.config = runner.config;

  var connectMiddleware = runner.connectMiddleware();
  var chain = connectMiddleware.middleware();

  this.plugin = {
    register: function(server, options, next) {

      server.ext('onRequest', function(request, reply) {

        var req = request.raw.req;
        var res = newResponse(reply);

        chain(req, res, function(err) {
          if (err) {
            if (err.statusCode) { res.statusCode = err.statusCode; }
            res.end(err.message);
          }
          res.finish();
        });
      });

      /* istanbul ignore next */
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
  return {
    getHeader: function getHeader(name) {
      return this.headers ? this.headers[name.toLowerCase()] : null;
    },
    setHeader: function setHeader(name, value) {
      if (!this.headers) { this.headers = {}; }
      this.headers[name.toLowerCase()] = value;
    },
    end: function end(string) {
      this.res = reply(string);
      this.res.statusCode = this.statusCode;
      if (this.headers) {
        for (var header in this.headers) {
          this.res.header(header, this.headers[header]);
        }
      }
    },
    finish: function finish() {
      if (!this.res) {
        reply.continue();
      }
    }
  };
}
