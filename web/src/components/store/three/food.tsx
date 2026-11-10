'use client';

import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, type MutableRefObject, type ReactNode } from 'react';
import * as THREE from 'three';

/** 0 = assembled, 1 = fully exploded. Driven by a spring in the stage. */
export type Explode = MutableRefObject<number>;
export type FoodKind = 'burger' | 'hotdog' | 'sandwich' | 'roll' | 'dessert';

export const FOOD_LABEL: Record<FoodKind, string> = {
  burger: 'Burger',
  hotdog: 'Hot dog',
  sandwich: 'Sandwich',
  roll: 'Roll',
  dessert: 'Dessert',
};

/** Menus are dynamic, so the model is picked from whatever the category is called. */
export function foodKindFor(name: string): FoodKind {
  const n = name.toLowerCase();
  if (/hot\s*-?\s*dog|\bdog/.test(n)) return 'hotdog';
  if (/sandwich|\bsub|toast|club|panini/.test(n)) return 'sandwich';
  if (/roll|wrap|kathi|burrito/.test(n)) return 'roll';
  if (/sweet|dessert|cake|brownie|bite|pastr|ice/.test(n)) return 'dessert';
  return 'burger';
}

type P = [number, number][];

/** A layer rises by `lift * explode` so the food pulls apart into its ingredients. */
function Layer({ y, lift, explode, children }: { y: number; lift: number; explode: Explode; children: ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    if (g.current) g.current.position.y = y + lift * explode.current;
  });
  return (
    <group ref={g} position-y={y}>
      {children}
    </group>
  );
}

function Lathe({ profile, color, roughness = 0.7 }: { profile: P; color: string; roughness?: number }) {
  const geo = useMemo(() => new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 72), [profile]);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color={color} roughness={roughness} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ───────────── shared profiles ─────────────
const BUN_BOTTOM: P = [[0, 0], [1.18, 0], [1.25, 0.08], [1.25, 0.26], [1.12, 0.38], [0, 0.4]];
const PATTY: P = [[0, 0], [1.28, 0], [1.35, 0.1], [1.35, 0.22], [1.24, 0.32], [0, 0.32]];
const BUN_TOP: P = (() => {
  const p: P = [[0, 0], [1.25, 0], [1.31, 0.1]];
  for (let i = 1; i <= 16; i++) {
    const a = (i / 16) * (Math.PI / 2);
    p.push([1.31 * Math.cos(a), 0.1 + Math.sin(a)]);
  }
  return p;
})();

// ───────────── shared ingredients ─────────────
function Cheese() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(2.8, 2.8, 28, 28);
    g.rotateX(-Math.PI / 2);
    g.rotateY(Math.PI / 4);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const r = Math.hypot(p.getX(i), p.getZ(i));
      p.setY(i, -Math.pow(Math.max(0, r - 1.15), 1.5) * 0.5); // corners droop
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color="#f5b82e" roughness={0.35} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Lettuce({ radius = 1.5 }: { radius?: number }) {
  const geo = useMemo(() => {
    const g = new THREE.RingGeometry(0.2, radius, 80, 8);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const r = Math.hypot(x, z);
      const th = Math.atan2(z, x);
      const k = THREE.MathUtils.smoothstep(r, 0.5, radius);
      p.setY(i, (Math.sin(th * 10) * 0.08 + Math.sin(th * 17 + r * 5) * 0.035) * k);
    }
    g.computeVertexNormals();
    return g;
  }, [radius]);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color="#7bbf3f" roughness={0.5} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Tomato({ r = 1.0 }: { r?: number }) {
  return (
    <mesh position-y={0.05}>
      <cylinderGeometry args={[r, r, 0.1, 48]} />
      <meshStandardMaterial color="#d6362b" roughness={0.3} />
    </mesh>
  );
}

function Sesame() {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const d = new THREE.Object3D();
    let s = 3;
    const r = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
    const n = new THREE.Vector3();
    for (let i = 0; i < 48; i++) {
      const a = 0.12 + r() * 1.3;
      const phi = r() * Math.PI * 2;
      const x = 1.31 * Math.cos(a) * Math.cos(phi);
      const z = 1.31 * Math.cos(a) * Math.sin(phi);
      const y = 0.1 + Math.sin(a);
      n.set(x / (1.31 * 1.31), (y - 0.1) / 1, z / (1.31 * 1.31)).normalize();
      d.position.set(x * 1.004, 0.1 + (y - 0.1) * 1.004, z * 1.004);
      d.lookAt(d.position.x + n.x, d.position.y + n.y, d.position.z + n.z);
      d.rotateZ(r() * Math.PI);
      d.scale.set(0.085, 0.05, 0.03);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 48]}>
      <sphereGeometry args={[1, 10, 8]} />
      <meshStandardMaterial color="#f3e3b5" roughness={0.5} />
    </instancedMesh>
  );
}

// ───────────── BURGER ─────────────
export function Burger({ explode }: { explode: Explode }) {
  return (
    <group position-y={-0.95} scale={0.85}>
      <Layer y={0} lift={0} explode={explode}><Lathe profile={BUN_BOTTOM} color="#d9993f" /></Layer>
      <Layer y={0.42} lift={0.3} explode={explode}><Lathe profile={PATTY} color="#4a2a1a" roughness={0.9} /></Layer>
      <Layer y={0.78} lift={0.55} explode={explode}><Cheese /></Layer>
      <Layer y={0.9} lift={0.8} explode={explode}><Tomato /></Layer>
      <Layer y={1.0} lift={1.05} explode={explode}><Lettuce /></Layer>
      <Layer y={1.12} lift={1.4} explode={explode}>
        <Lathe profile={BUN_TOP} color="#d28a35" roughness={0.55} />
        <Sesame />
      </Layer>
    </group>
  );
}

// ───────────── HOT DOG ─────────────
export function HotDog({ explode }: { explode: Explode }) {
  const { mustard, ketchup } = useMemo(() => {
    const pts = (phase: number) =>
      Array.from({ length: 48 }, (_, i) => {
        const x = -1.45 + (i / 47) * 2.9;
        return new THREE.Vector3(x, 0.745, Math.sin(x * 6 + phase) * 0.13);
      });
    return { mustard: new THREE.CatmullRomCurve3(pts(0)), ketchup: new THREE.CatmullRomCurve3(pts(Math.PI)) };
  }, []);
  return (
    <group scale={0.92} rotation-y={-0.25}>
      <Layer y={0} lift={0} explode={explode}>
        <mesh rotation-z={Math.PI / 2} scale={[0.85, 1, 1.05]}>
          <capsuleGeometry args={[0.62, 2.7, 12, 36]} />
          <meshStandardMaterial color="#e0a050" roughness={0.7} />
        </mesh>
      </Layer>
      <Layer y={0.32} lift={0.6} explode={explode}>
        <mesh rotation-z={Math.PI / 2}>
          <capsuleGeometry args={[0.4, 3.0, 12, 32]} />
          <meshStandardMaterial color="#b83a26" roughness={0.4} />
        </mesh>
      </Layer>
      <Layer y={0} lift={1.05} explode={explode}>
        <mesh>
          <tubeGeometry args={[mustard, 180, 0.05, 10, false]} />
          <meshStandardMaterial color="#f4c20d" roughness={0.35} />
        </mesh>
      </Layer>
      <Layer y={0} lift={1.35} explode={explode}>
        <mesh>
          <tubeGeometry args={[ketchup, 180, 0.05, 10, false]} />
          <meshStandardMaterial color="#c5161d" roughness={0.3} />
        </mesh>
      </Layer>
    </group>
  );
}

// ───────────── SANDWICH ─────────────
function Slice() {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-1.2, -1.1);
    s.lineTo(1.2, -1.1);
    s.lineTo(1.2, 0.5);
    s.bezierCurveTo(1.5, 0.85, 1.25, 1.4, 0.55, 1.4);
    s.lineTo(-0.55, 1.4);
    s.bezierCurveTo(-1.25, 1.4, -1.5, 0.85, -1.2, 0.5);
    s.lineTo(-1.2, -1.1);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 4, curveSegments: 16 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0.06, 0);
    return g;
  }, []);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color="#e2b66c" roughness={0.75} />
    </mesh>
  );
}

export function Sandwich({ explode }: { explode: Explode }) {
  return (
    <group position-y={-0.6} scale={0.85} rotation-y={0.35}>
      <Layer y={0} lift={0} explode={explode}><Slice /></Layer>
      <Layer y={0.34} lift={0.3} explode={explode}><group scale={[0.9, 1, 0.9]}><Lettuce radius={1.45} /></group></Layer>
      <Layer y={0.38} lift={0.6} explode={explode}>
        {[[-0.6, 0.4], [0.6, 0.4], [0, -0.5]].map(([x, z], i) => (
          <group key={i} position={[x, 0, z]}><Tomato r={0.55} /></group>
        ))}
      </Layer>
      <Layer y={0.46} lift={0.9} explode={explode}><group scale={0.8}><Cheese /></group></Layer>
      <Layer y={0.52} lift={1.2} explode={explode}>
        <mesh position-y={0.07}>
          <boxGeometry args={[2.3, 0.14, 2.0]} />
          <meshStandardMaterial color="#e59aa0" roughness={0.5} />
        </mesh>
      </Layer>
      <Layer y={0.68} lift={1.6} explode={explode}>
        <Slice />
        <mesh position={[0.6, 0.75, 0.2]}>
          <cylinderGeometry args={[0.03, 0.03, 1.8, 10]} />
          <meshStandardMaterial color="#c9a46a" roughness={0.6} />
        </mesh>
        <mesh position={[0.6, 1.68, 0.2]}>
          <sphereGeometry args={[0.1, 16, 12]} />
          <meshStandardMaterial color="#d6362b" roughness={0.3} />
        </mesh>
      </Layer>
    </group>
  );
}

// ───────────── ROLL (kathi roll) ─────────────
const FILLING = [
  ['#7bbf3f', -0.2, 0.15, 0.28], ['#a2397d', 0.22, -0.1, 0.22], ['#a8683a', -0.05, -0.28, 0.3],
  ['#d6362b', 0.28, 0.22, 0.2], ['#e9812a', -0.3, -0.12, 0.2], ['#7bbf3f', 0.05, 0.05, 0.3],
] as const;

export function Roll({ explode }: { explode: Explode }) {
  return (
    <group rotation={[0.35, 0.6, -0.9]} scale={0.88} position-y={-0.1}>
      <Layer y={0} lift={0} explode={explode}>
        <mesh>
          <cylinderGeometry args={[0.62, 0.58, 3.0, 56, 1, true]} />
          <meshStandardMaterial color="#d9a35f" roughness={0.65} side={THREE.DoubleSide} />
        </mesh>
        {/* seared stripes */}
        {[-0.9, 0.0, 0.9].map((y) => (
          <mesh key={y} position-y={y} rotation-y={0.6}>
            <cylinderGeometry args={[0.625, 0.625, 0.16, 56, 1, true, 0, Math.PI * 1.3]} />
            <meshStandardMaterial color="#a8682b" roughness={0.8} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </Layer>
      <Layer y={-0.55} lift={-0.5} explode={explode}>
        <mesh rotation-y={Math.PI * 0.15}>
          <cylinderGeometry args={[0.68, 0.64, 1.9, 56, 1, true, 0, Math.PI * 1.65]} />
          <meshStandardMaterial color="#f3e9d2" roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
      </Layer>
      <Layer y={1.35} lift={0.9} explode={explode}>
        {FILLING.map(([c, x, z, r], i) => (
          <mesh key={i} position={[x, 0.1 + (i % 3) * 0.12, z]}>
            <sphereGeometry args={[r, 20, 16]} />
            <meshStandardMaterial color={c} roughness={0.55} />
          </mesh>
        ))}
      </Layer>
    </group>
  );
}

// ───────────── DESSERT (brownie, scoop, cherry) ─────────────
export function Dessert({ explode }: { explode: Explode }) {
  const drizzle = useMemo(() => {
    const pts = Array.from({ length: 60 }, (_, i) => {
      const t = i / 59;
      const a = t * Math.PI * 6;
      const rr = 0.72 * Math.sin(Math.min(t * 1.15, 1) * Math.PI * 0.55 + 0.4);
      return new THREE.Vector3(Math.cos(a) * rr, 0.62 - t * 0.5, Math.sin(a) * rr);
    });
    return new THREE.CatmullRomCurve3(pts);
  }, []);
  return (
    <group position-y={-1.05} scale={0.88} rotation-y={0.4}>
      <Layer y={0} lift={0} explode={explode}>
        <mesh position-y={0.35}>
          <boxGeometry args={[2.1, 0.7, 2.1]} />
          <meshStandardMaterial color="#24120a" roughness={0.9} />
        </mesh>
        <mesh position-y={0.72}>
          <boxGeometry args={[2.0, 0.1, 2.0]} />
          <meshStandardMaterial color="#3a1f12" roughness={0.3} />
        </mesh>
      </Layer>
      <Layer y={0.78} lift={0.45} explode={explode}>
        <mesh position-y={0.62}>
          <sphereGeometry args={[0.72, 40, 32]} />
          <meshStandardMaterial color="#f4e6c8" roughness={0.6} />
        </mesh>
        <mesh position-y={0.1} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.66, 0.13, 16, 48]} />
          <meshStandardMaterial color="#efdcb4" roughness={0.65} />
        </mesh>
      </Layer>
      <Layer y={0.78} lift={0.75} explode={explode}>
        <mesh>
          <tubeGeometry args={[drizzle, 140, 0.035, 8, false]} />
          <meshStandardMaterial color="#2a140b" roughness={0.2} />
        </mesh>
      </Layer>
      <Layer y={1.55} lift={1.05} explode={explode}>
        <mesh position={[0, 0.17, 0]}>
          <sphereGeometry args={[0.17, 20, 16]} />
          <meshStandardMaterial color="#b3122a" roughness={0.2} />
        </mesh>
        <mesh position={[0.05, 0.4, 0]} rotation-z={-0.4}>
          <cylinderGeometry args={[0.012, 0.012, 0.3, 6]} />
          <meshStandardMaterial color="#4b6b2a" roughness={0.6} />
        </mesh>
      </Layer>
    </group>
  );
}
