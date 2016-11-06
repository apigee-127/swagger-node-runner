'use strict';

var debug = require('debug')('swagger:swagger_raw');
var YAML = require('js-yaml');
var _ = require('lodash');

// default filter just drops all the x- labels
var DROP_SWAGGER_EXTENSIONS = /^(?!x-.*)/;

// default filter drops anything labeled x-private
var X_PRIVATE = ['x-private'];

module.exports = function create(fittingDef, bagpipes) {

  debug('config: %j', fittingDef);

  var filter = DROP_SWAGGER_EXTENSIONS;
  if (fittingDef.filter) {
    filter = new RegExp(fittingDef.filter);
  }
  debug('swagger doc filter: %s', filter);
  var privateTags = fittingDef.privateTags || X_PRIVATE;
  var filteredSwagger = filterKeysRecursive(bagpipes.config.swaggerNodeRunner.swagger, filter, privateTags);

  if (!filteredSwagger) { return next(null, ''); }

  // should this just be based on accept type?
  var yaml = YAML.safeDump(filteredSwagger, { indent: 2 });
  var json = JSON.stringify(filteredSwagger, null, 2);

  return function swagger_raw(context, next) {

    debug('exec');

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

function filterKeysRecursive(object, dropTagRegex, privateTags) {
  if (_.isPlainObject(object)) {
    if (_.any(privateTags, function(tag) { return object[tag]; })) {
      object = undefined;
    } else {
      var result = {};
      _.each(object, function(value, key) {
        if (dropTagRegex.test(key)) {
          var v = filterKeysRecursive(value, dropTagRegex, privateTags);
          if (v !== undefined) {
            result[key] = v;
          } else {
            debug('dropping object at %s', key);
            delete(result[key]);
          }
        } else {
            debug("dropping value at %s", key)
        }
      });
      return result;
    }
  } else if (Array.isArray(object) ) {
     object = object.reduce(function(reduced, value) {
        var v = filterKeysRecursive(value, dropTagRegex, privateTags);
        if (v !== undefined) reduced.push(v);
        return reduced
     }, [])
  }
  return object;
}
