export interface Spring {
  x: number;
  v: number;
}

export const makeSpring = (x = 0): Spring => ({ x, v: 0 });

/** Semi-implicit Euler spring. Low damping relative to stiffness = overshoot = "springy". */
export function stepSpring(s: Spring, target: number, stiffness: number, damping: number, dt: number) {
  s.v += (-stiffness * (s.x - target) - damping * s.v) * dt;
  s.x += s.v * dt;
  return s.x;
}
