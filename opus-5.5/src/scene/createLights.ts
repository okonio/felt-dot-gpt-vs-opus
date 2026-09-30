import { DirectionalLight, HemisphereLight, type Scene } from "three";

/** Soft studio setup: large key from upper-left front, weak fill, subtle rim. */
export function createLights(scene: Scene, shadows: boolean) {
  const hemisphere = new HemisphereLight(0xffffff, 0xdfe6ef, 0.9);

  const key = new DirectionalLight(0xfffaf3, 2.1);
  key.position.set(-3.2, 5, 4.2);
  key.castShadow = shadows;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 9;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  const cam = key.shadow.camera;
  cam.left = -2.4;
  cam.right = 2.4;
  cam.top = 2.4;
  cam.bottom = -2.4;
  cam.near = 1;
  cam.far = 14;

  const fill = new DirectionalLight(0xe8f1ff, 0.55);
  fill.position.set(4, 1.5, 3);

  const rim = new DirectionalLight(0xffffff, 1.1);
  rim.position.set(1.5, 3, -4.5);

  scene.add(hemisphere, key, key.target, fill, rim);
  return { key, fill, rim, hemisphere };
}
