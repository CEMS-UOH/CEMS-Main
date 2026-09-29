// Protects a route: requires a valid session cookie and an active user.
// On success it attaches the user (never the passwordHash) to req.user.
const prisma = require('../lib/prisma');
const { fail } = require('../lib/response');
const { COOKIE_NAME, verifyToken } = require('../lib/session');
const { PUBLIC_USER_FIELDS } = require('../lib/userFields');

module.exports = async function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return fail(res, 'Authentication required', 401, 'UNAUTHENTICATED');

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    // Expired, tampered with, or signed by a different secret - all the same to the client.
    return fail(res, 'Invalid or expired session', 401, 'UNAUTHENTICATED');
  }

  try {
    // Load from the database every request: a deactivated user or a changed role takes
    // effect immediately instead of when the token expires.
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: PUBLIC_USER_FIELDS,
    });

    if (!user) return fail(res, 'Invalid or expired session', 401, 'UNAUTHENTICATED');
    if (!user.isActive) return fail(res, 'This account is disabled', 403, 'ACCOUNT_INACTIVE');

    req.user = user;
    return next();
  } catch (e) {
    return next(e);
  }
};
