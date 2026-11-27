// HTTP layer for FR-10..FR-13 and FR-16, plus list/get (see events.service.js header).
// requireAuth + requireRole('ORGANIZER') run first (organizer/index.js), so req.user is set.
// All request validation happens HERE (CLAUDE.md rule 5) - events.service.js only does
// business rules that need the database.
const { ok, fail } = require('../../lib/response');
const {
  isUuid,
  parsePositiveInt,
  isPositiveInteger,
  isNonEmptyString,
  isHttpUrl,
  parseDate,
} = require('./params');
const eventsService = require('./events.service');

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_ATTACHMENTS = 10;
const EVENT_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

/** attachments is optional; when present, every entry must be a validated http(s) URL (FR-16). */
function readAttachments(value) {
  if (value === undefined) return { ok: true, attachments: undefined };
  if (!Array.isArray(value) || value.length > MAX_ATTACHMENTS) return { ok: false };
  if (!value.every(isHttpUrl)) return { ok: false };
  return { ok: true, attachments: value };
}

/**
 * Reads and validates the body fields common to create and edit.
 * `partial: true` (edit) only checks fields that are actually present; `partial: false`
 * (create) requires every field. Returns `{ error }` or `{ values }` with only the fields
 * that were present (so the service can tell "not sent" apart from "sent as empty").
 */
function readEventBody(body, { partial }) {
  const values = {};
  const need = (key) => !partial || Object.prototype.hasOwnProperty.call(body, key);

  if (need('title')) {
    if (!isNonEmptyString(body.title) || body.title.trim().length > MAX_TITLE_LENGTH) {
      return { error: ['title is required (max 200 characters)', 'INVALID_TITLE'] };
    }
    values.title = body.title.trim();
  }

  if (need('description')) {
    if (
      !isNonEmptyString(body.description) ||
      body.description.trim().length > MAX_DESCRIPTION_LENGTH
    ) {
      return { error: ['description is required (max 5000 characters)', 'INVALID_DESCRIPTION'] };
    }
    values.description = body.description.trim();
  }

  const startsAtGiven = Object.prototype.hasOwnProperty.call(body, 'startsAt');
  const endsAtGiven = Object.prototype.hasOwnProperty.call(body, 'endsAt');
  if (!partial || startsAtGiven || endsAtGiven) {
    // Both must arrive together so the service can compare them meaningfully.
    if (!partial && (!startsAtGiven || !endsAtGiven)) {
      return { error: ['startsAt and endsAt are required', 'INVALID_DATES'] };
    }
    if (partial && startsAtGiven !== endsAtGiven) {
      return { error: ['startsAt and endsAt must be changed together', 'INVALID_DATES'] };
    }
    const startsAt = parseDate(body.startsAt);
    const endsAt = parseDate(body.endsAt);
    if (!startsAt || !endsAt) {
      return { error: ['startsAt and endsAt must be real dates', 'INVALID_DATES'] };
    }
    values.startsAt = startsAt;
    values.endsAt = endsAt;
  }

  if (need('capacity')) {
    if (!isPositiveInteger(body.capacity)) {
      return { error: ['capacity must be a positive whole number', 'INVALID_CAPACITY'] };
    }
    values.capacity = body.capacity;
  }

  if (need('categoryId')) {
    if (!isUuid(body.categoryId)) return { error: ['Unknown category', 'INVALID_CATEGORY'] };
    values.categoryId = body.categoryId;
  }

  // venueId is always optional, even on create - an event need not have a venue yet.
  if (Object.prototype.hasOwnProperty.call(body, 'venueId') && body.venueId !== null) {
    if (!isUuid(body.venueId)) return { error: ['Unknown venue', 'INVALID_VENUE'] };
    values.venueId = body.venueId;
  } else if (Object.prototype.hasOwnProperty.call(body, 'venueId')) {
    values.venueId = null; // explicit null clears the venue on edit
  }

  if (Object.prototype.hasOwnProperty.call(body, 'imageUrl') && body.imageUrl !== null) {
    if (!isHttpUrl(body.imageUrl)) return { error: ['imageUrl must be an http(s) URL', 'INVALID_IMAGE_URL'] };
    values.imageUrl = body.imageUrl;
  } else if (Object.prototype.hasOwnProperty.call(body, 'imageUrl')) {
    values.imageUrl = null;
  }

  const attachmentsResult = readAttachments(body.attachments);
  if (!attachmentsResult.ok) {
    return {
      error: [`attachments must be at most ${MAX_ATTACHMENTS} http(s) URLs`, 'INVALID_ATTACHMENTS'],
    };
  }
  if (attachmentsResult.attachments !== undefined) values.attachments = attachmentsResult.attachments;

  return { values };
}

/** POST /api/organizer/events */
async function create(req, res, next) {
  const { values, error } = readEventBody(req.body || {}, { partial: false });
  if (error) return fail(res, error[0], 422, error[1]);

  try {
    const event = await eventsService.createEvent({ organizerId: req.user.id, ...values });
    return ok(res, { event }, 201);
  } catch (e) {
    return next(e);
  }
}

/** PATCH /api/organizer/events/:id */
async function update(req, res, next) {
  if (!isUuid(req.params.id)) return fail(res, 'Event not found', 404, 'EVENT_NOT_FOUND');

  const { values, error } = readEventBody(req.body || {}, { partial: true });
  if (error) return fail(res, error[0], 422, error[1]);

  try {
    const event = await eventsService.editEvent(req.user.id, req.params.id, values);
    return ok(res, { event });
  } catch (e) {
    return next(e);
  }
}

/** DELETE /api/organizer/events/:id */
async function remove(req, res, next) {
  if (!isUuid(req.params.id)) return fail(res, 'Event not found', 404, 'EVENT_NOT_FOUND');

  try {
    await eventsService.deleteEvent(req.user.id, req.params.id);
    return ok(res, { deleted: true });
  } catch (e) {
    return next(e);
  }
}

/** GET /api/organizer/events?status=&page=&limit= - not in the FR list, see events.service.js */
async function list(req, res, next) {
  const { status, page, limit } = req.query;

  if (status !== undefined && !EVENT_STATUSES.includes(status)) {
    return fail(res, 'status must be a real event status', 422, 'INVALID_FILTER');
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
    const result = await eventsService.listOwnEvents({
      organizerId: req.user.id,
      status,
      page: pageNumber,
      limit: pageSize,
    });
    return ok(res, result);
  } catch (e) {
    return next(e);
  }
}

/** GET /api/organizer/events/:id - not in the FR list, see events.service.js */
async function details(req, res, next) {
  if (!isUuid(req.params.id)) return fail(res, 'Event not found', 404, 'EVENT_NOT_FOUND');

  try {
    const event = await eventsService.getOwnEvent(req.user.id, req.params.id);
    return ok(res, { event });
  } catch (e) {
    return next(e);
  }
}

module.exports = { create, update, remove, list, details };
