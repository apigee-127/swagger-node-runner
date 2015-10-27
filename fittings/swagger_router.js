'use strict';

var debug = require('debug')('swagger:swagger_router');
var path = require('path');
var assert = require('assert');
var SWAGGER_ROUTER_CONTROLLER = 'x-swagger-router-controller';

module.exports = function create(fittingDef, bagpipes) {

  debug('config: %j', fittingDef);

  assert(Array.isArray(fittingDef.controllersDirs), 'controllersDirs must be an array');
  assert(Array.isArray(fittingDef.mockControllersDirs), 'mockControllersDirs must be an array');

  var swaggerNodeRunner = bagpipes.config.swaggerNodeRunner;
  var appRoot = swaggerNodeRunner.config.swagger.appRoot;

  var mockMode = !!fittingDef.mockMode || !!swaggerNodeRunner.config.swagger.mockMode;

  var controllersDirs = mockMode ? fittingDef.mockControllersDirs : fittingDef.controllersDirs;

  controllersDirs = controllersDirs.map(function(dir) {
    return path.resolve(appRoot, dir);
  });

  return function swagger_router(context, cb) {
    debug('exec');

    var operation = context.request.swagger.operation;
    var controllerName = operation[SWAGGER_ROUTER_CONTROLLER] || operation.pathObject[SWAGGER_ROUTER_CONTROLLER];

    // todo: caching! error handling! mock mode!
    controllersDirs.forEach(function(controllersDir) {
      var controllerPath = path.resolve(controllersDir, controllerName);
      var controller = require(controllerPath);
      var controllerFunction = controller[operation.definition['operationId']];
      controllerFunction(context.request, context.response, cb);
    });

    cb();
  }
};

/*
Operation
 .getResponseExample(codeOrMimeType, [mimeType]) ⇒ string
 .getResponseSchema([code]) ⇒ object
 .getResponseSample([code]) ⇒ *
 */
