/****************************************************************************
 The MIT License (MIT)

 Copyright (c) 2015 Apigee Corporation

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
'use strict';

var should = require('should');
var utility = require('../../lib/utility');

describe('utility', function() {

  describe('createChain', function() {

    it('given null should return a noop', function(done) {

      var chain = utility.createChain(null);
      should(chain).be.a.Function;
      chain(null, null, function() {
        done();
      });
    });

    it('should return a function that calls all functions in the chain', function(done) {

      var request = {};
      var response = {};
      var f1Called = false, f2Called = false;

      function f1(req, res, next) {
        request.should.equal(req);
        response.should.equal(res);
        f1Called = true;
        next();
      }

      function f2(req, res, next) {
        request.should.equal(req);
        response.should.equal(res);
        f2Called = true;
        next();
      }

      var chain = utility.createChain([f1, f2]);
      should(chain).be.a.Function;
      chain(request, response, function() {
        f1Called.should.be.true;
        f2Called.should.be.true;
        done();
      });
    });
  });

  it('passed errors should exit chain immediately', function(done) {

    var request = {};
    var response = {};
    var f1Called = false, f2Called = false;

    function f1(req, res, next) {
      request.should.equal(req);
      response.should.equal(res);
      f1Called = true;
      next(new Error());
    }

    function f2(req, res, next) {
      request.should.equal(req);
      response.should.equal(res);
      f2Called = true;
      next();
    }

    var chain = utility.createChain([f1, f2]);
    should(chain).be.a.Function;
    chain(request, response, function(err) {
      f1Called.should.be.true;
      f2Called.should.be.false;
      should(err).be.an.Error;
      done();
    });
  });

});
