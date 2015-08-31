'use strict';

var debug = require('debug')('pipes:fittings');
var path = require('path');

module.exports = function create(fittingDef, pipes) {

  var controllers = fittingDef.mockMode ? fittingDef.mockControllersDirs : fittingDef.controllersDirs;

  var swaggerNodeRunner = pipes.config.swaggerNodeRunner;
  var appRoot = swaggerNodeRunner.config.swagger.appRoot;

  controllers = controllers.map(function(dir) {
    return path.resolve(appRoot, dir);
  });

  var routerConfig = {
    useStubs: !!fittingDef.mockMode,
    controllers: controllers
  };
  debug('swaggerTools router config: %j', routerConfig);
  var middleware = swaggerNodeRunner.swaggerTools.swaggerRouter(routerConfig);

  return function swagger_router(context, cb) {
    middleware(context.request, context.response, cb);
  }
};
