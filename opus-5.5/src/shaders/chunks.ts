import deform from "./deform.glsl?raw";
import noise from "./noise.glsl?raw";
import feltVertex from "./feltVertex.glsl?raw";
import feltFragment from "./feltFragment.glsl?raw";
import furShellVertex from "./furShell.vert.glsl?raw";
import furShellFragment from "./furShell.frag.glsl?raw";

const localChunks: Record<string, string> = {
  dot_deform: deform,
  felt_noise: noise,
};

/** Inlines this project's own chunks; Three.js resolves its built-in ones later. */
const resolve = (source: string) =>
  source.replace(/^[ \t]*#include <(\w+)>/gm, (match, name: string) => localChunks[name] ?? match);

export const shaders = {
  feltVertex: resolve(feltVertex),
  feltFragment: resolve(feltFragment),
  furShellVertex: resolve(furShellVertex),
  furShellFragment: resolve(furShellFragment),
};
