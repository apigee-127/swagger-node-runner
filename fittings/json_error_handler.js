'use strict';

var debug = require('debug')('swagger:json_error_handler');
var util = require('util');

module.exports = function create(fittingDef, bagpipes) {

  debug('config: %j', fittingDef);

  return function error_handler(context, next) {

    if (!util.isError(context.error)) { return next(); }

    var err = context.error;

    debug('exec: %s', context.error.message);

    try {
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

      if (context.statusCode === 500 && !fittingDef.handle500Errors) { return next(err); }

      context.headers['Content-Type'] = 'application/json';
      Object.defineProperty(err, 'message', { enumerable: true }); // include message property in response

      delete(context.error);
      next(null, JSON.stringify(err));
    } catch (err2) {
      debug('jsonErrorHandler unable to stringify error: %j', err);
      next();
    }
  }
};
