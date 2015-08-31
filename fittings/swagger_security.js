'use strict';

var debug = require('debug')('pipes:fittings');

module.exports = function create(fittingDef, pipes) {

  debug('swagger security config: %j', fittingDef);

  var swaggerNodeRunner = pipes.config.swaggerNodeRunner;
  var middleware = swaggerNodeRunner.swaggerTools.swaggerSecurity(swaggerNodeRunner.swaggerSecurityHandlers);

  return function swagger_security(context, cb) {
    middleware(context.request, context.response, cb);
  }
};
