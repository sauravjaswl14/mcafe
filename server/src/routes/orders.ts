import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { HttpError, idParam, wrap } from '../lib/http';
import { optionalAuth, requireAdmin } from '../middleware/auth';

export const ordersRouter = Router();
export const salesRouter = Router();

const FORM_LABEL = { WHOLE_BEANS: 'Whole beans', GROUND: 'Ground', PACKAGED: 'Packaged' } as const;

const orderSchema = z.object({
  type: z.enum(['DINE_IN', 'TAKEAWAY', 'ROOM_SERVICE', 'ONLINE']).default('ONLINE'),
  customerName: z.string().trim().min(1, 'Name is required'),
  customerPhone: z.string().trim().optional(),
  notes: z.string().trim().max(500).optional(),
  bookingId: z.number().int().optional(),
  items: z
    .array(
      z
        .object({
          variantId: z.number().int().optional(),
          menuItemId: z.number().int().optional(),
          quantity: z.number().int().min(1).max(50),
        })
        .refine((i) => Boolean(i.variantId) !== Boolean(i.menuItemId), 'Give either variantId or menuItemId'),
    )
    .min(1, 'Your order is empty')
    .max(60),
});

const orderInclude = {
  items: true,
  sale: true,
  booking: { include: { room: true, guest: true } },
} satisfies Prisma.OrderInclude;

/** Place an order. Public (guests can order); prices and stock are validated server-side. */
ordersRouter.post('/', optionalAuth, wrap(async (req, res) => {
  const body = orderSchema.parse(req.body);
  const isAdmin = req.user?.role === 'ADMIN';

  // Staff-only features: non-online order types and room charges
  if (!isAdmin && body.type !== 'ONLINE') throw new HttpError(403, 'Only staff can create this order type');
  if (!isAdmin && body.bookingId) throw new HttpError(403, 'Only staff can attach an order to a room');

  const order = await prisma.$transaction(async (tx) => {
    if (body.bookingId) {
      const b = await tx.booking.findUnique({ where: { id: body.bookingId } });
      if (!b || b.status !== 'CHECKED_IN') throw new HttpError(400, 'Room charges need a checked-in booking');
    }

    const variantIds = body.items.flatMap((i) => (i.variantId ? [i.variantId] : []));
    const menuIds = body.items.flatMap((i) => (i.menuItemId ? [i.menuItemId] : []));

    const [variants, menuItems] = await Promise.all([
      tx.productVariant.findMany({
        where: { id: { in: variantIds }, active: true, product: { active: true } },
        include: { product: true },
      }),
      tx.menuItem.findMany({ where: { id: { in: menuIds }, available: true } }),
    ]);

    let total = 0;
    const lines: Prisma.OrderItemCreateWithoutOrderInput[] = [];
    const stockOps: { variantId: number; qty: number; label: string }[] = [];

    for (const i of body.items) {
      if (i.variantId) {
        const v = variants.find((x) => x.id === i.variantId);
        if (!v) throw new HttpError(400, `Product ${i.variantId} is unavailable`);
        const name = `${v.product.name} · ${FORM_LABEL[v.form]} ${v.sizeGrams}g`;
        stockOps.push({ variantId: v.id, qty: i.quantity, label: name });
        lines.push({ name, unitPrice: v.price, quantity: i.quantity, variant: { connect: { id: v.id } } });
        total += v.price * i.quantity;
      } else {
        const m = menuItems.find((x) => x.id === i.menuItemId);
        if (!m) throw new HttpError(400, `Menu item ${i.menuItemId} is unavailable`);
        lines.push({ name: m.name, unitPrice: m.price, quantity: i.quantity, menuItem: { connect: { id: m.id } } });
        total += m.price * i.quantity;
      }
    }

    // Guarded decrement: fails cleanly if stock changed since the customer looked
    for (const op of stockOps) {
      const r = await tx.productVariant.updateMany({
        where: { id: op.variantId, stock: { gte: op.qty } },
        data: { stock: { decrement: op.qty } },
      });
      if (r.count === 0) throw new HttpError(409, `Not enough stock for ${op.label}`);
    }

    return tx.order.create({
      data: {
        type: body.type,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        notes: body.notes,
        total,
        userId: req.user?.id,
        bookingId: body.bookingId,
        items: { create: lines },
      },
      include: orderInclude,
    });
  });

  res.status(201).json(order);
}));

// ───────────── Admin order management ─────────────
ordersRouter.get('/', requireAdmin, wrap(async (req, res) => {
  const status = z.enum(['PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED']).optional().parse(req.query.status);
  res.json(
    await prisma.order.findMany({
      where: status ? { status } : undefined,
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
  );
}));

ordersRouter.get('/:id', requireAdmin, wrap(async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: idParam(req) }, include: orderInclude });
  if (!order) throw new HttpError(404, 'Order not found');
  res.json(order);
}));

const statusSchema = z.object({
  status: z.enum(['PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED']),
  paymentMethod: z.enum(['CASH', 'CARD', 'ONLINE', 'ROOM_CHARGE']).optional(),
});

ordersRouter.patch('/:id/status', requireAdmin, wrap(async (req, res) => {
  const id = idParam(req);
  const { status, paymentMethod } = statusSchema.parse(req.body);

  const updated = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id }, include: { items: true, sale: true } });
    if (!order) throw new HttpError(404, 'Order not found');
    if (order.status === status) return tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      throw new HttpError(409, `A ${order.status.toLowerCase()} order can no longer change`);
    }

    if (status === 'CANCELLED') {
      // Put coffee stock back
      for (const it of order.items) {
        if (it.variantId) {
          await tx.productVariant.update({ where: { id: it.variantId }, data: { stock: { increment: it.quantity } } });
        }
      }
    }

    if (status === 'COMPLETED') {
      const method = paymentMethod ?? (order.bookingId ? 'ROOM_CHARGE' : 'CASH');
      if (method === 'ROOM_CHARGE' && !order.bookingId) {
        throw new HttpError(400, 'ROOM_CHARGE needs an order attached to a room booking');
      }
      await tx.sale.create({ data: { orderId: id, amount: order.total, method } });
    }

    return tx.order.update({ where: { id }, data: { status }, include: orderInclude });
  });

  res.json(updated);
}));

// ───────────── Sales (read-only ledger) ─────────────
salesRouter.get('/', requireAdmin, wrap(async (req, res) => {
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  const where: Prisma.SaleWhereInput = {
    paidAt: {
      ...(from && !isNaN(from.getTime()) ? { gte: from } : {}),
      ...(to && !isNaN(to.getTime()) ? { lte: to } : {}),
    },
  };
  const [sales, totals] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: { order: { select: { id: true, customerName: true, type: true, items: true } } },
      orderBy: { paidAt: 'desc' },
      take: 500,
    }),
    prisma.sale.aggregate({ where, _sum: { amount: true }, _count: true }),
  ]);
  res.json({ sales, totalAmount: totals._sum.amount ?? 0, count: totals._count });
}));
