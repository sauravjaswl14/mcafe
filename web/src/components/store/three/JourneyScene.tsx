'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { useInView } from '@/lib/useInView';
import { createBeanGeometry, createDotTexture } from './geometry';
import { makeSpring, stepSpring } from './spring';

const STOPS = ['#7a8450', '#c9a064', '#7a4521', '#3a1f10'];
const N = 90;

function JourneyBean({ progress }: { progress: MutableRefObject<number> }) {
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const dust = useRef<THREE.Points>(null);
  const dustMat = useRef<THREE.PointsMaterial>(null);

  const geometry = useMemo(() => createBeanGeometry(), []);
  const sprite = useMemo(() => createDotTexture(), []);
  const stops = useMemo(() => STOPS.map((c) => new THREE.Color(c)), []);
  const p = useRef(makeSpring(0));
  const kick = useRef(makeSpring(0));
  const lastStep = useRef(0);

  const seeds = useMemo(() => {
    let s = 5;
    const r = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
    return Array.from({ length: N }, () => ({ a: r() * Math.PI * 2, rad: 1.3 + r() * 1.6, sp: 0.25 + r() * 0.6, y0: r() * 6, ph: r() * 6 }));
  }, []);
  const positions = useMemo(() => new Float32Array(N * 3), []);

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 30);
    const t = state.clock.elapsedTime;
    // the bean follows scroll through a spring, so it lags and overshoots a little
    stepSpring(p.current, progress.current, 38, 9, dt);
    const v = THREE.MathUtils.clamp(p.current.x, 0, 1);

    // pop each time a roast stage changes
    const stage = Math.round(v * 3);
    if (stage !== lastStep.current) {
      lastStep.current = stage;
      kick.current.v += 5;
    }
    stepSpring(kick.current, 0, 120, 9, dt);

    const seg = v * 3;
    const i = Math.min(2, Math.floor(seg));
    const f = seg - i;
    if (mat.current) {
      mat.current.color.copy(stops[i]).lerp(stops[i + 1], f);
      mat.current.roughness = 0.85 - 0.55 * v; // oils appear as it roasts
    }

    const g = group.current;
    if (g) {
      g.rotation.y = v * Math.PI * 5 + t * 0.15;
      g.rotation.x = 0.5 + Math.sin(v * Math.PI * 2) * 0.45;
      g.rotation.z = -0.3 + v * 0.7;
      g.scale.setScalar(1.55 + v * 0.45 + kick.current.x * 0.06);
      g.position.y = Math.sin(t * 1.1) * 0.12;
    }

    // rising roast steam / chaff
    const a = dust.current?.geometry.attributes.position as THREE.BufferAttribute | undefined;
    if (a) {
      for (let k = 0; k < N; k++) {
        const s = seeds[k];
        const ang = s.a + t * s.sp * 0.4;
        const y = ((s.y0 + t * s.sp * 0.8) % 6) - 3;
        const wob = Math.sin(t + s.ph) * 0.15;
        positions[k * 3] = Math.cos(ang) * s.rad + wob;
        positions[k * 3 + 1] = y;
        positions[k * 3 + 2] = Math.sin(ang) * s.rad;
      }
      a.needsUpdate = true;
    }
    if (dustMat.current) dustMat.current.opacity = THREE.MathUtils.smoothstep(v, 0.25, 0.7) * 0.7;
  });

  return (
    <>
      <group ref={group}>
        <mesh geometry={geometry}>
          <meshStandardMaterial ref={mat} vertexColors color={STOPS[0]} roughness={0.8} metalness={0.05} />
        </mesh>
      </group>
      <points ref={dust}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial ref={dustMat} map={sprite} size={0.18} sizeAttenuation transparent opacity={0} depthWrite={false} color="#f3e0bd" />
      </points>
    </>
  );
}

export default function JourneyScene({ progress }: { progress: MutableRefObject<number> }) {
  const [ref, inView] = useInView<HTMLDivElement>('300px');
  return (
    <div ref={ref} className="h-full w-full">
      <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0, 7], fov: 40 }} frameloop={inView ? 'always' : 'never'} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[4, 5, 5]} intensity={2.6} color="#fff0d8" />
        <directionalLight position={[-5, -1, -2]} intensity={1.4} color="#ff9a4d" />
        <JourneyBean progress={progress} />
      </Canvas>
    </div>
  );
}
