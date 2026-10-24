// HTTP layer for FR-20. Nothing to validate: both endpoints take no input.
// requireAuth + requireRole('ADMIN') run first (admin/index.js mounts this module).
const { ok } = require('../../lib/response');
const analyticsService = require('./analytics.service');

/** GET /api/admin/analytics */
async function overview(req, res, next) {
  try {
    return ok(res, await analyticsService.getOverview());
  } catch (e) {
    return next(e);
  }
}

/** GET /api/admin/analytics/predictions */
async function predictions(req, res, next) {
  try {
    return ok(res, await analyticsService.getPredictions());
  } catch (e) {
    return next(e);
  }
}

module.exports = { overview, predictions };
