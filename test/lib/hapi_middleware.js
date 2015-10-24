'use strict';

var should = require('should');
var path = require('path');
var _ = require('lodash');

var SwaggerRunner = require('../..');

var TEST_PROJECT_ROOT = path.resolve(__dirname, '..', 'assets', 'project');
var TEST_PROJECT_CONFIG = { appRoot: TEST_PROJECT_ROOT };

describe('hapi_middleware', function() {

  before(function(done) {
    var hapi = require('hapi');
    this.app = new hapi.Server();
    var self = this;
    SwaggerRunner.create(TEST_PROJECT_CONFIG, function(err, r) {
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
  });

  require('./common')();

});
