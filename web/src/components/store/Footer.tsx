'use client';

import { motion } from 'motion/react';
import { useRef } from 'react';
import { cafe } from '@shared/catalog';
import { gsap, useGSAP } from '@/lib/gsap';
import { Magnetic, SplitText } from './Reveal';

export function Footer() {
  const root = useRef<HTMLElement>(null);

  // Giant outlined wordmark slides sideways as the footer scrolls into view
  useGSAP(
    () => {
      gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo('.f-word', { xPercent: 12 }, { xPercent: -28, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom bottom', scrub: true } });
      });
    },
    { scope: root },
  );

  return (
    <footer ref={root} id="visit" className="overflow-hidden bg-espresso-950 pb-10 pt-28">
      <div className="px-6">
        <motion.div
          initial={{ clipPath: 'inset(22% 16% 22% 16% round 4rem)' }}
          whileInView={{ clipPath: 'inset(0% 0% 0% 0% round 2.5rem)' }}
          viewport={{ once: true, margin: '-15% 0px' }}
          transition={{ type: 'spring', stiffness: 60, damping: 18 }}
          className="mx-auto max-w-4xl bg-caramel-400 px-8 py-16 text-center text-espresso-950 sm:px-16"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.3em]">Come say hello</p>
          <h2 className="mt-3 font-display text-4xl font-semibold sm:text-6xl">
            <SplitText text="Fresh pour, warm seat." />
          </h2>
          <p className="mt-5 text-lg">{cafe.address}</p>
          <p className="text-lg font-medium">{cafe.hours}</p>
          <div className="mt-8">
            <Magnetic>
              <a href="#top" className="inline-block rounded-full bg-espresso-950 px-6 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-espresso-800">
                Back to top ↑
              </a>
            </Magnetic>
          </div>
        </motion.div>
      </div>

      <div className="mt-20 select-none overflow-hidden" aria-hidden="true">
        <p className="f-word whitespace-nowrap font-display text-[20vw] font-semibold leading-none text-transparent [-webkit-text-stroke:1.5px_rgba(230,211,177,0.22)]">
          {cafe.name} · {cafe.name} · {cafe.name}
        </p>
      </div>

      <p className="mt-10 text-center text-sm text-cream-300">
        © {new Date().getFullYear()} {cafe.name}. Roasted with care.
      </p>
    </footer>
  );
}
