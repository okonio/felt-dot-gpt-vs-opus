import {
  Color,
  Group,
  Mesh,
  Raycaster,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from "three";
import type { DotConfig } from "../config";
import { shaders } from "../shaders/chunks";
import { createDeformUniforms, type DeformUniforms } from "./deform";
import { createDeformDepthMaterial, createFeltMaterial, createFeltUniforms } from "./feltMaterial";

interface Lobe {
  dir: Vector3;
  amount: number;
  width: number;
}

// Soft bulges that break the sphere into a lumpy, cloud-like plush silhouette.
const LOBES: Lobe[] = [
  { dir: new Vector3(-0.92, -0.2, 0.3), amount: 0.2, width: 0.12 },
  { dir: new Vector3(-0.45, -0.3, 0.85), amount: 0.1, width: 0.1 },
  { dir: new Vector3(0.92, -0.15, 0.3), amount: 0.16, width: 0.11 },
  { dir: new Vector3(0.6, 0.55, 0.4), amount: 0.12, width: 0.1 },
  { dir: new Vector3(-0.45, 0.8, 0.3), amount: 0.1, width: 0.12 },
  { dir: new Vector3(0.3, -0.25, 1), amount: 0.07, width: 0.18 },
  // Shallow creases between the lumps.
  { dir: new Vector3(0.85, 0.3, 0.45), amount: -0.05, width: 0.05 },
  { dir: new Vector3(-0.8, 0.35, 0.45), amount: -0.04, width: 0.05 },
  { dir: new Vector3(0.05, 0.2, -1), amount: -0.06, width: 0.5 },
].map((l) => ({ ...l, dir: l.dir.normalize() }));

const FLOOR = -0.6;
const FLOOR_SOFTNESS = 0.16;

function shapeBody(geometry: SphereGeometry) {
  const pos = geometry.attributes.position;
  const d = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    d.fromBufferAttribute(pos, i).normalize();

    let r = 1;
    for (const lobe of LOBES) r += lobe.amount * Math.exp((d.dot(lobe.dir) - 1) / lobe.width);
    r += 0.012 * Math.sin(d.x * 5.1 + d.y * 3.3) * Math.sin(d.z * 4.7 - d.y * 2.1);

    // Wider base, narrower crown, slightly shallower front-to-back.
    const taper = 1.16 - 0.14 * d.y;
    let x = d.x * r * 1.1 * taper;
    let y = d.y * r * 0.84;
    let z = d.z * r * 0.92 * taper;

    // Polynomial smooth-max against the floor: a flat, soft-edged base
    // that bulges a little as if the blob were resting on its own weight.
    const h = Math.min(1, Math.max(0, 0.5 + (0.5 * (y - FLOOR)) / FLOOR_SOFTNESS));
    const flattened = FLOOR + (y - FLOOR) * h + FLOOR_SOFTNESS * h * (1 - h);
    const spread = 1 + 0.06 * (1 - h);
    x *= spread;
    z *= spread;
    y = flattened;

    pos.setXYZ(i, x, y - FLOOR, z);
  }
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
}

export interface SurfaceHit {
  point: Vector3;
  normal: Vector3;
}

export interface BodyParts {
  group: Group;
  mesh: Mesh;
  height: number;
  deform: DeformUniforms;
  /** Front surface point at body-space (x, y), found by casting towards -Z. */
  surfaceFront(x: number, y: number): SurfaceHit;
  /** Top surface point at body-space (x, z), found by casting downwards. */
  surfaceTop(x: number, z: number): SurfaceHit;
  dispose(): void;
}

export function createBody(config: DotConfig): BodyParts {
  const geometry = new SphereGeometry(1, 160, 120);
  shapeBody(geometry);
  const height = geometry.boundingBox!.max.y;
  const deform = createDeformUniforms(height);

  const base = new Color(config.bodyColor);
  const hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);
  const bottom = new Color().setHSL(hsl.h + 0.02, Math.min(1, hsl.s + 0.15), hsl.l * 0.6);
  const top = new Color().setHSL(hsl.h - 0.045, Math.min(1, hsl.s + 0.1), hsl.l * 0.95);
  const fuzzColor = new Color().setHSL(hsl.h - 0.04, 0.9, 0.82);

  const feltOptions = {
    top,
    bottom,
    fuzzColor,
    sheenColor: new Color().setHSL(hsl.h - 0.03, 0.8, 0.78),
    gradient: [0.1, height * 1.05] as [number, number],
    roughness: config.bodyRoughness,
    fuzz: config.fuzzStrength,
    bump: config.bumpStrength,
    fiberScale: config.fiberScale,
    deform,
  };
  const { material } = createFeltMaterial(feltOptions);

  const mesh = new Mesh(geometry, material);
  mesh.castShadow = config.shadows;
  mesh.receiveShadow = config.shadows;
  mesh.customDepthMaterial = createDeformDepthMaterial(deform);

  const group = new Group();
  group.add(mesh);

  // Fur shells: a few translucent offset layers that give the silhouette a fuzzy edge.
  const shellMaterials: ShaderMaterial[] = [];
  const keyDir = new Vector3(-0.55, 0.65, 0.55).normalize();
  const feltUniforms = createFeltUniforms(feltOptions);
  for (let i = 0; i < config.furShells; i++) {
    const layer = (i + 1) / config.furShells;
    const shellMaterial = new ShaderMaterial({
      vertexShader: shaders.furShellVertex,
      fragmentShader: shaders.furShellFragment,
      uniforms: {
        ...feltUniforms,
        ...deform,
        uKeyDir: { value: keyDir },
        uShellOffset: { value: config.furLength * layer },
        uLayer: { value: layer },
        uShellOpacity: { value: 0.75 },
      },
      transparent: true,
      depthWrite: false,
    });
    shellMaterials.push(shellMaterial);
    const shell = new Mesh(geometry, shellMaterial);
    shell.renderOrder = 1 + i;
    group.add(shell);
  }

  const raycaster = new Raycaster();
  const cast = (origin: Vector3, direction: Vector3): SurfaceHit => {
    raycaster.set(origin, direction);
    const hit = raycaster.intersectObject(mesh, false)[0];
    if (!hit || !hit.face) throw new Error("Surface probe missed the body");
    return { point: hit.point.clone(), normal: hit.face.normal.clone() };
  };

  return {
    group,
    mesh,
    height,
    deform,
    surfaceFront: (x, y) => cast(new Vector3(x, y, 10), new Vector3(0, 0, -1)),
    surfaceTop: (x, z) => cast(new Vector3(x, 10, z), new Vector3(0, -1, 0)),
    dispose() {
      geometry.dispose();
      material.dispose();
      mesh.customDepthMaterial?.dispose();
      shellMaterials.forEach((m) => m.dispose());
    },
  };
}
