import { Router } from 'express';
import type { Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { HttpError, wrap } from '../lib/http';
import { COOKIE_NAME, requireAuth, signToken } from '../middleware/auth';

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

function cookieOptions() {
  const prod = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: prod,
    sameSite: (process.env.COOKIE_SAMESITE as 'lax' | 'none' | 'strict' | undefined) ?? 'lax',
    domain: process.env.COOKIE_DOMAIN || undefined,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  } as const;
}

function sendSession(res: Response, user: { id: number; name: string; email: string; role: 'ADMIN' | 'CUSTOMER' }) {
  const token = signToken({ id: user.id, role: user.role, name: user.name });
  res.cookie(COOKIE_NAME, token, cookieOptions());
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}

// Public sign-up ALWAYS creates a CUSTOMER. Admins are created by the seed script.
authRouter.post('/register', wrap(async (req, res) => {
  const data = registerSchema.parse(req.body);
  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw new HttpError(409, 'Email is already registered');
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: await bcrypt.hash(data.password, 12),
      role: 'CUSTOMER',
    },
  });
  sendSession(res.status(201), user);
}));

authRouter.post('/login', wrap(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  // Same message for unknown email / wrong password
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'Invalid email or password');
  }
  sendSession(res, user);
}));

authRouter.post('/logout', (_req, res) => {
  const { maxAge: _m, ...opts } = cookieOptions();
  res.clearCookie(COOKIE_NAME, opts);
  res.status(204).end();
});

authRouter.get('/me', requireAuth, wrap(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) throw new HttpError(401, 'Account no longer exists');
  res.json({ user });
}));
