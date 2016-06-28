'use strict';

var should = require('should');
var path = require('path');
var _ = require('lodash');

var SwaggerRunner = require('../..');

var TEST_PROJECT_ROOT = path.resolve(__dirname, '..', 'assets', 'project');
var TEST_PROJECT_CONFIG = {
  appRoot: TEST_PROJECT_ROOT,
  appPath: TEST_PROJECT_ROOT,
  http: {
    middleware: {
      order: [
        'router'
      ]
    }
  } 
};
var MOCK_CONFIG = {
  appRoot: TEST_PROJECT_ROOT,
  appPath: TEST_PROJECT_ROOT
};

describe('sails_middleware', function () {
  describe('standard', function () {
    before(function (done) {
      this.timeout(5000);
      createServer.call(this, TEST_PROJECT_CONFIG, done);
    });

    after(function (done) {
      this.sails.lower(done);
    });

    require('./common')();
  });

  describe('mock', function () {
    before(function (done) {
      this.timeout(5000);
      process.env['swagger_mockMode'] = true
      createServer.call(this, MOCK_CONFIG, done);
    });

    after(function (done) {
      this.sails.lower(done)
      delete process.env['swagger_mockMode'];
    });

    require('./common_mock')();
  });
});

function createServer (config, done) {
  var Sails = require('sails').constructor;
  var sails = new Sails();
  var self = this;
  this.sails = sails; // used to lower sails app during after
  sails.lift(config, function (err, sailsApp) {
    if (err) {
      return done(err);
    }
    self.app = sailsApp.hooks.http.app;
    self.runner = sailsApp.hooks['swagger-sails-hook'].runner;
    return done();
  });
};
