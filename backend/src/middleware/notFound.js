const { fail } = require('../lib/response');

module.exports = (req, res) => fail(res, `Route not found: ${req.method} ${req.path}`, 404, 'NOT_FOUND');
