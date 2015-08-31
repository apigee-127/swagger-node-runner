'use strict';

var debug = require('debug')('pipes:fittings');

module.exports = function create(fittingDef, pipes) {

  var controllers = fittingDef.mockMode ? fittingDef.mockControllersDirs : fittingDef.controllersDirs;

  var routerConfig = {
    useStubs: !!fittingDef.mockMode,
    controllers: controllers
  };
  debug('swaggerTools router config: %j', routerConfig);
  var middleware = pipes.config.swaggerNodeRunner.swaggerTools.swaggerRouter(routerConfig);

  return function swagger_router(context, cb) {
    middleware(context.request, context.response, cb);
  }
};
