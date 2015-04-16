/****************************************************************************
 The MIT License (MIT)

 Copyright (c) 2015 Apigee Corporation

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
'use strict';

/*
Runner:
  config
  swagger
  swaggerTools
  connectMiddleware()
  resolveAppPath()

config:
  appRoot
  mockMode
  configDir
  controllersDirs
  mockControllersDirs
  securityHandlers
 */

var _ = require('lodash');
var YAML = require('yamljs');
var path = require('path');
var initSwaggerTools = require('swagger-tools').initializeMiddleware;
var debug = require('debug')('swagger');

var CONFIG_DEFAULTS = {
  validateResponse: true
};

var appPaths = { // relative to appRoot
  configDir: 'config',
  swaggerFile: 'api/swagger/swagger.yaml',
  controllersDir: 'api/controllers',
  mockControllersDir: 'api/mocks'
};

/*
SwaggerNode config priority:
  1. swagger_* environment vars
  2. config passed to create()
  3. read from swaggerNode node in default.yaml in config directory
  4. defaults in this file
 */

module.exports.create = function(config, callback) {

  if (!callback && _.isFunction(config)) { callback = config; config = undefined; }
  if (!_.isFunction(callback)) { throw new Error('callback is required'); }
  if (!config.appRoot) { throw new Error('config.appRoot is required'); }

  new Runner(config, callback);
};

function Runner(appJsConfig, callback) {

  this.resolveAppPath = function resolveAppPath(to) {
    return path.resolve(appJsConfig.appRoot, to);
  };

  this.connectMiddleware = function connectMiddleware() {
    return require('./lib/connect_middleware')(this);
  };

  this.expressMiddleware = this.connectMiddleware;

  this.restifyMiddleware = function restifyMiddleware() {
    return require('./lib/restify_middleware')(this);
  };

  this.sailsMiddleware = function sailsMiddleware() {
    return require('./lib/sails_middleware')(this);
  };

  this.hapiMiddleware = function hapiMiddleware() {
    return require('./lib/hapi_middleware')(this);
  };

  var configDir = path.resolve(appJsConfig.appRoot, appJsConfig.configDir || appPaths.configDir);
  var fileConfig = readConfigFile(path.resolve(configDir, 'default.yaml'));

  var envConfig = readEnvConfig();

  var swaggerNodeConfigDefaults = _.extend({}, CONFIG_DEFAULTS, {
    controllersDirs: [ this.resolveAppPath(appPaths.controllersDir) ],
    mockControllersDirs: [ this.resolveAppPath(appPaths.mockControllersDir) ]
  });

  fileConfig.swaggerNode = _.defaults(envConfig,
                                      appJsConfig,
                                      fileConfig.swaggerNode || {},
                                      swaggerNodeConfigDefaults);

  this.config = fileConfig;
  debug('resolved config: %j', this.config);

  if (!this.swagger) {
    this.swagger = YAML.load(this.resolveAppPath(appPaths.swaggerFile));
  }

  var self = this;
  initSwaggerTools(this.swagger, function(swaggerTools) {
    self.swaggerTools = swaggerTools;
    callback(undefined, self);
  });
}

function readConfigFile(file) {

  try {
    var obj = YAML.load(file);
    debug('read config file: %s', file);
    debug('config from file: %j', obj);
    return obj;
  }
  catch(err) {
    debug('failed attempt to read config: %s', file);
    return {};
  }
}

function readEnvConfig() {

    var config = {};
  _.each(process.env, function(value, key) {
    var split = key.split('_');
    if (split[0] === 'swagger') {
      var configItem = config;
      for (var i = 1; i < split.length; i++) {
        var subKey = split[i];
        if (i < split.length - 1) {
          if (!configItem[subKey]) { configItem[subKey] = {}; }
          configItem = configItem[subKey];
        } else {
          configItem[subKey] = JSON.parse(value);
        }
      }
    }
  });
  debug('loaded env vars: %j', config);
  return config;
}