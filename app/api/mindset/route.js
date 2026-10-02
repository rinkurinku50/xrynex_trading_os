import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuthenticatedApi } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const DEFAULT_CATEGORY = 'Trading discipline';
const defaultTips = [
  { icon: '🚀', title: 'Waiting for motivation', problem: 'You may feel like you need motivation before you start. But **motivation often shows up once you begin.**', why: 'Waiting to feel ready can leave you **stuck for hours.**', action: 'Take one small step. Momentum tends to follow action.' },
  { icon: '🪨', title: 'Goals feel too big', problem: 'Large goals can make **your mind feel overwhelmed.**', why: 'When the next step is unclear, it is easier to put the whole task off.', action: 'Choose one small action and finish it before planning the next.' },
  { icon: '📵', title: 'Too many distractions', problem: 'Your phone, social media, and notifications can make it harder to focus.', why: 'Every interruption pulls attention away from **the plan in front of you.**', action: 'Silence nonessential alerts and protect one focused block of time.' },
  { icon: '⏱️', title: 'Saying “later”', problem: '“I’ll do it later” can quietly become a **habit of delaying.**', why: 'The task stays on your mind while your time keeps disappearing.', action: 'If the next step takes two minutes, do it now. Otherwise, schedule it.' },
  { icon: '🌱', title: 'Comfort zone', problem: 'Staying comfortable can **hold back your growth.**', why: 'Only repeating what feels safe can keep you from learning.', action: 'Pick one small, deliberate challenge and review what it teaches you.' },
  { icon: '🪜', title: 'Fear of failure', problem: 'Sometimes we avoid a task because we are **afraid of making mistakes.**', why: 'Mistakes are part of learning; waiting for perfect conditions costs progress.', action: 'Start, review the result, and improve the next attempt.' },
];
const noStore = { 'Cache-Control': 'no-store, max-age=0' };

function response(data, status = 200) {
  return NextResponse.json(data, { status, headers: noStore });
}

function validText(value, maxLength, required = false) {
  return typeof value === 'string'
    && value.length <= maxLength
    && (!required || Boolean(value.trim()));
}

async function ensureDefaultContent(ownerId) {
  await prisma.$transaction(async (tx) => {
    const category = await tx.mindsetCategory.upsert({
      where: { ownerId_name: { ownerId, name: DEFAULT_CATEGORY } },
      create: { ownerId, name: DEFAULT_CATEGORY, isDefault: true, sortOrder: 0 },
      update: { isDefault: true },
    });
    for (const [sortOrder, tip] of defaultTips.entries()) {
      await tx.mindsetTip.upsert({
        where: { categoryId_title: { categoryId: category.id, title: tip.title } },
        create: {
          ...tip,
          ownerId,
          categoryId: category.id,
          isDefault: true,
          sortOrder,
        },
        update: {},
      });
    }
  });
}

export async function GET() {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  await ensureDefaultContent(user.id);

  const categories = await prisma.mindsetCategory.findMany({
    where: { ownerId: user.id },
    include: { tips: { where: { ownerId: user.id }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return response({ categories });
}

export async function POST(request) {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  const body = await request.json();

  if (body.type === 'import-legacy') {
    if (!Array.isArray(body.tabs) || body.tabs.length > 100 || !Array.isArray(body.tips) || body.tips.length > 500) {
      return response({ error: 'Legacy mindset data is invalid.' }, 400);
    }
    if (body.tabs.some((tab) => typeof tab?.id !== 'string' || !validText(tab.name, 30, true))) {
      return response({ error: 'A saved mindset category is invalid; browser data was not removed.' }, 400);
    }
    if (body.tips.some((tip) => typeof tip?.tab !== 'string'
      || !validText(tip.title, 60, true)
      || !validText(tip.problem, 500, true)
      || !validText(tip.why ?? '', 500)
      || !validText(tip.action, 240, true)
      || !validText(tip.icon ?? '', 16))) {
      return response({ error: 'A saved mindset tip is invalid; browser data was not removed.' }, 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingCategories = await tx.mindsetCategory.findMany({ where: { ownerId: user.id } });
      const categoriesById = new Map();
      const categoriesByName = new Map(existingCategories.map((category) => [category.name.trim().toLowerCase(), category]));
      const defaultCategory = existingCategories.find((category) => category.isDefault);
      if (!defaultCategory) throw new Error('Default mindset category is missing. Reload the tab and try again.');
      categoriesById.set('discipline', defaultCategory);

      let importedCategories = 0;
      for (const legacyCategory of body.tabs) {
        let category = categoriesByName.get(legacyCategory.name.trim().toLowerCase());
        if (!category) {
          category = await tx.mindsetCategory.create({
            data: { ownerId: user.id, name: legacyCategory.name.trim(), sortOrder: existingCategories.length + importedCategories },
          });
          categoriesByName.set(category.name.trim().toLowerCase(), category);
          importedCategories += 1;
        }
        categoriesById.set(legacyCategory.id, category);
      }

      let importedTips = 0;
      let skippedTips = 0;
      for (const legacyTip of body.tips) {
        const category = categoriesById.get(legacyTip.tab)
          || categoriesByName.get(legacyTip.tab.trim().toLowerCase());
        if (!category) return { error: 'A mindset tip references a missing category; browser data was not removed.' };
        const title = legacyTip.title.trim();
        const exists = await tx.mindsetTip.findUnique({
          where: { categoryId_title: { categoryId: category.id, title } },
          select: { id: true },
        });
        if (exists) {
          skippedTips += 1;
          continue;
        }
        const sortOrder = await tx.mindsetTip.count({ where: { ownerId: user.id, categoryId: category.id } });
        await tx.mindsetTip.create({
          data: {
            ownerId: user.id,
            categoryId: category.id,
            title,
            icon: legacyTip.icon?.trim() || '💡',
            problem: legacyTip.problem.trim(),
            why: (legacyTip.why || '').trim(),
            action: legacyTip.action.trim(),
            sortOrder,
          },
        });
        importedTips += 1;
      }
      return { importedCategories, importedTips, skippedTips };
    });
    if (result.error) return response({ error: result.error }, 400);
    return response(result);
  }

  if (body.type === 'category') {
    if (!validText(body.name, 30, true)) return response({ error: 'Enter a category name up to 30 characters.' }, 400);
    try {
      const category = await prisma.mindsetCategory.create({
        data: { ownerId: user.id, name: body.name.trim() },
      });
      return response(category, 201);
    } catch (error) {
      if (error.code === 'P2002') return response({ error: 'That category already exists.' }, 409);
      throw error;
    }
  }

  if (body.type === 'tip') {
    if (typeof body.categoryId !== 'string'
      || !validText(body.title, 60, true)
      || !validText(body.problem, 500, true)
      || !validText(body.why ?? '', 500)
      || !validText(body.action, 240, true)
      || !validText(body.icon ?? '', 16)) {
      return response({ error: 'Check the tip details and try again.' }, 400);
    }
    const category = await prisma.mindsetCategory.findFirst({ where: { id: body.categoryId, ownerId: user.id } });
    if (!category) return response({ error: 'Category not found.' }, 404);
    const sortOrder = await prisma.mindsetTip.count({ where: { categoryId: category.id, ownerId: user.id } });
    const tip = await prisma.mindsetTip.create({
      data: {
        categoryId: category.id,
        ownerId: user.id,
        title: body.title.trim(),
        problem: body.problem.trim(),
        why: (body.why ?? '').trim(),
        action: body.action.trim(),
        icon: (body.icon ?? '').trim() || '💡',
        sortOrder,
      },
    });
    return response(tip, 201);
  }

  return response({ error: 'Choose a valid record type.' }, 400);
}

export async function PATCH(request) {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  const body = await request.json();
  if (body.type !== 'tip' || typeof body.id !== 'string') return response({ error: 'Choose a valid tip.' }, 400);

  const data = {};
  for (const [field, maxLength] of Object.entries({ title: 60, problem: 500, why: 500, action: 240, icon: 16 })) {
    if (field in body) {
      if (!validText(body[field], maxLength, field !== 'why' && field !== 'icon')) return response({ error: `Check the ${field} value.` }, 400);
      data[field] = body[field].trim();
    }
  }
  if (!Object.keys(data).length) return response({ error: 'Nothing to update.' }, 400);

  const result = await prisma.mindsetTip.updateMany({ where: { id: body.id, ownerId: user.id, isDefault: false }, data });
  if (!result.count) return response({ error: 'Tip not found or is protected.' }, 404);
  return response(await prisma.mindsetTip.findFirst({ where: { id: body.id, ownerId: user.id } }));
}

export async function DELETE(request) {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  const body = await request.json();
  if (typeof body.id !== 'string' || !body.id) return response({ error: 'Choose a record to delete.' }, 400);

  if (body.type === 'category') {
    const result = await prisma.mindsetCategory.deleteMany({ where: { id: body.id, ownerId: user.id, isDefault: false } });
    return result.count ? response({ deleted: true }) : response({ error: 'Category not found or is protected.' }, 404);
  }
  if (body.type === 'tip') {
    const result = await prisma.mindsetTip.deleteMany({ where: { id: body.id, ownerId: user.id, isDefault: false } });
    return result.count ? response({ deleted: true }) : response({ error: 'Tip not found or is protected.' }, 404);
  }
  return response({ error: 'Choose a valid record type.' }, 400);
}