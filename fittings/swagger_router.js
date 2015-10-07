'use strict';

var debug = require('debug')('pipes:fittings');
var path = require('path');
var assert = require('assert');

module.exports = function create(fittingDef, pipes) {

  assert(Array.isArray(fittingDef.controllersDirs), 'controllersDirs must be an array');
  assert(Array.isArray(fittingDef.mockControllersDirs), 'mockControllersDirs must be an array');

  var swaggerNodeRunner = pipes.config.swaggerNodeRunner;
  var appRoot = swaggerNodeRunner.config.swagger.appRoot;

  var mockMode = !!fittingDef.mockMode || !!swaggerNodeRunner.config.swagger.mockMode;

  var controllers = mockMode ? fittingDef.mockControllersDirs : fittingDef.controllersDirs;

  controllers = controllers.map(function(dir) {
    return path.resolve(appRoot, dir);
  });

  var routerConfig = {
    useStubs: mockMode,
    controllers: controllers
  };
  debug('swaggerTools router config: %j', routerConfig);
  var middleware = swaggerNodeRunner.swaggerTools.swaggerRouter(routerConfig);

  return function swagger_router(context, cb) {
    middleware(context.request, context.response, cb);
  }
};
