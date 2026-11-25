const { port, assertRuntimeConfig } = require('./config/env');
const app = require('./app');

// Fail fast on missing required configuration before accepting any traffic.
assertRuntimeConfig();

app.listen(port, () => console.log(`SCEMS API listening on http://localhost:${port}`));

// Event reminders (the day before, the hour before). Runs here, not in app.js, so tests never
// start a timer. Safe to run often: each reminder is sent once (see reminders.service.js).
const { runReminders } = require('./modules/attendee/reminders.service');
const REMINDER_EVERY_MS = 5 * 60 * 1000;
const sendReminders = () =>
  runReminders().catch((e) => console.error(`[reminders] ${e.message}`));
setTimeout(sendReminders, 30 * 1000).unref();
setInterval(sendReminders, REMINDER_EVERY_MS).unref();
