import { ACESFilmicToneMapping, PCFShadowMap, SRGBColorSpace, WebGLRenderer, Mesh, Material } from 'three';
import { DOT_CONFIG, type DotConfig } from './dot/config';
import { createDot } from './dot/createDot';
import { DotAnimator } from './dot/DotAnimator';
import { createCamera, resizeCamera } from './scene/createCamera';
import { createScene } from './scene/createScene';

export function createDotExperience(container: HTMLElement, options: Partial<DotConfig> = {}) {
  const config = { ...DOT_CONFIG, ...options };
  const scene = createScene();
  const camera = createCamera();
  const renderer = new WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.domElement.setAttribute('aria-label', 'Animated blue felt blob');
  renderer.domElement.setAttribute('role', 'img');
  container.appendChild(renderer.domElement);
  const dot = createDot(config);
  scene.add(dot.group);
  const animator = new DotAnimator(dot, config);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, previousTime = 0, disposed = false, contextLost = false;

  const resize = () => {
    const { width, height } = container.getBoundingClientRect();
    if (width < 1 || height < 1) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, config.maxPixelRatio));
    renderer.setSize(width, height, false);
    resizeCamera(camera, width, height);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  window.addEventListener('resize', resize);
  resize();

  const move = (event: PointerEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    animator.setPointer((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
  };
  const leave = () => animator.clearPointer();
  const endTouch = (event: PointerEvent) => { if (event.pointerType !== 'mouse') leave(); };
  renderer.domElement.addEventListener('pointermove', move);
  renderer.domElement.addEventListener('pointerleave', leave);
  renderer.domElement.addEventListener('pointercancel', leave);
  renderer.domElement.addEventListener('pointerup', endTouch);
  window.addEventListener('blur', leave);

  const render = (time: number) => {
    if (disposed || contextLost || document.hidden) return;
    const delta = previousTime ? (time - previousTime) / 1000 : 1 / 60;
    previousTime = time;
    animator.update(delta, reducedMotion.matches);
    renderer.render(scene, camera);
    frame = requestAnimationFrame(render);
  };
  const resume = () => { cancelAnimationFrame(frame); previousTime = 0; if (!document.hidden && !contextLost && !disposed) frame = requestAnimationFrame(render); };
  const lost = (event: Event) => { event.preventDefault(); contextLost = true; cancelAnimationFrame(frame); };
  const restored = () => { contextLost = false; resume(); };
  document.addEventListener('visibilitychange', resume);
  renderer.domElement.addEventListener('webglcontextlost', lost);
  renderer.domElement.addEventListener('webglcontextrestored', restored);
  frame = requestAnimationFrame(render);

  return {
    dot, animator, renderer, camera,
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('blur', leave);
      document.removeEventListener('visibilitychange', resume);
      renderer.domElement.removeEventListener('pointermove', move);
      renderer.domElement.removeEventListener('pointerleave', leave);
      renderer.domElement.removeEventListener('pointercancel', leave);
      renderer.domElement.removeEventListener('pointerup', endTouch);
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      renderer.domElement.removeEventListener('webglcontextrestored', restored);
      const materials = new Set<Material>();
      scene.traverse((object) => {
        if (object instanceof Mesh) {
          object.geometry.dispose();
          (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => materials.add(m));
          if (object.customDepthMaterial) materials.add(object.customDepthMaterial);
        }
      });
      [dot.body.depthMaterial, dot.body.fibers.depthMaterial, dot.beret.depthMaterial, dot.beret.fibers.depthMaterial].forEach(m => materials.add(m));
      materials.forEach(m => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
