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

var should = require('should');
var path = require('path');
var _ = require('lodash');
//var util = require('util');
//var proxyquire =  require('proxyquire');
//var tmp = require('tmp');
//var fs = require('fs');
//var yaml = require('yamljs');
//var request = require('supertest');

var SwaggerRunner = require('../..');

var DEFAULT_PROJECT_ROOT = path.resolve(__dirname, '..', 'assets', 'project');
var DEFAULT_PROJECT_CONFIG = { appRoot: DEFAULT_PROJECT_ROOT };

describe('connect_middleware', function() {

  var connectMiddleware;

  before(function(done) {

    SwaggerRunner.create(DEFAULT_PROJECT_CONFIG, function(err, runner) {
      should.not.exist(err);

      connectMiddleware = runner.connectMiddleware();
      should.exist(connectMiddleware);

      done();
    });
  });

  describe('instantiation', function() {

    function shouldBeConnectMiddleware(middleware) {
      middleware.should.be.a.function;
    }

    it('should expose functionality', function() {

      connectMiddleware.should.have.properties('runner', 'config', 'metadata', 'security', 'validator', 'router',
        'jsonErrorHandler', 'expressCompatibilityMW', 'swaggerDoc', 'helpers', 'cors', 'register', 'stack');
    });

    it('should set config to config.swaggerNode', function() {

     connectMiddleware.config.should.eql(connectMiddleware.runner.config.swaggerNode);
    })
  });

  //describe('')

});
