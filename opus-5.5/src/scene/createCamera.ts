import { MathUtils, PerspectiveCamera, Vector3 } from "three";

// Region that must stay in view: blob, beret and a little breathing room.
const FRAME_CENTER = new Vector3(-0.05, 0.9, 0);
const FRAME_HALF_WIDTH = 2.45;
const FRAME_HALF_HEIGHT = 1.55;
const ELEVATION = 0.14;

export function createCamera() {
  const camera = new PerspectiveCamera(28, 1, 0.1, 60);

  /** Static framing that fits the character for any aspect ratio. */
  const fit = (width: number, height: number) => {
    const aspect = width / Math.max(1, height);
    camera.aspect = aspect;
    const tanHalf = Math.tan(MathUtils.degToRad(camera.fov / 2));
    // Portrait screens also need room for the title above the character.
    const halfHeight = FRAME_HALF_HEIGHT * (aspect < 1 ? 1.15 : 1);
    const halfWidth = FRAME_HALF_WIDTH * (aspect < 1 ? 0.88 : 1);
    const distance = Math.max(halfHeight / tanHalf, halfWidth / (tanHalf * aspect));
    camera.position.set(FRAME_CENTER.x, FRAME_CENTER.y + distance * ELEVATION, FRAME_CENTER.z + distance);
    // Aim a touch above centre so the character sits slightly low, under the title.
    camera.lookAt(FRAME_CENTER.x, FRAME_CENTER.y + halfHeight * 0.12, FRAME_CENTER.z);
    camera.updateProjectionMatrix();
  };

  return { camera, fit };
}
