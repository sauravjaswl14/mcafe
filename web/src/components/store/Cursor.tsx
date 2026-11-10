'use client';

import { motion, useMotionValue, useSpring } from 'motion/react';
import { useEffect, useState } from 'react';

type Mode = 'idle' | 'link' | 'drag';

/** Spring-following cursor: a dot that tracks exactly and a ring that lags, swells over links and shows "Drag" over 3D. */
export function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<Mode>('idle');
  const [down, setDown] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const rx = useSpring(x, { stiffness: 260, damping: 22, mass: 0.6 });
  const ry = useSpring(y, { stiffness: 260, damping: 22, mass: 0.6 });

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return;
    setEnabled(true);
    document.documentElement.classList.add('has-cursor');

    let lx = -100;
    let ly = -100;
    const classify = (el: Element | null) => {
      const t = el?.closest<HTMLElement>('a,button,[data-cursor]');
      setMode(t?.dataset.cursor === 'drag' ? 'drag' : t ? 'link' : 'idle');
    };
    const move = (e: PointerEvent) => {
      lx = e.clientX;
      ly = e.clientY;
      x.set(lx);
      y.set(ly);
      classify(e.target as Element | null);
    };
    // content scrolls under a stationary pointer, so re-check what is beneath it
    const onScroll = () => classify(document.elementFromPoint(lx, ly));
    const dn = () => setDown(true);
    const up = () => setDown(false);
    window.addEventListener('pointermove', move);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointerdown', dn);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointerdown', dn);
      window.removeEventListener('pointerup', up);
      document.documentElement.classList.remove('has-cursor');
    };
  }, [x, y]);

  if (!enabled) return null;
  const size = mode === 'drag' ? 92 : mode === 'link' ? 60 : 34;

  return (
    <>
      <motion.div style={{ x, y }} className="pointer-events-none fixed left-0 top-0 z-[100]" aria-hidden="true">
        <div className="-translate-x-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-caramel-300" />
      </motion.div>
      <motion.div style={{ x: rx, y: ry }} className="pointer-events-none fixed left-0 top-0 z-[99]" aria-hidden="true">
        <motion.div
          animate={{ width: size, height: size, scale: down ? 0.82 : 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          className={`-translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full border text-[11px] font-semibold uppercase tracking-widest transition-colors ${
            mode === 'idle' ? 'border-cream-200/40' : 'border-caramel-300 bg-caramel-400/15 text-caramel-300 backdrop-blur-[2px]'
          }`}
        >
          {mode === 'drag' ? 'Drag' : ''}
        </motion.div>
      </motion.div>
    </>
  );
}
