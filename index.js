'use strict';

/*
Runner:
  config
  swagger
  api  // (sway)
  connectMiddleware()
  resolveAppPath()
  swaggerSecurityHandlers
  bagpipes

config:
  appRoot
  mockMode
  configDir
  controllersDirs
  mockControllersDirs
  securityHandlers
 */

module.exports = {
  create: create
};

var _ = require('lodash');
var yaml = require('js-yaml');
var path = require('path');
var sway = require('sway');
var debug = require('debug')('swagger');
var bagpipes = require('bagpipes');
var helpers = require('./lib/helpers');

var SWAGGER_SELECTED_PIPE = 'x-swagger-pipe';
var SWAGGER_ROUTER_CONTROLLER = 'x-swagger-router-controller';
var DEFAULT_FITTINGS_DIRS = [ 'api/fittings' ];
var DEFAULT_VIEWS_DIRS = [ 'api/views' ];
var DEFAULT_APP_PATHS = { // relative to appRoot
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

function create(config, cb) {

  if (!config || !config.appRoot) { return cb(new Error('config.appRoot is required')); }
  if (!_.isFunction(cb)) { return cb(new Error('callback is required')); }

  new Runner(config, cb);
}

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
      next();
    }
  };

  this.getOperation = function getOperation(req) {
    return this.api.getOperation(req);
  };

  this.applyMetadata = function applyMetadata(req, operation, cb) {

    var swagger = req.swagger = {};
    swagger.operation = operation;
    // todo: do we need any of this?
    //swagger.operationPath = operation.pathObject;
    //swagger.operationParameters = operation.parameterObjects;
    //swagger.security = operation.securityDefinitions;
    //swagger.swaggerVersion = operation.api.version;

    helpers.resolveParameters(req, cb);
  };

    // must assign req.swagger (see #applyMetadata) before calling
  this.getPipe = function getPipe(req) {

    var operation = req.swagger.operation;

    if (!operation) { return null; }

    var path = operation.pathObject;
    var config = this.config.swagger;

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

  // don't override if env var already set
  if (!process.env.NODE_CONFIG_DIR) {
    if (!appJsConfig.configDir) { appJsConfig.configDir = 'config'; }
    process.env.NODE_CONFIG_DIR = path.resolve(appJsConfig.appRoot, appJsConfig.configDir);
  }
  var config = require('config');

  var swaggerConfigDefaults = {
    validateResponse: true,
    enforceUniqueOperationId: false,
    startWithErrors: false,
    startWithWarnings: true,
    controllersDirs: [ this.resolveAppPath(DEFAULT_APP_PATHS.controllersDir) ],
    mockControllersDirs: [ this.resolveAppPath(DEFAULT_APP_PATHS.mockControllersDir) ]
  };

  config.swagger = _.defaults(readEnvConfig(),
                              appJsConfig,
                              config.swagger || {},
                              swaggerConfigDefaults);

  this.config = config;
  debug('resolved config: %j', this.config);

  var self = this;
  var swayOpts = {
    definition: appJsConfig.swagger || appJsConfig.swaggerFile || this.resolveAppPath(DEFAULT_APP_PATHS.swaggerFile)
  };

  // sway uses Promises
  sway.create(swayOpts)
    .then(function(api) {

      api.validate();

      var errors = api.getLastErrors();

      if (errors && errors.length > 0) {
        if (!config.swagger.enforceUniqueOperationId) {
          errors = errors.filter(function(err) {
            return (err.code !== 'DUPLICATE_OPERATIONID');
          });
        }
        if (errors.length > 0) {
          if (config.swagger.startWithErrors) {
            var errorText = JSON.stringify(errors);
            console.error(errorText, 2);
          } else {
            throw new Error(errors, 2);
          }
        }
      }

      var warnings = api.getLastWarnings();
      if (warnings && warnings.length > 0) {
        var warningText = JSON.stringify(warnings);
        if (config.swagger.startWithWarnings) {
          console.error(warningText, 2);
        } else {
          throw new Error(warningText, 2);
        }
      }

      self.api = api;
      self.swagger = api.definition;
      self.swaggerSecurityHandlers = appJsConfig.swaggerSecurityHandlers;
      self.bagpipes = createPipes(self);

      cb(null, self);
    })
    .catch(function(err) {
      cb(err);
    })
    .catch(function(err) {
      console.error('Error in callback! Tossing to global error handler.', err);
      process.nextTick(function() { throw err; });
    })
}

function createPipes(self) {
  var config = self.config.swagger;

  var fittingsDirs = (config.fittingsDirs || DEFAULT_FITTINGS_DIRS).map(function(dir) {
    return path.resolve(config.appRoot, dir);
  });
  var swaggerNodeFittingsDir = path.resolve(__dirname, './fittings');
  fittingsDirs.push(swaggerNodeFittingsDir);

  var viewsDirs = (config.viewsDirs || DEFAULT_VIEWS_DIRS).map(function(dir) {
    return path.resolve(config.appRoot, dir);
  });

  // legacy support: set up a default piping for traditional swagger-node if nothing is specified
  if (!config.bagpipes) {

    debug('**** No bagpipes defined in config. Using default setup. ****');

    config.swaggerControllerPipe = 'swagger_controllers';

    config.bagpipes = {
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
        'cors',
        'swagger_security',
        '_swagger_validate',
        'express_compatibility',
        '_router'
      ]
    };

    if (config.mapErrorsToJson) {
      config.bagpipes.swagger_controllers.unshift({ onError: 'json_error_handler' });
    }
  }

  var pipesDefs = config.bagpipes;

  var pipesConfig = {
    connectMiddlewareDirs: config.controllersDirs,
    userFittingsDirs: fittingsDirs,
    userViewsDirs: viewsDirs,
    swaggerNodeRunner: self
  };
  return bagpipes.create(pipesDefs, pipesConfig);
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