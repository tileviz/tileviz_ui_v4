// ============================================================
//  three/controls.ts — Camera + Scene Controls
// ============================================================

import * as THREE from 'three';
import { frameCameraToRoom } from './scene';
import { RoomConfig } from './room-builder';

export interface ControlState {
  camera:     THREE.PerspectiveCamera;
  roomGroup:  THREE.Group | null;
  sun:        THREE.DirectionalLight;
  pointLight: THREE.PointLight;
  autoRotate: boolean;
  lightOn:    boolean;
  config:     RoomConfig | null;
}

export function rotateLeft(s: ControlState)  { if (!s.roomGroup) return; s.autoRotate=false; s.roomGroup.rotation.y-=0.28; }
export function rotateRight(s: ControlState) { if (!s.roomGroup) return; s.autoRotate=false; s.roomGroup.rotation.y+=0.28; }
export function zoomIn(s: ControlState)      { s.camera.position.multiplyScalar(0.88); s.camera.position.clampLength(2,28); }
export function zoomOut(s: ControlState)     { s.camera.position.multiplyScalar(1.12); s.camera.position.clampLength(2,28); }

export function resetView(s: ControlState) {
  if (s.config) frameCameraToRoom(s.camera, s.config.widthFt, s.config.lengthFt, s.config.heightFt);
  if (s.roomGroup) s.roomGroup.rotation.y = 0;
  s.autoRotate = true;
}

export function toggleAutoRotate(s: ControlState): boolean { s.autoRotate=!s.autoRotate; return s.autoRotate; }

export function toggleLighting(s: ControlState): boolean {
  s.lightOn=!s.lightOn;
  s.sun.intensity=s.lightOn?1.4:0;
  s.pointLight.intensity=s.lightOn?1.0:0;
  return s.lightOn;
}

export function tickAutoRotate(s: ControlState) {
  if (s.roomGroup && s.autoRotate) s.roomGroup.rotation.y+=0.003;
}
