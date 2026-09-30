import { DirectionalLight, HemisphereLight, Scene } from 'three';

export function createLights(scene: Scene) {
  const ambient = new HemisphereLight('#dcecff', '#33382e', 1.55);
  const key = new DirectionalLight('#fff4e7', 3.2);
  key.position.set(-3.5, 5, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -3; key.shadow.camera.right = 3;
  key.shadow.camera.top = 4; key.shadow.camera.bottom = -2;
  key.shadow.camera.near = 0.5; key.shadow.camera.far = 12;
  key.shadow.normalBias = 0.022;
  key.shadow.bias = -0.00015;
  key.shadow.radius = 4;
  const fill = new DirectionalLight('#bddbff', 0.8);
  fill.position.set(3, 2.2, 4);
  const rim = new DirectionalLight('#dae5ec', 1.3);
  rim.position.set(2.5, 4, -3);
  scene.add(ambient, key, fill, rim);
}
