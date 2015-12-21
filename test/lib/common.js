'use strict';

var should = require('should');
var request = require('supertest');
var path = require('path');
var _ = require('lodash');
var yaml = require('js-yaml');

module.exports = function() {

  describe('controllers', function() {

    it('should execute', function(done) {
      request(this.app)
        .get('/hello')
        .set('Accept', 'application/json')
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.should.eql('Hello, stranger!');
          done();
        });
    });

    it('should execute without operationId', function(done) {
      request(this.app)
        .get('/hello_no_operationid')
        .set('Accept', 'application/json')
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.should.eql('Hello, stranger!');
          done();
        });
    });

    it('should get query parameter', function(done) {
      request(this.app)
        .get('/hello?name=Scott')
        .set('Accept', 'application/json')
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.should.eql('Hello, Scott!');
          done();
        });
    });

    it('should get formData parameter', function(done) {
      request(this.app)
        .get('/hello_form')
        .send('name=Scott')
        .set('Accept', 'application/json')
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.should.eql('Hello, Scott!');
          done();
        });
    });

    it('should get body parameter', function(done) {
      request(this.app)
        .get('/hello_body')
        .send({name: 'Scott'})
        .set('Accept', 'application/json')
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.should.eql('Hello, Scott!');
          done();
        });
    });

    it('should get file parameter', function(done) {
      request(this.app)
        .get('/hello_file')
        .field('name', 'Scott')
        .attach('example_file', path.resolve(__dirname, '../assets/example_file.txt'))
        .set('Accept', 'application/json')
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.should.eql('Hello, Scott! Thanks for the 7 byte file!');
          done();
        });
    });

    it('should get text body', function(done) {
      request(this.app)
        .get('/hello_text_body')
        .send('Scott')
        .type('text')
        .set('Accept', 'application/json')
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.should.eql('Hello, Scott!');
          done();
        });
    });

    it('should get a 404 for unknown path and operation', function(done) {
      request(this.app)
        .get('/not_there')
        .expect(404)
        .end(function(err, res) {
          should.not.exist(err);
          done();
        });
    });

    it('should get a 405 for known path and unknown operation', function(done) {
      request(this.app)
        .put('/hello')
        .expect(405)
        .end(function(err, res) {
          should.not.exist(err);
          done();
        });
    });

    it('should not get a 405 for known path and undeclared options operation', function(done) {
      request(this.app)
        .options('/hello')
        .expect(204)
        .end(function(err, res) {
          should.not.exist(err);
          done();
        });
    });

    it('should get a 500 for missing controller', function(done) {
      request(this.app)
        .put('/hello_missing_controller')
        .expect(405)
        .end(function(err, res) {
          should.not.exist(err);
          done();
        });
    });

    it('should get a 405 for missing operation function', function(done) {
      request(this.app)
        .put('/hello_missing_operation')
        .expect(405)
        .end(function(err, res) {
          should.not.exist(err);
          done();
        });
    });
  });

  describe('request validation', function() {

    it('should reject when invalid parameter type', function(done) {
      request(this.app)
        .put('/expect_integer?name=Scott')
        .set('Content-Type', 'application/json')
        .expect(400)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.message.should.eql('Validation errors');
          res.body.errors.should.be.an.Array;
          res.body.errors[0].should.have.properties({
            code: 'INVALID_REQUEST_PARAMETER',
            in: 'query',
            message: 'Invalid parameter (name): Expected type integer but found type string',
            name: 'name'
          });
          done();
        });
    });

    it('should reject when missing parameter', function(done) {
      request(this.app)
        .get('/hello_form')
        .send('xxx=Scott')
        .set('Accept', 'application/json')
        .expect(400)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.should.have.property('errors');
          res.body.message.should.eql('Validation errors');
          res.body.errors.should.be.an.Array;
          res.body.errors[0].should.have.properties({
            code: 'INVALID_REQUEST_PARAMETER',
            in: 'formData',
            message: 'Invalid parameter (name): Value is required but was not provided',
            name: 'name'
          });
          done();
        });
    });

    it('should reject when invalid content', function(done) {
      request(this.app)
        .put('/expect_integer')
        .set('Content-Type', 'text/plain')
        .expect(400)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.message.should.eql('Validation errors');
          res.body.errors.should.be.an.Array;
          res.body.errors[0].should.have.properties({
            code: 'INVALID_CONTENT_TYPE',
            message: 'Invalid Content-Type (text/plain).  These are supported: application/json'
          });
          done();
        });
    });
  });

  describe('security', function() {

    describe('loaded from path', function() {

      it('should deny when swagger-tools handler denies', function(done) {

        request(this.app)
          .get('/hello_secured')
          .set('Accept', 'application/json')
          .expect(403)
          .expect('Content-Type', /json/)
          .end(function(err, res) {
            should.not.exist(err);

            res.body.should.have.properties({
              code: 'server_error',
              message: 'no way!'
            });

            done();
          });
      });

      it('should allow when swagger-tools handler accepts', function(done) {

        request(this.app)
          .get('/hello_secured?name=Scott')
          .set('Accept', 'application/json')
          .expect(200)
          .expect('Content-Type', /json/)
          .end(function(err, res) {
            should.not.exist(err);
            res.body.should.eql('Hello, Scott!');

            done();
          });
      });
    });

    describe('explicit in config', function() {

      it('should deny when missing handler', function(done) {

        this.runner.securityHandlers = { };

        request(this.app)
          .get('/hello_secured')
          .set('Accept', 'application/json')
          .expect(403)
          .expect('Content-Type', /json/)
          .end(function(err, res) {
            should.not.exist(err);

            res.body.should.have.properties({
              code: 'server_error',
              message: 'Unknown security handler: api_key'
            });

            done();
          });
      });

      it('should deny when swagger-tools handler denies', function(done) {

        this.runner.securityHandlers = {
          api_key: function(req, secDef, key, cb) {
            cb(new Error('no way!'));
          }
        };

        request(this.app)
          .get('/hello_secured')
          .set('Accept', 'application/json')
          .expect(403)
          .expect('Content-Type', /json/)
          .end(function(err, res) {
            should.not.exist(err);

            res.body.should.have.properties({
              code: 'server_error',
              message: 'no way!'
            });

            done();
          });
      });

      it('should allow when swagger-tools handler accepts', function(done) {

        this.runner.securityHandlers = {
          api_key: function(req, secDef, key, cb) {
            cb();
          }
        };

        request(this.app)
          .get('/hello_secured')
          .set('Accept', 'application/json')
          .expect(200)
          .expect('Content-Type', /json/)
          .end(function(err, res) {
            should.not.exist(err);
            res.body.should.eql('Hello, stranger!');

            done();
          });
      });
    });
  });

  describe('non-controller routing', function() {

    describe('/swagger should respond', function() {

      it('with json', function(done) {
        request(this.app)
          .get('/swagger')
          .set('Accept', 'application/json')
          .expect(200)
          .expect('Content-Type', /json/)
          .end(function(err, res) {
            should.not.exist(err);
            res.body.swagger.should.eql('2.0');
            done();
          });
      });

      it('with yaml', function(done) {
        request(this.app)
          .get('/swagger')
          .expect(200)
          .set('Accept', 'text/yaml')
          .expect('Content-Type', /yaml/)
          .end(function(err, res) {
            should.not.exist(err);
            var swagger = yaml.safeLoad(res.text);
            swagger.swagger.should.eql('2.0');
            done();
          });
      });
    });

    describe('/pipe_on_get should respond', function() {

      it('to get operation', function(done) {
        request(this.app)
          .get('/pipe_on_get')
          .set('Accept', 'application/json')
          .expect(200)
          .expect('Content-Type', /json/)
          .end(function(err, res) {
            should.not.exist(err);
            res.body.swagger.should.eql('2.0');
            done();
          });
      });

      it('with 405 on put operation', function(done) {
        request(this.app)
          .put('/pipe_on_get')
          .set('Accept', 'application/json')
          .expect(405)
          .end(function(err, res) {
            should.not.exist(err);
            done();
          });
      });
    });

    it('empty path', function(done) {

      request(this.app)
        .put('/empty_path')
        .set('Accept', 'application/json')
        .expect(405)
        .end(function(err, res) {
          should.not.exist(err);
          done();
        });
    });

    it('no controller specified', function(done) {

      request(this.app)
        .get('/no_router_controller')
        .set('Accept', 'application/json')
        .expect(405)
        .end(function(err, res) {
          should.not.exist(err);
          done();
        });
    });
  });

  describe('response validation listeners', function() {

    afterEach(function() {
      this.runner.removeAllListeners();
    });

    it('should receive invalid response code errors', function(done) {

      this.runner.once('responseValidationError', function(validationResponse, req, res) {
        should.exist(validationResponse);
        should.exist(req);
        should.exist(res);
        validationResponse.errors.should.be.an.Array;
        validationResponse.errors.length.should.eql(1);
        validationResponse.errors[0].should.have.properties({
          code: 'INVALID_RESPONSE_CODE'
        });
        done();
      });

      request(this.app)
        .get('/invalid_response_code')
        .set('Accept', 'application/json')
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          should.not.exist(err);
        });
    });

    it('should receive invalid header errors', function(done) {

      this.runner.once('responseValidationError', function(validationResponse, req, res) {
        should.exist(validationResponse);
        should.exist(req);
        should.exist(res);
        validationResponse.errors.should.be.an.Array;
        validationResponse.errors.length.should.eql(1);
        validationResponse.errors[0].should.eql({
          code: 'INVALID_RESPONSE_HEADER',
          errors:
          [ { code: 'INVALID_TYPE',
            message: 'Expected type integer but found type string',
            path: [] } ],
            message: 'Invalid header (content-type): Expected type integer but found type string',
          name: 'content-type',
          path: []
        });
        done();
      });

      request(this.app)
        .get('/invalid_header')
        .set('Accept', 'application/json')
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          should.not.exist(err);
        });
    });

    it('should receive schema validation errors', function(done) {

      this.runner.once('responseValidationError', function(validationResponse, req, res) {
        should.exist(validationResponse);
        should.exist(req);
        should.exist(res);
        validationResponse.errors.should.be.an.Array;
        validationResponse.errors.length.should.eql(1);
        validationResponse.errors[0].should.eql({
          code: 'INVALID_RESPONSE_BODY',
          errors:
            [ { code: 'INVALID_TYPE',
              message: 'Expected type object but found type string',
              path: [] } ],
          message: 'Invalid body: Expected type object but found type string',
          path: []
        });
        done();
      });

      request(this.app)
        .get('/hello')
        .set('Accept', 'application/json')
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          should.not.exist(err);
        });
    });

    it('should not validate multiple writes', function(done) {

      var responseValidationError;

      this.runner.once('responseValidationError', function(validationResponse, req, res) {
        responseValidationError = true;
      });

      request(this.app)
        .get('/multiple_writes')
        .set('Accept', 'application/json')
        .expect(200)
        .end(function(err, res) {
          should.not.exist(err);
          process.nextTick(function() {
            should.not.exist(responseValidationError);
            done();
          });
        });
    });
  });
};
