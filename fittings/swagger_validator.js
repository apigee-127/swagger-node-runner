'use strict';

var debug = require('debug')('pipes:fittings');

module.exports = function create(fittingDef, pipes) {

  var validatorConfig = {
    validateResponse: !!fittingDef.validateResponse
  };
  debug('validator config: %j', validatorConfig);
  var middleware = pipes.config.swaggerNodeRunner.swaggerTools.swaggerValidator(validatorConfig);

  return function swagger_validator(context, cb) {
    middleware(context.request, context.response, cb);
  }
};
