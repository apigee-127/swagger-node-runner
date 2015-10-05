var should = require('should');
var express_compatibility = require('../../fittings/express_compatibility');

describe('express_compatibility', function() {

  var expressCompatibility;
  var url = 'http://localhost:10010/test?query1=val1&query2=val2';

  before(function() {
    expressCompatibility = express_compatibility();
  });

  it('should add missing properties to request and response', function(done) {

    var requestProps = ['path', 'query', 'get'];
    var responseProps = ['json', 'get', 'set', 'status'];

    var request = { url: url };
    var response = {};
    var context = { request: request, response: response };

    expressCompatibility(context, function(err) {
      should.not.exist(err);
      context.request.should.have.properties(requestProps);
      context.response.should.have.properties(responseProps);

      done();
    });
  });

  it('should properly handle json()', function(done) {

    var setHeaderCalled = false;
    var testObject = { this: 'is', a: 'test' };

    var request = { url: url };
    var response = {
      setHeader: function(name, value) {
        name.should.eql('Content-Type');
        value.should.eql('application/json');
        setHeaderCalled = true;
      },
      end: function(value) {
        setHeaderCalled.should.be.true;
        response.statusCode.should.eql(200);
        JSON.parse(value).should.eql(testObject);
        done();
      }
    };
    var context = { request: request, response: response };

    expressCompatibility(context, function(err) {
      should.not.exist(err);
      response.json(testObject);
      should.fail; // should never get here
    });
  });

  it('request.get should get a header', function(done) {

    var request = { url: url, headers: { myheader: 'myvalue' } };
    var response = {};
    var context = { request: request, response: response };

    should.not.exist(request.get);
    expressCompatibility(context, function() {
      request.get('myheader').should.eql(request.headers['myheader']);
      done();
    });
  });

  it('request.status should set status', function(done) {

    var request = { url: url };
    var response = {};
    var context = { request: request, response: response };

    should.not.exist(response.statusCode);
    expressCompatibility(context, function() {
      response.status(200);
      response.statusCode.should.eql(200);
      done();
    });
  });
});
