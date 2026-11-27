// SCEMS demo data - four approved public events, so the site has something to show.
//
// For demos and local development only. It is a SEPARATE command from `db:seed` on purpose:
// the real seed (reference data + first admin) is safe everywhere, while these events are
// sample content that must never be loaded into production by accident.
//
// Idempotent: run it as often as you like. The demo organizer and the four events are matched
// and refreshed, never duplicated - and each run moves the events back into the future, so the
// feed does not go empty as the weeks pass.
//
// Run with:  npm run db:seed:demo     (loads .env from the repo root; run db:seed first)
//
// Required env vars (see .env.example):
//   SEED_DEMO_ORGANIZER_EMAIL     the demo organizer's email
//   SEED_DEMO_ORGANIZER_PASSWORD  its password, min 8 chars - hashed with bcrypt, never stored raw
//
// Cover images are public photos on Unsplash, linked by address (no file is stored here).
// If one ever stops loading, the event card falls back to its built-in placeholder.
const bcrypt = require('bcryptjs');
const prisma = require('../src/lib/prisma');
const { bcryptRounds } = require('../src/config/env');

const image = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&h=675&q=80`;

// Campus time is UTC+3 all year (no daylight saving), the same convention the API uses.
const CAMPUS_UTC_OFFSET_HOURS = 3;

/** A moment `daysFromNow` days ahead, at hh:mm campus time. */
function campusTime(daysFromNow, hour, minute = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  date.setUTCHours(hour - CAMPUS_UTC_OFFSET_HOURS, minute, 0, 0);
  return date;
}

// category / venue are the names created by `db:seed`.
const EVENTS = [
  {
    title: 'ورشة عمل: الذكاء الاصطناعي العام (AGI) — أين وصلنا؟',
    description:
      'ورشة تعريفية تشرح ما المقصود بالذكاء الاصطناعي العام، وما الفرق بينه وبين الأنظمة التي نستخدمها اليوم.\n\n' +
      'نستعرض أبرز ما تحقق في السنوات الأخيرة، والتحديات التقنية التي ما زالت قائمة، وما يعنيه ذلك لطلاب الحاسب والهندسة.\n\n' +
      'الورشة مفتوحة لجميع التخصصات ولا تتطلب خبرة سابقة.',
    category: 'Workshop',
    venue: 'Lecture Hall A',
    capacity: 80,
    startsAt: () => campusTime(9, 16),
    endsAt: () => campusTime(9, 18),
    imageUrl: image('photo-1677442136019-21780ecad995'),
  },
  {
    title: 'ورشة عمل: بناء تطبيقات بالنماذج اللغوية الكبيرة (LLM)',
    description:
      'ورشة عملية تتعلم فيها كيف تعمل النماذج اللغوية الكبيرة، وكيف تبني عليها تطبيقًا بسيطًا خطوة بخطوة.\n\n' +
      'نغطي كتابة التعليمات (Prompts)، وربط النموذج ببياناتك، وأهم الأخطاء الشائعة وكيف تتجنبها.\n\n' +
      'يُفضّل إحضار حاسبك المحمول. معرفة أساسيات البرمجة كافية.',
    category: 'Workshop',
    venue: 'Main Auditorium',
    capacity: 120,
    startsAt: () => campusTime(12, 17),
    endsAt: () => campusTime(12, 19, 30),
    imageUrl: image('photo-1555949963-aa79dcee981c'),
  },
  {
    title: 'هاكاثون الأفكار التقنية',
    description:
      'يوم كامل من العمل الجماعي: كوّن فريقك، اختر مشكلة من واقع الحياة الجامعية، وابنِ نموذجًا أوليًا لحلها.\n\n' +
      'يبدأ اليوم بعرض التحديات، وينتهي بعرض المشاريع أمام لجنة التحكيم وتكريم الفرق الفائزة.\n\n' +
      'المشاركة في فرق من ثلاثة إلى خمسة أعضاء، ومرحّب بكل التخصصات.',
    category: 'Competition',
    venue: 'Main Auditorium',
    capacity: 200,
    startsAt: () => campusTime(18, 9),
    endsAt: () => campusTime(18, 21),
    imageUrl: image('photo-1504384308090-c894fdcc538d'),
  },
  {
    title: 'بطولة كرة القدم الخماسية',
    description:
      'بطولة ودية لفرق الكليات بنظام خروج المغلوب، تُقام على الملعب الخارجي في مركز الأنشطة الطلابية.\n\n' +
      'سجّل لحضور المباريات وتشجيع فريق كليتك. الدخول متاح للجميع حتى اكتمال المقاعد.',
    category: 'Sports',
    venue: 'Sports Complex',
    capacity: 300,
    startsAt: () => campusTime(25, 16, 30),
    endsAt: () => campusTime(25, 20),
    imageUrl: image('photo-1574629810360-7efbbe195018'),
  },
];

async function seedOrganizer() {
  const email = (process.env.SEED_DEMO_ORGANIZER_EMAIL || '').trim().toLowerCase();
  const password = process.env.SEED_DEMO_ORGANIZER_PASSWORD || '';

  if (!email || !password) {
    throw new Error(
      'SEED_DEMO_ORGANIZER_EMAIL and SEED_DEMO_ORGANIZER_PASSWORD must be set in .env before seeding demo data.'
    );
  }
  if (password.length < 8) {
    throw new Error('SEED_DEMO_ORGANIZER_PASSWORD must be at least 8 characters.');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Same rule as the admin seed: never reset a password that may have been changed.
    console.log(`organizer: ${email} already existed (password left unchanged)`);
    return existing;
  }

  const organizer = await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, bcryptRounds),
      fullName: 'نادي التقنية والابتكار',
      role: 'ORGANIZER',
      organization: 'نادي التقنية والابتكار',
      isActive: true,
    },
  });
  console.log(`organizer: created ${email}`);
  return organizer;
}

async function seedEvents(organizer) {
  let created = 0;
  for (const e of EVENTS) {
    const category = await prisma.category.findUnique({ where: { name: e.category } });
    const venue = await prisma.venue.findFirst({ where: { name: e.venue } });
    if (!category || !venue) {
      throw new Error(
        `"${e.category}" / "${e.venue}" not found - run \`npm run db:seed\` before the demo seed.`
      );
    }

    const data = {
      description: e.description,
      startsAt: e.startsAt(),
      endsAt: e.endsAt(),
      capacity: e.capacity,
      imageUrl: e.imageUrl,
      categoryId: category.id,
      venueId: venue.id,
      // Demo content skips the approval queue so it is visible straight away.
      status: 'APPROVED',
    };

    // Event has no unique column, so match on title + organizer before inserting.
    const existing = await prisma.event.findFirst({
      where: { title: e.title, organizerId: organizer.id },
    });
    if (existing) {
      await prisma.event.update({ where: { id: existing.id }, data });
    } else {
      await prisma.event.create({ data: { ...data, title: e.title, organizerId: organizer.id } });
      created += 1;
    }
  }
  console.log(`events: ${created} created, ${EVENTS.length - created} refreshed`);
}

async function main() {
  console.log('seeding SCEMS demo data...');
  const organizer = await seedOrganizer();
  await seedEvents(organizer);
  console.log('demo seed complete.');
}

main()
  .catch((e) => {
    console.error(`demo seed failed: ${e.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
