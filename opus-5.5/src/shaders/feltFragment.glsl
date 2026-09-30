varying vec3 vFeltPos;
uniform vec3 uFeltTop;
uniform vec3 uFeltBottom;
uniform vec3 uFeltFuzzColor;
uniform vec2 uFeltGradient;
uniform float uFeltFuzz;
uniform float uFeltBump;
uniform float uFeltScale;

#include <felt_noise>

float feltHeight(vec3 p) {
  vec3 q = p * uFeltScale;
  float fine = feltNoise(q * 2.6 + 11.3);
  float mid = feltNoise(q);
  float clump = feltNoise(q * 0.16 + 3.7);
  return fine * 0.45 + mid * 0.35 + clump * 0.2;
}

vec3 feltAlbedo(vec3 p, float h) {
  float g = smoothstep(uFeltGradient.x, uFeltGradient.y, p.y + 0.1 * sin(p.x * 2.3 + p.z));
  vec3 base = mix(uFeltBottom, uFeltTop, g);
  return base * (0.86 + 0.24 * h);
}

// Screen-space bump from a procedural height (Mikkelsen's surface gradient).
vec3 feltPerturbNormal(vec3 surfPos, vec3 n, float h) {
  vec3 sigmaX = dFdx(surfPos);
  vec3 sigmaY = dFdy(surfPos);
  vec3 r1 = cross(sigmaY, n);
  vec3 r2 = cross(n, sigmaX);
  float det = dot(sigmaX, r1);
  vec2 dHdxy = vec2(dFdx(h), dFdy(h));
  vec3 grad = sign(det) * (dHdxy.x * r1 + dHdxy.y * r2);
  return normalize(abs(det) * n - grad);
}

vec3 feltFuzz(vec3 n, vec3 viewDir, float h) {
  float ndv = clamp(dot(n, viewDir), 0.0, 1.0);
  float rim = pow(1.0 - ndv, 2.2);
  return uFeltFuzzColor * rim * uFeltFuzz * (0.5 + h);
}
