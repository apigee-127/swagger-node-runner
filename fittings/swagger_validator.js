'use strict';

var debug = require('debug')('swagger:swagger_validator');
var _ = require('lodash');
var onFinished = require('on-finished');

module.exports = function create(fittingDef, pipes) {

  debug('config: %j', fittingDef);

  return function swagger_validator(context, cb) {

    debug('exec');

    if (fittingDef.validateResponse) {
      // Hapi middleware currently passes in request.raw as request and a wrapper as response
      // todo: better Hapi solution?
      var response = context.request.res || context.response;
      onFinished(context.response, function (err, res) {
        if (!err) {
          debug('validating response');
          // todo: validate response when Sway supports it
        }
      });
    }

    // todo: validate all the other req stuff

    // validate parameters
    var error = undefined;
    _.forEach(context.request.swagger.params, function(parameterValue) {
      if (!parameterValue.valid) {
        if (!error) {
          error = new Error('Validation errors');
          error.statusCode = 400;
          error.errors = [];
        }
        error.errors.push(formatError(parameterValue.error));
      }
    });
    cb(error);
  }
};

function formatError(err) {

  // Format the errors to include the parameter information
  if (err.failedValidation === true) {
    var currentMessage = err.message;
    var validationMessage = 'Parameter (' + err.paramName + ') ';

    switch (err.code) {
      case 'ENUM_MISMATCH':
      case 'MAXIMUM':
      case 'MAXIMUM_EXCLUSIVE':
      case 'MINIMUM':
      case 'MINIMUM_EXCLUSIVE':
      case 'MULTIPLE_OF':
      case 'INVALID_TYPE':
        if (err.code === 'INVALID_TYPE' && err.message.split(' ')[0] === 'Value') {
          validationMessage += err.message.split(' ').slice(1).join(' ');
        } else {
          validationMessage += 'is ' + err.message.charAt(0).toLowerCase() + err.message.substring(1);
        }

        break;

      case 'ARRAY_LENGTH_LONG':
      case 'ARRAY_LENGTH_SHORT':
      case 'MAX_LENGTH':
      case 'MIN_LENGTH':
        validationMessage += err.message.split(' ').slice(1).join(' ');

        break;

      case 'MAX_PROPERTIES':
      case 'MIN_PROPERTIES':
        validationMessage += 'properties are ' + err.message.split(' ').slice(4).join(' ');

        break;

      default:
        validationMessage += err.message.charAt(0).toLowerCase() + err.message.substring(1);
    }

    // Replace the message
    err.message = 'Request validation failed: ' + validationMessage;

    // Replace the stack message
    err.stack = err.stack.replace(currentMessage, validationMessage);
  }

  Object.defineProperty(err, 'message', { enumerable: true });

  return err;
}
