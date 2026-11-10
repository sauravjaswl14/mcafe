import { Router } from 'express';
import type { ZodTypeAny } from 'zod';
import { HttpError, idParam, wrap } from './http';

interface Delegate {
  findMany(args?: unknown): Promise<unknown[]>;
  findUnique(args: unknown): Promise<unknown | null>;
  create(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
  delete(args: unknown): Promise<unknown>;
}

interface Options {
  orderBy?: unknown;
  include?: unknown;
}

/** Generic REST CRUD for simple resources. Mount behind requireAdmin. */
export function crud(delegate: Delegate, schema: ZodTypeAny, opts: Options = {}) {
  const r = Router();

  r.get('/', wrap(async (_req, res) => {
    res.json(await delegate.findMany({ orderBy: opts.orderBy, include: opts.include }));
  }));

  r.get('/:id', wrap(async (req, res) => {
    const row = await delegate.findUnique({ where: { id: idParam(req) }, include: opts.include });
    if (!row) throw new HttpError(404, 'Not found');
    res.json(row);
  }));

  r.post('/', wrap(async (req, res) => {
    const data = schema.parse(req.body);
    res.status(201).json(await delegate.create({ data, include: opts.include }));
  }));

  r.put('/:id', wrap(async (req, res) => {
    const data = schema.parse(req.body);
    res.json(await delegate.update({ where: { id: idParam(req) }, data, include: opts.include }));
  }));

  r.delete('/:id', wrap(async (req, res) => {
    await delegate.delete({ where: { id: idParam(req) } });
    res.status(204).end();
  }));

  return r;
}
