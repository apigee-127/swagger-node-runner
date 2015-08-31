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

        // todo: fix these tests
        delete(runner.config.swagger.swaggerControllerPipe);
        delete(runner.config.swagger.pipes);
        runner.config.swagger.should.eql(DEFAULT_CONFIG.swagger);

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

        // todo: fix these tests
        delete(runner.config.swagger.swaggerControllerPipe);
        delete(runner.config.swagger.pipes);
        runner.config.swagger.should.eql(testConfig.swagger);

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

        // todo: fix these tests
        delete(runner.config.swagger.swaggerControllerPipe);
        delete(runner.config.swagger.pipes);
        runner.config.swagger.should.eql(testConfig.swagger);

        delete(process.env['swagger_test']);
        delete(process.env['swagger_test2_test3']);
        done();
      });
    });
  });
});

