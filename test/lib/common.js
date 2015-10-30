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
            message: 'Not a valid integer: Scott'
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
            message: 'Request validation failed: Parameter (name) value is required but was not provided',
            code: 'REQUIRED',
            failedValidation: true,
            path: [ 'paths', '/hello_form', 'get', 'parameters', '0' ]
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
          res.body.errors[0].should.eql('Invalid content type (text/plain). These are valid: application/json');
          done();
        });
    });
  });

  describe('security', function() {

    it('should deny when missing handler', function(done) {
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

  describe('raw bagpipe', function() {

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
};