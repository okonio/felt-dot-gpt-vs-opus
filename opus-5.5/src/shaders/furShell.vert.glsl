#include <dot_deform>

uniform float uShellOffset;
varying vec3 vFeltPos;
varying vec3 vNormalW;
varying vec3 vViewDirW;

void main() {
  vFeltPos = position;
  vec3 p = dotDeform(position + normal * uShellOffset);
  vec4 worldPos = modelMatrix * vec4(p, 1.0);
  vNormalW = normalize(mat3(modelMatrix) * dotDeformNormal(position, normal));
  vViewDirW = normalize(cameraPosition - worldPos.xyz);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
