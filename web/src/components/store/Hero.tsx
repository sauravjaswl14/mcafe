'use client';

import { motion, useScroll, useTransform } from 'motion/react';
import dynamic from 'next/dynamic';
import { useEffect, useRef } from 'react';
import { cafe } from '@shared/catalog';
import { useIntroDone } from '@/lib/introStore';
import { useWebGLMode } from '@/lib/useWebGL';
import { BeanField } from './BeanField';
import { Magnetic, SplitText } from './Reveal';
import type { HeroInput } from './three/types';

const HeroScene = dynamic(() => import('./three/HeroScene'), { ssr: false });

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const input = useRef<HeroInput>({ x: 0, y: 0, burst: false });
  const mode = useWebGLMode();
  const done = useIntroDone();

  // Motion drives the headline parallax; three.js drives the beans; GSAP drives the SVG fallback
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const textY = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const textScale = useTransform(scrollYProgress, [0, 1], [1, 0.9]);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      input.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      input.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, []);

  const fade = (delay: number) => ({
    initial: { opacity: 0, y: 24 },
    animate: done ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 },
    transition: { type: 'spring' as const, stiffness: 90, damping: 16, delay },
  });

  return (
    <section
      ref={ref}
      id="top"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-espresso-950"
      onPointerDown={(e) => {
        input.current.x = (e.clientX / window.innerWidth) * 2 - 1;
        input.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
        if (window.scrollY < window.innerHeight * 0.8) input.current.burst = true;
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,#3b2619_0%,#1c120c_55%,#120b07_100%)]" />
      {mode === '3d' && <HeroScene input={input} />}
      {mode === 'fallback' && <BeanField />}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(18,11,7,0.72)_0%,rgba(18,11,7,0.2)_55%,transparent_80%)]" />

      <motion.div style={{ y: textY, opacity: textOpacity, scale: textScale }} className="pointer-events-none relative z-30 mx-auto max-w-3xl px-6 text-center">
        <motion.p
          initial={{ opacity: 0, letterSpacing: '0.1em' }}
          animate={done ? { opacity: 1, letterSpacing: '0.35em' } : { opacity: 0, letterSpacing: '0.1em' }}
          transition={{ duration: 1.4 }}
          className="mb-6 text-xs font-medium uppercase text-caramel-300"
        >
          Specialty roasters &amp; café
        </motion.p>

        <h1 className="font-display text-5xl font-semibold leading-[1.05] text-cream-50 sm:text-7xl">
          <SplitText text="Coffee worth" trigger="intro" delay={0.1} />
          <br />
          <SplitText text="waking up for." trigger="intro" delay={0.45} className="italic text-caramel-300" />
        </h1>

        <motion.p {...fade(1.0)} className="mx-auto mt-6 max-w-xl text-lg text-cream-200">
          {cafe.tagline} Whole beans, ground or ready-to-brew, plus a menu made fresh all day.
        </motion.p>

        <motion.div {...fade(1.2)} className="pointer-events-auto mt-10 flex flex-wrap items-center justify-center gap-4">
          <Magnetic>
            <a href="#coffee" className="inline-block rounded-full bg-caramel-400 px-7 py-3 font-semibold text-espresso-950 transition-colors hover:bg-caramel-300">
              Shop coffee
            </a>
          </Magnetic>
          <Magnetic>
            <a href="#menu" className="inline-block rounded-full border border-cream-200/30 px-7 py-3 font-semibold text-cream-50 transition-colors hover:border-caramel-300 hover:text-caramel-300">
              See the menu
            </a>
          </Magnetic>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: done ? 1 : 0 }}
        transition={{ delay: 1.6 }}
        className="absolute bottom-8 left-1/2 z-30 -translate-x-1/2 text-xs uppercase tracking-[0.3em] text-cream-300"
      >
        <motion.span animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.8 }} className="block">
          Scroll ↓
        </motion.span>
      </motion.div>

      {mode === '3d' && (
        <p className="pointer-events-none absolute bottom-8 right-6 z-30 hidden text-[11px] uppercase tracking-[0.3em] text-cream-300/60 md:block">
          Move · Click to scatter
        </p>
      )}
    </section>
  );
}
