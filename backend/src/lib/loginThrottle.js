// Slows down password guessing on POST /api/attendee/auth/login (security NFR).
// In memory, no dependency.
//
// Counted per ACCOUNT (the normalized email), not per IP address: in the free hosting setup
// every request reaches the API through the site's proxy, so many users can share one IP and
// an IP limit would lock out a whole classroom. Per-account, an attacker gets at most
// MAX_FAILURES guesses per WINDOW_MS for any one account - a few hundred a day, hopeless
// against a real password.
//
// The trade-off: someone who knows your email can keep your login locked by failing on
// purpose. The lock lasts WINDOW_MS and lifts on its own; a successful login is not needed.
//
// State lives in this process, which is right for one backend instance (the current
// deployment). With several instances, move it to a shared store.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const MAX_TRACKED = 10_000;

/** email -> { count, firstAt, lockedUntil } */
const entries = new Map();

function prune(now) {
  if (entries.size <= MAX_TRACKED) return;
  for (const [key, entry] of entries) {
    if (entry.lockedUntil <= now && now - entry.firstAt > WINDOW_MS) entries.delete(key);
  }
  // Still too many (a flood of distinct emails): drop the oldest first.
  for (const key of entries.keys()) {
    if (entries.size <= MAX_TRACKED) break;
    entries.delete(key);
  }
}

/** May this account try to log in now? */
function check(email, now = Date.now()) {
  const entry = entries.get(email);
  if (entry && entry.lockedUntil > now) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.lockedUntil - now) / 1000) };
  }
  return { allowed: true };
}

/** A wrong password (or unknown email) for this account. */
function recordFailure(email, now = Date.now()) {
  let entry = entries.get(email);
  if (!entry || now - entry.firstAt > WINDOW_MS) {
    entry = { count: 0, firstAt: now, lockedUntil: 0 };
    entries.delete(email); // re-insert so Map order stays oldest-first for pruning
    entries.set(email, entry);
  }
  entry.count += 1;
  if (entry.count >= MAX_FAILURES) entry.lockedUntil = now + WINDOW_MS;
  prune(now);
}

/** The right password: start counting from zero again. */
function recordSuccess(email) {
  entries.delete(email);
}

/** Tests only. */
function reset() {
  entries.clear();
}

module.exports = { check, recordFailure, recordSuccess, reset, WINDOW_MS, MAX_FAILURES };
