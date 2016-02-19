'use strict';
var debug = require('debug')('pipes:fittings');
var util = require('util');
var statuses = require('statuses');

module.exports = function create(fittingDef) {

  return function error_handler(context, next) {

    if (!util.isError(context.error)) { return next(); }

    var err = context.error;


    debug('jsonErrorHandler: %s', context.error.message);

    try {
      context.headers['Content-Type'] = 'application/json';

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

      
      if (context.statusCode === 500) {
        console.error(err.stack);
      }
      delete(context.error);
	  var production = process.env.NODE_ENV;
      if (production === 'production') {
        next(null, JSON.stringify(statuses[context.statusCode]));
      } else {
	  Object.defineProperty(err, 'message', { enumerable: true }); // include message property in response
        next(null, JSON.stringify(err));
      }


    } catch (err2) {
      debug('jsonErrorHandler unable to stringify error: %j', err);
      next();
    }
  }
};
