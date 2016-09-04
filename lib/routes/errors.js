/**
 * Default errors.
 */

var debug = require('debug')('reactive-bot:api');

exports.notfound = function (req, res) {
  res.status(404).send({ message: 'Resource not found' });
};

exports.error = function (err, req, res, next) {
  debug(err.stack);
  res.status(500).send({ message: 'Internal Server Error' });
};
