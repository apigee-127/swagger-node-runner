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

module.exports = init;

function init(runner) {
  return new Middleware(runner);
}

function Middleware(runner) {
  this.runner = runner;
  this.config = runner.config.swaggerNode;

  this.metadata = function metadata() {

    //return this.runner.swaggerTools.swaggerMetadata(this.runner.swagger);
    return this.runner.swaggerTools.swaggerMetadata();
  };

  this.security = function security() {

    return this.runner.swaggerTools.swaggerSecurity(this.config.securityHandlers);
  };

  this.validator = function validator() {

    var validatorConfig = {
      validateResponse: !!this.config.validateResponse
    };
    return this.runner.swaggerTools.swaggerValidator(validatorConfig);
  };

  this.router = function router() {

    debug('config: %j', this.config);
    var controllers = this.config.mockMode ? this.config.mockControllersDirs : this.config.controllersDirs;

    var routerConfig = {
      useStubs: this.config.mockMode,
      controllers: controllers
    };
    debug('swaggerTools router config: %j', routerConfig);
    return this.runner.swaggerTools.swaggerRouter(routerConfig);
  };

  this.expressCompatibilityMW = function expressCompatibilityMW() {
    return expressCompatibility;
  };

  // enables request.swaggerNode.config
  this.helpers = function helpers() {

    var swaggerNode = {
      config: this.runner.config
    };
    return function(req, res, next) {
      req.swaggerNode = swaggerNode;
      next();
    };
  };

  this.chain = function chain() {

    return createChain([
      this.metadata(),
      this.security(),
      this.validator(),
      this.helpers(),
      this.expressCompatibilityMW(),
      this.router()
    ]);
  };
}

function createChain(middlewares) {

  if (!middlewares || middlewares.length < 1) {
    return function(req, res, next) { next(); };
  }

  return function(req, res, next) {
    function createNext(middleware, index) {
      return function(err) {
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
