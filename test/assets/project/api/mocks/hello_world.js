'use strict';

module.exports = {
  hello_mock: hello_mock
};

function hello_mock(req, res, next) {
  res.json({ message: 'mocking from the controller!'});
  next();
}
