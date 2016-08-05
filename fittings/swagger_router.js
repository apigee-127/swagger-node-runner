'use strict';

var debug = require('debug')('swagger:swagger_router');
var path = require('path');
var assert = require('assert');
var SWAGGER_ROUTER_CONTROLLER = 'x-swagger-router-controller';
var util = require('util');
var translateResponse = require('../lib/connect_middleware').translateResponse;

module.exports = function create(fittingDef, bagpipes) {

  debug('config: %j', fittingDef);

  assert(Array.isArray(fittingDef.controllersDirs), 'controllersDirs must be an array');
  assert(Array.isArray(fittingDef.mockControllersDirs), 'mockControllersDirs must be an array');

  var swaggerNodeRunner = bagpipes.config.swaggerNodeRunner;
  var appRoot = swaggerNodeRunner.config.swagger.appRoot;

  var mockMode = !!fittingDef.mockMode || !!swaggerNodeRunner.config.swagger.mockMode;

  var controllersDirs = mockMode ? fittingDef.mockControllersDirs : fittingDef.controllersDirs;

  controllersDirs = controllersDirs.map(function (dir) {
    return path.resolve(appRoot, dir);
  });

  var controllerFunctionsCache = {};

  return function swagger_router(context, cb) {
    debug('exec %s', context.request.swagger.operation.ptr || context.request.swagger.operation.pathObject.ptr);

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
          controller = require(controllerPath);
          controllerFunctionsCache[controllerName] = controller;
          debug('controller found', path.relative(appRoot, controllerPath));
          break;
        } catch (err) {
          debug('controller not in', path.relative(appRoot, controllerPath));
          if (!mockMode && i === controllersDirs.length - 1) {
            return cb(err);
          }
        }
      }
    }

    if (!controller && mockMode) {
      controller = controllerFunctionsCache[controllerName] = {};
      debug('created mock controller %s', controllerName);
    }

    if (controller) {

      var operationId = operation.definition['operationId'] || context.request.method.toLowerCase();
      var controllerFunction = controller[operationId];

      if (!controllerFunction && mockMode) {
        controllerFunction = controller[operationId] = createMockControllerFunction(fittingDef, bagpipes);
        debug('created mock controller function %s.%s', controllerName, operationId);
      }

      if (controllerFunction && typeof controllerFunction === 'function') {
        debug('running controller %s.%s', controllerName, operationId);
        return controllerFunction(context.request, context.response, cb);
      }

      debug(util.format('Controller %s doesn\'t export handler function %s', controllerName, operationId));
      return cb(new Error(msg));
    }

    // for completeness, we should never actually get here
    cb(new Error(util.format('No controller found for %s in %j', controllerName, controllersDirs)));
  }
};

function createMockControllerFunction(fittingDef, bagpipes) {
  var swaggerNodeRunner = bagpipes.config.swaggerNodeRunner;
  var appRoot = swaggerNodeRunner.config.swagger.appRoot;

  var mockModeNoCallback = !!fittingDef.mockModeNoCallback || !!swaggerNodeRunner.config.swagger.mockModeNoCallback;

  return function default_mock_controller(request, response, cb) {
    debug('exec default_mock_controller')

    var operation = request.swagger.operation;
    var controllerName = operation[SWAGGER_ROUTER_CONTROLLER] || operation.pathObject[SWAGGER_ROUTER_CONTROLLER];

    var statusCode = parseInt(request.get('_mockreturnstatus')) || 200;

    var mimetype = request.get('accept');
    if (!mimetype || mimetype === '*/*') {
      if (!operation.produces || !operation.produces.length || operation.produces.indexOf('application/json') >= 0) {
        mimetype = 'application/json';
      } else {
        mimetype = operation.produces[0];
      }
    }

    var mock = operation.getResponseExample(statusCode, mimetype);

    if (mock) {
      debug('returning mock example value', mock);
    } else {
      mock = operation.getResponseSample(statusCode);
      debug('returning mock sample value', mock);
    }

    response.setHeader('Content-Type', mimetype);

    response.statusCode = statusCode;

    if (mockModeNoCallback) {
      response.end(translateResponse(mock, mimetype));
    } else {
      cb(null, mock);
    }
  };
}