'use strict';

module.exports = init;

function init(runner) {

  // todo: figure out error handling
  if (runner.config.swagger.mapErrorsToJson) {
    debug('mapErrorsToJson option not currently available in Sails. Ignoring.');
  }

  var connectMiddleware = runner.connectMiddleware();

  // todo: silly... fix this later
  connectMiddleware.chain = function chain() {
    return connectMiddleware.middleware();
  };

  return connectMiddleware;
}
