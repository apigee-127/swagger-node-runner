'use strict';

var debug = require('debug')('pipes:fittings');
var util = require('util');

module.exports = function create(fittingDef) {

  return function error_handler(context, next) {

    if (!util.isError(context.error)) { return next(); }

    var err = context.error;

    debug('jsonErrorHandler: %s', context.error.message);

    try {
      context.headers['Content-Type'] = 'application/json';
      context.statusCode = context.statusCode || 500;
      Object.defineProperty(err, 'message', { enumerable: true }); // include message property in response
      if (context.statusCode === 500) {
        console.error(err.stack);
      }
      next(null, JSON.stringify(err));
    } catch (err2) {
      debug('jsonErrorHandler unable to stringify error: %j', err);
      next();
    }
  }
};
