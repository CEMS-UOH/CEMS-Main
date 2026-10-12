// HTTP layer for FR-01 / FR-02. All request validation happens HERE (CLAUDE.md rule 5).
const { ok, fail } = require('../../lib/response');
const {
  isEmail,
  normalizeEmail,
  isNonEmptyString,
  isPhone,
  normalizePhone,
} = require('../../lib/validate');
const { setSessionCookie, clearSessionCookie, signToken } = require('../../lib/session');
const authService = require('./auth.service');

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 200; // bcrypt only reads the first 72 bytes; cap the input anyway
const MAX_NAME_LENGTH = 120;
const MAX_ORGANIZATION_LENGTH = 120;

// Who may sign themselves up. ADMIN is never on this list: admins are created by the seed
// or by another admin (FR-18), never through the public form.
const SELF_REGISTER_ROLES = ['ATTENDEE', 'ORGANIZER'];

/** POST /api/attendee/auth/register */
async function register(req, res, next) {
  const { email, password, fullName, phone, organization } = req.body || {};
  // Absent means the default, an Attendee - the original FR-01 behaviour.
  const role = req.body?.role === undefined ? 'ATTENDEE' : req.body.role;

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
  if (!SELF_REGISTER_ROLES.includes(role)) {
    return fail(res, 'Choose Attendee or Organizer', 422, 'INVALID_ROLE');
  }

  // An Organizer leaves contact details for the Admin who will review their event requests:
  // a phone number (required) and the club or department they represent (optional).
  // An Attendee is never asked for either, and anything sent is ignored.
  let contact = { phone: null, organization: null };
  if (role === 'ORGANIZER') {
    if (!isPhone(phone)) {
      return fail(res, 'Enter a valid phone number', 422, 'INVALID_PHONE');
    }
    if (organization !== undefined && organization !== null && typeof organization !== 'string') {
      return fail(res, 'Organization must be text', 422, 'INVALID_ORGANIZATION');
    }
    const trimmed = typeof organization === 'string' ? organization.trim() : '';
    if (trimmed.length > MAX_ORGANIZATION_LENGTH) {
      return fail(res, 'Organization is too long', 422, 'INVALID_ORGANIZATION');
    }
    contact = { phone: normalizePhone(phone), organization: trimmed || null };
  }

  try {
    const user = await authService.register({
      email: normalizeEmail(email),
      password,
      fullName: fullName.trim(),
      role,
      ...contact,
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
