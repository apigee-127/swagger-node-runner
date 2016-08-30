var should = require('should');
var json_error_handler = require('../../fittings/json_error_handler');
var _ = require('lodash');

describe('json_error_handler', function() {

  var jsonErrorHandler = json_error_handler({});

  var err = new Error('this is a test');
  Object.defineProperty(err, 'message', { enumerable: true });
  var errorString = JSON.stringify(err);

  describe('error in context', function() {

    var context;
    beforeEach(function() {
      context = {
        headers: {},
        error: new Error('this is a test')
      }
    });

    it('should set headers', function(done) {

      context.error.statusCode = 400;
      jsonErrorHandler(context, function(err) {
        should.not.exist(err);
        should.not.exist(context.error);
        'application/json'.should.eql(context.headers['Content-Type']);
        done();
      });
    });

    it('should set status code', function(done) {

      context.error.statusCode = 400;
      jsonErrorHandler(context, function(err) {
        should.not.exist(err);
        should.not.exist(context.error);
        context.statusCode.should.eql(400);
        done();
      });
    });

    it('should emit appropriate json', function(done) {

      context.error.statusCode = 400;

      jsonErrorHandler(context, function(err, output) {
        should.not.exist(err);
        should.not.exist(context.error);
        errorString.should.eql(output);
        done();
      });
    });

    it('should not handle unexpected errors by default', function(done) {

      jsonErrorHandler(context, function(err) {
        should.exist(err);
        should.exist(context.error);
        should.not.exist(context.headers['Content-Type']);
        context.statusCode.should.eql(500);
        done();
      });
    });

    it('should handle unexpected errors if configured to do so', function(done) {

      var jsonErrorHandler = json_error_handler({ handle500Errors: true });
      jsonErrorHandler(context, function(err, output) {
        should.not.exist(err);
        should.not.exist(context.error);
        'application/json'.should.eql(context.headers['Content-Type']);
        context.statusCode.should.eql(500);
        errorString.should.eql(output);
        done();
      });
    });
  });

  describe('error with statusCode in context', function() {

    var context;
    beforeEach(function() {
      var err = new Error('this is a test');
      err.statusCode = 401;
      context = {
        headers: {},
        error: err
      };
    });

    it('should set headers', function(done) {

      jsonErrorHandler(context, function(err) {
        should.not.exist(err);
        'application/json'.should.eql(context.headers['Content-Type']);
        done();
      });
    });

    it('should set status code', function(done) {

      jsonErrorHandler(context, function(err) {
        should.not.exist(err);
        context.statusCode.should.eql(401);
        done();
      });
    });

    it('should emit appropriate json', function(done) {

      var err = new Error('this is a test');
      Object.defineProperty(err, 'message', { enumerable: true });
      var errorString = JSON.stringify(err);

      jsonErrorHandler(context, function(err, output) {
        should.not.exist(err);
        should.not.exist(context.error);
        errorString.should.eql(output);
        done();
      });
    });
  });



  describe('no error in context', function() {

    var context;
    before(function() {
      context = {
        headers: {}
      }
    });

    it('should not set headers', function(done) {
      jsonErrorHandler(context, function(err) {
        should.not.exist(err);
        should.not.exist(context.headers['Content-Type']);
        done();
      });
    });

    it('should not set status code', function(done) {
      jsonErrorHandler(context, function(err) {
        should.not.exist(err);
        should.not.exist(context.statusCode);
        done();
      });
    });

    it('should not emit error json', function(done) {

      jsonErrorHandler(context, function(err, output) {
        should.not.exist(err);
        should.not.exist(output);
        done();
      });
    });
  });
  
  describe('context has a logger in response', function() {
    var context;
    beforeEach(function() {
      context = {
        headers: {},
        response: {
          log: { 
            error: function() { this.lastErr = arguments } 
          }
        },
        error: new Error('this is a test')
      };
      context.error.circular = context.error; //force stringification error
    });

    it('should pass stringification error to the logger', function(done) {
      jsonErrorHandler(context, function(err) {
        should.not.exist(err);
        should.not.exist(context.error);
        should.exist(context.response.log.error.lastErr, "error was not passed to log");
        should(context.response.log.error.lastErr.length).eql(3);
        should(context.request.log.error.lastErr[2]).equal(context.error);
        done();
      });
    });
  });
  
  describe('context has no logger in response, but has in request', function() {
    var context;
    beforeEach(function() {
      context = {
        headers: {},
        request: {
          log: { 
            error: function() { this.lastErr = arguments } 
          }
        },
        error: new Error('this is a test')
      };
      context.error.circular = context.error; //force stringification error
    });

    it('should pass stringification error to the logger', function(done) {
      jsonErrorHandler(context, function(err) {
        should.not.exist(err);
        should.not.exist(context.error);
        should.exist(context.request.log.error.lastErr, "error was not passed to log");
        should(context.request.log.error.lastErr.length).eql(3);
        should(context.request.log.error.lastErr[2]).equal(context.error);
        done();
      });
    });
  });
});
