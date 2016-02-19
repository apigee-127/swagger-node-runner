'use strict';

var should = require('should');
var request = require('supertest');
var path = require('path');
var _ = require('lodash');
var yaml = require('js-yaml');

module.exports = function() {

  it('should return from mock controller handler if exists', function(done) {
    request(this.app)
      .get('/hello_with_mock')
      .set('Accept', 'application/json')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
        should.not.exist(err);
        res.body.should.eql({ message: 'mocking from the controller!'});
        done();
      });
  });

  it('should return example if exists and no mock controller', function(done) {
    request(this.app)
      .get('/hello')
      .set('Accept', 'application/json')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
        should.not.exist(err);
        res.body.should.eql({ message: 'An example message' });
        done();
      });
  });

  it('should return example if exists based on accept header', function(done) {

    var YAML = require('js-yaml');
    var msg = YAML.safeDump({ message: 'A yaml example' }, { indent: 2 });

    request(this.app)
      .get('/hello')
      .set('Accept', 'application/x-yaml')
      .expect(200)
      .expect('Content-Type', 'application/x-yaml')
      .end(function(err, res) {
        should.not.exist(err);
        res.text.should.be.a.String;
        res.text.should.eql(msg);
        done();
      });
  });

  it('should return example based on _mockReturnStatus header', function(done) {
    request(this.app)
      .get('/hello_form')
      .send('name=Scott')
      .set('Accept', 'application/json')
      .set('_mockReturnStatus', '201')
      .expect(201)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
        should.not.exist(err);
        res.body.should.not.eql({ message: 'An example message' });
        res.body.should.not.eql({ message: 'mocking from the controller!'});
        res.body.should.have.property('string');
        res.body.string.should.be.a.String;
        res.body.should.have.property('integer');
        res.body.integer.should.be.a.Integer;
        done();
      });
  });

};