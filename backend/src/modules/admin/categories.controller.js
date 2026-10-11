// HTTP layer for FR-19. All request validation happens HERE (CLAUDE.md rule 5).
const { ok, fail } = require('../../lib/response');
const { isUuid } = require('./params');
const categoriesService = require('./categories.service');

const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 1000;
const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

/** GET /api/admin/categories */
async function list(req, res, next) {
  try {
    return ok(res, { categories: await categoriesService.listCategories() });
  } catch (e) {
    return next(e);
  }
}

/** POST /api/admin/categories  { name, description? } */
async function create(req, res, next) {
  const { name, description } = req.body || {};

  if (!isNonEmptyString(name) || name.trim().length > MAX_NAME_LENGTH) {
    return fail(res, 'name is required (max 100 characters)', 422, 'INVALID_NAME');
  }
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string' || description.length > MAX_DESCRIPTION_LENGTH) {
      return fail(res, 'description must be a string (max 1000 characters)', 422, 'INVALID_DESCRIPTION');
    }
  }

  try {
    const category = await categoriesService.createCategory({
      name: name.trim(),
      description: description ? description.trim() : undefined,
    });
    return ok(res, { category }, 201);
  } catch (e) {
    return next(e);
  }
}

/** PATCH /api/admin/categories/:id  { name?, description? } */
async function update(req, res, next) {
  if (!isUuid(req.params.id)) return fail(res, 'Category not found', 404, 'CATEGORY_NOT_FOUND');

  const body = req.body || {};
  const changes = {};

  if (Object.prototype.hasOwnProperty.call(body, 'name')) {
    if (!isNonEmptyString(body.name) || body.name.trim().length > MAX_NAME_LENGTH) {
      return fail(res, 'name must be 1..100 characters', 422, 'INVALID_NAME');
    }
    changes.name = body.name.trim();
  }
  if (Object.prototype.hasOwnProperty.call(body, 'description')) {
    if (body.description !== null && typeof body.description !== 'string') {
      return fail(res, 'description must be a string or null', 422, 'INVALID_DESCRIPTION');
    }
    changes.description = body.description ? body.description.trim() : null;
  }

  try {
    const category = await categoriesService.updateCategory(req.params.id, changes);
    return ok(res, { category });
  } catch (e) {
    return next(e);
  }
}

/** DELETE /api/admin/categories/:id */
async function remove(req, res, next) {
  if (!isUuid(req.params.id)) return fail(res, 'Category not found', 404, 'CATEGORY_NOT_FOUND');
  try {
    await categoriesService.deleteCategory(req.params.id);
    return ok(res, { deleted: true });
  } catch (e) {
    return next(e);
  }
}

module.exports = { list, create, update, remove };
