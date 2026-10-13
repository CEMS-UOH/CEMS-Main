// HTTP layer for FR-18 and the user half of FR-22. All request validation happens HERE
// (CLAUDE.md rule 5). requireAuth + requireRole('ADMIN') run first (admin/index.js).
const { ok, fail } = require('../../lib/response');
const { isEmail, normalizeEmail, isNonEmptyString } = require('../../lib/validate');
const { isUuid, parsePositiveInt } = require('./params');
const usersService = require('./users.service');

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 200;
const MAX_NAME_LENGTH = 120;
const ALL_ROLES = ['ATTENDEE', 'ORGANIZER', 'ADMIN'];
// FR-18 says "create Organizer/Admin accounts" - Attendees self-register through FR-01.
const CREATABLE_ROLES = ['ORGANIZER', 'ADMIN'];

/** GET /api/admin/users?role=&q=&page=&limit= */
async function list(req, res, next) {
  const { role, q, page, limit } = req.query;

  if (role !== undefined && !ALL_ROLES.includes(role)) {
    return fail(res, 'role must be ATTENDEE, ORGANIZER or ADMIN', 422, 'INVALID_FILTER');
  }
  const pageNumber = parsePositiveInt(page, 1);
  const pageSize = parsePositiveInt(limit, DEFAULT_PAGE_SIZE);
  if (pageNumber === null || pageSize === null || pageSize > MAX_PAGE_SIZE) {
    return fail(
      res,
      `page must be 1 or more and limit between 1 and ${MAX_PAGE_SIZE}`,
      422,
      'INVALID_PAGINATION'
    );
  }

  try {
    const result = await usersService.listUsers({
      role,
      q: typeof q === 'string' && q.trim() ? q.trim() : undefined,
      page: pageNumber,
      limit: pageSize,
    });
    return ok(res, result);
  } catch (e) {
    return next(e);
  }
}

/** POST /api/admin/users  { email, password, fullName, role } */
async function create(req, res, next) {
  const { email, password, fullName, role } = req.body || {};

  if (!isEmail(email)) return fail(res, 'Enter a valid email address', 422, 'INVALID_EMAIL');
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return fail(res, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`, 422, 'WEAK_PASSWORD');
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return fail(res, 'Password is too long', 422, 'WEAK_PASSWORD');
  }
  if (!isNonEmptyString(fullName) || fullName.trim().length > MAX_NAME_LENGTH) {
    return fail(res, 'Full name is required (max 120 characters)', 422, 'INVALID_NAME');
  }
  if (!CREATABLE_ROLES.includes(role)) {
    return fail(res, 'role must be ORGANIZER or ADMIN', 422, 'INVALID_ROLE');
  }

  try {
    const user = await usersService.createUser({
      email: normalizeEmail(email),
      password,
      fullName: fullName.trim(),
      role,
    });
    return ok(res, { user }, 201);
  } catch (e) {
    return next(e);
  }
}

/** POST /api/admin/users/:id/activate */
async function activate(req, res, next) {
  if (!isUuid(req.params.id)) return fail(res, 'User not found', 404, 'USER_NOT_FOUND');
  try {
    const user = await usersService.setActive(req.user.id, req.params.id, true);
    return ok(res, { user });
  } catch (e) {
    return next(e);
  }
}

/** POST /api/admin/users/:id/deactivate */
async function deactivate(req, res, next) {
  if (!isUuid(req.params.id)) return fail(res, 'User not found', 404, 'USER_NOT_FOUND');
  try {
    const user = await usersService.setActive(req.user.id, req.params.id, false);
    return ok(res, { user });
  } catch (e) {
    return next(e);
  }
}

/** POST /api/admin/users/:id/role  { role } */
async function changeRole(req, res, next) {
  if (!isUuid(req.params.id)) return fail(res, 'User not found', 404, 'USER_NOT_FOUND');
  const { role } = req.body || {};
  if (!ALL_ROLES.includes(role)) {
    return fail(res, 'role must be ATTENDEE, ORGANIZER or ADMIN', 422, 'INVALID_ROLE');
  }

  try {
    const user = await usersService.changeRole(req.user.id, req.params.id, role);
    return ok(res, { user });
  } catch (e) {
    return next(e);
  }
}

/** DELETE /api/admin/users/:id */
async function remove(req, res, next) {
  if (!isUuid(req.params.id)) return fail(res, 'User not found', 404, 'USER_NOT_FOUND');
  try {
    await usersService.deleteUser(req.user.id, req.params.id);
    return ok(res, { deleted: true });
  } catch (e) {
    return next(e);
  }
}

module.exports = { list, create, activate, deactivate, changeRole, remove };
