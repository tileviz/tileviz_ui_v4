// three/scene.ts — Scene, lights, renderer. Dynamic require for expo-three (web safe)
import * as THREE from 'three';
import { THREE_FT_SCALE } from '../config';
import { patchGLForExpoThree } from './materials';

export interface SceneBundle {
  scene:THREE.Scene; camera:THREE.PerspectiveCamera; renderer:any;
  sun:THREE.DirectionalLight; pointLight:THREE.PointLight; hemi:THREE.HemisphereLight;
}

export function createScene(gl: any, w: number, h: number): SceneBundle {
  // Patch the GL context BEFORE the Renderer is created so that Three.js
  // uses the legacy texImage2D path that expo-gl supports for Asset textures.
  patchGLForExpoThree(gl);

  // Dynamic require — expo-three is native only, top-level import crashes web
  const { Renderer } = require('expo-three');
  
  // In expo-gl, we pass the gl context and it automatically configures
  // the size and pixel ratio based on the native drawing buffer.
  const renderer = new Renderer({ gl });
  
  // Set logical size for the viewport calculations without CSS overrides
  renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight, false);
  renderer.setPixelRatio(1); // expo-gl is already physical-pixel backed

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0xe8e2d8, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe8e2d8);
  scene.fog = new THREE.FogExp2(0xe8e2d8, 0.005);

  const camera = new THREE.PerspectiveCamera(48, w / h, 0.1, 120);
  camera.position.set(6, 5, 8);
  camera.lookAt(0, 0, 0);

  const hemi = new THREE.HemisphereLight(0xfff5e4, 0x8a7a6a, 0.9);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff5e6, 1.4);
  sun.position.set(8, 14, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 70;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -16;
  sun.shadow.camera.right = sun.shadow.camera.top = 16;
  sun.shadow.bias = -0.0003;
  scene.add(sun);

  const pointLight = new THREE.PointLight(0xfff8e0, 1.0, 35);
  pointLight.position.set(0, 5, 0);
  scene.add(pointLight);

  const fill = new THREE.DirectionalLight(0xe8f4ff, 0.4);
  fill.position.set(5, 3, 8);
  scene.add(fill);

  return { scene, camera, renderer, sun, pointLight, hemi };
}

// ── Web renderer (standard THREE.WebGLRenderer on a <canvas>) ─
export function createWebScene(canvas: HTMLCanvasElement, w: number, h: number): SceneBundle {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  // CRITICAL: Set pixelRatio BEFORE setSize, and use false to preserve canvas CSS
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h, false); // false = don't override canvas CSS dimensions
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0xe8e2d8, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe8e2d8);
  scene.fog = new THREE.FogExp2(0xe8e2d8, 0.005);

  const camera = new THREE.PerspectiveCamera(48, w / h, 0.1, 120);
  camera.position.set(6, 5, 8);
  camera.lookAt(0, 0, 0);

  const hemi = new THREE.HemisphereLight(0xfff5e4, 0x8a7a6a, 0.9);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff5e6, 1.4);
  sun.position.set(8, 14, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 70;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -16;
  sun.shadow.camera.right = sun.shadow.camera.top = 16;
  sun.shadow.bias = -0.0003;
  scene.add(sun);

  const pointLight = new THREE.PointLight(0xfff8e0, 1.0, 35);
  pointLight.position.set(0, 5, 0);
  scene.add(pointLight);

  const fill = new THREE.DirectionalLight(0xe8f4ff, 0.4);
  fill.position.set(5, 3, 8);
  scene.add(fill);

  return { scene, camera, renderer, sun, pointLight, hemi };
}

// Camera auto-fit using bounding sphere — FIX #2
export function frameCameraToRoom(cam:THREE.PerspectiveCamera, wFt:number, lFt:number, hFt:number) {
  const W=wFt*THREE_FT_SCALE, L=lFt*THREE_FT_SCALE, H=hFt*THREE_FT_SCALE;
  const halfDiag = Math.sqrt(W*W+L*L+H*H)/2;
  const fovRad   = (cam.fov*Math.PI)/180;
  const dist     = (halfDiag/Math.sin(fovRad/2))*1.25;
  cam.position.set(dist*0.62, dist*0.48, dist*0.82);
  cam.lookAt(0,0,0);
  cam.near=0.1; cam.far=dist*4;
  cam.updateProjectionMatrix();
}

export function setLighting(b:SceneBundle, on:boolean) {
  b.hemi.intensity=on?0.9:0.65;
  b.sun.intensity=on?1.4:0; b.pointLight.intensity=on?1.0:0;
}

// ── Interior Camera Setup (360° Panorama) ──
export function setupInteriorCamera(cam: THREE.PerspectiveCamera, wFt: number, lFt: number, hFt: number) {
  // Position camera at room center at eye height (~5.5ft standing level)
  const eyeHeight = 5.5 * THREE_FT_SCALE;
  cam.position.set(0, eyeHeight - (hFt * THREE_FT_SCALE) / 2, 0);
  cam.lookAt(0, eyeHeight - (hFt * THREE_FT_SCALE) / 2, -1); // Look forward (north)

  // Widen FOV for panoramic feel
  cam.fov = 75;

  // Adjust near/far clip planes for close-up wall viewing
  cam.near = 0.01;
  cam.far = Math.max(wFt, lFt) * THREE_FT_SCALE * 2;

  cam.updateProjectionMatrix();
}

// ── Interior Lighting (softer ambient) ──
export function setInteriorLighting(b: SceneBundle) {
  // Softer, more ambient lighting for interior view
  b.hemi.intensity = 1.2;
  b.sun.intensity = 0.6;
  b.pointLight.intensity = 1.5;
}

// ── Restore Exterior Lighting ──
export function setExteriorLighting(b: SceneBundle, lightOn: boolean) {
  // Restore original exterior lighting
  b.hemi.intensity = 0.9;
  b.sun.intensity = lightOn ? 1.4 : 0;
  b.pointLight.intensity = lightOn ? 1.0 : 0;
}
