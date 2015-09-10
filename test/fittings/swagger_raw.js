var should = require('should');
var swagger_raw = require('../../fittings/swagger_raw');
var fs = require('fs');
var YAML = require('js-yaml');
var path = require('path');
var _ = require('lodash');

describe('swagger_raw', function() {

  var swagger, yaml, json, swaggerDoc;

  before(function() {
    var data = fs.readFileSync(path.resolve(__dirname, '../assets/project/api/swagger/swagger.yaml'), 'utf8');
    swagger = YAML.safeLoad(data);

    var bagpipes = { config: { swaggerNodeRunner: { swagger: swagger }}};
    swaggerDoc = swagger_raw({}, bagpipes);

    var filteredSwagger = _.cloneDeep(swagger);
    delete(filteredSwagger.paths['/hello']['x-swagger-router-controller']);
    yaml = YAML.safeDump(filteredSwagger, { indent: 2 });
    json = JSON.stringify(filteredSwagger, null, 2);
  });

  it('should retrieve swagger json', function(done) {

    var context = {
      headers: {},
      request: {
        headers: { }
      }
    };

    swaggerDoc(context, function(err, output) {
      should.not.exist(err);
      'application/json'.should.eql(context.headers['Content-Type']);
      output.should.eql(json);
      done();
    });
  });

  it('should retrieve swagger yaml', function(done) {

    var context = {
      headers: {},
      request: {
        headers: { accept: 'application/yaml' }
      }
    };

    swaggerDoc(context, function(err, output) {
      should.not.exist(err);
      'application/yaml'.should.eql(context.headers['Content-Type']);
      output.should.eql(yaml);
      done();
    });
  });

  it('should be able to set the filter', function(done) {

    var context = {
      headers: {},
      request: {
        headers: { accept: 'application/yaml' }
      }
    };

    config = {
      filter: '.*'
    };

    var bagpipes = { config: { swaggerNodeRunner: { swagger: swagger }}};
    var swaggerDoc = swagger_raw(config, bagpipes);

    swaggerDoc(context, function(err, output) {
      should.not.exist(err);
      'application/yaml'.should.eql(context.headers['Content-Type']);

      var yaml = YAML.safeDump(swagger, { indent: 2 });
      output.should.eql(yaml);
      done();
    });
  });
});
