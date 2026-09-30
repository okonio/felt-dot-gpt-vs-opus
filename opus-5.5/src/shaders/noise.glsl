float feltHash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float feltNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(
      mix(feltHash(i), feltHash(i + vec3(1.0, 0.0, 0.0)), f.x),
      mix(feltHash(i + vec3(0.0, 1.0, 0.0)), feltHash(i + vec3(1.0, 1.0, 0.0)), f.x),
      f.y
    ),
    mix(
      mix(feltHash(i + vec3(0.0, 0.0, 1.0)), feltHash(i + vec3(1.0, 0.0, 1.0)), f.x),
      mix(feltHash(i + vec3(0.0, 1.0, 1.0)), feltHash(i + vec3(1.0, 1.0, 1.0)), f.x),
      f.y
    ),
    f.z
  );
}
