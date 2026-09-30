// Auth business logic for FR-01 (registration) and FR-02 (login).
// OWNER: Role 2. Input is already validated by the controller.
const bcrypt = require('bcryptjs');
const prisma = require('../../lib/prisma');
const { HttpError } = require('../../lib/response');
const { bcryptRounds } = require('../../config/env');
const { PUBLIC_USER_FIELDS } = require('../../lib/userFields');

// A real bcrypt hash of a value nobody can log in with. When the email does not exist we
// still run one bcrypt comparison against this, so a missing account and a wrong password
// take roughly the same time and cannot be told apart by timing.
const DUMMY_HASH = bcrypt.hashSync('unusable-placeholder-password', 10);

/**
 * FR-01: self-registration. The role is ALWAYS ATTENDEE - it is never taken from the
 * client. Organizers and Admins are created by an Admin (FR-18), not through this route.
 */
async function register({ email, password, fullName }) {
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    throw new HttpError(409, 'An account with this email already exists', 'EMAIL_TAKEN');
  }

  return prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, bcryptRounds),
      fullName,
      role: 'ATTENDEE',
    },
    select: PUBLIC_USER_FIELDS,
  });
}

/**
 * FR-02: login for every role. A wrong email and a wrong password produce the SAME error,
 * so the endpoint cannot be used to discover which emails are registered.
 */
async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });

  const matches = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !matches) {
    throw new HttpError(401, 'Incorrect email or password', 'INVALID_CREDENTIALS');
  }

  // Checked only after the password is proven correct, so a disabled account is not
  // revealed to someone who does not already know the credentials.
  if (!user.isActive) {
    throw new HttpError(403, 'This account is disabled', 'ACCOUNT_INACTIVE');
  }

  // Strip passwordHash by rebuilding from the shared public shape.
  const safe = {};
  for (const key of Object.keys(PUBLIC_USER_FIELDS)) safe[key] = user[key];
  return safe;
}

module.exports = { register, login };
