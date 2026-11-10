'use client';

import Lenis from 'lenis';
import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useIntroDone } from '@/lib/introStore';

/**
 * Inertial smooth scrolling (Lenis) wired into GSAP's ticker so ScrollTrigger,
 * Motion's scroll hooks and the 3D scenes all see the same smoothed scroll position.
 * Locked while the intro curtain is up.
 */
export function SmoothScroll() {
  const done = useIntroDone();
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
    lenisRef.current = lenis;
    lenis.on('scroll', ScrollTrigger.update);

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // in-page anchors glide instead of jumping
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      const id = a?.getAttribute('href');
      if (!a || !id || id.length < 2) return;
      const el = document.querySelector<HTMLElement>(id);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { duration: 1.7, easing: (t) => 1 - Math.pow(1 - t, 4) });
    };
    document.addEventListener('click', onClick);

    return () => {
      document.removeEventListener('click', onClick);
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  useEffect(() => {
    const l = lenisRef.current;
    if (!l) return;
    if (done) l.start();
    else l.stop();
  }, [done]);

  return null;
}
