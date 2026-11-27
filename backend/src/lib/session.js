// Session handling: a JWT carried in an httpOnly cookie.
// Shared by the attendee auth module and the requireAuth middleware - never reimplement this.
const jwt = require('jsonwebtoken');
const { jwtSecret, sessionDays, cookieDomain, isProduction } = require('../config/env');

const COOKIE_NAME = 'scems_session';
const MAX_AGE_MS = sessionDays * 24 * 60 * 60 * 1000;

// The token carries only an id and a role. requireAuth still loads the user from the
// database on every request, so a deactivated or role-changed user takes effect immediately
// instead of waiting for the token to expire.
const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, jwtSecret, { expiresIn: `${sessionDays}d` });

const verifyToken = (token) => jwt.verify(token, jwtSecret);

const cookieOptions = () => ({
  httpOnly: true, // not readable from JavaScript - protects against XSS token theft
  sameSite: 'lax', // sent on top-level navigation, blocked on cross-site POSTs (CSRF)
  secure: isProduction, // HTTPS only in production; must stay false for http://localhost
  path: '/',
  ...(cookieDomain ? { domain: cookieDomain } : {}),
});

const setSessionCookie = (res, token) =>
  res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: MAX_AGE_MS });

// Must use the same path/domain/flags as setSessionCookie, or the browser keeps the old cookie.
const clearSessionCookie = (res) => res.clearCookie(COOKIE_NAME, cookieOptions());

module.exports = { COOKIE_NAME, signToken, verifyToken, setSessionCookie, clearSessionCookie };
