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
    delete(filteredSwagger.paths['/invalid_header']);

    // hokey algorithm, but at least it's different than the one it's testing
    var OMIT = ['x-swagger-router-controller', 'x-swagger-pipe', 'x-hidden', 'x-private'];
    _.forEach(filteredSwagger.paths, function(element, name) {
      filteredSwagger.paths[name] = _.omit(element, OMIT);
      _.forEach(filteredSwagger.paths[name], function(element, subName) {
        filteredSwagger.paths[name][subName] = _.omit(element, OMIT);
      });
    });

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

      var filteredSwagger = _.cloneDeep(swagger);
      delete(filteredSwagger.paths['/invalid_header']);
      should.exist(filteredSwagger.paths['/invalid_response_code'].get)
      var yaml = YAML.safeDump(filteredSwagger, { indent: 2 });

      output.should.eql(yaml);
      done();
    });
  });

  it('should be able to modify privateTags & apply to operations', function(done) {

    var context = {
      headers: {},
      request: {
        headers: { accept: 'application/yaml' }
      }
    };

    config = {
      filter: '.*',
      privateTags: [ 'x-private', 'x-hidden' ]
    };

    var bagpipes = { config: { swaggerNodeRunner: { swagger: swagger }}};
    var swaggerDoc = swagger_raw(config, bagpipes);

    swaggerDoc(context, function(err, output) {
      should.not.exist(err);
      'application/yaml'.should.eql(context.headers['Content-Type']);

      var filteredSwagger = _.cloneDeep(swagger);
      delete(filteredSwagger.paths['/invalid_header']);
      delete(filteredSwagger.paths['/invalid_response_code'].get);
      var yaml = YAML.safeDump(filteredSwagger, { indent: 2 });

      output.should.eql(yaml);
      done();
    });
  });
});
