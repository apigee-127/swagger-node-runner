'use strict';

/*
Runner properties:
  config
  swagger
  api  // (sway)
  connectMiddleware()
  resolveAppPath()
  securityHandlers
  bagpipes

Runner events:
 responseValidationError

config properties:
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
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var SWAGGER_SELECTED_PIPE = 'x-swagger-pipe';
var SWAGGER_ROUTER_CONTROLLER = 'x-swagger-router-controller';
var DEFAULT_FITTINGS_DIRS = [ 'api/fittings' ];
var DEFAULT_VIEWS_DIRS = [ 'api/views' ];
var DEFAULT_SWAGGER_FILE = 'api/swagger/swagger.yaml'; // relative to appRoot

/*
SwaggerNode config priority:
  1. swagger_* environment vars
  2. config passed to create()
  3. read from swagger node in default.yaml in config directory
  4. defaults in this file
 */

function create(config, cb) {

  if (!_.isFunction(cb)) { throw new Error('callback is required'); }
  if (!config || !config.appRoot) { return cb(new Error('config.appRoot is required')); }

  new Runner(config, cb);
}

util.inherits(Runner, EventEmitter);

function Runner(appJsConfig, cb) {

  EventEmitter.call(this);

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

  this.getPath = function getPath(req) {
    return this.api.getPath(req);
  };

  // adds req.swagger to the request
  this.applyMetadata = function applyMetadata(req, operation, cb) {

    var swagger = req.swagger = {};
    swagger.operation = operation;
    cb();
  };

    // must assign req.swagger (see #applyMetadata) before calling
  this.getPipe = function getPipe(req) {

    var operation = req.swagger.operation;

    var path = operation ? operation.pathObject : this.getPath(req);
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
  var Config = require('config');

  var swaggerConfigDefaults = {
    enforceUniqueOperationId: false,
    startWithErrors: false,
    startWithWarnings: true
  };

  this.config = Config.util.cloneDeep(Config);
  this.config.swagger =
    Config.util.extendDeep(
      swaggerConfigDefaults,
      this.config.swagger,
      appJsConfig,
      readEnvConfig());

  debug('resolved config: %j', this.config);

  var self = this;
  var swayOpts = {
    definition: appJsConfig.swagger || appJsConfig.swaggerFile || this.resolveAppPath(DEFAULT_SWAGGER_FILE)
  };

  debug('initializing Sway');
  // sway uses Promises
  sway.create(swayOpts)
    .then(function(api) {

      debug('validating api');
      var validateResult = api.validate();
      debug('done validating api. errors: %d, warnings: %d', validateResult.errors.length, validateResult.warnings.length);

      var errors = validateResult.errors;
      if (errors && errors.length > 0) {
        if (!self.config.swagger.enforceUniqueOperationId) {
          errors = errors.filter(function(err) {
            return (err.code !== 'DUPLICATE_OPERATIONID');
          });
        }
        if (errors.length > 0) {
          if (self.config.swagger.startWithErrors) {
            var errorText = JSON.stringify(errors);
            console.error(errorText, 2);
          } else {
            var err = new Error('Swagger validation errors:');
            err.validationErrors = errors;
            throw err;
          }
        }
      }

      var warnings = validateResult.warnings;
      if (warnings && warnings.length > 0) {
        var warningText = JSON.stringify(warnings);
        if (self.config.swagger.startWithWarnings) {
          console.error(warningText, 2);
        } else {
          var err = new Error('Swagger validation warnings:');
          err.validationWarnings = warnings;
          throw err;
        }
      }

      self.api = api;
      self.swagger = api.definition;
      self.securityHandlers = appJsConfig.securityHandlers || appJsConfig.swaggerSecurityHandlers; // legacy name
      self.bagpipes = createPipes(self);

      cb(null, self);
    })
    .catch(function(err) {
      cb(err);
    })
    .catch(function(err) {
      console.error('Error in callback! Tossing to global error handler.', err.stack);

      if (err.validationErrors) {
        console.error('Details: ');
        for (var i= 0; i<err.validationErrors.length; i++) {
          console.error("\t#" + i + ".: " + err.validationErrors[i].message + " in swagger config at: >" + err.validationErrors[i].path.join('/') + "<");
        }
      }
      
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
  if (!config.bagpipes || config.bagpipes ==='DEFAULTS_TEST') {

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
        'swagger_params_parser',
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
          try {
            configItem[subKey] = JSON.parse(value);
          } catch (err) {
            configItem[subKey] = value;
          }
        }
      }
    }
  });
  debug('loaded env vars: %j', config);
  return config;
}