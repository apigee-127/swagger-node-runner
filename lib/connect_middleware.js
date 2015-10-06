'use strict';

var debug = require('debug')('pipe');
var debugContent = require('debug')('pipe:content');
var _ = require('lodash');

module.exports = init;

function init(runner) {
  return new Middleware(runner);
}

function Middleware(runner) {

  this.runner = runner;

  this.middleware = function middleware() {

    var swagger_metadata = runner.swaggerTools.swaggerMetadata();

    return function(req, res, next) {

      swagger_metadata(req, res, function(err) {
        if (err) { return next(err); }
        adaptToConnect(req, res, next)
      });
    };

    // finish
    function adaptToConnect(req, res, next) { // flow back to connect pipe

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
          // todo: what if response is already sent?
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
    }
  };

  this.register = function register(app) {
    app.use(this.middleware());
  };
}
