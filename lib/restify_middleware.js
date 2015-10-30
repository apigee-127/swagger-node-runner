'use strict';

module.exports = init;

var debug = require('debug')('swagger:restify_middleware');
var SWAGGER_SELECTED_PIPE = 'x-swagger-pipe';
var ALL_METHODS = ['del', 'get', 'head', 'opts', 'post', 'put', 'patch'];

function init(runner) {
  return new Middleware(runner);
}

function Middleware(runner) {

  this.runner = runner;

  var connectMiddleware = runner.connectMiddleware();
  var chain = connectMiddleware.middleware();

  this.register = function register(app) {

    var api = connectMiddleware.runner.api;

    function registerHandler(path, method) {
      app[method](path, function(req, res, next) {
        req.query = undefined; // oddly, req.query is a function in Restify, kill it
        chain(req, res, next);
      });
    }

    api.pathObjects.forEach(function(path) {
      if (path.operationObjects && path.operationObjects.length > 0) {
        path.operationObjects.forEach(function(operation) {
          registerHandler(path.path, operation.method);
        });
      } else {
        ALL_METHODS.forEach(function(method) {
          registerHandler(path.path, method);
        });
      }
    });

    connectMiddleware.register(app);
  };
}
