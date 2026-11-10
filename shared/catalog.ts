/**
 * SINGLE SOURCE OF TRUTH for the café catalog.
 *  - The storefront falls back to this data when the API is offline.
 *  - The server seed (server/prisma/seed.ts) imports it to populate PostgreSQL.
 * Edit products / menus here, then re-run `npm run seed` in /server.
 */

export type BeanForm = 'WHOLE_BEANS' | 'GROUND' | 'PACKAGED';
export type Roast = 'Light' | 'Medium' | 'Dark';

export const BEAN_FORMS: Record<BeanForm, string> = {
  WHOLE_BEANS: 'Whole beans',
  GROUND: 'Ground',
  PACKAGED: 'Packaged (ready-to-brew)',
};

export interface CoffeeVariant {
  form: BeanForm;
  sizeGrams: number;
  price: number;
  stock: number;
}

export interface CoffeeProduct {
  slug: string;
  name: string;
  origin: string;
  roast: Roast;
  flavors: string[];
  description: string;
  active?: boolean;
  variants: CoffeeVariant[];
}

export interface MenuItemData {
  name: string;
  description: string;
  price: number;
  available?: boolean;
}

export interface MenuCategoryData {
  name: string;
  items: MenuItemData[];
}

export const cafe = {
  name: 'Bean & Bloom',
  tagline: 'Small-batch coffee, roasted slow and served warm.',
  currency: 'Rs',
  address: '12 Coffee Street',
  hours: 'Daily · 7:00 – 20:00',
};

export const roastAccent: Record<Roast, string> = {
  Light: '#d9a24b',
  Medium: '#a8652b',
  Dark: '#4a2a17',
};

const v = (form: BeanForm, sizeGrams: number, price: number, stock: number): CoffeeVariant => ({
  form,
  sizeGrams,
  price,
  stock,
});

export const products: CoffeeProduct[] = [
  {
    slug: 'himalayan-sunrise',
    name: 'Himalayan Sunrise',
    origin: 'Gulmi, Nepal',
    roast: 'Medium',
    flavors: ['Caramel', 'Hazelnut', 'Orange peel'],
    description: 'Shade-grown Nepali arabica with a silky body and a sweet, nutty finish.',
    variants: [
      v('WHOLE_BEANS', 250, 950, 40),
      v('WHOLE_BEANS', 1000, 3400, 12),
      v('GROUND', 250, 980, 30),
      v('PACKAGED', 120, 520, 60),
    ],
  },
  {
    slug: 'yirgacheffe-bloom',
    name: 'Yirgacheffe Bloom',
    origin: 'Yirgacheffe, Ethiopia',
    roast: 'Light',
    flavors: ['Jasmine', 'Bergamot', 'Lemon'],
    description: 'Floral and tea-like, bright acidity — a showcase for pour-over.',
    variants: [
      v('WHOLE_BEANS', 250, 1250, 25),
      v('GROUND', 250, 1280, 18),
      v('PACKAGED', 120, 640, 35),
    ],
  },
  {
    slug: 'huila-chocolate',
    name: 'Huila Chocolate',
    origin: 'Huila, Colombia',
    roast: 'Medium',
    flavors: ['Milk chocolate', 'Red apple', 'Panela'],
    description: 'Balanced and crowd-pleasing, with round cocoa sweetness.',
    variants: [
      v('WHOLE_BEANS', 250, 1100, 32),
      v('WHOLE_BEANS', 1000, 4000, 8),
      v('GROUND', 250, 1130, 22),
    ],
  },
  {
    slug: 'mandheling-night',
    name: 'Mandheling Night',
    origin: 'Sumatra, Indonesia',
    roast: 'Dark',
    flavors: ['Dark chocolate', 'Cedar', 'Warm spice'],
    description: 'Earthy, heavy-bodied and low in acidity. Made for espresso and French press.',
    variants: [
      v('WHOLE_BEANS', 250, 1050, 28),
      v('GROUND', 250, 1080, 20),
      v('PACKAGED', 120, 560, 40),
    ],
  },
  {
    slug: 'kenya-aa-berry',
    name: 'Kenya AA Berry',
    origin: 'Nyeri, Kenya',
    roast: 'Light',
    flavors: ['Blackcurrant', 'Grapefruit', 'Brown sugar'],
    description: 'Juicy, vibrant and complex with a sparkling berry finish.',
    variants: [v('WHOLE_BEANS', 250, 1400, 15), v('GROUND', 250, 1430, 10)],
  },
  {
    slug: 'vanilla-hazelnut-blend',
    name: 'Vanilla Hazelnut Blend',
    origin: 'House blend',
    roast: 'Medium',
    flavors: ['Vanilla', 'Hazelnut', 'Toffee'],
    description: 'Our naturally flavored dessert coffee — gentle, sweet and cozy.',
    variants: [
      v('WHOLE_BEANS', 250, 900, 45),
      v('GROUND', 250, 930, 38),
      v('PACKAGED', 120, 480, 70),
    ],
  },
];

/** Menus are dynamic: add/remove categories and items freely. */
export const menus: MenuCategoryData[] = [
  {
    name: 'Sandwiches',
    items: [
      { name: 'Grilled Chicken Club', description: 'Toasted sourdough, chicken, lettuce, tomato, aioli.', price: 420 },
      { name: 'Paneer Tikka Sandwich', description: 'Spiced paneer, mint chutney, pickled onion.', price: 360 },
      { name: 'Classic Veg Grill', description: 'Cheese, cucumber, tomato, capsicum.', price: 280 },
    ],
  },
  {
    name: 'Hot Dogs',
    items: [
      { name: 'Classic Dog', description: 'Beef frank, mustard, ketchup, caramelized onion.', price: 320 },
      { name: 'Chili Cheese Dog', description: 'Smoky chili, cheddar, jalapeños.', price: 390 },
    ],
  },
  {
    name: 'Burgers',
    items: [
      { name: 'Roastery Burger', description: 'Beef patty, coffee-BBQ glaze, cheddar, pickles.', price: 520 },
      { name: 'Crispy Chicken Burger', description: 'Buttermilk fried chicken, slaw, hot honey.', price: 460 },
      { name: 'Garden Veggie Burger', description: 'Black-bean patty, avocado, sprouts.', price: 410 },
    ],
  },
  {
    name: 'Rolls',
    items: [
      { name: 'Chicken Kathi Roll', description: 'Egg-wrapped paratha, masala chicken, onions.', price: 340 },
      { name: 'Paneer Wrap', description: 'Grilled paneer, hummus, greens.', price: 320 },
      { name: 'Buff Roll', description: 'Local-style spiced buff, tangy sauce.', price: 300 },
    ],
  },
  {
    name: 'Sweet Bites',
    items: [
      { name: 'Tiramisu Cup', description: 'Espresso-soaked ladyfingers, mascarpone.', price: 310 },
      { name: 'Brownie & Ice Cream', description: 'Warm walnut brownie, vanilla scoop.', price: 280 },
    ],
  },
];
