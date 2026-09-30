import { Group, Mesh, SphereGeometry, Vector3 } from 'three';
import { createFeltMaterial } from './createFeltMaterial';
import { createFibers } from './createFibers';

export function createBeret() {
  const group = new Group();
  group.position.set(-0.28, 1.92, 0.015);
  group.rotation.set(-0.10, -0.05, 0.23);
  const restRotation = group.rotation.clone();
  const geometry = new SphereGeometry(1, 64, 32);
  const positions = geometry.getAttribute('position');
  const p = new Vector3();
  for (let i = 0; i < positions.count; i++) {
    p.fromBufferAttribute(positions, i);
    const irregular = 1 + 0.045 * Math.sin(p.x * 5.0 + p.z * 3.0) + 0.018 * Math.sin(p.z * 9.0);
    positions.setXYZ(i,
      p.x * 0.98 * irregular,
      p.y * 0.235 + 0.045 * p.x + 0.025 * Math.sin(p.z * 4.0) * (1 - p.y * p.y),
      p.z * 0.76 * irregular,
    );
  }
  geometry.computeVertexNormals();
  const felt = createFeltMaterial('#242520', 1, 1.35);
  felt.uniforms.uFeltMotion.value = 0;
  const crown = new Mesh(geometry, felt.material);
  crown.castShadow = true;
  crown.receiveShadow = true;
  const fibers = createFibers(geometry, '#292a25', 6500, 0.011);
  fibers.uniforms.uFeltMotion.value = 0;
  const button = new Mesh(new SphereGeometry(1, 20, 16), felt.material);
  button.position.set(-0.07, 0.28, 0.0);
  button.scale.set(0.09, 0.12, 0.09);
  button.castShadow = true;
  group.add(crown, fibers.mesh, button);
  return { group, restRotation, ...felt, fibers };
}
