'use strict';

var debug = require('debug')('swagger:cors');
var CORS = require('cors');

// config options: https://www.npmjs.com/package/cors

module.exports = function create(fittingDef, bagpipes) {

  debug('config: %j', fittingDef);
  var middleware = CORS(fittingDef);

  return function cors(context, cb) {
    debug('exec');
    middleware(context.request, context.response, cb);
  }
};
