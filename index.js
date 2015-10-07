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

var DEFAULT_FITTINGS_DIRS = [ 'api/fittings' ];
var DEFAULT_VIEWS_DIRS = [ 'api/views' ];

var appPaths = { // relative to appRoot
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
      next();
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

  // don't override if env var already set
  if (appJsConfig.configDir && !process.env.NODE_CONFIG_DIR) {
    process.env.NODE_CONFIG_DIR = path.resolve(appJsConfig.appRoot, appJsConfig.configDir);
  }
  var config = require('config');

  var swaggerConfigDefaults = {
    validateResponse: true,
    controllersDirs: [ this.resolveAppPath(appPaths.controllersDir) ],
    mockControllersDirs: [ this.resolveAppPath(appPaths.mockControllersDir) ]
  };

  config.swagger = _.defaults(readEnvConfig(),
                              appJsConfig,
                              config.swagger || {},
                              swaggerConfigDefaults);

  this.config = config;
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

    // todo: support this legacy config? how?
    // docEndpoints:
    //   raw: /swagger

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