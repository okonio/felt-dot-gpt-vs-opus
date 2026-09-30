import { Timer } from "three";
import { DOT_CONFIG, type DotConfig } from "./config";
import { DotAnimator } from "./dot/DotAnimator";
import { createDot } from "./dot/createDot";
import { PointerTracker } from "./interaction/PointerTracker";
import { createCamera } from "./scene/createCamera";
import { createLights } from "./scene/createLights";
import { createRenderer, createScene } from "./scene/createScene";

export interface DotExperience {
  animator: DotAnimator;
  dispose(): void;
}

/**
 * Mounts the animated character into any container element. The canvas fills
 * the container and follows its size.
 */
export function createDotExperience(
  container: HTMLElement,
  overrides: Partial<DotConfig> = {},
): DotExperience {
  const config: DotConfig = { ...DOT_CONFIG, ...overrides };

  const renderer = createRenderer(config.shadows);
  container.appendChild(renderer.domElement);

  const { scene, dispose: disposeScene } = createScene(renderer);
  createLights(scene, config.shadows);
  const { camera, fit } = createCamera();

  const dot = createDot(config);
  scene.add(dot.root);

  const pointer = new PointerTracker(container);
  const animator = new DotAnimator(dot, config, pointer);

  const resize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    fit(width, height);
    // setSize clears the canvas; draw right away so resizing never flashes blank.
    renderer.render(scene, camera);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  const timer = new Timer();
  timer.connect(document);
  renderer.setAnimationLoop((now) => {
    timer.update(now);
    animator.update(timer.getDelta(), timer.getElapsed());
    renderer.render(scene, camera);
  });

  return {
    animator,
    dispose() {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      timer.dispose();
      pointer.dispose();
      dot.dispose();
      disposeScene();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
