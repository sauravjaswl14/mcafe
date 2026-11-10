'use client';

import { AnimatePresence, motion, useScroll, useTransform } from 'motion/react';
import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';
import { useCart } from '@/lib/cart';
import { money } from '@/lib/format';
import { useMenu } from '@/lib/queries';
import { useWebGLMode } from '@/lib/useWebGL';
import { Bean } from './Bean';
import { Reveal, SplitText } from './Reveal';
import { foodKindFor } from './three/food';

const FoodViewer = dynamic(() => import('./three/FoodViewer'), { ssr: false });

/** Decorative beans drifting at different speeds as the menu scrolls past (Motion scroll-linked parallax). */
function DriftingBeans({ target }: { target: React.RefObject<HTMLElement | null> }) {
  const { scrollYProgress } = useScroll({ target, offset: ['start end', 'end start'] });
  const slow = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const fast = useTransform(scrollYProgress, [0, 1], [220, -220]);
  const spin = useTransform(scrollYProgress, [0, 1], [-40, 140]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <motion.div style={{ y: fast, rotate: spin }} className="absolute -left-6 top-24 w-28 opacity-90">
        <Bean tone="dark" className="h-auto w-full drop-shadow-[0_16px_20px_rgba(0,0,0,0.5)]" />
      </motion.div>
      <motion.div style={{ y: slow, rotate: spin }} className="absolute right-10 top-1/3 w-16 opacity-50 blur-[1px]">
        <Bean tone="medium" className="h-auto w-full" />
      </motion.div>
      <motion.div style={{ y: fast }} className="absolute -right-4 bottom-24 w-32 rotate-[25deg]">
        <Bean tone="light" className="h-auto w-full drop-shadow-[0_16px_20px_rgba(0,0,0,0.5)]" />
      </motion.div>
    </div>
  );
}

export function MenuSection() {
  const ref = useRef<HTMLElement>(null);
  const { data, isLoading } = useMenu();
  const { add } = useCart();
  const mode = useWebGLMode();
  const [active, setActive] = useState<number | null>(null);

  const categories = data?.items ?? [];
  const current = categories.find((c) => c.id === active) ?? categories[0];
  const show3d = mode === '3d' && Boolean(current);

  return (
    <section ref={ref} id="menu" className="relative overflow-hidden bg-espresso-900 px-6 py-28">
      <DriftingBeans target={ref} />

      <div className="relative mx-auto max-w-6xl">
        <div className="text-center">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-caramel-300">From the kitchen</p>
          </Reveal>
          <h2 className="mt-3 font-display text-4xl font-semibold text-cream-50 sm:text-6xl">
            <SplitText text="The menu" />
          </h2>
          <Reveal delay={0.1}>
            <p className="mx-auto mt-4 max-w-md text-cream-200">Sandwiches, hot dogs, burgers, rolls and sweet bites that go with the coffee.</p>
          </Reveal>
        </div>

        <Reveal delay={0.1} className="mt-10 flex flex-wrap justify-center gap-2">
          {categories.map((c) => {
            const on = c.id === current?.id;
            return (
              <button
                key={c.id}
                onClick={() => setActive(c.id)}
                className={`relative rounded-full px-5 py-2 text-sm font-medium transition ${on ? 'text-espresso-950' : 'text-cream-200 hover:text-cream-50'}`}
              >
                {on && <motion.span layoutId="menu-pill" className="absolute inset-0 rounded-full bg-caramel-400" transition={{ type: 'spring', stiffness: 420, damping: 26 }} />}
                <span className="relative">{c.name}</span>
              </button>
            );
          })}
        </Reveal>

        {isLoading && <div className="mt-12 h-64 animate-pulse rounded-3xl bg-espresso-800" />}

        <div className={`mt-12 grid items-start gap-8 ${show3d ? 'lg:grid-cols-[0.9fr_1.1fr]' : 'mx-auto max-w-4xl'}`}>
          {show3d && current && (
            <div className="lg:sticky lg:top-28">
              <Reveal x={-40}>
                <FoodViewer kind={foodKindFor(current.name)} />
              </Reveal>
            </div>
          )}

          <AnimatePresence mode="wait">
            {current && (
              <motion.ul
                key={current.id}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, y: -12, transition: { duration: 0.18 } }}
                variants={{ show: { transition: { staggerChildren: 0.08 } } }}
                className="divide-y divide-white/10 rounded-3xl border border-white/5 bg-espresso-950/60 px-6 backdrop-blur-sm sm:px-10"
              >
                {current.items.map((it) => (
                  <motion.li
                    key={it.id}
                    variants={{
                      hidden: { opacity: 0, y: 30, rotateX: -25 },
                      show: { opacity: 1, y: 0, rotateX: 0, transition: { type: 'spring', stiffness: 130, damping: 14 } },
                    }}
                    whileHover={{ x: 10 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                    className="flex items-center justify-between gap-6 py-6"
                    style={{ transformPerspective: 800 }}
                  >
                    <div>
                      <h3 className="font-display text-xl font-semibold text-cream-50">{it.name}</h3>
                      {it.description && <p className="mt-1 text-sm text-cream-300">{it.description}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-4">
                      <span className="font-display text-lg text-caramel-300">{money(it.price)}</span>
                      <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.8, rotate: 90 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 14 }}
                        onClick={() => add({ key: `m:${it.id}`, kind: 'menu', id: it.id, name: it.name, detail: current.name, price: it.price, offline: Boolean(data?.offline) })}
                        aria-label={`Add ${it.name} to cart`}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-caramel-400/50 text-lg text-caramel-300 transition-colors hover:bg-caramel-400 hover:text-espresso-950"
                      >
                        +
                      </motion.button>
                    </div>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
