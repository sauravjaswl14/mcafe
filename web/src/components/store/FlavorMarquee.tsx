'use client';

import { motion, useAnimationFrame, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, useVelocity } from 'motion/react';
import { useMemo, useRef } from 'react';
import { useProducts } from '@/lib/queries';

const wrap = (min: number, max: number, v: number) => {
  const range = max - min;
  return ((((v - min) % range) + range) % range) + min;
};

/**
 * Endless ticker of tasting notes. It reacts to scroll: speed up when you scroll fast,
 * reverse direction when you scroll up, and skew with the velocity.
 */
export function FlavorMarquee() {
  const { data } = useProducts();
  const reduce = useReducedMotion();
  const flavors = useMemo(() => [...new Set((data?.items ?? []).flatMap((p) => p.flavors))], [data]);

  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const boost = useTransform(velocity, [0, 1000], [0, 5], { clamp: false });
  const skewX = useTransform(velocity, [-2000, 0, 2000], [-10, 0, 10], { clamp: true });
  const x = useTransform(baseX, (v) => `${v}%`);
  const dir = useRef(1);

  useAnimationFrame((_, delta) => {
    if (reduce) return;
    const b = boost.get();
    if (b < -0.05) dir.current = -1;
    else if (b > 0.05) dir.current = 1;
    let move = dir.current * -2 * (delta / 1000);
    move += move * Math.abs(b);
    baseX.set(wrap(-25, 0, baseX.get() + move));
  });

  if (!flavors.length) return <div className="h-14 bg-caramel-400" />;

  return (
    <div className="overflow-hidden bg-caramel-400 py-4 text-espresso-950" aria-hidden="true">
      <motion.div style={{ x, skewX }} className="flex w-max whitespace-nowrap font-display text-xl font-semibold">
        {[0, 1, 2, 3].map((k) => (
          <div key={k} className="flex shrink-0 items-center gap-10 pr-10">
            {flavors.map((f) => (
              <span key={f} className="flex items-center gap-10">
                {f}
                <span className="text-espresso-800">✦</span>
              </span>
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
