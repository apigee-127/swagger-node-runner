module.exports = {
  pipeInterface:       pipeInterface,
  middlewareInterface: middlewareInterface,
  pipeInterfaceNoBody: pipeInterfaceNoBody
}

function pipeInterface(ctx, next) {
  ctx.statusCode = 200;
  ctx.headers = { 
    'content-type': 'application/json',
    'x-interface': 'pipe'
  };
  next(null, { interface: 'pipe' });
}

function middlewareInterface(req, res, next) {
  res.setHeader('x-interface', 'middleware');
  res.json({ interface: "middleware" });
}

function pipeInterfaceNoBody(ctx, next) {
  ctx.statusCode = 200;
  ctx.headers = { 
    'content-type': 'application/json',
    'x-interface': 'pipe'
  };
  next(null, null);
}