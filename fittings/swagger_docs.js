'use strict';

var debug = require('debug')('pipes:fittings');
var YAML = require('js-yaml');
var _ = require('lodash');

// default filter just drops all the x- labels
var DROP_SWAGGER_EXTENSIONS = /^(?!x-.*)/;

module.exports = function create(fittingDef, pipes) {

  var filter = DROP_SWAGGER_EXTENSIONS;
  if (fittingDef.filter) {
    filter = new RegExp(fittingDef.filter);
  }
  debug('swagger doc filter: %s', filter);
  var filteredSwagger = filterKeysRecursive(pipes.config.swaggerNodeRunner.swagger, filter);

  // should this just be based on accept type?
  var yaml = YAML.safeDump(filteredSwagger, { indent: 2 });
  var json = JSON.stringify(filteredSwagger, null, 2);

  return function swagger_docs(context, next) {

    var req = context.request;
    var res = context.response;

    try {
      var accept = req.headers['accept'];
      if (accept && accept.indexOf('yaml') != -1) {
        res.setHeader('Content-Type', 'application/yaml');
        return res.end(yaml);
      } else {
        res.setHeader('Content-Type', 'application/json');
        return res.end(json);
      }
    } catch (err) {
      return next(err);
    }
  }
};

function filterKeysRecursive(object, regex) {
  if (_.isPlainObject(object)) {
    var result = {};
    _.each(object, function(value, key) {
      if (regex.test(key)) {
        result[key] = filterKeysRecursive(value, regex);
      }
    });
    return result;
  }
  return object;
}
