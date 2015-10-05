'use strict';

var should = require('should');
var path = require('path');
var _ = require('lodash');

var SwaggerRunner = require('../..');

var DEFAULT_PROJECT_ROOT = path.resolve(__dirname, '..', 'assets', 'project');
var DEFAULT_PROJECT_CONFIG = {
  appRoot: DEFAULT_PROJECT_ROOT,
  controllersDirs: [],
  docEndpoints: { raw: '/swagger' },
  mapErrorsToJson: true
};

describe('connect_middleware', function() {

  function shouldBeConnectMiddleware(middleware) {
    middleware.should.be.a.Function;
    middleware.length.should.be.within(3, 4);
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

    it('should expose runner', function() {
      connectMiddleware.runner.should.equal(createdRunner);
    });

    it('should expose middleware function', function() {
      shouldBeConnectMiddleware(connectMiddleware.middleware());
    });

    it('should expose register function', function() {
      should.exist(connectMiddleware.register);
    });
  });

});
