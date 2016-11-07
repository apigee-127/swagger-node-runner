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
  
  describe('includeErrStack:true', function() {

    var context;
    beforeEach(function() {
      var err = new Error('this is a test');
      err.statusCode = 401;
      err.someAttr = 'value';
      context = {
        headers: {},
        error: err
      };
    });
    
    it('should allow the stack in the response body', function(done) {

      var jsonErrorHandler = json_error_handler({ includeErrStack: true });

      jsonErrorHandler(context, function(err, output) {
        should.not.exist(err);
        should.not.exist(context.error);

        var e;
        try {
          var body = JSON.parse(output);
          body.should.have.property('message', 'this is a test');
          body.should.have.property('someAttr','value');
          body.should.have.property('stack')
        } catch(x) { e = x }
        done(e)
      });
    })
  })

  describe('handle500Errors:true and error fails to stringify', function() { 
    var jsonErrorHandler;
    var mockErr;
    var context;
    var err;
    
    before(function() {
      jsonErrorHandler = json_error_handler({ handle500Errors: true });
      mockErr          = new Error('this is a test');
      mockErr.circular = mockErr; //force stringification error
    });
  
    describe('and context has a logger on request', function() {
      before(function(done) {
        context = {
          headers: {},
          request: {
            log: { 
              error: function() { this.lastErr = arguments } 
            }
          },
          error: mockErr
        };
        jsonErrorHandler(context, function(e) {
            err = e;
            done()
        });
      });
      it('should not fail', function() {
          should.not.exist(err);
      })
      it('should remove the error from the context', function() {
          should.not.exist(context.error);
      });
      it('should pass stringification error to the logger', function() {
          should.exist(context.request.log.lastErr, "error was not passed to log");
          should(context.request.log.lastErr.length).eql(3);
          should(context.request.log.lastErr[2]).equal(mockErr);
      });
    });
    
    describe('and context has no logger on req.log, but has on request.app.log', function() {
      before(function(done) {
        context = {
          headers: {},
          request: {
            app: {
              log: { 
                error: function() { this.lastErr = arguments } 
              }
            }
          },
          error: mockErr
        };
        jsonErrorHandler(context, function(e) {
            err = e;
            done()
        });
      });
      it('should not fail', function() {
          should.not.exist(err);
      })
      it('should remove the error from the context', function() {
          should.not.exist(context.error);
      });
      it('should pass stringification error to the logger', function() {
          should.exist(context.request.app.log.lastErr, "error was not passed to log");
          should(context.request.app.log.lastErr.length).eql(3);
          should(context.request.app.log.lastErr[2]).equal(mockErr);
      });
    });
    
    describe('and context has no logger on request, but has on response', function() {
      
      beforeEach(function(done) {
        context = {
          headers: {},
          response: {
            log: { 
              error: function() { this.lastErr = arguments } 
            }
          },
          error: mockErr
        };
        jsonErrorHandler(context, function(e) {
            err = e;
            done()
        });
        
      });

      it('should not fail', function() {
          should.not.exist(err);
      });
      it('should remove the error from the context', function() {
          should.not.exist(context.error);
      });
      it('should pass stringification error to the logger', function() {
          should.exist(context.response.log.lastErr, "error was not passed to log");
          should(context.response.log.lastErr.length).eql(3);
          should(context.response.log.lastErr[2]).equal(mockErr);
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
