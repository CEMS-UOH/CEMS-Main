// HTTP layer for the read-only venues/categories lists. No input to validate.
const { ok } = require('../../lib/response');
const referenceService = require('./reference.service');

/** GET /api/organizer/venues */
async function venues(req, res, next) {
  try {
    return ok(res, { venues: await referenceService.listVenues() });
  } catch (e) {
    return next(e);
  }
}

/** GET /api/organizer/categories */
async function categories(req, res, next) {
  try {
    return ok(res, { categories: await referenceService.listCategories() });
  } catch (e) {
    return next(e);
  }
}

module.exports = { venues, categories };
