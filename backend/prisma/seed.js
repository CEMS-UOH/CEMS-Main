// SCEMS database seed - OWNER: Role 2 (Backend + Database)
//
// Idempotent: safe to run as many times as you like. Nothing is duplicated and an
// existing ADMIN password is never overwritten.
//
// Run with:  npm run db:seed        (loads .env from the repo root)
//
// Required env vars (see .env.example):
//   SEED_ADMIN_EMAIL     the first ADMIN account's email
//   SEED_ADMIN_PASSWORD  its password, min 8 chars - hashed with bcrypt, never stored raw
const bcrypt = require('bcryptjs');
const prisma = require('../src/lib/prisma');
const { bcryptRounds } = require('../src/config/env');

const CATEGORIES = [
  { name: 'Workshop', description: 'Hands-on practical sessions' },
  { name: 'Seminar', description: 'Talks and presentations' },
  { name: 'Competition', description: 'Contests and challenges' },
  { name: 'Cultural', description: 'Cultural and social events' },
  { name: 'Sports', description: 'Sporting events and tournaments' },
];

const VENUES = [
  { name: 'Main Auditorium', building: 'College of Computer Science', location: 'Ground floor', capacity: 300 },
  { name: 'Lecture Hall A', building: 'College of Engineering', location: 'First floor', capacity: 120 },
  { name: 'Sports Complex', building: 'Student Activities Center', location: 'Outdoor field', capacity: 500 },
];

async function seedCategories() {
  let created = 0;
  for (const c of CATEGORIES) {
    // Category.name is @unique, so upsert is naturally idempotent.
    const before = await prisma.category.findUnique({ where: { name: c.name } });
    await prisma.category.upsert({
      where: { name: c.name },
      update: { description: c.description },
      create: c,
    });
    if (!before) created += 1;
  }
  console.log(`categories: ${created} created, ${CATEGORIES.length - created} already present`);
}

async function seedVenues() {
  let created = 0;
  for (const v of VENUES) {
    // Venue has no unique column, so match on name + building before inserting.
    const existing = await prisma.venue.findFirst({ where: { name: v.name, building: v.building } });
    if (existing) {
      await prisma.venue.update({ where: { id: existing.id }, data: v });
    } else {
      await prisma.venue.create({ data: v });
      created += 1;
    }
  }
  console.log(`venues: ${created} created, ${VENUES.length - created} already present`);
}

async function seedAdmin() {
  const email = (process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || '';

  if (!email || !password) {
    throw new Error(
      'SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env before seeding the ADMIN user.'
    );
  }
  if (password.length < 8) {
    throw new Error('SEED_ADMIN_PASSWORD must be at least 8 characters.');
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    // Never reset an existing admin's password - it may have been changed deliberately.
    await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN', isActive: true },
    });
    console.log(`admin: ${email} already existed (role/isActive re-asserted, password left unchanged)`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, bcryptRounds),
      fullName: 'System Administrator',
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log(`admin: created ${email}`);
}

async function main() {
  console.log('seeding SCEMS database...');
  await seedCategories();
  await seedVenues();
  await seedAdmin();
  console.log('seed complete.');
}

main()
  .catch((e) => {
    console.error(`seed failed: ${e.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
