import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
// The shared catalog is the single source of truth for products and menus.
import { menus, products } from '../../shared/catalog';

const prisma = new PrismaClient();
const reset = process.argv.includes('--reset');

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL ?? 'admin@beanandbloom.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error('Set ADMIN_PASSWORD in server/.env before seeding');
  await prisma.user.upsert({
    where: { email },
    update: { role: 'ADMIN' },
    create: {
      name: process.env.ADMIN_NAME ?? 'Cafe Admin',
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: 'ADMIN',
    },
  });
  console.log(`✔ admin ready: ${email}`);
}

async function seedProducts() {
  for (const p of products) {
    const base = {
      name: p.name,
      origin: p.origin,
      roast: p.roast.toUpperCase() as 'LIGHT' | 'MEDIUM' | 'DARK',
      flavors: p.flavors,
      description: p.description,
      active: p.active ?? true,
    };
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: base,
      create: { slug: p.slug, ...base },
    });
    for (const v of p.variants) {
      await prisma.productVariant.upsert({
        where: { productId_form_sizeGrams: { productId: product.id, form: v.form, sizeGrams: v.sizeGrams } },
        // Without --reset, dashboard edits to price/stock survive re-seeding
        update: reset ? { price: v.price, stock: v.stock, active: true } : {},
        create: { productId: product.id, form: v.form, sizeGrams: v.sizeGrams, price: v.price, stock: v.stock },
      });
    }
  }
  console.log(`✔ ${products.length} coffees`);
}

async function seedMenus() {
  let order = 0;
  for (const c of menus) {
    const cat = await prisma.menuCategory.upsert({
      where: { name: c.name },
      update: { sortOrder: order },
      create: { name: c.name, sortOrder: order },
    });
    order++;
    for (const it of c.items) {
      await prisma.menuItem.upsert({
        where: { categoryId_name: { categoryId: cat.id, name: it.name } },
        update: reset ? { description: it.description, price: it.price, available: it.available ?? true } : {},
        create: {
          categoryId: cat.id,
          name: it.name,
          description: it.description,
          price: it.price,
          available: it.available ?? true,
        },
      });
    }
  }
  console.log(`✔ ${menus.length} menu categories`);
}

async function seedOperations() {
  // Sample HMS rooms and suppliers so the dashboard isn't empty on day one
  const rooms = [
    { number: '101', type: 'Standard', capacity: 2, rate: 3500 },
    { number: '102', type: 'Standard', capacity: 2, rate: 3500 },
    { number: '201', type: 'Deluxe', capacity: 3, rate: 5200 },
    { number: '202', type: 'Deluxe', capacity: 3, rate: 5200 },
    { number: '301', type: 'Suite', capacity: 4, rate: 8500 },
  ];
  for (const r of rooms) {
    await prisma.room.upsert({ where: { number: r.number }, update: {}, create: r });
  }
  if ((await prisma.supplier.count()) === 0) {
    await prisma.supplier.createMany({
      data: [
        { name: 'Gulmi Highland Growers', phone: '+977-9800000001', email: 'orders@gulmigrowers.example', address: 'Gulmi' },
        { name: 'Green Bean Traders', phone: '+977-9800000002', email: 'sales@greenbean.example', address: 'Kathmandu' },
      ],
    });
  }
  console.log('✔ sample rooms and suppliers');
}

async function main() {
  await seedAdmin();
  await seedProducts();
  await seedMenus();
  await seedOperations();
  console.log(reset ? 'Done (prices and stock reset from catalog.ts).' : 'Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
