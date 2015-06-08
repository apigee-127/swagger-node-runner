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
var YAML = require('js-yaml');
var util = require('util');

var SwaggerRunner = require('../..');

var DEFAULT_PROJECT_ROOT = path.resolve(__dirname, '..', 'assets', 'project');
var DEFAULT_PROJECT_CONFIG = {
  appRoot: DEFAULT_PROJECT_ROOT,
  controllersDirs: [],
  docEndpoints: { raw: '/swagger' }
};

describe('connect_middleware', function() {

  function shouldBeConnectMiddleware(middleware) {
    middleware.should.be.a.Function;
    middleware.length.should.eql(3);
  }

  var connectMiddleware, createdRunner;

  before(function(done) {

    SwaggerRunner.create(DEFAULT_PROJECT_CONFIG, function(err, runner) {
      should.not.exist(err);

      createdRunner = runner;
      connectMiddleware = runner.connectMiddleware();
      should.exist(connectMiddleware);

      done();
    });
  });

  describe('basics', function() {

    it('should expose config', function() {

      connectMiddleware.sysConfig.should.be.an.Object;
      _.each(DEFAULT_PROJECT_CONFIG, function(value, key) {
        connectMiddleware.sysConfig[key].should.eql(value);
      });
    });

    it('should expose runner', function() {

      connectMiddleware.runner.should.equal(createdRunner);
    });

    it('should expose middleware functions', function() {

      ['metadata', 'security', 'validator', 'router', 'expressCompatibilityMW',
        'swaggerDoc', 'cors'].forEach(function(funcName) {
          shouldBeConnectMiddleware(connectMiddleware[funcName]());
        });

      //todo: connectMiddleware.register();

    });

    it('should set config to config.swagger', function() {

     connectMiddleware.sysConfig.should.eql(connectMiddleware.runner.config.swagger);
    })
  });

  describe('stack', function() {

    it('should return a default Array', function() {

      connectMiddleware.stack().should.be.an.Array
      connectMiddleware.stack().length.should.eql(6); // note: includes swaggerDoc MW

      connectMiddleware.stack().forEach(function(ea) {
        shouldBeConnectMiddleware(ea);
      });
    });

    // todo: config variations

  });


  describe('jsonErrorHandler', function() {

    var jsonErrorHandler;

    before(function() {
      jsonErrorHandler = connectMiddleware.jsonErrorHandler();
    });

    it('should be a connect middleware error handler', function() {

      jsonErrorHandler.should.be.a.Function;
      jsonErrorHandler.length.should.eql(4);
    });

    it('should emit appropriate json', function(done) {

      var err = new Error('this is a test');
      var headerSet = false;
      var res = {
        setHeader: function(key, value) {
          key.should.equal('Content-Type');
          value.should.equal('application/json');
          headerSet = true;
        },
        end: function(json) {
          json.should.eql(JSON.stringify({ message: err.message }));
          headerSet.should.be.true;
          done();
        }
      };
      jsonErrorHandler(err, null, res, function() {
        should.fail; // should never get here
      });
    });

    it('should do nothing if accidentally run as normal middleware', function(done) {

      jsonErrorHandler(null, null, function(err) {
        should.not.exist(err);
        done();
      });
    });

  });

  describe('expressCompatibility', function() {

    var expressMW;
    var url = 'http://localhost:10010/test?query1=val1&query2=val2';

    before(function() {
      expressMW = connectMiddleware.expressCompatibilityMW();
    });

    it('should add missing properties to request and response', function(done) {

      var requestProps = ['path', 'query', 'get'];
      var responseProps = ['json', 'get', 'set', 'status'];

      var request = { url: url };
      var response = {};

      expressMW(request, response, function() {
        request.should.have.properties(requestProps);
        response.should.have.properties(responseProps);

        done();
      });
    });

    it('should properly handle json()', function(done) {

      var setHeaderCalled = false;
      var testObject = { this: 'is', a: 'test' };

      var request = { url: url };
      var response = {
        setHeader: function(name, value) {
          name.should.eql('Content-Type');
          value.should.eql('application/json');
          setHeaderCalled = true;
        },
        end: function(value) {
          setHeaderCalled.should.be.true;
          response.statusCode.should.eql(200);
          JSON.parse(value).should.eql(testObject);
          done();
        }
      };

      expressMW(request, response, function() {
        response.json(testObject);
        should.fail; // should never get here
      });
    });

    it('request.get should get a header', function(done) {

      var request = { url: url, headers: { myheader: 'myvalue' } };
      var response = {};

      should.not.exist(request.get);
      expressMW(request, response, function() {
        request.get('myheader').should.eql(request.headers['myheader']);
        done();
      });
    });

    it('request.status should set status', function(done) {

      var request = { url: url };
      var response = {};

      should.not.exist(response.statusCode);
      expressMW(request, response, function() {
        response.status(200);
        response.statusCode.should.eql(200);
        done();
      });
    });
  });

  describe('swaggerDoc', function() {

    var swagger, swaggerDocMW, yaml, json;

    before(function() {
      swagger = connectMiddleware.runner.swagger;
      swaggerDocMW = connectMiddleware.swaggerDoc();
      var filteredSwagger = _.cloneDeep(swagger);
      delete(filteredSwagger.paths['/hello']['x-swagger-router-controller']);
      yaml = YAML.safeDump(filteredSwagger, { indent: 2 });
      json = JSON.stringify(filteredSwagger, null, 2);
    });

    it('should retrieve swagger json', function(done) {

      var request = {
        path: connectMiddleware.runner.config.swagger.docEndpoints.raw,
        headers: { }
      };
      var setHeaderCalled = false;
      var response = {
        setHeader: function(name, value) {
          name.should.eql('Content-Type');
          value.should.eql('application/json');
          setHeaderCalled = true;
        },
        end: function(value) {
          setHeaderCalled.should.be.true;
          should(json == value).be.true
          done();
        }
      };

      swaggerDocMW(request, response, function() {
        should.fail; // should never get here
      });
    });

    it('should retrieve swagger yaml', function(done) {

      var request = {
        path: connectMiddleware.runner.config.swagger.docEndpoints.raw,
        headers: { accept: 'application/yaml' }
      };
      var setHeaderCalled = false;
      var response = {
        setHeader: function(name, value) {
          name.should.eql('Content-Type');
          value.should.eql('application/yaml');
          setHeaderCalled = true;
        },
        end: function(value) {
          setHeaderCalled.should.be.true;
          should(yaml == value).be.true;
          done();
        }
      };

      swaggerDocMW(request, response, function() {
        should.fail; // should never get here
      });
    });

    it('should derive the path as needed', function(done) {

      var request = {
        url: util.format('http://localhost:10010%s', connectMiddleware.runner.config.swagger.docEndpoints.raw),
        headers: { accept: 'application/yaml' }
      };
      var response = {
        setHeader: function(name, value) {
        },
        end: function(value) {
          should(yaml == value).be.true;
          done();
        }
      };

      swaggerDocMW(request, response, function() {
        should.fail; // should never get here
      });
    });

    it('should be able to set the filter', function(done) {

      var config = _.clone(DEFAULT_PROJECT_CONFIG);
      config.docEndpoints = { raw: '/swagger', filter: '.*' };
      should.exist(swagger.paths['/hello']['x-swagger-router-controller']);
      var yaml = YAML.safeDump(swagger, { indent: 2 });

      SwaggerRunner.create(config, function(err, runner) {
        should.not.exist(err);

        var connectMiddleware = runner.connectMiddleware();
        swaggerDocMW = connectMiddleware.swaggerDoc();

        var request = {
          path: connectMiddleware.runner.config.swagger.docEndpoints.raw,
          headers: { accept: 'application/yaml' }
        };
        var setHeaderCalled = false;
        var response = {
          setHeader: function(name, value) {
            name.should.eql('Content-Type');
            value.should.eql('application/yaml');
            setHeaderCalled = true;
          },
          end: function(value) {
            setHeaderCalled.should.be.true;
            should(yaml == value).be.true;
            done();
          }
        };

        swaggerDocMW(request, response, function() {
          should.fail; // should never get here
        });
      });
    });

  });
});
