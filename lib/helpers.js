'use strict';

module.exports = {
  queryString: queryString
};

var qs = require('qs');
var parseUrl = require('parseurl');
var debug = require('debug')('swagger');

// side-effect: stores in query property on req
function queryString(req) {
  if (!req.query) {
    var url = parseUrl(req);
    req.query = (url.query) ? qs.parse(url.query) : {};
  }
  return req.query;
}
