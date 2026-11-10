'use client';

import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'motion/react';
import { useMemo, useState } from 'react';
import { BEAN_FORMS, roastAccent, type Roast } from '@shared/catalog';
import { useCart } from '@/lib/cart';
import { money } from '@/lib/format';
import { useProducts } from '@/lib/queries';
import type { BeanForm, Product, RoastKey } from '@/lib/types';
import { Bean, type BeanTone } from './Bean';
import { Reveal, SplitText } from './Reveal';

const ROAST_TONE: Record<RoastKey, BeanTone> = { LIGHT: 'light', MEDIUM: 'medium', DARK: 'dark' };
const ROAST_LABEL: Record<RoastKey, Roast> = { LIGHT: 'Light', MEDIUM: 'Medium', DARK: 'Dark' };

const chip = (active: boolean) =>
  `rounded-full border px-4 py-1.5 text-sm transition ${
    active
      ? 'border-caramel-400 bg-caramel-400 font-semibold text-espresso-950'
      : 'border-cream-200/20 text-cream-200 hover:border-caramel-300'
  }`;

export function Products() {
  const { data, isLoading, error } = useProducts();
  const [roast, setRoast] = useState<RoastKey | 'ALL'>('ALL');
  const [form, setForm] = useState<BeanForm | 'ALL'>('ALL');

  const items = data?.items ?? [];
  const shown = useMemo(
    () =>
      items.filter(
        (p) => (roast === 'ALL' || p.roast === roast) && (form === 'ALL' || p.variants.some((v) => v.form === form)),
      ),
    [items, roast, form],
  );

  return (
    <section id="coffee" className="relative bg-espresso-950 px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-caramel-300">The roastery</p>
        </Reveal>
        <h2 className="mt-3 font-display text-4xl font-semibold text-cream-50 sm:text-6xl">
          <SplitText text="Our coffees" />
        </h2>
        <Reveal delay={0.1}>
          <p className="mt-4 max-w-xl text-cream-200">
            Every coffee comes as whole beans, ground for your brewer, or packaged and ready to brew.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by roast">
            <button className={chip(roast === 'ALL')} onClick={() => setRoast('ALL')}>All roasts</button>
            {(Object.keys(ROAST_LABEL) as RoastKey[]).map((r) => (
              <button key={r} className={chip(roast === r)} onClick={() => setRoast(r)}>{ROAST_LABEL[r]}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by form">
            <button className={chip(form === 'ALL')} onClick={() => setForm('ALL')}>Any form</button>
            {(Object.keys(BEAN_FORMS) as BeanForm[]).map((f) => (
              <button key={f} className={chip(form === f)} onClick={() => setForm(f)}>{BEAN_FORMS[f]}</button>
            ))}
          </div>
        </Reveal>

        {data?.offline && (
          <p className="mt-6 rounded-lg border border-caramel-400/30 bg-caramel-400/10 px-4 py-3 text-sm text-caramel-300">
            Showing the demo catalog because the API isn&apos;t reachable. Start the server to enable ordering.
          </p>
        )}
        {error && <p className="mt-6 text-sm text-red-300">Couldn&apos;t load coffees. Please refresh.</p>}

        <motion.div layout className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading && Array.from({ length: 3 }, (_, i) => <div key={i} className="h-96 animate-pulse rounded-3xl bg-espresso-800" />)}
          <AnimatePresence mode="popLayout">
            {shown.map((p, i) => (
              <ProductCard key={p.id} product={p} form={form} index={i} offline={Boolean(data?.offline)} />
            ))}
          </AnimatePresence>
        </motion.div>

        {!isLoading && shown.length === 0 && (
          <p className="mt-10 text-center text-cream-300">No coffees match those filters.</p>
        )}
      </div>
    </section>
  );
}

function ProductCard({ product, form: filterForm, index, offline }: { product: Product; form: BeanForm | 'ALL'; index: number; offline: boolean }) {
  const { add } = useCart();

  // 3D tilt + moving glare + bean parallax, all spring-smoothed from one pointer position
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotY = useSpring(useTransform(mx, [0, 1], [-8, 8]), { stiffness: 180, damping: 14 });
  const rotX = useSpring(useTransform(my, [0, 1], [8, -8]), { stiffness: 180, damping: 14 });
  const beanX = useSpring(useTransform(mx, [0, 1], [-16, 16]), { stiffness: 120, damping: 14 });
  const gx = useTransform(mx, (v) => `${v * 100}%`);
  const gy = useTransform(my, (v) => `${v * 100}%`);
  const glare = useMotionTemplate`radial-gradient(380px circle at ${gx} ${gy}, rgba(255,226,170,0.16), transparent 65%)`;

  const forms = useMemo(() => [...new Set(product.variants.map((v) => v.form))], [product.variants]);
  const [form, setForm] = useState<BeanForm>(forms.includes(filterForm as BeanForm) ? (filterForm as BeanForm) : forms[0]);
  const sizes = product.variants.filter((v) => v.form === form);
  const [variantId, setVariantId] = useState<number>(sizes[0]?.id ?? product.variants[0].id);

  const variant = sizes.find((v) => v.id === variantId) ?? sizes[0];
  const soldOut = !variant || variant.stock <= 0;
  const accent = roastAccent[ROAST_LABEL[product.roast]];

  const pickForm = (f: BeanForm) => {
    setForm(f);
    const first = product.variants.find((v) => v.form === f);
    if (first) setVariantId(first.id);
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 90, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 110, damping: 15, delay: Math.min(index, 5) * 0.08 }}
      whileHover={{ y: -8 }}
      style={{ rotateX: rotX, rotateY: rotY, transformPerspective: 900 }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width);
        my.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => {
        mx.set(0.5);
        my.set(0.5);
      }}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/5 bg-espresso-800"
    >
      <motion.div style={{ background: glare }} className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative h-40 overflow-hidden" style={{ background: `radial-gradient(circle at 30% 20%, ${accent}, #1c120c 80%)` }}>
        {[0, 1, 2].map((k) => (
          <motion.div
            key={k}
            className="absolute w-12 drop-shadow-[0_10px_12px_rgba(0,0,0,0.5)]"
            style={{ left: `${18 + k * 28}%`, top: `${22 + (k % 2) * 22}%`, rotate: -30 + k * 35, x: beanX }}
            whileInView={{ y: [0, -6, 0] }}
            transition={{ duration: 3 + k, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Bean tone={ROAST_TONE[product.roast]} className="h-auto w-full transition-transform duration-500 group-hover:rotate-12" />
          </motion.div>
        ))}
        <span className="absolute right-4 top-4 rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-cream-50 backdrop-blur">
          {ROAST_LABEL[product.roast]} roast
        </span>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <p className="text-xs uppercase tracking-widest text-caramel-300">{product.origin}</p>
        <h3 className="mt-1 font-display text-2xl font-semibold text-cream-50">{product.name}</h3>
        <p className="mt-2 text-sm leading-relaxed text-cream-200">{product.description}</p>

        <ul className="mt-4 flex flex-wrap gap-2">
          {product.flavors.map((f) => (
            <li key={f} className="rounded-full bg-white/5 px-3 py-1 text-xs text-cream-100">{f}</li>
          ))}
        </ul>

        <div className="mt-5 space-y-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Form">
            {forms.map((f) => (
              <button key={f} onClick={() => pickForm(f)} className={chip(f === form) + ' !px-3 !py-1 !text-xs'}>
                {BEAN_FORMS[f]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Size">
            {sizes.map((v) => (
              <button
                key={v.id}
                onClick={() => setVariantId(v.id)}
                className={`rounded-lg border px-3 py-1 text-xs transition ${
                  v.id === variant?.id ? 'border-caramel-400 text-caramel-300' : 'border-cream-200/15 text-cream-200 hover:border-cream-200/40'
                }`}
              >
                {v.sizeGrams >= 1000 ? `${v.sizeGrams / 1000} kg` : `${v.sizeGrams} g`}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between pt-6">
          <div>
            <p className="font-display text-2xl font-semibold text-cream-50">{variant ? money(variant.price) : '—'}</p>
            {variant && variant.stock > 0 && variant.stock <= 10 && (
              <p className="text-xs text-caramel-300">Only {variant.stock} left</p>
            )}
            {soldOut && <p className="text-xs text-red-300">Sold out</p>}
          </div>
          <motion.button
            whileTap={{ scale: 0.94 }}
            disabled={soldOut}
            onClick={() =>
              variant &&
              add({
                key: `v:${variant.id}`,
                kind: 'variant',
                id: variant.id,
                name: product.name,
                detail: `${BEAN_FORMS[variant.form]} · ${variant.sizeGrams}g`,
                price: variant.price,
                offline,
              })
            }
            className="rounded-full bg-caramel-400 px-5 py-2 text-sm font-semibold text-espresso-950 transition hover:bg-caramel-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add to cart
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
}
