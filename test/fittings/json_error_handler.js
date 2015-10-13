var should = require('should');
var json_error_handler = require('../../fittings/json_error_handler');
var _ = require('lodash');

describe('json_error_handler', function() {

  var jsonErrorHandler = json_error_handler();

  describe('error in context', function() {

    var context;
    beforeEach(function() {
      context = {
        headers: {},
        error: new Error('this is a test')
      }
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
        context.statusCode.should.eql(500);
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
});
