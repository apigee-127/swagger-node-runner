'use strict';

module.exports = init;

var debug = require('debug')('swagger');
var debugContent = require('debug')('swagger:content_middleware');
var _ = require('lodash');
var util = require('util');

function init(runner) {
  return new Middleware(runner);
}

function Middleware(runner) {

  this.runner = runner;

  this.middleware = function middleware() {

    return function middleware(req, res, next) { // flow back to connect pipe

      var operation = runner.getOperation(req);

      if (!operation) {
        var path = runner.getPath(req);
        if (!path) { return next(); }

        if (!path['x-swagger-pipe']) {
          var msg = util.format('Path [%s] defined in Swagger, but %s operation is not.', path.path, req.method);
          var err = new Error(msg);
          err.statusCode = 405;

          var allowedMethods = _.map(path.operationObjects, function(operation) {
            return operation.method.toUpperCase();
          });
          err.allowedMethods = allowedMethods;

          res.setHeader('Allow', allowedMethods.sort().join(', '));
          return next(err);
        }
      }

      runner.applyMetadata(req, operation, function(err) {
        if (err) { return next(err); }

        var pipe = runner.getPipe(req);
        if (!pipe) {
          var err = new Error('No implementation found for this path.');
          err.statusCode = 405;
          return next(err);
        }

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
              debug('setting statusCode: %d', context.statusCode);
              response.statusCode = context.statusCode;
            }

            if (context.headers) {
              debugContent('setting headers: %j', context.headers);
              _.each(context.headers, function(value, name) {
                response.setHeader(name, value);
              });
            }

            if (context.output) {
              var body = translate(context.output, response.getHeader('content-type'));

              debugContent('body: %s', body);
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

function translate(output, mimeType) {

  if (typeof output !== 'object') { return output; }

  switch(true) {

    case /json/.test(mimeType):
      return JSON.stringify(output);

    default:
      return util.inspect(output)
  }
}
