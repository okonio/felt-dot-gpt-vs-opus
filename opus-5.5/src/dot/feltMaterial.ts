import { Color, MeshDepthMaterial, MeshPhysicalMaterial, Vector2 } from "three";
import { shaders } from "../shaders/chunks";
import type { DeformUniforms } from "./deform";

export interface FeltOptions {
  top: Color;
  bottom: Color;
  fuzzColor: Color;
  sheenColor: Color;
  gradient: [number, number];
  roughness: number;
  fuzz: number;
  bump: number;
  fiberScale: number;
  deform?: DeformUniforms;
}

export function createFeltUniforms(o: FeltOptions) {
  return {
    uFeltTop: { value: o.top },
    uFeltBottom: { value: o.bottom },
    uFeltFuzzColor: { value: o.fuzzColor },
    uFeltGradient: { value: new Vector2(...o.gradient) },
    uFeltFuzz: { value: o.fuzz },
    uFeltBump: { value: o.bump },
    uFeltScale: { value: o.fiberScale },
  };
}

const injectDeformVertex = (vertexShader: string) =>
  vertexShader
    .replace("#include <common>", `#include <common>\n${shaders.feltVertex}`)
    .replace(
      "#include <beginnormal_vertex>",
      "#include <beginnormal_vertex>\n#ifdef FELT_DEFORM\nobjectNormal = dotDeformNormal(position, objectNormal);\n#endif",
    )
    .replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nvFeltPos = transformed;\n#ifdef FELT_DEFORM\ntransformed = dotDeform(transformed);\n#endif",
    );

/**
 * Physically based felt: very rough diffuse + sheen, with procedural fibre
 * albedo, a fine bump and a fresnel fuzz layer injected into the stock shader.
 */
export function createFeltMaterial(o: FeltOptions) {
  const material = new MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: o.roughness,
    metalness: 0,
    sheen: 1,
    sheenRoughness: 0.85,
    sheenColor: o.sheenColor,
    envMapIntensity: 0.6,
  });
  const uniforms = createFeltUniforms(o);
  if (o.deform) material.defines = { FELT_DEFORM: "" };

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, o.deform ?? {});
    shader.vertexShader = injectDeformVertex(shader.vertexShader);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${shaders.feltFragment}`)
      .replace(
        "#include <color_fragment>",
        "#include <color_fragment>\nfloat feltH = feltHeight(vFeltPos);\ndiffuseColor.rgb *= feltAlbedo(vFeltPos, feltH);",
      )
      .replace(
        "#include <normal_fragment_maps>",
        "#include <normal_fragment_maps>\nnormal = feltPerturbNormal(-vViewPosition, normal, feltH * uFeltBump);",
      )
      .replace(
        "#include <opaque_fragment>",
        "outgoingLight += feltFuzz(normal, normalize(vViewPosition), feltH);\n#include <opaque_fragment>",
      );
  };
  material.customProgramCacheKey = () => (o.deform ? "felt-deform" : "felt-static");

  return { material, uniforms };
}

/** Shadow-pass material that applies the same animated deformation. */
export function createDeformDepthMaterial(deform: DeformUniforms) {
  const material = new MeshDepthMaterial();
  material.defines = { FELT_DEFORM: "" };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, deform);
    shader.vertexShader = injectDeformVertex(shader.vertexShader);
  };
  material.customProgramCacheKey = () => "felt-deform-depth";
  return material;
}
