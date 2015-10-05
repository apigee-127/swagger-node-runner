'use strict';

var debug = require('debug')('pipes:fittings');
var YAML = require('js-yaml');
var _ = require('lodash');

// default filter just drops all the x- labels
var DROP_SWAGGER_EXTENSIONS = /^(?!x-.*)/;

module.exports = function create(fittingDef, bagpipes) {

  var filter = DROP_SWAGGER_EXTENSIONS;
  if (fittingDef.filter) {
    filter = new RegExp(fittingDef.filter);
  }
  debug('swagger doc filter: %s', filter);
  var filteredSwagger = filterKeysRecursive(bagpipes.config.swaggerNodeRunner.swagger, filter);

  // should this just be based on accept type?
  var yaml = YAML.safeDump(filteredSwagger, { indent: 2 });
  var json = JSON.stringify(filteredSwagger, null, 2);

  return function swagger_raw(context, next) {

    var req = context.request;

    var accept = req.headers['accept'];
    if (accept && accept.indexOf('yaml') != -1) {
      context.headers['Content-Type'] = 'application/yaml';
      next(null, yaml);
    } else {
      context.headers['Content-Type'] = 'application/json';
      next(null, json);
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
