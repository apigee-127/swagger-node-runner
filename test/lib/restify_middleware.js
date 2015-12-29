'use strict';

var should = require('should');
var request = require('supertest');
var path = require('path');
var _ = require('lodash');
var sinon = require('sinon');

var SwaggerRunner = require('../..');

var TEST_PROJECT_ROOT = path.resolve(__dirname, '..', 'assets', 'project');
var TEST_PROJECT_CONFIG = { appRoot: TEST_PROJECT_ROOT };
var MOCK_CONFIG = {
  appRoot: TEST_PROJECT_ROOT,
  bagpipes: {_router: {mockMode: true}}
};

describe('restify_middleware', function() {

  describe('standard', function() {

    before(function(done) {
      createServer.call(this, TEST_PROJECT_CONFIG, done);
    });

    after(function(done) {
      try {
        this.app.close(done);
      } catch (err) {
        done();
      }
    });

    require('./common')();
  });

  describe('mock', function() {
    var afterEvent;

    before(function(done) {
      createServer.call(this, MOCK_CONFIG, done);
      afterEvent = sinon.spy();
      this.app.on('after', afterEvent);
    });

    describe('after event', function () {
      it('should been emitted', function (done) {
        request(this.app)
          .get('/hello')
          .set('Accept', 'application/json')
          .expect(200)
          .end(function(err, res) {
            sinon.assert.called(afterEvent);
            done();
          });
      });
    });

    after(function(done) {
      try {
        this.app.close(done);
      } catch (err) {
        done();
      }
    });

    require('./common_mock')();
  });
});

function createServer(config, done) {
  this.app = require('restify').createServer();
  var self = this;
  SwaggerRunner.create(config, function(err, r) {
    if (err) {
      console.error(err);
      return done(err);
    }
    self.runner = r;
    var middleware = self.runner.restifyMiddleware();
    middleware.register(self.app);
    done();
  });
}
