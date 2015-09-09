'use strict';

var debug = require('debug')('pipes:fittings');

module.exports = function create(fittingDef, bagpipes) {

  debug('swagger security config: %j', fittingDef);

  var swaggerNodeRunner = bagpipes.config.swaggerNodeRunner;
  var middleware = swaggerNodeRunner.swaggerTools.swaggerSecurity(swaggerNodeRunner.swaggerSecurityHandlers);

  return function swagger_security(context, cb) {
    middleware(context.request, context.response, cb);
  }
};
