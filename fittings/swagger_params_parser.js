'use strict';

var debug = require('debug')('swagger:swagger_params_parser');
var debugContent = require('debug')('swagger:content');
var path = require('path');
var helpers = require('../lib/helpers');

var bodyParser = require('body-parser');
var async = require('async');
var _ = require('lodash');

module.exports = function create(fittingDef, bagpipes) {

  debug('config: %j', fittingDef);

  _.defaults(fittingDef, {
    jsonOptions: {
      type: ['json', 'application/*+json']
    },
    urlencodedOptions: {
      extended: false
    },
    multerOptions: {
      inMemory: true
    },
    textOptions: {
      type: '*/*'
    }
  });

  return function swagger_params_parser(context, next) {
    debug('exec');

    var req = context.request;
    parseRequest(req, fittingDef, function(err) {
      if (err) { /* istanbul ignore next */ return next(err); }

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
  debugContent('parsing req.body for content-type: %s', req.headers['content-type']);
  async.series([
    function parseMultipart(cb) {
      if (multFields.length === 0) { return cb(); }
      var mult = require('multer')(fittingDef.multerOptions);
      mult.fields(multFields)(req, res, function(err) {
        if (err) { /* istanbul ignore next */
          if (err.code === 'LIMIT_UNEXPECTED_FILE') { err.statusCode = 400 }
          return cb(err);
        }
        if (req.files) {
          _.forEach(req.files, function(file, name) {
            req.files[name] = (Array.isArray(file) && file.length === 1) ? file[0] : file;
          });
        }
        debugContent('multer parsed req.body:', req.body);
        cb();
      });
    },
    function parseUrlencoded(cb) {
      if (req.body || !shouldParseForm) { return cb(); }
      if (skipParse(fittingDef.urlencodedOptions, req)) { return cb(); } // hack: see skipParse function
      var urlEncodedBodyParser = bodyParser.urlencoded(fittingDef.urlencodedOptions);
      urlEncodedBodyParser(req, res, cb);
    },
    function parseJson(cb) {
      if (req.body) {
        debugContent('urlencoded parsed req.body:', req.body);
        return cb();
      }
      if (skipParse(fittingDef.jsonOptions, req)) { return cb(); } // hack: see skipParse function
      bodyParser.json(fittingDef.jsonOptions)(req, res, cb);
    },
    function parseText(cb) {
      if (req.body) {
        debugContent('json parsed req.body:', req.body);
        return cb();
      }
      if (skipParse(fittingDef.textOptions, req)) { return cb(); } // hack: see skipParse function
      bodyParser.text(fittingDef.textOptions)(req, res, function(err) {
        if (req.body) { debugContent('text parsed req.body:', req.body); }
        cb(err);
      });
    }
  ], function finishedParseBody(err) {
    return cb(err);
  });

}

// hack: avoids body-parser issue: https://github.com/expressjs/body-parser/issues/128
var typeis = require('type-is').is;
function skipParse(options, req) {
  return typeof options.type !== 'function' && !Boolean(typeis(req, options.type));
}
