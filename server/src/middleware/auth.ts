import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { HttpError } from '../lib/http';

export interface AuthUser {
  id: number;
  role: Role;
  name: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const COOKIE_NAME = 'token';

export function jwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return s;
}

export function signToken(user: AuthUser): string {
  return jwt.sign(user, jwtSecret(), { expiresIn: '7d' });
}

function readToken(req: Request): string | undefined {
  const cookie = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (cookie) return cookie;
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return undefined;
}

function decode(token: string): AuthUser | null {
  try {
    const p = jwt.verify(token, jwtSecret()) as AuthUser;
    return { id: p.id, role: p.role, name: p.name };
  } catch {
    return null;
  }
}

/** Attaches req.user when a valid token is present; never rejects. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readToken(req);
  if (token) {
    const user = decode(token);
    if (user) req.user = user;
  }
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readToken(req);
  const user = token ? decode(token) : null;
  if (!user) return next(new HttpError(401, 'Please sign in'));
  req.user = user;
  next();
}

/** Only ADMIN users may pass. */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, (err?: unknown) => {
    if (err) return next(err);
    if (req.user?.role !== 'ADMIN') return next(new HttpError(403, 'Admin access required'));
    next();
  });
}
