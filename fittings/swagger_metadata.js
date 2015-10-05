'use strict';

var debug = require('debug')('pipes:fittings');

module.exports = function create(fittingDef, pipes) {

  var middleware = pipes.config.swaggerNodeRunner.swaggerTools.swaggerMetadata();

  return function swagger_metadata(context, cb) {
    middleware(context.request, context.response, cb);
  }
};
