'use strict';

module.exports = init;

var debug = require('debug')('swagger:restify_middleware');

function init(runner) {
  return new Middleware(runner);
}

function Middleware(runner) {

  this.runner = runner;

  var connectMiddleware = runner.connectMiddleware();
  var chain = connectMiddleware.middleware();

  this.register = function register(app) {

    var api = connectMiddleware.runner.api;

    api.pathObjects.forEach(function(path) {
      path.operationObjects.forEach(function(operation) {
        app[operation.method](path.path, function(req, res, next) {
          req.query = undefined;
          chain(req, res, next);
        });
      });
    });

    connectMiddleware.register(app);
  };
}
