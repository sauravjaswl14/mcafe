import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { HttpError, idParam, wrap } from '../lib/http';
import { crud } from '../lib/crud';
import { requireAdmin } from '../middleware/auth';

// ───────────── Products (coffee) ─────────────
export const productsRouter = Router();

const variantSchema = z.object({
  id: z.number().int().optional(),
  form: z.enum(['WHOLE_BEANS', 'GROUND', 'PACKAGED']),
  sizeGrams: z.number().int().min(1),
  price: z.number().int().min(0),
  stock: z.number().int().min(0),
});

const productSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and dashes'),
  name: z.string().trim().min(2),
  origin: z.string().trim().min(2),
  roast: z.enum(['LIGHT', 'MEDIUM', 'DARK']),
  flavors: z.array(z.string().trim().min(1)).max(8),
  description: z.string().trim().min(1),
  active: z.boolean().default(true),
  variants: z.array(variantSchema).min(1, 'Add at least one variant'),
});

const includeVariants = (onlyActive: boolean) => ({
  variants: {
    where: onlyActive ? { active: true } : undefined,
    orderBy: [{ form: 'asc' as const }, { sizeGrams: 'asc' as const }],
  },
});

// Public: active products only
productsRouter.get('/', wrap(async (_req, res) => {
  const rows = await prisma.product.findMany({
    where: { active: true },
    include: includeVariants(true),
    orderBy: { id: 'asc' },
  });
  res.json(rows.filter((p) => p.variants.length > 0));
}));

// Admin: everything
productsRouter.get('/admin/all', requireAdmin, wrap(async (_req, res) => {
  res.json(await prisma.product.findMany({ include: includeVariants(false), orderBy: { id: 'asc' } }));
}));

productsRouter.post('/', requireAdmin, wrap(async (req, res) => {
  const { variants, ...data } = productSchema.parse(req.body);
  const product = await prisma.product.create({
    data: { ...data, variants: { create: variants.map(({ id: _id, ...v }) => v) } },
    include: includeVariants(false),
  });
  res.status(201).json(product);
}));

productsRouter.put('/:id', requireAdmin, wrap(async (req, res) => {
  const id = idParam(req);
  const { variants, ...data } = productSchema.parse(req.body);
  const updated = await prisma.$transaction(async (tx) => {
    const existing = await tx.productVariant.findMany({ where: { productId: id } });
    if (!(await tx.product.findUnique({ where: { id } }))) throw new HttpError(404, 'Product not found');

    const keepIds = new Set(variants.filter((v) => v.id).map((v) => v.id!));
    // Variants removed in the editor are deactivated (order/purchase history stays intact)
    const removed = existing.filter((v) => !keepIds.has(v.id)).map((v) => v.id);
    if (removed.length) {
      await tx.productVariant.updateMany({ where: { id: { in: removed } }, data: { active: false } });
    }
    for (const { id: vid, ...v } of variants) {
      if (vid) {
        const owned = existing.find((e) => e.id === vid);
        if (!owned) throw new HttpError(400, `Variant ${vid} does not belong to this product`);
        await tx.productVariant.update({ where: { id: vid }, data: { ...v, active: true } });
      } else {
        // Re-activate a matching archived variant instead of violating the unique key
        await tx.productVariant.upsert({
          where: { productId_form_sizeGrams: { productId: id, form: v.form, sizeGrams: v.sizeGrams } },
          create: { ...v, productId: id },
          update: { ...v, active: true },
        });
      }
    }
    return tx.product.update({ where: { id }, data, include: includeVariants(true) });
  });
  res.json(updated);
}));

productsRouter.delete('/:id', requireAdmin, wrap(async (req, res) => {
  const id = idParam(req);
  try {
    // Fails with P2003 if purchase history references its variants
    await prisma.product.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
      await prisma.product.update({ where: { id }, data: { active: false } });
      return res.json({ archived: true, message: 'Product has purchase history, so it was archived instead.' });
    }
    throw e;
  }
}));

// ───────────── Menu (dynamic categories + items) ─────────────
export const menuRouter = Router();

const categorySchema = z.object({
  name: z.string().trim().min(2),
  sortOrder: z.number().int().default(0),
});

const itemSchema = z.object({
  categoryId: z.number().int(),
  name: z.string().trim().min(2),
  description: z.string().trim().default(''),
  price: z.number().int().min(0),
  available: z.boolean().default(true),
});

// Public: only available items, empty categories hidden
menuRouter.get('/', wrap(async (_req, res) => {
  const cats = await prisma.menuCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    include: { items: { where: { available: true }, orderBy: { id: 'asc' } } },
  });
  res.json(cats.filter((c) => c.items.length > 0));
}));

// Admin
menuRouter.get('/admin/all', requireAdmin, wrap(async (_req, res) => {
  res.json(
    await prisma.menuCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      include: { items: { orderBy: { id: 'asc' } } },
    }),
  );
}));

menuRouter.use('/categories', requireAdmin, crud(prisma.menuCategory, categorySchema, { orderBy: { sortOrder: 'asc' } }));
menuRouter.use('/items', requireAdmin, crud(prisma.menuItem, itemSchema, { orderBy: { id: 'asc' } }));
