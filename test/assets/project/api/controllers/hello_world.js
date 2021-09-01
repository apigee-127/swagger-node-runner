'use strict';

var util = require('util');

module.exports = {
  hello: hello,
  hello_array: hello_array,
  hello_body: hello_body,
  hello_file: hello_file,
  get: hello,
  multiple_writes: multiple_writes,
  hello_text_body: hello_text_body
};

function hello(req, res) {
  var name = req.swagger.params.name.value || 'stranger';
  var hello = util.format('Hello, %s!', name);
  res.json(hello);
}

function hello_array(req, res) {
  var hello = 'Hello';
  var names = req.swagger.params.names.value
  for (let n =0; n < names.length; n ++) {
    if (names.hasOwnProperty(n)) {
      if ((n + 1) === names.length){
        hello += " and "
      }else {
        hello += ", "
      }
      hello += names[n]
    }
  }
  res.json(hello);
}

function hello_body(req, res) {
  var name = req.swagger.params.nameRequest.value.name || 'stranger';
  var hello = util.format('Hello, %s!', name);
  res.json(hello);
}

function hello_file(req, res) {
  var name = req.swagger.params.name.value || 'stranger';
  var file = req.swagger.params.example_file.value;
  var hello = util.format('Hello, %s! Thanks for the %d byte file!', name, file.size);
  res.json(hello);
}

function multiple_writes(req, res) {
  res.write('hello');
  res.write('world');
  res.end('yo');
}

function hello_text_body(req, res) {
  var name = req.swagger.params.name.value || 'stranger';
  var hello = util.format('Hello, %s!', name);
  res.json(hello);
}
