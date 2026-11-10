import 'dotenv/config';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { errorHandler } from './lib/http';
import { requireAdmin } from './middleware/auth';
import { authRouter } from './routes/auth';
import { menuRouter, productsRouter } from './routes/catalog';
import { bookingsRouter, guestsRouter, roomsRouter } from './routes/hms';
import { ordersRouter, salesRouter } from './routes/orders';
import { purchasesRouter, suppliersRouter } from './routes/purchasing';
import { statsRouter } from './routes/stats';

const app = express();

app.use(
  cors({
    origin: (process.env.CLIENT_ORIGIN ?? 'http://localhost:3000').split(','),
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ── Public / mixed (each route guards itself where needed) ──
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter); // GET public; writes are admin-only
app.use('/api/menu', menuRouter); // GET public; writes are admin-only
app.use('/api/orders', ordersRouter); // POST public; everything else admin-only

// ── Admin-only: the whole dashboard side ──
app.use('/api/sales', salesRouter);
app.use('/api/stats', requireAdmin, statsRouter);
app.use('/api/suppliers', requireAdmin, suppliersRouter);
app.use('/api/purchases', requireAdmin, purchasesRouter);
app.use('/api/rooms', requireAdmin, roomsRouter);
app.use('/api/guests', requireAdmin, guestsRouter);
app.use('/api/bookings', requireAdmin, bookingsRouter);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => console.log(`API ready on http://localhost:${port}`));
