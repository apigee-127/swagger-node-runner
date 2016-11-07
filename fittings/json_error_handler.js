'use strict';

var debug = require('debug')('swagger:json_error_handler');
var util = require('util');

module.exports = function create(fittingDef, bagpipes) {

  debug('config: %j', fittingDef);

  return function error_handler(context, next) {

    if (!util.isError(context.error)) { return next(); }

    var err = context.error;
    var log;
    var body;

    debug('exec: %s', context.error.message);
      
    if (!context.statusCode || context.statusCode < 400) {
      if (context.response && context.response.statusCode && context.response.statusCode >= 400) {
        context.statusCode = context.response.statusCode;
      } else if (err.statusCode && err.statusCode >= 400) {
        context.statusCode = err.statusCode;
        delete(err.statusCode);
      } else {
        context.statusCode = 500;
      }
    }

    try {
      //TODO: find what's throwing here...
      if (context.statusCode === 500 && !fittingDef.handle500Errors) { return next(err); }
      //else - from here we commit to emitting error as JSON, no matter what.

      context.headers['Content-Type'] = 'application/json';
      Object.defineProperty(err, 'message', { enumerable: true }); // include message property in response
      if (fittingDef.includeErrStack)
          Object.defineProperty(err, 'stack', { enumerable: true }); // include stack property in response

      delete(context.error);
      next(null, JSON.stringify(err));
    } catch (err2) {
      log = context.request && ( 
               context.request.log 
            || context.request.app && context.request.app.log
            )
         || context.response && context.response.log;
    
      body = { 
        message: "unable to stringify error properly",
        stringifyErr: err2.message,
        originalErrInspect: util.inspect(err)
      };
      context.statusCode = 500;
      
      debug('jsonErrorHandler unable to stringify error: ', err);
      if (log) log.error(err2, "onError: json_error_handler - unable to stringify error", err);
      
      next(null, JSON.stringify(body));
    }
  }
};
