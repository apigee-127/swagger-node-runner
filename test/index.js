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

var SwaggerRunner = require('..');

var DEFAULT_PROJECT_ROOT = path.resolve(__dirname, 'assets', 'project');
var DEFAULT_PROJECT_CONFIG = { appRoot: DEFAULT_PROJECT_ROOT };

describe('index', function() {

  describe('instantiation', function() {

    it('should fail without config', function(done) {

      var config = undefined;
      SwaggerRunner.create(config, function(err, runner) {
        should.exist(err);
        err.message.should.eql('config.appRoot is required');
        done();
      });
    });

    it('should fail without config.appRoot', function(done) {

      var config = {};
      SwaggerRunner.create(config, function(err, runner) {
        should.exist(err);
        err.message.should.eql('config.appRoot is required');
        done();
      });
    });

    it('should fail with bad appRoot', function(done) {

      var config = { appRoot: 'asdf' };
      SwaggerRunner.create(config, function(err, runner) {
        should.exist(err);
        err.code.should.eql('ENOENT');
        done();
      });
    });
  });

  //it('should expose expected properties', function(done) {
  //
  //  SwaggerRunner.create(DEFAULT_PROJECT_CONFIG, function(err, runner) {
  //    should.not.exist(err);
  //    should.exist(runner);
  //
  //    runner.should.have.properties('resolveAppPath', 'connectMiddleware', 'expressMiddleware', 'restifyMiddleware',
  //                                  'sailsMiddleware', 'hapiMiddleware', 'config', 'swagger', 'swaggerTools');
  //    done();
  //  });
  //});
  //
  describe('config', function() {

    var DEFAULT_CONFIG = {
      swagger: {
        appRoot: DEFAULT_PROJECT_ROOT,
        validateResponse: true,
        controllersDirs: [path.resolve(DEFAULT_PROJECT_ROOT, 'api/controllers')],
        mockControllersDirs: [path.resolve(DEFAULT_PROJECT_ROOT, 'api/mocks')],
        configDir: path.resolve(DEFAULT_PROJECT_ROOT, 'config')
      }
    };

    it('should load default config', function(done) {

      SwaggerRunner.create(DEFAULT_PROJECT_CONFIG, function(err, runner) {
        should.not.exist(err);

        runner.config.should.eql(DEFAULT_CONFIG);

        done();
      });
    });

    it('should load a specified config dir', function(done) {

      var configDir = path.resolve(__dirname, 'assets/config');
      var config = _.cloneDeep(DEFAULT_PROJECT_CONFIG);
      config.configDir = configDir;
      SwaggerRunner.create(config, function(err, runner) {
        should.not.exist(err);

        var testConfig = _.cloneDeep(DEFAULT_CONFIG);
        testConfig.swagger.configDir = configDir;
        testConfig.test = true;

        runner.config.should.eql(testConfig);

        done();
      });
    });

    it('should load swagger config from env vars', function(done) {

      process.env['swagger_test'] = 'true';
      process.env['swagger_test2_test3'] = '2';
      SwaggerRunner.create(DEFAULT_PROJECT_CONFIG, function(err, runner) {
        should.not.exist(err);

        var testConfig = _.cloneDeep(DEFAULT_CONFIG);
        testConfig.swagger.test = true;
        testConfig.swagger.test2 = {
          test3: 2
        };

        runner.config.should.eql(testConfig);

        delete(process.env['swagger_test']);
        delete(process.env['swagger_test2_test3']);
        done();
      });
    });
  });
});

