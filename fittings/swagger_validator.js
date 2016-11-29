'use strict';

var debug = require('debug')('swagger:swagger_validator');
var _ = require('lodash');
var util = require('util');

module.exports = function create(fittingDef, bagpipes) {

  debug('config: %j', fittingDef);

  return function swagger_validator(context, cb) {

    debug('exec');

    // todo: add support for validating accept header against produces declarations
    // see: http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html
    //var accept = req.headers['accept'];
    //var produces = _.union(operation.api.definition.produces, operation.definition.produces);

    if (context.request.swagger.operation) {
      var validateResult = context.request.swagger.operation.validateRequest(context.request);
      if (validateResult.errors.length) {
        var error = new Error('Validation errors');
        error.statusCode = 400;
        error.errors = validateResult.errors;
      }
    } else {
      debug('not a swagger operation, will not validate response');
    }

    cb(error);
  }
};
