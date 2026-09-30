import { Mesh, SphereGeometry, Vector3 } from 'three';
import type { DotConfig } from './config';
import { createFeltMaterial } from './createFeltMaterial';
import { createFibers } from './createFibers';

export function createBody(config: DotConfig) {
  const geometry = new SphereGeometry(1, 80, 56);
  const positions = geometry.getAttribute('position');
  const p = new Vector3();
  for (let i = 0; i < positions.count; i++) {
    p.fromBufferAttribute(positions, i);
    const t = (p.y + 1) * 0.5;
    const organic = 1 + 0.035 * Math.sin(p.x * 3.3 + p.y * 2.1) + 0.025 * Math.sin(p.z * 4.0 - p.y * 3.0);
    const taper = 1.19 - 0.3 * t;
    const y = (Math.max(-0.78, p.y) + 0.78) * 1.12 + 0.018;
    positions.setXYZ(i,
      p.x * 1.21 * taper * organic + 0.075 * t * t,
      y,
      p.z * 0.87 * taper * organic,
    );
  }
  geometry.computeVertexNormals();
  const felt = createFeltMaterial(config.bodyColor, config.bodyRoughness);
  const mesh = new Mesh(geometry, felt.material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.customDepthMaterial = felt.depthMaterial;
  const fibers = createFibers(geometry, config.bodyColor, config.fiberCount, config.fiberLength);
  return { mesh, fibers, ...felt };
}
