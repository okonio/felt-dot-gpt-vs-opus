varying vec3 vFeltPosition;
uniform float uFeltGrain;

float feltHash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.17, 0.43, 0.71));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float feltNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(feltHash(i), feltHash(i + vec3(1,0,0)), f.x),
        mix(feltHash(i + vec3(0,1,0)), feltHash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(feltHash(i + vec3(0,0,1)), feltHash(i + vec3(1,0,1)), f.x),
        mix(feltHash(i + vec3(0,1,1)), feltHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}

vec3 feltNormal(vec3 n, vec3 viewPosition, float height) {
  vec3 dx = dFdx(viewPosition);
  vec3 dy = dFdy(viewPosition);
  vec3 r1 = cross(dy, n);
  vec3 r2 = cross(n, dx);
  float det = dot(dx, r1);
  vec3 gradient = sign(det) * (dFdx(height) * r1 + dFdy(height) * r2);
  return normalize(abs(det) * n - gradient);
}
