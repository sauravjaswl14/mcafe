'use client';

import { animate, motion, useMotionTemplate, useMotionValue, useTransform } from 'motion/react';
import { useEffect, useState } from 'react';
import { cafe } from '@shared/catalog';
import { getIntroDone, setIntroDone } from '@/lib/introStore';
import { Bean } from './Bean';

type Phase = 'loading' | 'leaving' | 'gone';

/**
 * Intro curtain: a bean fills with roast as the counter climbs, then the two halves
 * of the curtain split apart (spring-eased) and release the hero animations.
 */
export function Preloader() {
  const [phase, setPhase] = useState<Phase>(() => (getIntroDone() ? 'gone' : 'loading'));
  const [pct, setPct] = useState(0);
  const count = useMotionValue(0);
  const top = useTransform(count, [0, 100], [100, 0]);
  const clip = useMotionTemplate`inset(${top}% 0% 0% 0%)`;

  useEffect(() => {
    if (getIntroDone()) return;
    let seen = false;
    try {
      seen = sessionStorage.getItem('intro-seen') === '1';
    } catch {
      /* storage unavailable */
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const quick = seen || reduce;
    document.documentElement.style.overflow = 'hidden';

    const c = animate(count, 100, {
      duration: quick ? 0.6 : 2.4,
      ease: [0.65, 0, 0.35, 1],
      onUpdate: (v) => setPct(Math.round(v)),
      onComplete: () => {
        try {
          sessionStorage.setItem('intro-seen', '1');
        } catch {
          /* ignore */
        }
        setPhase('leaving');
        window.setTimeout(setIntroDone, 450);
      },
    });
    return () => c.stop();
  }, [count]);

  useEffect(() => {
    if (phase === 'gone') document.documentElement.style.overflow = '';
  }, [phase]);

  if (phase === 'gone') return null;
  const leaving = phase === 'leaving';
  const split = { duration: 1.05, ease: [0.76, 0, 0.24, 1] as [number, number, number, number], delay: 0.05 };

  return (
    <div className={`fixed inset-0 z-[90] ${leaving ? 'pointer-events-none' : ''}`} role="status" aria-label="Loading">
      <motion.div
        className="absolute inset-x-0 top-0 h-1/2 bg-espresso-950"
        animate={{ y: leaving ? '-100%' : '0%' }}
        transition={split}
        onAnimationComplete={() => leaving && setPhase('gone')}
      />
      <motion.div className="absolute inset-x-0 bottom-0 h-1/2 bg-espresso-950" animate={{ y: leaving ? '100%' : '0%' }} transition={split} />

      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center gap-6"
        animate={{ opacity: leaving ? 0 : 1, scale: leaving ? 1.12 : 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="relative w-24">
          <Bean tone="light" className="h-auto w-full opacity-15" />
          <motion.div className="absolute inset-0" style={{ clipPath: clip }}>
            <Bean tone="medium" className="h-auto w-full" />
          </motion.div>
        </div>
        <p className="font-display text-6xl font-semibold tabular-nums text-cream-50">
          {pct}
          <span className="text-2xl text-caramel-300">%</span>
        </p>
        <p className="text-xs uppercase tracking-[0.4em] text-caramel-300">Roasting · {cafe.name}</p>
      </motion.div>
    </div>
  );
}
