uniform float uFeltTime;
uniform float uFeltMotion;
varying vec3 vFeltPosition;

vec3 deformFelt(vec3 p) {
  float weight = smoothstep(0.06, 1.6, p.y);
  p.x += sin(p.y * 2.8 + uFeltTime * 1.2) * 0.007 * weight * uFeltMotion;
  p.z += sin(p.y * 3.1 + p.x * 2.0 + uFeltTime * 0.9) * 0.005 * weight * uFeltMotion;
  return p;
}
