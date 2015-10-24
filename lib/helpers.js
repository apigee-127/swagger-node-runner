'use strict';

module.exports = {
  queryString: queryString,
  resolveParameters: resolveParameters
};

var qs = require('querystring');
var parseUrl = require('parseurl');
var debug = require('debug')('swagger');
var bodyParser = require('body-parser');
var async = require('async');
var _ = require('lodash');

var bodyParserOptions = {
  extended: false
};
var multerOptions = {
  inMemory: true
};
var textBodyParserOptions = {
  type: '*/*'
};

// side-effect: stores in query property on req
function queryString(req) {
  if (!req.query) {
    var url = parseUrl(req);
    req.query = (url.query) ? qs.parse(url.query) : {};
  }
  return req.query;
}

function resolveParameters(req, cb) {
  parseRequest(req, function(err) {
    if (err) { return cb(err); }

    var params = req.swagger.params = {};
    req.swagger.operation.parameterObjects.forEach(function(parameter) {
      params[parameter.name] = parameter.getValue(req); // note: does not check for errors here!
    });

    cb(null, params);
  });
}

function parseRequest(req, cb) {

  if (req.query && req.body && req.files) { return cb(); }

  var shouldParseBody = false;
  var shouldParseForm = false;
  var shouldParseQuery = false;
  var multFields = [];

  req.swagger.operation.parameterObjects.forEach(function(parameter) {

    switch (parameter.in) {

      case 'body':
        shouldParseBody = true;
        break;

      case 'formData':
        shouldParseForm = true;
        if (parameter.type === 'file') {
          multFields.push({ name: parameter.name });
        }
        break;

      case 'query':
        shouldParseQuery = true;
        break;
    }
  });

  if (!req.query && shouldParseQuery) { queryString(req); }

  if (req.body || (!shouldParseBody && !shouldParseForm)) { return cb(); }

  var res = null;
  async.series([
    function parseMultipart(cb) {
      if (multFields.length === 0) { return cb(); }
      var mult = require('multer')(multerOptions);
      mult.fields(multFields)(req, res, function(err) {
        if (err) { return cb(err); }
        if (req.files) {
          _.forEach(req.files, function(file, name) {
            req.files[name] = (Array.isArray(file) && file.length === 1) ? file[0] : file;
          });
        }
        cb();
      });
    },
    function parseForm(cb) {
      if (req.body || !shouldParseForm) { return cb(); }
      var urlEncodedBodyParser = bodyParser.urlencoded(bodyParserOptions);
      urlEncodedBodyParser(req, res, cb);
    },
    function parseJson(cb) {
      if (req.body) { return cb(); }
      bodyParser.json()(req, res, cb);
    },
    function parseText(cb) {
      if (req.body) { return cb(); }
      bodyParser.text(textBodyParserOptions)(req, res, cb);
    }
  ], function finishedParseBody(err) {
    return cb(err);
  });

}
