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
var yaml = require('js-yaml');
var fs = require('fs');
var path = require('path');
var initSwaggerTools = require('swagger-tools').initializeMiddleware;
var debug = require('debug')('pipe');
var bagpipes = require('bagpipes');

var SWAGGER_SELECTED_PIPE = 'x-swagger-pipe';
var SWAGGER_ROUTER_CONTROLLER = 'x-swagger-router-controller';

var DEFAULT_FITTINGS_DIR = 'api/fittings';
var DEFAULT_VIEWS_DIR = 'api/views';

var CONFIG_DEFAULTS = {
  validateResponse: true
};

var appPaths = { // relative to appRoot
  configDir: 'config',
  swaggerFile: 'api/swagger/swagger.yaml',
  controllersDir: 'api/controllers',
  mockControllersDir: 'api/mocks',
  helpers: 'api/helpers'
};

/*
SwaggerNode config priority:
  1. swagger_* environment vars
  2. config passed to create()
  3. read from swagger node in default.yaml in config directory
  4. defaults in this file
 */

module.exports.create = function(config, cb) {

  if (!config || !config.appRoot) { return cb(new Error('config.appRoot is required')); }
  if (!_.isFunction(cb)) { return cb(new Error('callback is required')); }

  new Runner(config, cb);
};

function Runner(appJsConfig, cb) {

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

  this.defaultErrorHandler = function() {

    return this.bagpipes.createPipeFromFitting(defaultErrorFitting, { name: 'defaultErrorHandler' });

    function defaultErrorFitting(context, next) {

      debug('default error handler: %s', context.error.message);
      context.statusCode = 500;
      next(null, context.error.message);
    }
  };

  this.getPipe = function(req) {

    if (!(req.swagger && req.swagger.path)) {
      debug('no swagger path');
      return null;
    }

    var path = req.swagger.path;
    var operation = req.swagger.operation;

    var config = self.config.swagger;

    // prefer explicit pipe
    var pipeName;
    if (operation) {
      pipeName = operation[SWAGGER_SELECTED_PIPE];
    }
    if (!pipeName) {
      pipeName = path[SWAGGER_SELECTED_PIPE];
    }

    // no explicit pipe, but there's a controller
    if (!pipeName) {
      if ((operation && operation[SWAGGER_ROUTER_CONTROLLER]) || path[SWAGGER_ROUTER_CONTROLLER])
      {
        pipeName = config.swaggerControllerPipe;
      }
    }
    debug('pipe requested:', pipeName);

    // default pipe
    if (!pipeName) { pipeName = config.defaultPipe; }

    if (!pipeName) {
      debug('no default pipe');
      return null;
    }

    var pipe = this.bagpipes.pipes[pipeName];

    if (!pipe) {
      debug('no defined pipe: ', pipeName);
      return null;
    }

    debug('executing pipe %s', pipeName);

    return pipe;
  };

  var configDir = path.resolve(appJsConfig.appRoot, appJsConfig.configDir || appPaths.configDir);
  var configFile = path.resolve(configDir, 'default.yaml');
  var fileConfig = readConfigFile(configFile);

  var envConfig = readEnvConfig();

  var swaggerConfigDefaults = _.extend({}, CONFIG_DEFAULTS, {
    controllersDirs: [ this.resolveAppPath(appPaths.controllersDir) ],
    mockControllersDirs: [ this.resolveAppPath(appPaths.mockControllersDir) ],
    configDir: configDir
  });

  fileConfig.swagger = _.defaults(envConfig,
                                  appJsConfig,
                                  fileConfig.swagger || {},
                                  swaggerConfigDefaults);

  this.config = fileConfig;
  debug('resolved config: %j', this.config);

  if (_.isObject(appJsConfig.swagger)) { // allow direct setting of swagger
    this.swagger = appJsConfig.swagger;
  } else {
    try {
      var swaggerFile = appJsConfig.swaggerFile || this.resolveAppPath(appPaths.swaggerFile);
      var swaggerString = fs.readFileSync(swaggerFile, 'utf8');
      this.swagger = yaml.safeLoad(swaggerString);
    } catch (err) {
      return cb(err);
    }
  }

  var self = this;
  initSwaggerTools(self.swagger, function(swaggerTools) {
    self.swaggerTools = swaggerTools; // note: must be assigned before create for swagger fittings to reference
    self.swaggerSecurityHandlers = appJsConfig.swaggerSecurityHandlers;
    self.bagpipes = createPipes(self);
    cb(null, self);
  });
}

function createPipes(self) {
  var config = self.config.swagger;

  var projFittingsDir = path.resolve(config.appRoot, config.fittingsDir || DEFAULT_FITTINGS_DIR);
  var swaggerFittingsDir = path.resolve(__dirname, './fittings');
  var fittingsDirs = [ projFittingsDir, swaggerFittingsDir ];

  var projViewsDirs = [ path.resolve(config.appRoot, config.viewsDir || DEFAULT_VIEWS_DIR) ];

  // set up a default piping for traditional swagger-node if nothing is specified
  // todo: move this default pipes config to a yaml file?
  if (!config.pipes && !config.swaggerControllerPipe) {

    debug('**** No pipes defined in config. Using default setup. ****');

    config.swaggerControllerPipe = 'swagger_controllers';

    config.pipes = {
      _router: {
        name: 'swagger_router',
        mockMode: false,
        mockControllersDirs: [ 'api/mocks' ],
        controllersDirs: [ 'api/controllers' ]
      },
      _swagger_validate: {
        name: 'swagger_validator',
        validateReponse: true
      },
      swagger_controllers: [
        { onError: 'json_error_handler' },
        'cors',
        'swagger_security',
        '_swagger_validate',
        'express_compatibility',
        '_router'
      ]
    }
  }

  var pipesDefs = config.pipes;

  var pipesConfig = {
    userControllersDirs: config.controllersDirs,
    userFittingsDirs: fittingsDirs,
    userViewsDirs: projViewsDirs,
    swaggerNodeRunner: self
  };
  return bagpipes.create(pipesDefs, pipesConfig);
}

function readConfigFile(file) {

  try {
    var data = fs.readFileSync(file, 'utf8');
    var obj = yaml.safeLoad(data);
    debug('read config file: %s', file);
    debug('config from file: %j', obj);
    return obj;
  }
  catch(err) {
    debug('failed attempt to read config: %s:', file, err.stack);
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