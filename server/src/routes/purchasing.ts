import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { HttpError, idParam, wrap } from '../lib/http';
import { crud } from '../lib/crud';

export const suppliersRouter = Router();
export const purchasesRouter = Router();

const supplierSchema = z.object({
  name: z.string().trim().min(2),
  phone: z.string().trim().optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal('').transform(() => null)),
  address: z.string().trim().optional().nullable(),
});

suppliersRouter.use('/', crud(prisma.supplier, supplierSchema, { orderBy: { name: 'asc' } }));

const purchaseSchema = z.object({
  supplierId: z.number().int(),
  notes: z.string().trim().optional(),
  items: z
    .array(
      z.object({
        variantId: z.number().int(),
        quantity: z.number().int().min(1),
        unitCost: z.number().int().min(0),
      }),
    )
    .min(1, 'Add at least one line'),
});

const include = {
  supplier: true,
  items: { include: { variant: { include: { product: { select: { name: true } } } } } },
};

purchasesRouter.get('/', wrap(async (_req, res) => {
  res.json(await prisma.purchaseOrder.findMany({ include, orderBy: { createdAt: 'desc' }, take: 200 }));
}));

purchasesRouter.post('/', wrap(async (req, res) => {
  const body = purchaseSchema.parse(req.body);
  const total = body.items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
  const created = await prisma.purchaseOrder.create({
    data: {
      supplierId: body.supplierId,
      notes: body.notes,
      total,
      items: { create: body.items },
    },
    include,
  });
  res.status(201).json(created);
}));

// Receiving goods increases stock in the same transaction
purchasesRouter.patch('/:id/receive', wrap(async (req, res) => {
  const id = idParam(req);
  const result = await prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
    if (!po) throw new HttpError(404, 'Purchase order not found');
    if (po.status !== 'ORDERED') throw new HttpError(409, `Order is already ${po.status.toLowerCase()}`);
    for (const it of po.items) {
      await tx.productVariant.update({ where: { id: it.variantId }, data: { stock: { increment: it.quantity } } });
    }
    return tx.purchaseOrder.update({
      where: { id },
      data: { status: 'RECEIVED', receivedAt: new Date() },
      include,
    });
  });
  res.json(result);
}));

purchasesRouter.patch('/:id/cancel', wrap(async (req, res) => {
  const id = idParam(req);
  const po = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!po) throw new HttpError(404, 'Purchase order not found');
  if (po.status !== 'ORDERED') throw new HttpError(409, 'Only open orders can be cancelled');
  res.json(await prisma.purchaseOrder.update({ where: { id }, data: { status: 'CANCELLED' }, include }));
}));

purchasesRouter.delete('/:id', wrap(async (req, res) => {
  const id = idParam(req);
  const po = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!po) throw new HttpError(404, 'Purchase order not found');
  if (po.status === 'RECEIVED') throw new HttpError(409, 'Received orders are part of your records and cannot be deleted');
  await prisma.purchaseOrder.delete({ where: { id } });
  res.status(204).end();
}));
