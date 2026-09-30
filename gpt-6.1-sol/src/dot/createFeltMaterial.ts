import { MeshStandardMaterial, MeshDepthMaterial, RGBADepthPacking, DoubleSide } from 'three';
import feltVertex from '../shaders/feltVertex.glsl?raw';
import feltFragment from '../shaders/feltFragment.glsl?raw';

export function createFeltMaterial(color: string, roughness: number, grain = 1, fibers = false) {
  const uniforms = {
    uFeltTime: { value: 0 },
    uFeltMotion: { value: 1 },
    uFeltGrain: { value: grain },
  };
  const material = new MeshStandardMaterial({
    color, roughness, metalness: 0,
    side: fibers ? DoubleSide : undefined,
    vertexColors: fibers,
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + feltVertex)
      .replace('#include <begin_vertex>', 'vec3 transformed = deformFelt(position);\nvFeltPosition = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + feltFragment)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float grain = feltNoise(vFeltPosition * 210.0);
        float fleck = feltNoise(vFeltPosition * 420.0);
        float mottle = feltNoise(vFeltPosition * 18.0);
        diffuseColor.rgb *= 0.91 + 0.12 * grain + 0.06 * mottle;
      `)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        ${fibers ? 'normal *= faceDirection;' : ''}
        float height = (grain + fleck * 0.35) * 0.00065 * uFeltGrain;
        normal = feltNormal(normal, -vViewPosition, height);
      `)
      .replace('#include <opaque_fragment>', `
        float grazing = pow(1.0 - max(dot(normal, normalize(vViewPosition)), 0.0), 3.0);
        outgoingLight += diffuseColor.rgb * grazing * 0.13;
        #include <opaque_fragment>
      `);
  };
  material.customProgramCacheKey = () => fibers ? 'felt-fibers-v1' : 'felt-surface-v1';

  // The shadow pass uses the same displacement as the visible fabric.
  const depthMaterial = new MeshDepthMaterial({ depthPacking: RGBADepthPacking });
  depthMaterial.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + feltVertex)
      .replace('#include <begin_vertex>', 'vec3 transformed = deformFelt(position);');
  };
  depthMaterial.customProgramCacheKey = () => 'felt-depth-v1';
  return { material, depthMaterial, uniforms };
}
