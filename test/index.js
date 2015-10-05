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
  });

  describe('config', function() {

    var DEFAULT_CONFIG = {
      swagger: {
        appRoot: DEFAULT_PROJECT_ROOT,
        validateResponse: true,
        controllersDirs: [path.resolve(DEFAULT_PROJECT_ROOT, 'api/controllers')],
        mockControllersDirs: [path.resolve(DEFAULT_PROJECT_ROOT, 'api/mocks')]
      }
    };

    it('should load default config', function(done) {

      SwaggerRunner.create(DEFAULT_PROJECT_CONFIG, function(err, runner) {
        should.not.exist(err);

        var swagger = _.clone(runner.config.swagger);
        delete(swagger.swaggerControllerPipe);
        delete(swagger.bagpipes);
        swagger.should.eql(DEFAULT_CONFIG.swagger);

        done();
      });
    });
  });
});

