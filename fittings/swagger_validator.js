'use strict';

var debug = require('debug')('swagger:swagger_validator');
var _ = require('lodash');
var util = require('util');
var onFinished = require('on-finished');

module.exports = function create(fittingDef, bagpipes) {

  debug('config: %j', fittingDef);

  return function swagger_validator(context, cb) {

    debug('exec');

    // todo: validate response when Sway supports it - maybe a different fitting?
    //if (fittingDef.validateResponse) {
    //  // Hapi middleware currently passes in request.raw as request and a wrapper as response
    //  // 'context.request.res' is to access the Hapi response. Better Hapi solution? Use a hook?
    //  var response = context.request.res || context.response;
    //  onFinished(context.response, function (err, res) {
    //    if (!err) {
    //      debug('validating response');
    //      ....
    //    }
    //  });
    //}

    var error = validateContentType(context.request);

    // validate parameters
    _.forEach(context.request.swagger.params, function(parameterValue, parameterName) {
      if (!parameterValue.valid) {
        error = error || makeValidationError();
        error.errors.push(formatError(parameterName, parameterValue.error));
      }
    });

    cb(error);
  }
};

function makeValidationError() {
  var error = new Error('Validation errors');
  error.statusCode = 400;
  error.errors = [];
  return error;
}

function validateContentType(req) {
  var contentType = req.headers['content-type'];
  contentType = contentType ? contentType.split(';')[0] : 'application/octet-stream';

  var operation = req.swagger.operation;
  var consumes = _.union(operation.api.definition.consumes, operation.consumes);

  if (consumes.length > 0 && ['POST', 'PUT'].indexOf(req.method) !== -1 && consumes.indexOf(contentType) === -1) {
    var error = makeValidationError();
    error.errors.push(util.format('Invalid content type (%s). These are valid: %s', contentType, consumes.join(', ')));
    return error;
  }
}

function formatError(paramName, err) {

  // Format the errors to include the parameter information
  if (err.failedValidation === true) {
    var currentMessage = err.message;
    var validationMessage = 'Parameter (' + paramName + ') ';

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
