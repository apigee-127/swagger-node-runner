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
          var msg = util.format('Route defined in Swagger specification (%s) but there is no defined %s operation.',
            path.path, req.method.toUpperCase());
          var err = new Error(msg);

          var allowedMethods = _.map(path.operationObjects, function(operation) {
            return operation.method.toUpperCase();
          });
          err.allowedMethods = allowedMethods;

          res.statusCode = 405;
          res.setHeader('Allow', allowedMethods.sort().join(', '));

          return next(err);
        }
      }

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
            var request = context.request;
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

              // set content type to application/json as default if listed in produces
              if (!response.getHeader('content-type') &&
                  request.headers['accept'] &&
                  request.headers['accept'].match(/json/) &&
                  produces(context.request.swagger.operation, 'application/json')) {
                debug('assigning default content-type header: application/json');
                response.setHeader('content-type', 'application/json');
              }
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

function produces(operation, mimetype) {
  var producesArray = operation.pathObject.produces || operation.api.produces;
  return producesArray && producesArray.indexOf(mimetype) > -1;
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
