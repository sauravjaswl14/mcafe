'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';
import { Bean, type BeanTone } from './Bean';

const TONES: BeanTone[] = ['light', 'medium', 'medium', 'dark'];
const round = (n: number) => Math.round(n * 100) / 100;

// Deterministic "random" so server and client render identical markup
const BEANS = Array.from({ length: 26 }, (_, i) => {
  const r = (k: number) => {
    const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  return {
    id: i,
    left: round(r(1) * 96),
    top: round(r(2) * 96),
    size: round(26 + r(3) * 74),
    depth: round(0.3 + r(4) * 1.4), // bigger depth = closer = moves faster
    rot: Math.round(r(5) * 360),
    tone: TONES[Math.floor(r(6) * TONES.length)],
  };
});

/**
 * Floating coffee beans with three layers of motion (GSAP):
 *  1. scroll parallax: each bean drifts at its own speed and spins as the hero scrolls away
 *  2. pointer parallax: nearer beans follow the cursor more
 *  3. idle float: a gentle bob so the scene never feels frozen
 */
export function BeanField({ className = '' }: { className?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const host = root.current;
        if (!host) return;
        const trigger = host.parentElement ?? host;

        gsap.utils.toArray<HTMLElement>('.bean-layer').forEach((el) => {
          const depth = Number(el.dataset.depth);
          const rot = Number(el.dataset.rot);
          gsap.fromTo(
            el,
            { y: 0, rotation: rot },
            {
              y: -280 * depth,
              rotation: rot + 140 * depth,
              ease: 'none',
              scrollTrigger: { trigger, start: 'top top', end: 'bottom top', scrub: true },
            },
          );
        });

        gsap.utils.toArray<HTMLElement>('.bean-float').forEach((el, i) => {
          const dir = i % 2 ? -1 : 1;
          gsap.to(el, {
            y: dir * (6 + (i % 5) * 2.5),
            rotation: dir * 7,
            duration: 2.2 + (i % 7) * 0.35,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
          });
        });

        const onMove = (e: PointerEvent) => {
          const rect = host.getBoundingClientRect();
          const nx = (e.clientX - rect.left) / rect.width - 0.5;
          const ny = (e.clientY - rect.top) / rect.height - 0.5;
          gsap.utils.toArray<HTMLElement>('.bean-mouse').forEach((el) => {
            const d = Number(el.dataset.depth);
            gsap.to(el, { x: nx * 60 * d, y: ny * 40 * d, duration: 0.9, ease: 'power3.out', overwrite: 'auto' });
          });
        };
        trigger.addEventListener('pointermove', onMove as EventListener);
        return () => trigger.removeEventListener('pointermove', onMove as EventListener);
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {BEANS.map((b) => (
        <div
          key={b.id}
          className="bean-layer absolute will-change-transform"
          data-depth={b.depth}
          data-rot={b.rot}
          style={{
            left: `${b.left}%`,
            top: `${b.top}%`,
            width: b.size,
            opacity: b.depth < 0.6 ? 0.45 : 0.95,
            filter: b.depth < 0.6 ? 'blur(2px)' : b.depth > 1.5 ? 'blur(1px)' : undefined,
            zIndex: Math.round(b.depth * 10),
          }}
        >
          <div className="bean-mouse" data-depth={b.depth}>
            <div className="bean-float">
              <Bean tone={b.tone} className="h-auto w-full drop-shadow-[0_12px_18px_rgba(0,0,0,0.55)]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
