// Module: certificates - attendance certificates and their public verification.
// Mounted at /api/certificates. PUBLIC on purpose: a certificate's link (and the QR printed on
// it) lets anyone - an employer, a department - confirm it is genuine. The id is the booking's
// random UUID, so certificates cannot be listed or guessed.
const router = require('express').Router();
const { ok, fail } = require('../../lib/response');
const { isUuid } = require('../attendee/params');
const { getCertificate } = require('./certificates.service');

/** GET /api/certificates/:id */
router.get('/:id', async (req, res, next) => {
  if (!isUuid(req.params.id)) return fail(res, 'Certificate not found', 404, 'CERTIFICATE_NOT_FOUND');
  try {
    return ok(res, { certificate: await getCertificate(req.params.id) });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
