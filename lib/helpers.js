'use strict';

module.exports = {
  queryString: queryString
};

var qs = require('qs');
var parseUrl = require('parseurl');
var debug = require('debug')('swagger');


// custom decoder function
var decode = function (str) {
    try {
        return decodeURIComponent(str);
    } catch (e) {
        return str;
    }
};

//qs module options
var qsOptions = { decoder : decode};

// side-effect: stores in query property on req
function queryString(req) {
  if (!req.query) {
    var url = parseUrl(req);
    req.query = (url.query) ? qs.parse(url.query, qsOptions) : {};
  }
  return req.query;
}
