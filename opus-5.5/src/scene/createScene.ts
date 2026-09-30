import {
  Color,
  Mesh,
  NeutralToneMapping,
  PCFShadowMap,
  PMREMGenerator,
  PlaneGeometry,
  Scene,
  ShadowMaterial,
  SRGBColorSpace,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export const BACKGROUND = new Color(0xffffff);

export function createRenderer(shadows: boolean) {
  const renderer = new WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(BACKGROUND, 1);
  renderer.outputColorSpace = SRGBColorSpace;
  // Neutral keeps the blue's hue intact on a white page.
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = PCFShadowMap;
  return renderer;
}

export function createScene(renderer: WebGLRenderer) {
  const scene = new Scene();
  scene.background = BACKGROUND;

  // A soft studio environment for gentle, wrap-around ambient light.
  const pmrem = new PMREMGenerator(renderer);
  const environment = new RoomEnvironment();
  const envMap = pmrem.fromScene(environment, 0.04).texture;
  scene.environment = envMap;
  scene.environmentIntensity = 0.55;
  environment.dispose();
  pmrem.dispose();

  const ground = new Mesh(new PlaneGeometry(30, 30), new ShadowMaterial({ opacity: 0.09 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  return {
    scene,
    dispose() {
      envMap.dispose();
      ground.geometry.dispose();
      ground.material.dispose();
    },
  };
}
