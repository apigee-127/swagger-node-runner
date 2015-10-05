'use strict';

module.exports = init;

function init(runner) {
  return new Middleware(runner);
}

function Middleware(runner) {

  this.runner = runner;

  var connectMiddleware = runner.connectMiddleware();
  this.chain = connectMiddleware.middleware;
}
