import { Vector2, Vector3 } from "three";

export interface DeformUniforms {
  uLean: { value: Vector2 };
  uHeight: { value: number };
  uJiggle: { value: number };
  uTime: { value: number };
}

export const createDeformUniforms = (height: number): DeformUniforms => ({
  uLean: { value: new Vector2() },
  uHeight: { value: height },
  uJiggle: { value: 0 },
  uTime: { value: 0 },
});

/** CPU mirror of dotDeform() in shaders/deform.glsl. */
export function deformPoint(source: Vector3, u: DeformUniforms, target: Vector3) {
  const t = Math.min(1, Math.max(0, source.y / u.uHeight.value));
  const lean = u.uLean.value;
  target.set(source.x + lean.x * t * t, source.y, source.z + lean.y * t * t);
  const ripple = 1 + u.uJiggle.value * t * Math.sin(source.y * 6 - u.uTime.value * 11);
  target.x *= ripple;
  target.z *= ripple;
  return target;
}

/** Surface tilt (radians around Z and X) caused by the lean shear at a given height. */
export function deformSlope(y: number, u: DeformUniforms) {
  const h = u.uHeight.value;
  const t = Math.min(1, Math.max(0, y / h));
  return { x: (2 * u.uLean.value.x * t) / h, z: (2 * u.uLean.value.y * t) / h };
}
