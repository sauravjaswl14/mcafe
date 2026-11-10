# Bean & Bloom: PERN café platform

Storefront (Next.js) + admin dashboard (orders, sales, purchases, HMS, CRUD) + REST API (Express, Prisma, PostgreSQL).

```
cafe/
├─ shared/catalog.ts   ← SINGLE SOURCE OF TRUTH: coffee products + dynamic menus
├─ server/             ← Express + Prisma + PostgreSQL (JWT cookie auth, admin-only routes)
└─ web/                ← Next.js 15, React 19, Tailwind v4, TanStack Query, motion, GSAP
```

## Quick start

```bash
# 1. Database (any Postgres 14+). Example with Docker:
docker run -d --name cafe-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=cafe -p 5432:5432 postgres:16

# 2. API
cd server
cp .env.example .env            # set JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm install
npx prisma migrate dev --name init
npm run seed                    # loads shared/catalog.ts + admin user + sample rooms/suppliers
npm run dev                     # http://localhost:4000

# 3. Web
cd ../web
cp .env.example .env.local
npm install
npm run dev                     # http://localhost:3000
```

Admin dashboard: <http://localhost:3000/admin>. Log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `server/.env`.

## How the pieces fit

**Single source of truth.** `shared/catalog.ts` holds every coffee (flavors, roast, origin, bean/ground/packaged variants with size, price, stock) and every menu category and item. The seed script writes it into PostgreSQL; the storefront also falls back to it when the API is offline. Edit the file and run `npm run seed` again. It is idempotent: it upserts products and never overwrites stock or prices you changed in the dashboard unless you pass `--reset`.

**Authorization.**
- `POST /api/auth/register` always creates a `CUSTOMER`. Nobody can self-register as admin.
- The admin user is created by the seed from `.env`.
- JWT lives in an httpOnly cookie. Every dashboard API route is behind `requireAdmin`.
- In the web app, `middleware.ts` blocks `/admin/*` without a session cookie, and the admin layout re-checks `role === "ADMIN"` via `/api/auth/me`. The API is the real enforcement; the front end checks are convenience.

**Entity relations (Prisma).**

| Domain | Entities |
| --- | --- |
| Catalog | `Product` 1—N `ProductVariant`; `MenuCategory` 1—N `MenuItem` |
| Orders | `Order` 1—N `OrderItem` → (`ProductVariant` or `MenuItem`); `Order` 1—1 `Sale`; `Order` N—1 `User`; `Order` N—1 `Booking` (room service) |
| Purchasing | `Supplier` 1—N `PurchaseOrder` 1—N `PurchaseItem` → `ProductVariant` (receiving stock increases inventory) |
| HMS | `Room` 1—N `Booking` N—1 `Guest`; `Booking` 1—N `Order` (charges added to the bill at check-out) |

**Business rules enforced server-side.** Prices come from the DB, never the client. Stock is decremented atomically when an order is placed and restored on cancel. A `Sale` is created when an order completes. Receiving a purchase order adds stock. Bookings can't overlap on the same room. Check-in/out drives room status.

## Production notes
- Serve web and API on the same site (e.g. `app.example.com` and `api.example.com`) and set `COOKIE_DOMAIN`. For fully cross-site setups use `SameSite=None; Secure` (set `NODE_ENV=production` and `COOKIE_SAMESITE=none`).
- Put the API behind HTTPS and add rate limiting on `/api/auth/login`.

## Motion & 3D layer

| Piece | Tech | Where |
| --- | --- | --- |
| Inertial smooth scroll, synced to ScrollTrigger | Lenis + GSAP ticker | `SmoothScroll.tsx` |
| Intro curtain (bean fills as it counts, halves split open) | motion | `Preloader.tsx` |
| Spring cursor, "Drag" label over 3D | motion | `Cursor.tsx` |
| 64 instanced 3D coffee beans: cursor repels them, click sends a shockwave, scroll parallax | three.js / R3F | `three/CoffeeBeans.tsx` |
| Pinned story: a 3D bean spins and roasts green → dark on a spring, with roast steam | GSAP ScrollTrigger + three.js | `BeanJourney.tsx`, `three/JourneyScene.tsx` |
| Menu viewer: burger, hot dog, sandwich, roll, dessert (procedural, no assets). The model follows the active menu category; hover pulls it into layers, drag spins it with inertia | three.js | `three/food.tsx`, `three/FoodViewer.tsx` |
| Letter-by-letter spring headlines, magnetic buttons, scroll-lit manifesto, velocity-skewed marquee, tilt + glare product cards, clip-path footer reveal | motion + GSAP | `Reveal.tsx`, `Manifesto.tsx`, `FlavorMarquee.tsx`, `Products.tsx`, `Footer.tsx` |

Menus are dynamic, so a category's 3D model is chosen by name (`foodKindFor` in `three/food.tsx`): "Burgers" → burger, "Hot Dogs" → hot dog, and so on. Unknown names fall back to the burger.

**Accessibility and fallbacks.** If the visitor prefers reduced motion or WebGL is unavailable, the 3D scenes, smooth scroll, cursor and intro are skipped and the SVG beans are used. Canvases stop rendering while off screen.
