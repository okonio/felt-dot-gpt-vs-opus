import { PerspectiveCamera } from 'three';

export function createCamera() {
  const camera = new PerspectiveCamera(33, 1, 0.1, 40);
  camera.position.set(0, 1.7, 7.1);
  camera.lookAt(0, 1.12, 0);
  return camera;
}

export function resizeCamera(camera: PerspectiveCamera, width: number, height: number) {
  camera.aspect = width / height;
  // Keep a little breathing room on narrow portrait screens.
  camera.fov = Math.max(33, 2 * Math.atan(Math.tan(33 * Math.PI / 360) / Math.min(camera.aspect / 0.84, 1)) * 180 / Math.PI);
  camera.updateProjectionMatrix();
}
