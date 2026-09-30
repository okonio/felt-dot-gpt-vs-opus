import { BufferGeometry, Float32BufferAttribute, Mesh, Vector3 } from 'three';
import { createFeltMaterial } from './createFeltMaterial';

// One opaque mesh, with area-weighted sampling: no transparent fur shells or textures.
export function createFibers(surface: BufferGeometry, color: string, count: number, length: number) {
  const source = surface.toNonIndexed();
  const position = source.getAttribute('position');
  const normal = source.getAttribute('normal');
  const triangleCount = position.count / 3;
  const cumulative = new Float32Array(triangleCount);
  const a = new Vector3(), b = new Vector3(), c = new Vector3();
  const ab = new Vector3(), ac = new Vector3();
  let totalArea = 0;
  for (let i = 0; i < triangleCount; i++) {
    a.fromBufferAttribute(position, i * 3);
    b.fromBufferAttribute(position, i * 3 + 1);
    c.fromBufferAttribute(position, i * 3 + 2);
    totalArea += ab.subVectors(b, a).cross(ac.subVectors(c, a)).length() * 0.5;
    cumulative[i] = totalArea;
  }
  let seed = 1729;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const positions: number[] = [], normals: number[] = [], colors: number[] = [];
  const root = new Vector3(), n = new Vector3(), tangent = new Vector3(), bitangent = new Vector3();
  const tip = new Vector3(), left = new Vector3(), right = new Vector3();
  const na = new Vector3(), nb = new Vector3(), nc = new Vector3();
  for (let i = 0; i < count; i++) {
    const sample = random() * totalArea;
    let low = 0, high = triangleCount - 1;
    while (low < high) { const mid = (low + high) >>> 1; if (cumulative[mid] < sample) low = mid + 1; else high = mid; }
    const index = low * 3;
    const r = Math.sqrt(random()), v = random();
    const wa = 1 - r, wb = r * (1 - v), wc = r * v;
    a.fromBufferAttribute(position, index); b.fromBufferAttribute(position, index + 1); c.fromBufferAttribute(position, index + 2);
    root.copy(a).multiplyScalar(wa).addScaledVector(b, wb).addScaledVector(c, wc);
    na.fromBufferAttribute(normal, index); nb.fromBufferAttribute(normal, index + 1); nc.fromBufferAttribute(normal, index + 2);
    n.copy(na).multiplyScalar(wa).addScaledVector(nb, wb).addScaledVector(nc, wc).normalize();
    tangent.set(random() - 0.5, random() - 0.5, random() - 0.5).cross(n).normalize();
    bitangent.crossVectors(n, tangent).normalize();
    root.addScaledVector(n, -0.001);
    tip.copy(root).addScaledVector(n, length * (0.4 + random() * 0.6)).addScaledVector(bitangent, length * 0.45);
    const width = 0.0012 + random() * 0.001;
    left.copy(root).addScaledVector(tangent, width);
    right.copy(root).addScaledVector(tangent, -width);
    const shade = 0.84 + random() * 0.28;
    for (const point of [left, right, tip]) {
      positions.push(point.x, point.y, point.z);
      normals.push(n.x, n.y, n.z);
      colors.push(shade, shade, shade);
    }
  }
  source.dispose();
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  const felt = createFeltMaterial(color, 1, 0.2, true);
  const mesh = new Mesh(geometry, felt.material);
  mesh.receiveShadow = true;
  return { mesh, ...felt };
}
