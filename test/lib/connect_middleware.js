'use strict';

var should = require('should');
var request = require('supertest');
var path = require('path');
var _ = require('lodash');

var SwaggerRunner = require('../..');

var TEST_PROJECT_ROOT = path.resolve(__dirname, '..', 'assets', 'project');
var TEST_PROJECT_CONFIG = { appRoot: TEST_PROJECT_ROOT };
var MOCK_CONFIG = {
  appRoot: TEST_PROJECT_ROOT,
  bagpipes: {_router: {mockMode: true}}
};

describe.skip('connect_middleware', function() {

  describe('standard', function() {

    before(function(done) {
      createServer.call(this, TEST_PROJECT_CONFIG, done);
    });

    require('./common')();
  });

  describe('mock', function() {

    before(function(done) {
      createServer.call(this, MOCK_CONFIG, done);
    });

    require('./common_mock')();
  });
});

function createServer(config, done) {
  this.app = require('connect')();
  var self = this;
  SwaggerRunner.create(config, function(err, r) {
    if (err) {
      console.error(err);
      return done(err);
    }
    self.runner = r;
    var middleware = self.runner.connectMiddleware();
    middleware.register(self.app);
    done();
  });
}
