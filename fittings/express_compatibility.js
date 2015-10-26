'use strict';

var debug = require('debug')('swagger:cors');
var Url = require('url');

module.exports = function create(fittingDef, bagpipes) {

  debug('config: %j', fittingDef);

  return function express_compatibility(context, cb) {
    debug('exec');
    expressCompatibility(context.request, context.response, cb);
  }
};

function expressCompatibility(req, res, next) {

  if (!req.query || !req.path) {
    var url = Url.parse(req.url, !req.query);
    req.path = url.path;
    req.query = url.query;
  }

  if (!res.json) {
    res.json = function(obj) {
      res.statusCode = res.statusCode || 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(obj));
    };
  }

  if (!req.get) req.get = function(name) {
    return this.headers[name];
  };

  if (!res.set) { res.set = res.setHeader; }
  if (!res.get) { res.get = res.getHeader; }
  if (!res.status) {
    res.status = function(status) {
      res.statusCode = status;
    };
  }

  next();
}
