'use client';

import { motion, useReducedMotion, type Variants } from 'motion/react';
import { useRef, type ReactNode, type PointerEvent as RPointerEvent } from 'react';
import { useMotionValue, useSpring } from 'motion/react';
import { useIntroDone } from '@/lib/introStore';

interface Props {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  x?: number;
}

/** Fade + slide into place with a soft spring the first time the element scrolls into view. */
export function Reveal({ children, className, delay = 0, y = 48, x = 0 }: Props) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y, x }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ type: 'spring', stiffness: 90, damping: 16, mass: 0.9, delay }}
    >
      {children}
    </motion.div>
  );
}

const charVariants: Variants = {
  hidden: { y: '125%', rotate: 9, opacity: 0 },
  show: (i: number) => ({
    y: 0,
    rotate: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 150, damping: 15, mass: 0.8, delay: i * 0.028 },
  }),
};

/**
 * Character-by-character headline. Each letter springs up out of a mask with a slight
 * overshoot and rotation. `intro` waits for the preloader; `view` waits for scroll.
 */
export function SplitText({
  text,
  className = '',
  delay = 0,
  trigger = 'view',
}: {
  text: string;
  className?: string;
  delay?: number;
  trigger?: 'intro' | 'view';
}) {
  const reduce = useReducedMotion();
  const introDone = useIntroDone();
  const words = text.split(' ');
  let n = 0;

  // The trigger lives on the OUTER span and the letters inherit it through variants.
  // (Observing each letter fails: they start translated outside their own overflow mask,
  // so the browser reports them as never visible.)
  const root =
    trigger === 'intro'
      ? { initial: reduce ? 'show' : 'hidden', animate: introDone ? 'show' : 'hidden' }
      : { initial: reduce ? 'show' : 'hidden', whileInView: 'show', viewport: { once: true, margin: '-12% 0px' } };

  return (
    <motion.span className={className} aria-label={text} {...root}>
      {words.map((w, wi) => (
        <span key={wi}>
          <span className="inline-block overflow-hidden pb-[0.2em] -mb-[0.2em] align-bottom" aria-hidden="true">
            {[...w].map((ch, ci) => {
              const i = n++;
              return (
                <motion.span key={ci} className="inline-block will-change-transform" variants={charVariants} custom={i + delay / 0.028}>
                  {ch}
                </motion.span>
              );
            })}
          </span>
          {wi < words.length - 1 && ' '}
        </span>
      ))}
    </motion.span>
  );
}

/** Pulls its child toward the cursor with a springy magnet effect. */
export function Magnetic({ children, strength = 0.35, className = '' }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 14, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 220, damping: 14, mass: 0.5 });

  const move = (e: RPointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const leave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div ref={ref} style={{ x: sx, y: sy }} onPointerMove={move} onPointerLeave={leave} className={`inline-block ${className}`}>
      {children}
    </motion.div>
  );
}
