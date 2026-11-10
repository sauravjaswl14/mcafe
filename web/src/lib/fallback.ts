import { menus, products as src } from '@shared/catalog';
import type { MenuCategory, Product } from './types';

/**
 * Shapes the single-source catalog like API responses, so the storefront still
 * renders when the API/DB is not running. IDs here are synthetic; ordering is
 * disabled while these are in use.
 */
export const fallbackProducts: Product[] = src.map((p, i) => ({
  id: i + 1,
  slug: p.slug,
  name: p.name,
  origin: p.origin,
  roast: p.roast.toUpperCase() as Product['roast'],
  flavors: p.flavors,
  description: p.description,
  active: p.active ?? true,
  variants: p.variants.map((v, j) => ({
    id: (i + 1) * 100 + j,
    productId: i + 1,
    form: v.form,
    sizeGrams: v.sizeGrams,
    price: v.price,
    stock: v.stock,
    active: true,
  })),
}));

export const fallbackMenu: MenuCategory[] = menus.map((c, i) => ({
  id: i + 1,
  name: c.name,
  sortOrder: i,
  items: c.items.map((it, j) => ({
    id: (i + 1) * 100 + j,
    categoryId: i + 1,
    name: it.name,
    description: it.description,
    price: it.price,
    available: it.available ?? true,
  })),
}));
