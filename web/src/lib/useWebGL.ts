'use client';

import { useEffect, useState } from 'react';

export type GfxMode = 'pending' | '3d' | 'fallback';

/** '3d' when WebGL works and the visitor hasn't asked for reduced motion; otherwise 'fallback' (SVG). */
export function useWebGLMode(): GfxMode {
  const [mode, setMode] = useState<GfxMode>('pending');
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ok = false;
    try {
      const c = document.createElement('canvas');
      const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null;
      ok = Boolean(gl);
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      ok = false;
    }
    setMode(ok && !reduce ? '3d' : 'fallback');
  }, []);
  return mode;
}
