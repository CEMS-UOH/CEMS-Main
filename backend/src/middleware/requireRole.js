// Restricts a route to specific roles. Use AFTER requireAuth:
//   router.get('/users', requireAuth, requireRole('ADMIN'), handler)
const { fail } = require('../lib/response');

module.exports = function requireRole(...roles) {
  const allowed = roles.flat();

  return function roleGuard(req, res, next) {
    // Programming error, not a client error - requireAuth must run first.
    if (!req.user) return fail(res, 'Authentication required', 401, 'UNAUTHENTICATED');

    if (!allowed.includes(req.user.role)) {
      return fail(res, 'You do not have permission to perform this action', 403, 'FORBIDDEN');
    }
    return next();
  };
};
