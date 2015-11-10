module.exports = {
  api_key: function failure(req, res, next) {
    if (req.swagger.params.name.value === 'Scott') {
      next();
    } else {
      next(new Error('no way!'));
    }
  }
};
