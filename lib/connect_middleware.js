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

module.exports = init;

function init(runner) {
  return new Middleware(runner);
}

function Middleware(runner) {
  this.runner = runner;
  this.config = runner.config.swaggerNode;

  this.metadata = function metadata() {

    return this.runner.swaggerTools.swaggerMetadata();
  };

  this.security = function security() {

    debug('swagger security config: %j', this.config.securityHandlers);
    return this.runner.swaggerTools.swaggerSecurity(this.config.securityHandlers);
  };

  this.validator = function validator() {

    var validatorConfig = {
      validateResponse: !!this.config.validateResponse
    };
    debug('validator config: %j', validatorConfig);
    return this.runner.swaggerTools.swaggerValidator(validatorConfig);
  };

  this.router = function router() {

    var controllers = this.config.mockMode ? this.config.mockControllersDirs : this.config.controllersDirs;

    var routerConfig = {
      useStubs: !!this.config.mockMode,
      controllers: controllers
    };
    debug('swaggerTools router config: %j', routerConfig);
    return this.runner.swaggerTools.swaggerRouter(routerConfig);
  };

  this.jsonErrorHandler = function() {

    debug('jsonErrorHandler configured');
    return function jsonErrorHandler(err, req, res, next) {
      if (err && typeof err === 'object') {
        Object.defineProperty(err, 'message', {enumerable: true}); // include message property in response
        res.end(JSON.stringify(err));
      }
      next(err);
    };
  };

  this.expressCompatibilityMW = function expressCompatibilityMW() {
    debug('express compatibility middleware configured');
    return expressCompatibility;
  };

  this.swaggerDocs = function swaggerDocs() {

    debug('swagger docs functionality not yet implemented');
    // todo: this needs to be implemented
    return function(req, res, next) {
      next();
    };

    //var config = {
    //  apiDocs: '/api-docs'
    //};
    //return this.runner.swaggerTools.swaggerUi(config);
  };

  // enables request.swaggerNode.config
  this.helpers = function helpers() {

    debug('swaggerNode.config will be attached to requests');
    var swaggerNode = {
      config: this.runner.config
    };
    return function(req, res, next) {
      req.swaggerNode = swaggerNode;
      next();
    };
  };

  // config options: https://www.npmjs.com/package/cors
  this.cors = function cors() {

    debug('cors config: %j', this.config.corsOptions);
    //return CORS(Object.keys(this.config.corsOptions).length ? this.config.corsOptions : undefined);
    return CORS(this.config.corsOptions);
  };

  this.chain = function chain(options) {

    options = options || {};

    var middlewares = [
      this.metadata(),
      this.security(),
      this.validator(),
      this.helpers(),
      this.expressCompatibilityMW(),
      this.router(),
      this.swaggerDocs()
    ];

    if (this.config.corsOptions) {
      middlewares.unshift(this.cors());
    }

    if (options.mapErrorsToJson) {
      middlewares.push(this.jsonErrorHandler());
    }

    return createChain(middlewares);
  };
}

function createChain(middlewares) {

  if (!middlewares || middlewares.length < 1) {
    return function noOp(req, res, next) { next(); };
  }

  return function middlewareChain(req, res, next) {
    function createNext(middleware, index) {
      return function runNext(err) {
        if (err) { return next(err); }

        var nextIndex = index + 1;
        var nextMiddleware = middlewares[nextIndex] ? createNext(middlewares[nextIndex], nextIndex) : next;
        middleware(req, res, nextMiddleware);
      };
    }
    return createNext(middlewares[0], 0)();
  };
}

function expressCompatibility(req, res, next) {

  if (!req.query) {
    req.query = Url.parse(req.url, true).query;
  }

  res.json = function(obj) {
    if (!res.getHeader('Content-Type')) {
      res.setHeader('Content-Type', 'application/json');
    }
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
