import { Color, Group, Mesh, MeshStandardMaterial, SphereGeometry, Vector3 } from "three";
import type { DotConfig } from "../config";
import type { BodyParts } from "./createBody";

export interface Eye {
  /** Sits on the body surface and follows the deformation. */
  anchor: Group;
  /** Receives the look offset and the blink scale. */
  mesh: Mesh;
  restPosition: Vector3;
  baseScale: Vector3;
  phase: number;
}

export interface EyesParts {
  eyes: Eye[];
  dispose(): void;
}

const EYE_SIZE = new Vector3(0.078, 0.13, 0.05);

export function createEyes(body: BodyParts, config: DotConfig): EyesParts {
  const geometry = new SphereGeometry(1, 32, 24);
  const material = new MeshStandardMaterial({
    color: new Color(config.eyeColor),
    roughness: 0.82,
    metalness: 0,
  });

  // Right of centre and a little below mid-height, as in the reference.
  const centerX = 0.2;
  const spacing = 0.44;
  const y = body.height * 0.43;
  const forward = new Vector3(0, 0, 1);

  const eyes: Eye[] = [-1, 1].map((side, index) => {
    const hit = body.surfaceFront(centerX + (side * spacing) / 2, y);
    // Bias towards the camera so both eyes read as facing forward.
    const facing = hit.normal.clone().lerp(forward, 0.55).normalize();

    const anchor = new Group();
    const restPosition = hit.point.clone().addScaledVector(facing, -0.012);
    anchor.position.copy(restPosition);
    anchor.quaternion.setFromUnitVectors(forward, facing);

    const mesh = new Mesh(geometry, material);
    mesh.scale.copy(EYE_SIZE);
    anchor.add(mesh);

    return { anchor, mesh, restPosition, baseScale: EYE_SIZE.clone(), phase: index * 2.37 + 0.6 };
  });

  body.group.add(...eyes.map((e) => e.anchor));

  return {
    eyes,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

