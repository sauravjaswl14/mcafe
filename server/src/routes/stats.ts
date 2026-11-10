import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { wrap } from '../lib/http';

export const statsRouter = Router();

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

statsRouter.get('/', wrap(async (_req, res) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(startOfToday);
  weekStart.setDate(weekStart.getDate() - 6);
  const monthStart = new Date(startOfToday);
  monthStart.setDate(monthStart.getDate() - 29);

  const [weekSales, today, month, purchases, ordersByStatus, lowStock, roomsByStatus, pendingOrders, activeBookings] =
    await Promise.all([
      prisma.sale.findMany({ where: { paidAt: { gte: weekStart } }, select: { amount: true, paidAt: true } }),
      prisma.sale.aggregate({ where: { paidAt: { gte: startOfToday } }, _sum: { amount: true }, _count: true }),
      prisma.sale.aggregate({ where: { paidAt: { gte: monthStart } }, _sum: { amount: true }, _count: true }),
      prisma.purchaseOrder.aggregate({
        where: { status: 'RECEIVED', receivedAt: { gte: monthStart } },
        _sum: { total: true },
      }),
      prisma.order.groupBy({ by: ['status'], _count: true }),
      prisma.productVariant.findMany({
        where: { active: true, stock: { lte: 10 }, product: { active: true } },
        include: { product: { select: { name: true } } },
        orderBy: { stock: 'asc' },
        take: 8,
      }),
      prisma.room.groupBy({ by: ['status'], _count: true }),
      prisma.order.count({ where: { status: { in: ['PENDING', 'PREPARING'] } } }),
      prisma.booking.count({ where: { status: 'CHECKED_IN' } }),
    ]);

  // Revenue for each of the last 7 days (zero-filled)
  const byDay = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    byDay.set(ymd(d), 0);
  }
  for (const s of weekSales) {
    const k = ymd(s.paidAt);
    byDay.set(k, (byDay.get(k) ?? 0) + s.amount);
  }

  const revenue30 = month._sum.amount ?? 0;
  const spend30 = purchases._sum.total ?? 0;

  res.json({
    revenueToday: today._sum.amount ?? 0,
    salesToday: today._count,
    revenue30,
    sales30: month._count,
    purchases30: spend30,
    margin30: revenue30 - spend30,
    pendingOrders,
    activeBookings,
    revenueByDay: [...byDay.entries()].map(([date, amount]) => ({ date, amount })),
    ordersByStatus: ordersByStatus.map((o) => ({ status: o.status, count: o._count })),
    roomsByStatus: roomsByStatus.map((r) => ({ status: r.status, count: r._count })),
    lowStock: lowStock.map((v) => ({
      id: v.id,
      name: v.product.name,
      form: v.form,
      sizeGrams: v.sizeGrams,
      stock: v.stock,
    })),
  });
}));
