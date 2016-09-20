module.exports = function(dependencies){
  if (!dependencies.FooFactory)
    throw new Error('Foo Factory not found');
  var FooFactory = dependencies.FooFactory;

  return {
    hello: function(req, res) {
      var name = req.swagger.params.name.value;
      res.json(FooFactory.hello(name));
    }
  };
};
