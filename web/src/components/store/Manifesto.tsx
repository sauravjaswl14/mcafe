'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';
import { Bean } from './Bean';

const TEXT =
  'We roast in small batches, grind to order and cook everything from scratch. Because a good morning starts with something made with care.';
const EMPHASIS = new Set(['small', 'batches,', 'scratch.', 'care.']);

/** Scroll-scrubbed statement: every word lights up as you read down the page, while beans spin alongside. */
export function Manifesto() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          '.mw',
          { opacity: 0.12, y: 14 },
          {
            opacity: 1,
            y: 0,
            ease: 'none',
            stagger: 0.12,
            scrollTrigger: { trigger: root.current, start: 'top 75%', end: 'bottom 55%', scrub: 0.6 },
          },
        );
        gsap.utils.toArray<HTMLElement>('.mb').forEach((el, i) => {
          gsap.fromTo(
            el,
            { rotation: i ? 200 : -40, y: i ? -60 : 80 },
            { rotation: i ? -60 : 220, y: i ? 90 : -90, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true } },
          );
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative overflow-hidden bg-espresso-950 px-6 py-40">
      <div className="mb absolute left-[6%] top-24 w-20 opacity-80 sm:w-28">
        <Bean tone="medium" className="h-auto w-full drop-shadow-[0_18px_22px_rgba(0,0,0,0.55)]" />
      </div>
      <div className="mb absolute bottom-24 right-[7%] w-16 opacity-70 sm:w-24">
        <Bean tone="light" className="h-auto w-full drop-shadow-[0_18px_22px_rgba(0,0,0,0.55)]" />
      </div>

      <p className="relative mx-auto max-w-5xl text-center font-display text-4xl font-semibold leading-[1.2] text-cream-50 sm:text-6xl">
        {TEXT.split(' ').map((w, i) => (
          <span key={i} className={`mw inline-block ${EMPHASIS.has(w) ? 'italic text-caramel-300' : ''}`}>
            {w}&nbsp;
          </span>
        ))}
      </p>
    </section>
  );
}
