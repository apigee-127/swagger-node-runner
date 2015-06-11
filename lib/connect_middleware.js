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

var debug = require('debug')('swagger');
var Url = require('url');
var CORS = require('cors');
var YAML = require('js-yaml');
var _ = require('lodash');
var util = require('util');

// default filter just drops all the x- labels
var DROP_SWAGGER_EXTENSIONS = /^(?!x-.*)/;

module.exports = init;

function init(runner) {
  return new Middleware(runner);
}

function Middleware(runner) {
  this.runner = runner;
  this.config = runner.config;
  this.sysConfig = runner.config.swagger;

  this.metadata = function metadata() {

    return this.runner.swaggerTools.swaggerMetadata();
  };

  this.security = function security() {

    debug('swagger security config: %j', this.sysConfig.securityHandlers);
    return this.runner.swaggerTools.swaggerSecurity(this.sysConfig.securityHandlers);
  };

  this.validator = function validator() {

    var validatorConfig = {
      validateResponse: !!this.sysConfig.validateResponse
    };
    debug('validator config: %j', validatorConfig);
    return this.runner.swaggerTools.swaggerValidator(validatorConfig);
  };

  this.router = function router() {

    var controllers = this.sysConfig.mockMode ? this.sysConfig.mockControllersDirs : this.sysConfig.controllersDirs;

    var routerConfig = {
      useStubs: !!this.sysConfig.mockMode,
      controllers: controllers
    };
    debug('swaggerTools router config: %j', routerConfig);
    return this.runner.swaggerTools.swaggerRouter(routerConfig);
  };

  this.jsonErrorHandler = function() {

    debug('jsonErrorHandler configured');
    return function jsonErrorHandler(err, req, res, next) {
      if (util.isError(err)) {
        debug('jsonErrorHandler: %s', err.message);
        Object.defineProperty(err, 'message', { enumerable: true }); // include message property in response
        try {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(err));
        } catch (err2) {
          debug('jsonErrorHandler unable to stringify error: %j', err);
          next(err);
        }
      } else {
        // odd cases - in case we get here in non-error handler conditions
        if (typeof next === 'function') {
          next();
        } else if (typeof res === 'function') {
          res();
        }
      }
    };
  };

  this.expressCompatibilityMW = function expressCompatibilityMW() {
    debug('express compatibility middleware configured');
    return expressCompatibility;
  };

  this.swaggerDoc = function swaggerDoc() {

    var rawDocPath = this.sysConfig.docEndpoints ? this.sysConfig.docEndpoints.raw : undefined;

    debug('swagger raw doc path: %s', rawDocPath);

    var filter = DROP_SWAGGER_EXTENSIONS;
    if (this.sysConfig.docEndpoints && this.sysConfig.docEndpoints.filter) {
      filter = new RegExp(this.sysConfig.docEndpoints.filter);
    }
    debug('swagger doc filter: %s', filter);
    var filteredSwagger = filterKeysRecursive(this.runner.swagger, filter);

    // should this just be based on accept type?
    var yaml = YAML.safeDump(filteredSwagger, { indent: 2 });
    var json = JSON.stringify(filteredSwagger, null, 2);

    return function swaggerDoc(req, res, next) {

      if (rawDocPath) {
        try {
          if (!req.path) { req.path = Url.parse(req.url).path }
          if (rawDocPath.indexOf(req.path) != -1) {
            var accept = req.headers['accept'];
            if (accept && accept.indexOf('yaml') != -1) {
              res.setHeader('Content-Type', 'application/yaml');
              return res.end(yaml);
            } else {
              res.setHeader('Content-Type', 'application/json');
              return res.end(json);
            }
          }
        } catch (err) {
          console.error(err.stack);
          return next(err);
        }
      }
      next();
    };

  };

  function filterKeysRecursive(object, regex) {
    if (_.isPlainObject(object)) {
      var result = {};
      _.each(object, function(value, key) {
        if (regex.test(key)) {
          result[key] = filterKeysRecursive(value, regex);
        }
      });
      return result;
    }
    return object;
  }

  // config options: https://www.npmjs.com/package/cors
  this.cors = function cors() {

    debug('cors config: %j', this.sysConfig.corsOptions);
    return CORS(this.sysConfig.corsOptions);
  };

  this.register = function register(app) {
    this.stack().forEach(function(mw) { app.use(mw); });
  };

  this.stack = function stack(includeErrorHandler) {

    includeErrorHandler = !!includeErrorHandler;

    var middlewares = [
      this.metadata(),
      this.security(),
      this.validator(),
      this.expressCompatibilityMW(),
      this.router()
    ];

    if (this.sysConfig.corsOptions) {
      middlewares.unshift(this.cors());
    }

    if (includeErrorHandler && this.sysConfig.mapErrorsToJson) {
      middlewares.unshift(this.jsonErrorHandler());
    }

    if (this.sysConfig.docEndpoints && this.sysConfig.docEndpoints.raw) {
      middlewares.push(this.swaggerDoc());
    }

    return middlewares;
  };
}

function expressCompatibility(req, res, next) {

  if (!req.query || !req.path) {
    var url = Url.parse(req.url, !req.query);
    req.path = url.path;
    req.query = url.query;
  }

  res.json = function(obj) {
    res.statusCode = res.statusCode || 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
  };

  if (!req.get) req.get = function(name) {
    return this.headers[name];
  };

  if (!res.set) { res.set = res.setHeader; }
  if (!res.get) { res.get = res.getHeader; }
  if (!res.status) {
    res.status = function(status) {
      res.statusCode = status;
    };
  }

  next();
}
