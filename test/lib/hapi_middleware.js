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

var SwaggerRunner = require('../..');

var DEFAULT_PROJECT_ROOT = path.resolve(__dirname, '..', 'assets', 'project');
var DEFAULT_PROJECT_CONFIG = {
  appRoot: DEFAULT_PROJECT_ROOT,
  controllersDirs: [],
  docEndpoints: { raw: '/swagger' }
};

describe('hapi_middleware', function() {

  var hapiMiddleware, createdRunner;

  before(function(done) {

    SwaggerRunner.create(DEFAULT_PROJECT_CONFIG, function(err, runner) {
      should.not.exist(err);

      createdRunner = runner;
      hapiMiddleware = runner.hapiMiddleware();
      should.exist(hapiMiddleware);

      done();
    });
  });

  describe('basics', function() {

    it('should expose config', function() {

      hapiMiddleware.sysConfig.should.be.an.Object;
      _.each(DEFAULT_PROJECT_CONFIG, function(value, key) {
        hapiMiddleware.sysConfig[key].should.eql(value);
      });
    });

    it('should expose runner', function() {

      hapiMiddleware.runner.should.equal(createdRunner);
    });

    it('should expose plugin', function() {

      should.exist(hapiMiddleware.plugin.register);
      hapiMiddleware.plugin.register.should.be.a.Function;
      var attrs = { name: 'swagger-node-runner', version: require('../../package.json').version };
      attrs.should.eql(hapiMiddleware.plugin.register.attributes);
    });

    it('should set config to config.swagger', function() {

      hapiMiddleware.sysConfig.should.eql(hapiMiddleware.runner.config.swagger);
    })
  });

  describe('register', function() {

    it('should call app.register with plugin', function(done) {
      var registerCalled = false;
      var app = {
        register: function(plugin, cb) {
          should.exist(plugin);
          plugin.register.should.be.a.Function;
          registerCalled = true;
          cb();
        }
      };
      app.register(app, function() {
        registerCalled.should.be.true;
        done();
      });
    });
  });

  describe('plugin', function() {

    it('register should register with hapi', function(done) {

      var extCalled = false;
      var server = {

        ext: function(event, funct) {
          extCalled = true;
          'onRequest'.should.eql(event);
          should(funct).be.a.Function;
        },

        on: function(event, funct) {
          extCalled.should.be.true;
          'request-error'.should.eql(event);
          should(funct).be.a.Function;
          done();
        }
      };

      hapiMiddleware.plugin.register(server, null, function() {
        should.fail; // should never get here
      });
    });

  })

});
