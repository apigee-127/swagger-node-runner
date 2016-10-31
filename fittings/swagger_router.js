'use strict';

var debug = require('debug')('swagger:swagger_router');
var path = require('path');
var assert = require('assert');
var SWAGGER_ROUTER_CONTROLLER = 'x-swagger-router-controller';
var CONTROLLER_INTERFACE_TYPE = 'x-controller-interface';
var allowedCtrlInterfaces = ["middleware", "pipe", "auto-detect"];
var util = require('util');

module.exports = function create(fittingDef, bagpipes) {

  debug('config: %j', fittingDef);

  assert(Array.isArray(fittingDef.controllersDirs), 'controllersDirs must be an array');
  assert(Array.isArray(fittingDef.mockControllersDirs), 'mockControllersDirs must be an array');
  
  if (!fittingDef.controllersInterface) fittingDef.controllersInterface = "middleware";
  assert( ~allowedCtrlInterfaces.indexOf(fittingDef.controllersInterface), 
    'value in swagger_router config.controllersInterface - can be one of ' + allowedCtrlInterfaces + ' but got: ' + fittingDef.controllersInterface
  );

  var swaggerNodeRunner = bagpipes.config.swaggerNodeRunner;
  swaggerNodeRunner.api.getOperations().forEach(function(operation) { 
      var interfaceType = 
            operation.controllerInterface = 
            operation.definition[CONTROLLER_INTERFACE_TYPE] ||
            operation.pathObject.definition[CONTROLLER_INTERFACE_TYPE] ||
            swaggerNodeRunner.api.definition[CONTROLLER_INTERFACE_TYPE] ||
            fittingDef.controllersInterface;
        
      assert( ~allowedCtrlInterfaces.indexOf(interfaceType), 
        'whenever provided, value of ' + CONTROLLER_INTERFACE_TYPE + ' directive in openapi doc must be one of ' + allowedCtrlInterfaces + ' but got: ' + interfaceType);
  })
  
  var appRoot = swaggerNodeRunner.config.swagger.appRoot;
  var dependencies = swaggerNodeRunner.config.swagger.dependencies

  var mockMode = !!fittingDef.mockMode || !!swaggerNodeRunner.config.swagger.mockMode;

  var controllersDirs = mockMode ? fittingDef.mockControllersDirs : fittingDef.controllersDirs;

  controllersDirs = controllersDirs.map(function(dir) {
    return path.resolve(appRoot, dir);
  });

  var controllerFunctionsCache = {};

  return function swagger_router(context, cb) {
    debug('exec');

    var operation = context.request.swagger.operation;
    var controllerName = operation[SWAGGER_ROUTER_CONTROLLER] || operation.pathObject[SWAGGER_ROUTER_CONTROLLER];

    var controller;

    if (controllerName in controllerFunctionsCache) {

      debug('controller in cache', controllerName);
      controller = controllerFunctionsCache[controllerName];

    } else {

      debug('loading controller %s from fs: %s', controllerName, controllersDirs);
      for (var i = 0; i < controllersDirs.length; i++) {
        var controllerPath = path.resolve(controllersDirs[i], controllerName);
        try {
          var ctrlObj = require(controllerPath)
          controller = dependencies && typeof ctrlObj === 'function' ? ctrlObj(dependencies) : ctrlObj
          controllerFunctionsCache[controllerName] = controller;
          debug('controller found', controllerPath);
          break;
        } catch (err) {
          if (!mockMode && i === controllersDirs.length - 1) {
            return cb(err);
          }
          debug('controller not in', controllerPath);
        }
      }
    }

    if (controller) {

      var operationId = operation.definition.operationId || context.request.method.toLowerCase();
      var ctrlType = 
            operation.definition['x-controller-type'] ||
            operation.pathObject.definition['x-controller-type'] ||
            operation.pathObject.api.definition['x-controller-type'];
          
      var controllerFunction = controller[operationId];

      if (controllerFunction && typeof controllerFunction === 'function') {
        if (operation.controllerInterface == 'auto-detect') {
            operation.controllerInterface = 
              controllerFunction.length == 3
                ? 'middleware'
                : 'pipe';
            debug("auto-detected interface-type for operation '%s' at [%s] as '%s'", operationId, operation.pathToDefinition, operation.controllerInterface)
        }
        
        debug('running controller, as %s', operation.controllerInterface);
        return operation.controllerInterface == 'pipe'
          ? controllerFunction(context, cb)
          : controllerFunction(context.request, context.response, cb);
      }

      var msg = util.format('Controller %s doesn\'t export handler function %s', controllerName, operationId);
      if (mockMode) {
        debug(msg);
      } else {
        return cb(new Error(msg));
      }
    }

    if (mockMode) {

      var statusCode = parseInt(context.request.get('_mockreturnstatus')) || 200;

      var mimetype = context.request.get('accept') || 'application/json';
      var mock = operation.getResponse(statusCode).getExample(mimetype);

      if (mock) {
        debug('returning mock example value', mock);
      } else {
        mock = operation.getResponse(statusCode).getSample();
        debug('returning mock sample value', mock);
      }

      context.headers['Content-Type'] = mimetype;
      context.statusCode = statusCode;

      return cb(null, mock);
    }

    // for completeness, we should never actually get here
    cb(new Error(util.format('No controller found for %s in %j', controllerName, controllersDirs)));
  }
};
