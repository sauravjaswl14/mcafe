'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { useInView } from '@/lib/useInView';
import { CoffeeBeans } from './CoffeeBeans';
import type { HeroInput } from './types';

/** Warm light that chases the cursor so beans catch highlights as you move. */
function PointerLight({ input }: { input: MutableRefObject<HeroInput> }) {
  const light = useRef<THREE.PointLight>(null);
  useFrame((state) => {
    const l = light.current;
    if (!l) return;
    const { width, height } = state.viewport;
    l.position.x += ((input.current.x * width) / 2 - l.position.x) * 0.12;
    l.position.y += ((input.current.y * height) / 2 - l.position.y) * 0.12;
  });
  return <pointLight ref={light} position={[0, 0, 4.6]} intensity={34} distance={13} color="#ffd29a" />;
}

export default function HeroScene({ input }: { input: MutableRefObject<HeroInput> }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className="pointer-events-none absolute inset-0">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 9], fov: 45 }}
        frameloop={inView ? 'always' : 'never'}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.45} />
        <directionalLight position={[5, 6, 6]} intensity={2.4} color="#fff1dc" />
        <directionalLight position={[-6, 2, -3]} intensity={1.6} color="#ff9a4d" />
        <PointerLight input={input} />
        <CoffeeBeans input={input} />
      </Canvas>
    </div>
  );
}
