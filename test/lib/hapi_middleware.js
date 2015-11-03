'use strict';

var should = require('should');
var path = require('path');
var _ = require('lodash');

var SwaggerRunner = require('../..');

var TEST_PROJECT_ROOT = path.resolve(__dirname, '..', 'assets', 'project');
var TEST_PROJECT_CONFIG = { appRoot: TEST_PROJECT_ROOT };
var MOCK_CONFIG = {
  appRoot: TEST_PROJECT_ROOT,
  bagpipes: {_router: {mockMode: true}}
};

describe('hapi_middleware', function() {

  describe('stanard', function() {
    before(function(done) {
      createServer.call(this, TEST_PROJECT_CONFIG, done);
    });

    require('./common')();
  });

  // todo: fix and reenable
  //describe('mock', function() {
  //
  //  before(function(done) {
  //    createServer.call(this, MOCK_CONFIG, done);
  //  });
  //
  //  require('./common_mock')();
  //});
});

function createServer(config, done) {
  var hapi = require('hapi');
  this.app = new hapi.Server();
  var self = this;
  SwaggerRunner.create(config, function(err, r) {
    if (err) { return done(err); }
    self.runner = r;
    var middleware = self.runner.hapiMiddleware();

    self.app.address = function() { return { port: 7236 }; };
    self.app.connection(self.app.address());

    self.app.register(middleware.plugin, function(err) {
      if (err) { return console.error('Failed to load plugin:', err); }
      self.app.start(function() {
        done();
      });
    });
  });
}
