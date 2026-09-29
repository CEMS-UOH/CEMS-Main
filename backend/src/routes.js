const router = require('express').Router();
const prisma = require('./lib/prisma');
const { ok, fail } = require('./lib/response');

// Health checks - used by the frontend, Docker, and monitoring
router.get('/health', (req, res) => ok(res, { status: 'up', time: new Date().toISOString() }));

router.get('/health/db', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return ok(res, { database: 'up' });
  } catch (e) {
    return fail(res, 'Database unreachable', 503, 'DB_DOWN');
  }
});

// Feature modules - each one is owned by a single role (see CLAUDE.md)
router.use('/api/attendee', require('./modules/attendee'));
router.use('/api/organizer', require('./modules/organizer'));
router.use('/api/admin', require('./modules/admin'));
router.use('/api/chatbot', require('./modules/chatbot'));

module.exports = router;
