// Read-only venues/categories for the create-event form. Not FR-numbered on its own - the
// task asked for it explicitly as a companion to FR-10.
// OWNER: Role 3.
const prisma = require('../../lib/prisma');
const { VENUE_SELECT, CATEGORY_SELECT } = require('./shapes');

const listVenues = () => prisma.venue.findMany({ select: VENUE_SELECT, orderBy: { name: 'asc' } });

const listCategories = () =>
  prisma.category.findMany({ select: CATEGORY_SELECT, orderBy: { name: 'asc' } });

module.exports = { listVenues, listCategories };
