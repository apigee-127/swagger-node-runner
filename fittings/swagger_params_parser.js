'use strict';

var debug = require('debug')('swagger:swagger_params_parser');
var path = require('path');
var helpers = require('../lib/helpers');

var bodyParser = require('body-parser');
var async = require('async');
var _ = require('lodash');

module.exports = function create(fittingDef, bagpipes) {

  debug('config: %j', fittingDef);

  _.defaults(fittingDef, {
    bodyParserOptions: {
      extended: false
    },
    multerOptions: {
      inMemory: true
    },
    textBodyParserOptions: {
      type: '*/*'
    }
  });

  return function swagger_params_parser(context, next) {
    debug('exec');

    var req = context.request;
    parseRequest(req, fittingDef, function(err) {
      if (err) { return next(err); }

      var params = req.swagger.params = {};
      req.swagger.operation.parameterObjects.forEach(function(parameter) {
        params[parameter.name] = parameter.getValue(req); // note: we do not check for errors here
      });

      next(null, params);
    });
  }
};

function parseRequest(req, fittingDef, cb) {

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

  if (!req.query && shouldParseQuery) { helpers.queryString(req); }

  if (req.body || (!shouldParseBody && !shouldParseForm)) { return cb(); }

  var res = null;
  async.series([
    function parseMultipart(cb) {
      if (multFields.length === 0) { return cb(); }
      var mult = require('multer')(fittingDef.multerOptions);
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
      var urlEncodedBodyParser = bodyParser.urlencoded(fittingDef.bodyParserOptions);
      urlEncodedBodyParser(req, res, cb);
    },
    function parseJson(cb) {
      if (req.body) { return cb(); }
      bodyParser.json()(req, res, cb);
    },
    function parseText(cb) {
      if (req.body) { return cb(); }
      bodyParser.text(fittingDef.textBodyParserOptions)(req, res, cb);
    }
  ], function finishedParseBody(err) {
    return cb(err);
  });

}
