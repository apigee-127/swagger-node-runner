'use strict';

module.exports = init;

var debug = require('debug')('swagger');
var debugContent = require('debug')('swagger:content_middleware');
var _ = require('lodash');

function init(runner) {
  return new Middleware(runner);
}

function Middleware(runner) {

  this.runner = runner;

  this.middleware = function middleware() {

    return function middleware(req, res, next) { // flow back to connect pipe

      var operation = runner.getOperation(req);
      if (!operation) { return next(); }

      runner.applyMetadata(req, operation, function(err) {
        if (err) { return next(err); }

        var pipe = runner.getPipe(req);
        if (!pipe) { return next(); }

        var context = {
          // system values
          _errorHandler: runner.defaultErrorHandler(),
          request: req,
          response: res,

          // user-modifiable values
          input: undefined,
          statusCode: undefined,
          headers: {},
          output: undefined
        };

        context._finish = function finishConnect(ignore1, ignore2) { // must have arity of 2

          if (context.error) { return next(context.error); }

          try {
            var response = context.response;
            if (context.statusCode) {
              debug(' statusCode: %d', context.statusCode);
              response.statusCode = context.statusCode;
            }
            if (context.headers) {
              debugContent(' headers: %j', context.headers);
              _.each(context.headers, function(value, name) {
                response.setHeader(name, value);
              });
            }
            if (context.output) {
              // todo: determine the correct thing to do if it's not JSON
              var body = (typeof context.output === 'object') ? JSON.stringify(context.output) : context.output;
              debugContent(' body: %s', body);
              response.end(body);
            }
            next();
          }
          catch (err) {
            next(err);
          }
        };

        runner.bagpipes.play(pipe, context);
      });
    };
  };

  this.register = function register(app) {
    app.use(this.middleware());
  };
}
