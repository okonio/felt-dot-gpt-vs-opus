import {
  CatmullRomCurve3,
  Color,
  Group,
  LatheGeometry,
  Mesh,
  Quaternion,
  SphereGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
} from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { DotConfig } from "../config";
import type { BodyParts } from "./createBody";
import { createFeltMaterial } from "./feltMaterial";

// Half cross-section of the beret (radius, height), from the band up over the puff.
// The underside curves down so the beret hugs the round head.
const PROFILE = [
  [0.001, 0.08],
  [0.3, 0.02],
  [0.5, -0.05],
  [0.66, -0.08],
  [0.75, -0.02],
  [0.76, 0.08],
  [0.68, 0.18],
  [0.5, 0.26],
  [0.26, 0.3],
  [0.001, 0.31],
];

function createBeretGeometry(): BufferGeometry {
  const curve = new CatmullRomCurve3(PROFILE.map(([r, y]) => new Vector3(r, y, 0)));
  const points = curve.getPoints(48).map((p) => new Vector2(Math.max(0.001, p.x), p.y));
  let geometry: BufferGeometry = new LatheGeometry(points, 72);
  geometry.deleteAttribute("normal");
  geometry.deleteAttribute("uv");
  geometry = mergeVertices(geometry, 1e-4);

  // Hand-made irregularity: uneven rim, a droop on the left, a lumpy crown.
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    const theta = Math.atan2(z, x);
    const rim = Math.min(1, Math.max(0, (r - 0.38) / 0.34));

    const wobble = 1 + 0.035 * Math.sin(3 * theta + 0.4) + 0.02 * Math.sin(5 * theta + 1.9);
    const droop = rim * rim * 0.075 * (0.5 - 0.5 * Math.cos(theta - Math.PI));
    const lump = 0.018 * Math.sin(2 * theta + r * 5) * (y / 0.345);

    pos.setXYZ(i, x * wobble, y - droop + lump, z * wobble);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export interface BeretParts {
  /** Sits on the body surface at the band and follows the deformation. */
  anchor: Group;
  /** Receives the lagging secondary motion. */
  pivot: Group;
  restPosition: Vector3;
  restQuaternion: Quaternion;
  dispose(): void;
}

export function createBeret(body: BodyParts, config: DotConfig): BeretParts {
  const geometry = createBeretGeometry();
  const stemGeometry = new SphereGeometry(0.085, 24, 16);

  const base = new Color(config.beretColor);
  const { material } = createFeltMaterial({
    top: base.clone().multiplyScalar(1.1),
    bottom: base.clone().multiplyScalar(0.55),
    fuzzColor: new Color(0x6c6c74),
    sheenColor: new Color(0x3a3a40),
    gradient: [-0.05, 0.3],
    roughness: 1,
    fuzz: 0.5,
    bump: config.bumpStrength * 0.5,
    fiberScale: config.fiberScale * 1.1,
  });

  const cap = new Mesh(geometry, material);
  const stem = new Mesh(stemGeometry, material);
  stem.position.set(0.03, 0.36, -0.01);
  stem.scale.set(1, 0.85, 1);
  cap.castShadow = stem.castShadow = config.shadows;

  const sized = new Group();
  sized.add(cap, stem);
  sized.scale.setScalar(1.3);
  const pivot = new Group();
  pivot.add(sized);

  // Seat the band on the upper-left of the head, sunk in slightly, then tilt it.
  const hit = body.surfaceTop(-0.28, 0.02);
  const up = new Vector3(0, 1, 0);
  const seat = hit.normal.clone().lerp(up, 0.5).normalize();
  const anchor = new Group();
  const restPosition = hit.point.clone().addScaledVector(seat, -0.1);
  anchor.position.copy(restPosition);
  anchor.quaternion
    .setFromUnitVectors(up, seat)
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), 0.2))
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 0.1));
  anchor.add(pivot);
  body.group.add(anchor);

  return {
    anchor,
    pivot,
    restPosition,
    restQuaternion: anchor.quaternion.clone(),
    dispose() {
      geometry.dispose();
      stemGeometry.dispose();
      material.dispose();
    },
  };
}
