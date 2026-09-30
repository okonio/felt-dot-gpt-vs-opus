uniform vec3 uFeltTop;
uniform vec3 uFeltBottom;
uniform vec3 uFeltFuzzColor;
uniform vec2 uFeltGradient;
uniform vec3 uKeyDir;
uniform float uFeltScale;
uniform float uLayer;
uniform float uShellOpacity;

varying vec3 vFeltPos;
varying vec3 vNormalW;
varying vec3 vViewDirW;

#include <felt_noise>

void main() {
  // Stretched noise reads as short tangled fibres rather than dots.
  vec3 q = vFeltPos * uFeltScale * 2.4;
  float fibre = feltNoise(q * vec3(1.0, 1.7, 1.0)) * 0.65 + feltNoise(q * 2.1 + 5.0) * 0.35;
  float threshold = 0.46 + uLayer * 0.16;
  float mask = smoothstep(threshold, threshold + 0.12, fibre);

  vec3 n = normalize(vNormalW);
  float facing = abs(dot(n, normalize(vViewDirW)));
  float edge = pow(1.0 - facing, 1.6);
  float floorFade = smoothstep(0.0, 0.1, vFeltPos.y);
  float alpha = mask * (0.18 + 0.82 * edge) * floorFade * uShellOpacity * (1.0 - uLayer * 0.55);
  if (alpha < 0.01) discard;

  float light = clamp(dot(n, uKeyDir) * 0.5 + 0.5, 0.0, 1.0);
  float g = smoothstep(uFeltGradient.x, uFeltGradient.y, vFeltPos.y);
  vec3 base = mix(uFeltBottom, uFeltTop, g);
  vec3 color = mix(base * 0.72, base * 1.05 + uFeltFuzzColor * 0.3, light);

  gl_FragColor = vec4(color, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
