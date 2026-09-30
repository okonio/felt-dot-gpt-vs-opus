// Animated soft-body deformation. Mirrored in src/dot/deform.ts so the eyes
// and beret stay glued to the surface.
uniform vec2 uLean;
uniform float uHeight;
uniform float uJiggle;
uniform float uTime;

vec3 dotDeform(vec3 p) {
  float t = clamp(p.y / uHeight, 0.0, 1.0);
  p.xz += uLean * t * t;
  p.xz *= 1.0 + uJiggle * t * sin(p.y * 6.0 - uTime * 11.0);
  return p;
}

vec3 dotDeformNormal(vec3 p, vec3 n) {
  float t = clamp(p.y / uHeight, 0.0, 1.0);
  vec2 slope = uLean * (2.0 * t / uHeight);
  n.y -= dot(slope, n.xz);
  return normalize(n);
}
