import { Group, Mesh, MeshStandardMaterial, Raycaster, SphereGeometry, Vector3 } from 'three';

export function createEyes(body: Mesh) {
  const group = new Group();
  const geometry = new SphereGeometry(1, 24, 20);
  const material = new MeshStandardMaterial({ color: '#08090c', roughness: 0.94, metalness: 0 });
  const ray = new Raycaster();
  body.updateMatrixWorld(true);
  const eyes = [-0.25, 0.25].map((x, index) => {
    const mount = new Group();
    ray.set(new Vector3(x, 0.98 + index * 0.008, 3), new Vector3(0, 0, -1));
    const hit = ray.intersectObject(body)[0];
    if (!hit?.face) throw new Error('Could not place eye on body');
    mount.position.copy(hit.point).addScaledVector(hit.face.normal, 0.028);
    mount.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), hit.face.normal);
    const eye = new Mesh(geometry, material);
    eye.scale.set(0.083, 0.164, 0.05);
    eye.castShadow = true;
    mount.add(eye);
    group.add(mount);
    return { mount, eye, rest: mount.position.clone(), height: eye.scale.y };
  });
  return { group, eyes };
}
