import { Color, Mesh, PlaneGeometry, Scene, ShaderMaterial } from 'three';
import { createLights } from './createLights';

export function createScene() {
  const scene = new Scene();
  scene.background = new Color('#ffffff');
  createLights(scene);
  // An analytic contact shadow stays soft without postprocessing or a texture asset.
  const contact = new Mesh(new PlaneGeometry(5.5, 4.6), new ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec2 vUv; void main() { vec2 p = (vUv - 0.5) * vec2(2.6, 3.4); float a = exp(-dot(p,p) * 5.5) * 0.18; gl_FragColor = vec4(0.0, 0.0, 0.0, a); }',
  }));
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.005;
  scene.add(contact);
  return scene;
}
