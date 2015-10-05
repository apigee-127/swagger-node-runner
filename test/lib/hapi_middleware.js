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
