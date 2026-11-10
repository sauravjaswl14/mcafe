import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { HttpError, idParam, wrap } from '../lib/http';
import { crud } from '../lib/crud';

export const roomsRouter = Router();
export const guestsRouter = Router();
export const bookingsRouter = Router();

const roomSchema = z.object({
  number: z.string().trim().min(1),
  type: z.string().trim().min(2),
  capacity: z.number().int().min(1).default(2),
  rate: z.number().int().min(0),
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'CLEANING', 'MAINTENANCE']).default('AVAILABLE'),
});

const guestSchema = z.object({
  name: z.string().trim().min(2),
  phone: z.string().trim().optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal('').transform(() => null)),
  idNumber: z.string().trim().optional().nullable(),
});

roomsRouter.use('/', crud(prisma.room, roomSchema, { orderBy: { number: 'asc' } }));
guestsRouter.use('/', crud(prisma.guest, guestSchema, { orderBy: { name: 'asc' } }));

// ───────────── Bookings ─────────────
const include = { room: true, guest: true, orders: { select: { id: true, total: true, status: true } } };

const bookingSchema = z
  .object({
    roomId: z.number().int(),
    guestId: z.number().int(),
    checkIn: z.coerce.date(),
    checkOut: z.coerce.date(),
  })
  .refine((b) => b.checkOut > b.checkIn, { message: 'Check-out must be after check-in', path: ['checkOut'] });

const DAY = 24 * 60 * 60 * 1000;
const nightsBetween = (a: Date, b: Date) => Math.max(1, Math.ceil((b.getTime() - a.getTime()) / DAY));

async function assertRoomFree(roomId: number, checkIn: Date, checkOut: Date, ignoreId?: number) {
  const clash = await prisma.booking.findFirst({
    where: {
      roomId,
      id: ignoreId ? { not: ignoreId } : undefined,
      status: { in: ['RESERVED', 'CHECKED_IN'] },
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
    },
  });
  if (clash) throw new HttpError(409, 'That room is already booked for those dates');
}

bookingsRouter.get('/', wrap(async (_req, res) => {
  res.json(await prisma.booking.findMany({ include, orderBy: { checkIn: 'desc' }, take: 300 }));
}));

bookingsRouter.post('/', wrap(async (req, res) => {
  const body = bookingSchema.parse(req.body);
  const room = await prisma.room.findUnique({ where: { id: body.roomId } });
  if (!room) throw new HttpError(404, 'Room not found');
  if (room.status === 'MAINTENANCE') throw new HttpError(409, 'Room is under maintenance');
  await assertRoomFree(body.roomId, body.checkIn, body.checkOut);

  const nights = nightsBetween(body.checkIn, body.checkOut);
  const booking = await prisma.booking.create({
    data: { ...body, nightlyRate: room.rate, total: nights * room.rate },
    include,
  });
  res.status(201).json(booking);
}));

const bookingStatusSchema = z.object({
  status: z.enum(['RESERVED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED']),
});

// Status workflow drives room status; check-out totals the room nights plus room-service orders
bookingsRouter.patch('/:id/status', wrap(async (req, res) => {
  const id = idParam(req);
  const { status } = bookingStatusSchema.parse(req.body);

  const result = await prisma.$transaction(async (tx) => {
    const b = await tx.booking.findUnique({ where: { id }, include: { orders: true } });
    if (!b) throw new HttpError(404, 'Booking not found');

    const allowed: Record<string, string[]> = {
      RESERVED: ['CHECKED_IN', 'CANCELLED'],
      CHECKED_IN: ['CHECKED_OUT'],
      CHECKED_OUT: [],
      CANCELLED: [],
    };
    if (!allowed[b.status].includes(status)) {
      throw new HttpError(409, `Cannot move a ${b.status.toLowerCase().replace('_', ' ')} booking to ${status.toLowerCase().replace('_', ' ')}`);
    }

    let total = b.total;
    if (status === 'CHECKED_IN') {
      await tx.room.update({ where: { id: b.roomId }, data: { status: 'OCCUPIED' } });
    } else if (status === 'CHECKED_OUT') {
      const nights = nightsBetween(b.checkIn, b.checkOut);
      const extras = b.orders.filter((o) => o.status !== 'CANCELLED').reduce((s, o) => s + o.total, 0);
      total = nights * b.nightlyRate + extras;
      await tx.room.update({ where: { id: b.roomId }, data: { status: 'CLEANING' } });
    }
    return tx.booking.update({ where: { id }, data: { status, total }, include });
  });
  res.json(result);
}));

bookingsRouter.delete('/:id', wrap(async (req, res) => {
  const id = idParam(req);
  const b = await prisma.booking.findUnique({ where: { id } });
  if (!b) throw new HttpError(404, 'Booking not found');
  if (b.status === 'CHECKED_IN') throw new HttpError(409, 'Check the guest out first');
  await prisma.booking.delete({ where: { id } });
  res.status(204).end();
}));
