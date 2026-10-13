// FR-18 (manage users) and the user half of FR-22 (permanent delete).
// OWNER: Role 3. Input format is already validated by the controller; this file enforces the
// rules that need the database - duplicate email, self-protection, and the last-active-admin
// safety net.
const bcrypt = require('bcryptjs');
const prisma = require('../../lib/prisma');
const { HttpError } = require('../../lib/response');
const { bcryptRounds } = require('../../config/env');
const { USER_SELECT } = require('./shapes');

const NOT_FOUND = () => new HttpError(404, 'User not found', 'USER_NOT_FOUND');
const SELF = () =>
  new HttpError(409, 'You cannot perform this action on your own account', 'CANNOT_MODIFY_SELF');
const LAST_ADMIN = () =>
  new HttpError(409, 'This is the last active admin and must stay active', 'LAST_ADMIN_PROTECTED');

/** FR-18: list, searchable by name/email, filterable by role. */
async function listUsers({ role, q, page, limit }) {
  const where = {
    ...(role ? { role } : {}),
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: 'insensitive' } },
            { fullName: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: USER_SELECT,
      orderBy: [{ createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);
  return { users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

/**
 * FR-18: create an Organizer or Admin account. Hashing follows the exact same approach as
 * attendee/auth.service.js (bcrypt + the shared bcryptRounds) - not reused by calling that
 * service directly, because its register() always forces role ATTENDEE and is for
 * self-registration; this is an admin acting on someone else's behalf with a chosen role.
 */
async function createUser({ email, password, fullName, role }) {
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    throw new HttpError(409, 'An account with this email already exists', 'EMAIL_TAKEN');
  }

  return prisma.user.create({
    data: { email, passwordHash: await bcrypt.hash(password, bcryptRounds), fullName, role },
    select: USER_SELECT,
  });
}

/** How many ADMIN accounts are currently active - the number the last-admin rule protects. */
const activeAdminCount = () => prisma.user.count({ where: { role: 'ADMIN', isActive: true } });

/** Shared by setActive/changeRole/deleteUser: self and last-active-admin are always checked. */
async function guardAgainstSelfAndLastAdmin(actingAdminId, target) {
  if (target.id === actingAdminId) throw SELF();
  if (target.role === 'ADMIN' && target.isActive) {
    const count = await activeAdminCount();
    if (count <= 1) throw LAST_ADMIN();
  }
}

async function loadUser(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw NOT_FOUND();
  return user;
}

/** FR-18: activate/deactivate via isActive. */
async function setActive(actingAdminId, userId, isActive) {
  const target = await loadUser(userId);

  // Activating is always safe - only deactivating needs the self/last-admin protection.
  if (!isActive) await guardAgainstSelfAndLastAdmin(actingAdminId, target);

  return prisma.user.update({ where: { id: userId }, data: { isActive }, select: USER_SELECT });
}

/** FR-18: change a user's role. */
async function changeRole(actingAdminId, userId, role) {
  const target = await loadUser(userId);

  // Only a demotion away from ADMIN needs the protection; promoting is always safe.
  if (target.role === 'ADMIN' && role !== 'ADMIN') {
    await guardAgainstSelfAndLastAdmin(actingAdminId, target);
  }

  return prisma.user.update({ where: { id: userId }, data: { role }, select: USER_SELECT });
}

/**
 * FR-22: permanent delete. Users with events, registrations or feedback are refused with
 * 409 USER_HAS_DATA - deleting them would otherwise hit a foreign-key error at the database,
 * since only Notification and ChatSession cascade on user delete.
 */
async function deleteUser(actingAdminId, userId) {
  const target = await loadUser(userId);
  await guardAgainstSelfAndLastAdmin(actingAdminId, target);

  const [events, registrations, feedbacks] = await Promise.all([
    prisma.event.count({ where: { organizerId: userId } }),
    prisma.registration.count({ where: { userId } }),
    prisma.feedback.count({ where: { userId } }),
  ]);
  if (events > 0 || registrations > 0 || feedbacks > 0) {
    throw new HttpError(
      409,
      'This user has events, registrations or feedback and cannot be deleted',
      'USER_HAS_DATA'
    );
  }

  await prisma.user.delete({ where: { id: userId } });
}

module.exports = { listUsers, createUser, setActive, changeRole, deleteUser };
