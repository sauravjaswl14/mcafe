import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * A procedural coffee bean: an ellipsoid with a curved centre crease on its flat face.
 * The crease is baked into the mesh and into vertex colours (darker in the groove),
 * so no textures are needed.
 */
export function createBeanGeometry(): THREE.BufferGeometry {
  let g: THREE.BufferGeometry = new THREE.SphereGeometry(1, 72, 52);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g); // weld the UV seam so shading is continuous

  const pos = g.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const SX = 0.62;
  const SY = 0.95;
  const SZ = 0.46;
  const DEPTH = 0.2;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) * SX;
    const y = pos.getY(i) * SY;
    let z = pos.getZ(i) * SZ;
    let shade = 1;
    if (z > 0) {
      const seam = Math.sin(y * 2.4) * 0.09; // S-curve
      const d = x - seam;
      const taper = Math.sqrt(Math.max(0, 1 - (y / SY) ** 2)); // crease fades toward the tips
      const dip = DEPTH * Math.exp(-(d * d) / (2 * 0.045 * 0.045)) * taper;
      z -= dip;
      shade = 1 - 0.55 * (dip / DEPTH);
    }
    pos.setXYZ(i, x, y, z);
    colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = shade;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

/** Small round sprite for point particles. */
export function createDotTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
