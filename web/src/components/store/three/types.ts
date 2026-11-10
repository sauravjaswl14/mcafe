/** Normalised pointer (-1..1, y up) plus a one-shot click flag, shared between DOM and the hero scene. */
export interface HeroInput {
  x: number;
  y: number;
  burst: boolean;
}

/** Drag/hover state shared between the menu viewer's DOM wrapper and its scene. */
export interface ViewerInput {
  dragging: boolean;
  hover: boolean;
  dRot: number; // radians dragged since last frame
  spin: number; // rad/s release inertia
  tiltT: number; // target X tilt
}
