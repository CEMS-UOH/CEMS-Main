// FR-19: category CRUD. OWNER: Role 3. Input is already validated by the controller.
const prisma = require('../../lib/prisma');
const { HttpError } = require('../../lib/response');
const { CATEGORY_SELECT, toPublicCategory } = require('./shapes');

const NOT_FOUND = () => new HttpError(404, 'Category not found', 'CATEGORY_NOT_FOUND');
const NAME_TAKEN = () => new HttpError(409, 'A category with this name already exists', 'CATEGORY_NAME_TAKEN');

const listCategories = async () => {
  const categories = await prisma.category.findMany({
    select: { ...CATEGORY_SELECT, _count: { select: { events: true } } },
    orderBy: { name: 'asc' },
  });
  return categories.map(toPublicCategory);
};

async function createCategory({ name, description }) {
  try {
    const category = await prisma.category.create({
      data: { name, description: description || null },
      select: CATEGORY_SELECT,
    });
    return toPublicCategory(category);
  } catch (e) {
    if (e.code === 'P2002') throw NAME_TAKEN();
    throw e;
  }
}

async function updateCategory(id, changes) {
  const existing = await prisma.category.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw NOT_FOUND();

  try {
    const category = await prisma.category.update({ where: { id }, data: changes, select: CATEGORY_SELECT });
    return toPublicCategory(category);
  } catch (e) {
    if (e.code === 'P2002') throw NAME_TAKEN();
    throw e;
  }
}

/** Blocked while any event still references this category - events.categoryId is required. */
async function deleteCategory(id) {
  const existing = await prisma.category.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw NOT_FOUND();

  const eventCount = await prisma.event.count({ where: { categoryId: id } });
  if (eventCount > 0) {
    throw new HttpError(409, 'This category still has events and cannot be deleted', 'CATEGORY_HAS_EVENTS');
  }

  await prisma.category.delete({ where: { id } });
}

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
