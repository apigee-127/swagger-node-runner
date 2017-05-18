var should = require('should');
var connect_middleware = require('../../lib/connect_middleware');


describe("connect_middleware", function() {
  it("should be a factory function that names 1 argument: runner", function() {
    should(connect_middleware).be.a.Function();
    connect_middleware.length.should.eql(1);        
  });
  
  describe("when called with a runner object", function() {
    var mockRunner = {};
    var mw_provider;
    
    before(function() {
      mw_provider = connect_middleware(mockRunner)
    })
    
    describe("the returned provider", function() {
      it("should be an initiated provider module", function() {
        should(mw_provider).be.an.Object();
      });
      
      it("should have member .runner - as the injected runner", function() {
        should(mw_provider.runner).equal(mockRunner);
      });
      
      it("should have method .middleware()", function() {
        should(mw_provider.middleware).be.a.Function();
        should(mw_provider.middleware.length).eql(0);
      });
      describe(".middleware()", function(){
        describe("when called", function() {
          it("should return a middleware function(req,res,next)")
          describe("the returned middleware", function() {
            describe("when used with request that matches no operation nor path", function() {
              it("should call next with no side effects")
            });
            
            describe("when used with request that matches no operation AND path has no 'x-swagger-pipe' AND method is not OPTIONS", function() {
              it("should not fail");
              it("should call next");
              describe("the yielded error", function() {
                it("should have .statusCode: 405");
                it("should have .status: 405 (for sails)");
                it("should have .message like 'Path [<path>] defined in Swagger, but <method> operation is not'")
                it("should have .allowedMethods");
                it("should setHeader('Allow') properly");
              });
            });
            
            describe("when used with request that matches no operation but path has 'x-swagger-pipe'", function() {
              it("TBD")
            });
            
            describe("when used with request that matches a concrete operation", function() {
              describe("and pipe NOT found", function() {
                it("should yield an error");
                describe("the yielded error", function() {
                  it("should have .message like 'No implementation found for this path'");
                  it("should have .statusCode: 405")
                })
              });
              describe("and pipe is found", function() {
                it("should play the pipe");
                describe("and pipe executes to _finnish", function() {
                  describe("and context.error is set by the pipe", function() {
                    it("should yield the error")
                  });
                  describe("and context.statusCode is set", function() {
                    it("should set response.statusCode");
                  });
                  describe("and context.headers is set", function() {
                    it("should set each header in context.headers");
                  });
                  describe("and context.output is set", function() {
                    describe("and response content-type is set", function() {
                      describe("to application/json", function() {
                        it("should emit response body as JSON serialization of context.output")
                        it("should call next");
                      });
                    })
                    describe("and response content-type is not set", function() {
                      describe("and request accept type set", function() {
                        describe("to application/json", function() {
                          it("should emit response body as JSON serialization of context.output")
                          it("should call next");
                        });
                      });
                      describe("and request accept type set to */* or not set", function() {
                        it("should use the default mimetype in operation.produces[0]");
                        it("should yield no error");
                      });
                    });
                  });
                  describe("and context.output is set not set", function() {
                    it("should yield no error  without writing anything");
                  });
                });
                
                describe("and pipe is not executed to _finnish", function() {
                  it("TBD");
                });                
                
                describe("and 'responseValidationError' event on the runner is watched", function() {
                  it("should place response validation hooks")
                });
                describe("and 'responseValidationError' event on the runner not watched", function() {
                  it("should not place response validation hooks")
                });
              });
            });
          });
        });
      });
      
      it("should have method .register(app)", function() {
        should(mw_provider.register).be.a.Function();
        should(mw_provider.register.length).eql(1);
      });
      describe(".register(app)", function() {
        describe("when called with a server instance", function() {
          it("TBD");
        });
      });
    });
  });  
});