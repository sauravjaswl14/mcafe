'use client';

import dynamic from 'next/dynamic';
import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';
import { useWebGLMode } from '@/lib/useWebGL';
import { Bean, BEAN_COLORS } from './Bean';

const JourneyScene = dynamic(() => import('./three/JourneyScene'), { ssr: false });

const STEPS = [
  { tag: '01 · Grown', title: 'Shade-grown on high slopes', text: 'Arabica ripens slowly at altitude, building the sugars that become sweetness in your cup.', color: BEAN_COLORS.green },
  { tag: '02 · Processed', title: 'Hand-picked, washed and dried', text: 'Only ripe cherries are picked, then washed and sun-dried until the beans turn pale and firm.', color: '#c9a064' },
  { tag: '03 · Roasted', title: 'Small batches, slow roast', text: 'We roast in small batches and watch every second. Caramel, nut or dark cocoa, the roast brings it out.', color: BEAN_COLORS.medium },
  { tag: '04 · Brewed', title: 'Ground fresh for your cup', text: 'Take it home as whole beans, ground to your brew method, or ready-to-brew. Same care, three ways.', color: BEAN_COLORS.dark },
];

/**
 * Pinned, scroll-scrubbed story (GSAP ScrollTrigger). While the section is pinned, scroll progress
 * drives (a) the copy swapping step by step and (b) a real 3D bean that spins and roasts from green to
 * dark through a spring, so it lags and overshoots instead of following scroll rigidly.
 */
export function BeanJourney() {
  const root = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const mode = useWebGLMode();

  useGSAP(
    () => {
      if (mode === 'pending') return;
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const steps = gsap.utils.toArray<HTMLElement>('.j-step');
        const svg = mode === 'fallback';
        gsap.set(steps, { autoAlpha: 0, y: 40 });
        gsap.set(steps[0], { autoAlpha: 1, y: 0 });
        if (svg) gsap.set('.j-bean .bean-body', { fill: STEPS[0].color });

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: '+=3200',
            pin: true,
            scrub: 1,
            onUpdate: (self) => {
              progress.current = self.progress;
            },
          },
        });

        if (svg) tl.to('.j-bean', { rotation: 360, scale: 1.25, duration: STEPS.length - 1 }, 0);
        tl.fromTo('.j-progress', { scaleX: 0.04 }, { scaleX: 1, duration: STEPS.length - 1 }, 0);
        tl.to('.j-glow', { opacity: 0.9, duration: STEPS.length - 1 }, 0);

        steps.forEach((step, i) => {
          if (i === 0) return;
          tl.to(steps[i - 1], { autoAlpha: 0, y: -40, duration: 0.45, ease: 'power2.in' }, i - 0.5);
          tl.to(step, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power3.out' }, i - 0.1);
          if (svg) tl.to('.j-bean .bean-body', { fill: STEPS[i].color, duration: 0.8 }, i - 0.6);
        });
        tl.to({}, { duration: 0.35 }); // short hold on the last step
      });

      // Reduced motion: no pinning, just show every step in a column
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set('.j-steps', { height: 'auto' });
        gsap.set('.j-step', { position: 'relative', autoAlpha: 1, y: 0, marginBottom: 32 });
      });
    },
    { scope: root, dependencies: [mode], revertOnUpdate: true },
  );

  return (
    <section ref={root} id="story" className="relative min-h-screen overflow-hidden bg-espresso-900">
      <div className="j-glow absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-caramel-500/20 opacity-30 blur-3xl md:left-3/4" />

      <div className="relative mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-8 px-6 py-24 md:grid-cols-2">
        <div className="j-steps relative h-80">
          {STEPS.map((s) => (
            <div key={s.tag} className="j-step absolute inset-x-0 top-1/2 -translate-y-1/2">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-caramel-300">{s.tag}</p>
              <h2 className="font-display text-4xl font-semibold leading-tight text-cream-50 sm:text-5xl">{s.title}</h2>
              <p className="mt-5 max-w-md text-lg text-cream-200">{s.text}</p>
            </div>
          ))}
          <div className="absolute -bottom-6 left-0 h-1 w-48 overflow-hidden rounded-full bg-white/10 md:bottom-0">
            <div className="j-progress h-full origin-left rounded-full bg-caramel-400" />
          </div>
        </div>

        <div className="flex items-center justify-center">
          {mode === '3d' && (
            <div className="h-[20rem] w-full sm:h-[30rem]">
              <JourneyScene progress={progress} />
            </div>
          )}
          {mode === 'fallback' && (
            <div className="j-bean w-40 drop-shadow-[0_30px_40px_rgba(0,0,0,0.6)] sm:w-56">
              <Bean tone="green" className="h-auto w-full" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
