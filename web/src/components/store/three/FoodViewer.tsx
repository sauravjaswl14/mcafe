'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useState, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { useInView } from '@/lib/useInView';
import { Burger, Dessert, FOOD_LABEL, HotDog, Roll, Sandwich, type FoodKind } from './food';
import { makeSpring, stepSpring } from './spring';
import type { ViewerInput } from './types';

/**
 * Holds one model at a time. Switching category shrinks the old model through a spring,
 * swaps it at ~0, then springs the new one in with overshoot and a spin.
 * Hover/drag explodes the food into its layers; release and it snaps back together.
 */
function Stage({ kind, input }: { kind: FoodKind; input: MutableRefObject<ViewerInput> }) {
  const group = useRef<THREE.Group>(null);
  const [shown, setShown] = useState<FoodKind>(kind);
  const explode = useRef(0);

  const scale = useRef(makeSpring(0));
  const ex = useRef(makeSpring(0));
  const rotY = useRef(0.6);
  const rotX = useRef(makeSpring(0.45));

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 30);
    const t = state.clock.elapsedTime;
    const i = input.current;

    stepSpring(scale.current, shown === kind ? 1 : 0, 90, 9, dt);
    if (shown !== kind && scale.current.x < 0.05) setShown(kind);

    stepSpring(ex.current, i.hover || i.dragging ? 1 : 0, 70, 7, dt);
    explode.current = ex.current.x;

    if (i.dragging) {
      rotY.current += i.dRot;
      i.dRot = 0;
    } else {
      rotY.current += (0.45 + i.spin) * dt;
      i.spin *= Math.exp(-2.5 * dt);
      i.tiltT += (0.45 - i.tiltT) * (1 - Math.exp(-2 * dt));
    }
    stepSpring(rotX.current, i.tiltT, 60, 9, dt);

    const g = group.current;
    if (g) {
      const s = Math.max(scale.current.x, 0.0001);
      g.scale.setScalar(s);
      g.rotation.set(rotX.current.x, rotY.current + (1 - Math.min(scale.current.x, 1)) * 2.4, 0);
      g.position.y = Math.sin(t * 1.3) * 0.08;
    }
  });

  return (
    <group ref={group}>
      {shown === 'burger' && <Burger explode={explode} />}
      {shown === 'hotdog' && <HotDog explode={explode} />}
      {shown === 'sandwich' && <Sandwich explode={explode} />}
      {shown === 'roll' && <Roll explode={explode} />}
      {shown === 'dessert' && <Dessert explode={explode} />}
    </group>
  );
}

export default function FoodViewer({ kind }: { kind: FoodKind }) {
  const [ref, inView] = useInView<HTMLDivElement>('100px');
  const input = useRef<ViewerInput>({ dragging: false, hover: false, dRot: 0, spin: 0, tiltT: 0.45 });
  const last = useRef({ x: 0, y: 0 });

  return (
    <div
      ref={ref}
      data-cursor="drag"
      className="relative aspect-square w-full touch-pan-y select-none overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_50%_40%,#3b2619_0%,#1c120c_70%)]"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        input.current.dragging = true;
        last.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerMove={(e) => {
        const i = input.current;
        if (!i.dragging) return;
        const dx = e.clientX - last.current.x;
        const dy = e.clientY - last.current.y;
        last.current = { x: e.clientX, y: e.clientY };
        i.dRot += dx * 0.012;
        i.spin = THREE.MathUtils.clamp(i.spin * 0.5 + dx * 0.012 * 30, -8, 8);
        i.tiltT = THREE.MathUtils.clamp(i.tiltT + dy * 0.006, -0.25, 1.1);
      }}
      onPointerUp={() => (input.current.dragging = false)}
      onPointerCancel={() => (input.current.dragging = false)}
      onPointerEnter={() => (input.current.hover = true)}
      onPointerLeave={() => (input.current.hover = false)}
    >
      <p className="pointer-events-none absolute inset-x-0 top-5 z-10 text-center font-display text-sm uppercase tracking-[0.35em] text-caramel-300">
        {FOOD_LABEL[kind]}
      </p>
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0.6, 7.6], fov: 38 }} frameloop={inView ? 'always' : 'never'} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.55} />
        <hemisphereLight args={['#ffe9c8', '#2a1b12', 0.6]} />
        <directionalLight position={[4, 6, 5]} intensity={2.6} color="#fff1dc" />
        <directionalLight position={[-5, 2, -3]} intensity={1.3} color="#ff9a4d" />
        <pointLight position={[0, -2, 3]} intensity={18} color="#ffb86b" distance={9} />
        <Stage kind={kind} input={input} />
      </Canvas>
      <p className="pointer-events-none absolute inset-x-0 bottom-4 z-10 text-center text-[11px] uppercase tracking-[0.3em] text-cream-300/70">
        Hover to pull apart · Drag to spin
      </p>
    </div>
  );
}
