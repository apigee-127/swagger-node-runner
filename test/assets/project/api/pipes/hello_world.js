'use strict';
var util = require('util');

module.exports = {
  hello: hello,
  hello_body: hello_body,
  hello_file: hello_file,
  get: hello,
  self_multiple_writes : self_multiple_writes,
  hello_text_body: hello_text_body
};
  
function hello(ctx, next) {
  var req = ctx.request;
  var name = req.swagger.params.name.value || 'stranger';
  var hello = { message: util.format('Hello, %s!', name) };
  ctx.statusCode = 200;
  ctx.headers = { 'content-type' : 'application/json' };
  next(null, hello)
}

function hello_body(ctx, next) {
  var req = ctx.request;
  var name = req.swagger.params.nameRequest.value.name || 'stranger';
  var hello = { message: util.format('Hello, %s!', name) };
  ctx.statusCode = 200;
  ctx.headers = {};
  next(null, hello)
}

function hello_file(ctx, next) {
  var req = ctx.request;
  var name = req.swagger.params.name.value || 'stranger';
  var file = req.swagger.params.example_file.value;
  var hello = { message: util.format('Hello, %s!', name) };
  ctx.statusCode = 200;
  ctx.headers = {};
  next(null, hello)
}

function self_multiple_writes(ctx, next) {
  var res = ctx.response;
  res.write('hello');
  res.write('world');
  res.end('yo');
  next();
}

function hello_text_body(ctx, next) {
  var req = ctx.request;
  var name = req.swagger.params.name.value || 'stranger';
  var hello = { message: util.format('Hello, %s!', name) };
  ctx.statusCode = 200;
  ctx.headers = {};
  next(null, hello)
}