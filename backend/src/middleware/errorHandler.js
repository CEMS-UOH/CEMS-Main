const { fail } = require('../lib/response');

// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  return fail(res, status >= 500 ? 'Internal server error' : err.message, status, err.code || 'ERROR');
};
