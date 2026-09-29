// HTTP layer for FR-01 / FR-02. All request validation happens HERE (CLAUDE.md rule 5).
const { ok, fail } = require('../../lib/response');
const { isEmail, normalizeEmail, isNonEmptyString } = require('../../lib/validate');
const { setSessionCookie, clearSessionCookie, signToken } = require('../../lib/session');
const authService = require('./auth.service');

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 200; // bcrypt only reads the first 72 bytes; cap the input anyway
const MAX_NAME_LENGTH = 120;

/** POST /api/attendee/auth/register */
async function register(req, res, next) {
  const { email, password, fullName } = req.body || {};

  if (!isEmail(email)) {
    return fail(res, 'Enter a valid email address', 422, 'INVALID_EMAIL');
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return fail(
      res,
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      422,
      'WEAK_PASSWORD'
    );
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return fail(res, 'Password is too long', 422, 'WEAK_PASSWORD');
  }
  if (!isNonEmptyString(fullName)) {
    return fail(res, 'Full name is required', 422, 'INVALID_NAME');
  }
  if (fullName.trim().length > MAX_NAME_LENGTH) {
    return fail(res, 'Full name is too long', 422, 'INVALID_NAME');
  }

  try {
    // Note `role` is not read from the body at all - self-registration is always ATTENDEE.
    const user = await authService.register({
      email: normalizeEmail(email),
      password,
      fullName: fullName.trim(),
    });
    return ok(res, { user }, 201);
  } catch (e) {
    return next(e);
  }
}

/** POST /api/attendee/auth/login */
async function login(req, res, next) {
  const { email, password } = req.body || {};

  // Deliberately one generic message: never hint at which field was wrong.
  if (!isEmail(email) || typeof password !== 'string' || password.length === 0) {
    return fail(res, 'Incorrect email or password', 401, 'INVALID_CREDENTIALS');
  }

  try {
    const user = await authService.login({ email: normalizeEmail(email), password });
    setSessionCookie(res, signToken(user));
    return ok(res, { user });
  } catch (e) {
    return next(e);
  }
}

/** POST /api/attendee/auth/logout */
function logout(req, res) {
  clearSessionCookie(res);
  return ok(res, { loggedOut: true });
}

/** GET /api/attendee/auth/me - requireAuth has already loaded and vetted the user */
function me(req, res) {
  return ok(res, { user: req.user });
}

module.exports = { register, login, logout, me };
