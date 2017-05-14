var should = require('should');
var SwaggerRunner = require('../../');
var swagger_raw = require('../../fittings/swagger_raw');
var fs = require('fs');
var YAML = require('js-yaml');
var path = require('path');
var _ = require('lodash');
var request = require('supertest');


describe('swagger_raw', function() {

  var swagger, yaml, json, swaggerDoc;

  before(function() {
    var data = fs.readFileSync(path.resolve(__dirname, '../assets/project/api/swagger/swagger.yaml'), 'utf8');
    swagger = YAML.safeLoad(data);

    var bagpipes = { config: { swaggerNodeRunner: { swagger: swagger }}};
    swaggerDoc = swagger_raw({}, bagpipes);

    var filteredSwagger = filterDoc(swagger);
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

    var config = {
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

    var config = {
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
  
  describe("end-to-end", function() {
    var app, filteredSwagger;
    before(function(done) {
      var data = fs.readFileSync(path.resolve(__dirname, '../assets/project/api/swagger/swagger.yaml'), 'utf8');
      var attrs;
     
      //brings the size of the doc to
      // yaml -  125425
      // json -  120868
      var swagger = inflateDocWithAVeryBigTypeDefinition(YAML.safeLoad(data));
      
      filteredSwagger = filterDoc(swagger);
      yaml = YAML.safeDump(filteredSwagger, { indent: 2 });
      
      app = createServer(swagger, done)
    });
    
    describe('when requested with accept:application/json', function() {
      it('should yield the document as json', function(done) {
        request(app)
          .put('/swagger')
          .set('accept', 'application/json')
          .expect(200)
          .expect('Content-Type', /json/)
          .end(function(err, res) {
            should.not.exist(err);
            
            should(res.body).eql(filteredSwagger);
            
            done();
          })
      })
    });

    describe('when requested with accept:application/yaml', function() {
      it('should yield the document as json', function(done) {
        request(app)
          .put('/swagger')
          .set('accept', 'application/yaml')
          .expect(200)
          .expect('Content-Type', /yaml/)
          .end(function(err, res) {
            should.not.exist(err);
            
            should(res.text).eql(yaml);
            
            done();
          })
      })
    })    
  })
});


function createServer(swagger, done) {
  var TEST_PROJECT_ROOT = path.resolve(__dirname, '..', 'assets', 'project');
  var config = { 
    appRoot: TEST_PROJECT_ROOT,
    swagger: swagger
  };

  var app = require('connect')();
  SwaggerRunner.create(config, function(err, r) {
    if (err) {
      console.error(err);
      return done(err);
    }
    r.connectMiddleware().register(app);
    done();
  });
  return app
}

function filterDoc(swagger) {
    var filteredSwagger = _.cloneDeep(swagger);
    delete(filteredSwagger.paths['/invalid_header']);
    delete(filteredSwagger.paths['/hello'].get.parameters[0]['x-remove-me'])

    // hokey algorithm, but at least it's different than the one it's testing
    var OMIT = ['x-swagger-router-controller', 'x-swagger-pipe', 'x-hidden', 'x-private', 'x-controller-interface'];
    _.forEach(filteredSwagger.paths, function(element, name) {
      filteredSwagger.paths[name] = _.omit(element, OMIT);
      _.forEach(filteredSwagger.paths[name], function(element, subName) {
        filteredSwagger.paths[name][subName] = _.omit(element, OMIT);
      });
    });
    
    return filteredSwagger  
}

function inflateDocWithAVeryBigTypeDefinition(swagger) {
  var props;
  swagger.definitions.veryVeryBigCompoundType = {
    type: "object",
    properties: props = {
      some_string: {
        type: "string",
        description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
      }
    }
  };

  var i = 200;
  while(--i) props["some_string" + i] = _.clone(props.some_string);
  
  return swagger
}
