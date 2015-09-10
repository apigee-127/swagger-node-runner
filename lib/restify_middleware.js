'use strict';

module.exports = init;

function init(runner) {
  return new Middleware(runner);
}

function Middleware(runner) {

  this.runner = runner;

  var connectMiddleware = runner.connectMiddleware();
  var chain = connectMiddleware.middleware();

  this.register = function register(app) {

    // swagger-tools currently requires ownership of request.query, so set it to undefined
    // todo: remove when no longer using swagger tools
    app.use(function(req, res, next) { req.query = undefined; next(); });

    // this bit of oddness forces Restify to route all requests through the middleware
    ['del', 'get', 'head', 'opts', 'post', 'put', 'patch']
      .forEach(function(method) {
        app[method]('.*', function(req, res, next) {
          chain(req, res, function(err) {
            if (err) { return next(err); }
            if (!res.finished) {
              res.statusCode = 404;
              res.end('Not found');
            }
          });
        });
      });

    connectMiddleware.register(app);
  };
}
