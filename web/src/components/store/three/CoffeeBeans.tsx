'use client';

import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { createBeanGeometry } from './geometry';
import type { HeroInput } from './types';

const COUNT = 64;
const TONES = ['#c08a4a', '#8a4f26', '#6a3a1b', '#3f2212'];

/**
 * 64 beans in ONE draw call (InstancedMesh). Each bean has its own spring-driven offset:
 *  - the pointer repels nearby beans (they wobble back like jelly),
 *  - a click sends a shockwave through the whole field,
 *  - scrolling lifts beans at depth-dependent speeds (parallax) and spins them.
 */
export function CoffeeBeans({ input }: { input: MutableRefObject<HeroInput> }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => createBeanGeometry(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  const data = useMemo(() => {
    let seed = 11;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    return Array.from({ length: COUNT }, () => {
      const z = -6 + rnd() * 9.5;
      return {
        bx: (rnd() - 0.5) * 18,
        by: (rnd() - 0.5) * 10,
        bz: z,
        s: 0.2 + rnd() * 0.4 + (z > 1.5 ? 0.22 : 0),
        axis: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(),
        speed: (0.15 + rnd() * 0.5) * (rnd() > 0.5 ? 1 : -1),
        phase: rnd() * Math.PI * 2,
        ang: rnd() * Math.PI * 2,
        ox: 0, oy: 0, oz: 0,
        vx: 0, vy: 0, vz: 0,
        boost: 0,
        tone: TONES[Math.floor(rnd() * TONES.length)],
      };
    });
  }, []);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    data.forEach((d, i) => m.setColorAt(i, color.set(d.tone)));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [data, color]);

  useFrame((state, dtRaw) => {
    const m = mesh.current;
    if (!m) return;
    const dt = Math.min(dtRaw, 1 / 30);
    const t = state.clock.elapsedTime;
    const scroll = Math.min(window.scrollY / window.innerHeight, 1.6);
    const { width, height } = state.viewport;
    const px = (input.current.x * width) / 2;
    const py = (input.current.y * height) / 2;

    let burst = false;
    if (input.current.burst) {
      input.current.burst = false;
      burst = true;
    }

    for (let i = 0; i < COUNT; i++) {
      const d = data[i];
      const parallax = 0.5 + (d.bz + 6) * 0.22; // nearer beans travel further

      const wx = d.bx + d.ox;
      const wy = d.by + d.oy;

      // pointer repulsion
      const dx = wx - px;
      const dy = wy - py;
      const dist = Math.hypot(dx, dy) + 0.0001;
      if (dist < 2.4) {
        const f = (1 - dist / 2.4) * 38;
        d.vx += (dx / dist) * f * dt;
        d.vy += (dy / dist) * f * dt;
        d.boost += f * 0.02;
      }

      // click shockwave
      if (burst) {
        const bdx = wx - px;
        const bdy = wy - py;
        const bd = Math.hypot(bdx, bdy) + 0.3;
        const f = 18 / (1 + bd * 0.5);
        d.vx += (bdx / bd) * f;
        d.vy += (bdy / bd) * f;
        d.vz += (Math.random() - 0.2) * 5;
        d.boost += f * 0.6;
      }

      // underdamped spring back to rest = jelly overshoot
      d.vx += (-12 * d.ox - 2.6 * d.vx) * dt;
      d.vy += (-12 * d.oy - 2.6 * d.vy) * dt;
      d.vz += (-12 * d.oz - 2.6 * d.vz) * dt;
      d.ox += d.vx * dt;
      d.oy += d.vy * dt;
      d.oz += d.vz * dt;
      d.boost *= Math.exp(-2.2 * dt);
      d.ang += (d.speed + Math.sign(d.speed) * d.boost) * dt;

      dummy.position.set(
        d.bx + d.ox + Math.sin(t * 0.3 + d.phase) * 0.25,
        d.by + d.oy + Math.cos(t * 0.4 + d.phase) * 0.2 + scroll * parallax * 2.2,
        d.bz + d.oz,
      );
      dummy.quaternion.setFromAxisAngle(d.axis, d.ang + scroll * parallax * 1.5);
      dummy.scale.setScalar(d.s);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;

    // subtle camera sway
    const cam = state.camera;
    cam.position.x += (input.current.x * 0.7 - cam.position.x) * 0.04;
    cam.position.y += (input.current.y * 0.45 - cam.position.y) * 0.04;
    cam.lookAt(0, 0, 0);
  });

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, COUNT]} frustumCulled={false}>
      <meshStandardMaterial vertexColors roughness={0.42} metalness={0.05} />
    </instancedMesh>
  );
}
