import { CanvasTexture, Group, Mesh, MeshBasicMaterial, PlaneGeometry } from "three";
import type { DotConfig } from "../config";
import { createBeret, type BeretParts } from "./createBeret";
import { createBody, type BodyParts } from "./createBody";
import { createEyes, type EyesParts } from "./createEyes";

export interface Dot {
  /** Placed in the scene; stays planted on the floor. */
  root: Group;
  /** body.group pivots at the bottom centre: squash, stretch and wobble happen there. */
  body: BodyParts;
  eyes: EyesParts;
  beret: BeretParts;
  contactShadow: Mesh<PlaneGeometry, MeshBasicMaterial>;
  dispose(): void;
}

function createContactShadow() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(20, 30, 60, 0.5)");
  gradient.addColorStop(0.45, "rgba(20, 30, 60, 0.2)");
  gradient.addColorStop(1, "rgba(20, 30, 60, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const mesh = new Mesh(
    new PlaneGeometry(3.3, 1.9),
    new MeshBasicMaterial({ map: new CanvasTexture(canvas), transparent: true, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.002;
  return mesh;
}

export function createDot(config: DotConfig): Dot {
  const body = createBody(config);
  const eyes = createEyes(body, config);
  const beret = createBeret(body, config);
  const contactShadow = createContactShadow();

  const root = new Group();
  root.add(contactShadow, body.group);

  return {
    root,
    body,
    eyes,
    beret,
    contactShadow,
    dispose() {
      body.dispose();
      eyes.dispose();
      beret.dispose();
      contactShadow.geometry.dispose();
      contactShadow.material.map?.dispose();
      contactShadow.material.dispose();
    },
  };
}
