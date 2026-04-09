// ============================================================
//  three/controls.ts — Camera + Scene Controls
// ============================================================

import * as THREE from 'three';
import { frameCameraToRoom, setupInteriorCamera, setInteriorLighting, setExteriorLighting } from './scene';
import { RoomConfig } from './room-builder';

export interface ControlState {
  camera:     THREE.PerspectiveCamera;
  roomGroup:  THREE.Group | null;
  sun:        THREE.DirectionalLight;
  pointLight: THREE.PointLight;
  hemi:       THREE.HemisphereLight;
  autoRotate: boolean;
  lightOn:    boolean;
  config:     RoomConfig | null;
  // Interior view state
  interiorMode: boolean;
  yaw:          number;  // Horizontal rotation (radians)
  pitch:        number;  // Vertical rotation (radians)
}

export function rotateLeft(s: ControlState)  {
  if (s.interiorMode) {
    // In interior mode, rotate yaw
    s.yaw -= 0.28;
    updateInteriorCamera(s);
  } else {
    // In exterior mode, rotate room
    if (!s.roomGroup) return;
    s.autoRotate=false;
    s.roomGroup.rotation.y-=0.28;
  }
}

export function rotateRight(s: ControlState) {
  if (s.interiorMode) {
    // In interior mode, rotate yaw
    s.yaw += 0.28;
    updateInteriorCamera(s);
  } else {
    // In exterior mode, rotate room
    if (!s.roomGroup) return;
    s.autoRotate=false;
    s.roomGroup.rotation.y+=0.28;
  }
}

export function zoomIn(s: ControlState) {
  if (s.interiorMode) {
    // In interior mode, adjust FOV (35°–100°)
    s.camera.fov = Math.max(35, s.camera.fov - 5);
    s.camera.updateProjectionMatrix();
  } else {
    // In exterior mode, move camera closer
    s.camera.position.multiplyScalar(0.88);
    s.camera.position.clampLength(2, 28);
  }
}

export function zoomOut(s: ControlState) {
  if (s.interiorMode) {
    // In interior mode, adjust FOV (35°–100°)
    s.camera.fov = Math.min(100, s.camera.fov + 5);
    s.camera.updateProjectionMatrix();
  } else {
    // In exterior mode, move camera away
    s.camera.position.multiplyScalar(1.12);
    s.camera.position.clampLength(2, 28);
  }
}

export function resetView(s: ControlState) {
  if (s.interiorMode) {
    // Reset yaw/pitch to 0
    s.yaw = 0;
    s.pitch = 0;
    s.camera.fov = 75;
    updateInteriorCamera(s);
  } else {
    // Reset exterior view
    if (s.config) frameCameraToRoom(s.camera, s.config.widthFt, s.config.lengthFt, s.config.heightFt);
    if (s.roomGroup) s.roomGroup.rotation.y = 0;
    s.autoRotate = true;
  }
}

export function toggleAutoRotate(s: ControlState): boolean {
  if (s.interiorMode) return false; // No auto-rotate in interior mode
  s.autoRotate=!s.autoRotate;
  return s.autoRotate;
}

export function toggleLighting(s: ControlState): boolean {
  s.lightOn=!s.lightOn;
  if (s.interiorMode) {
    // Interior mode has its own lighting
    setInteriorLighting({
      scene: s.roomGroup?.parent as THREE.Scene,
      camera: s.camera,
      renderer: null as any,
      sun: s.sun,
      pointLight: s.pointLight,
      hemi: s.hemi
    });
  } else {
    // Exterior mode
    s.sun.intensity=s.lightOn?1.4:0;
    s.pointLight.intensity=s.lightOn?1.0:0;
  }
  return s.lightOn;
}

export function tickAutoRotate(s: ControlState) {
  if (s.roomGroup && s.autoRotate && !s.interiorMode) s.roomGroup.rotation.y+=0.003;
}

// ── Interior View Controls ──

export function toggleInteriorMode(s: ControlState): boolean {
  s.interiorMode = !s.interiorMode;

  if (s.interiorMode) {
    // Enter interior mode
    s.autoRotate = false;
    s.yaw = 0;
    s.pitch = 0;

    if (s.config) {
      setupInteriorCamera(s.camera, s.config.widthFt, s.config.lengthFt, s.config.heightFt);
    }

    setInteriorLighting({
      scene: s.roomGroup?.parent as THREE.Scene,
      camera: s.camera,
      renderer: null as any,
      sun: s.sun,
      pointLight: s.pointLight,
      hemi: s.hemi
    });
  } else {
    // Exit to exterior mode
    if (s.config) {
      frameCameraToRoom(s.camera, s.config.widthFt, s.config.lengthFt, s.config.heightFt);
    }

    setExteriorLighting({
      scene: s.roomGroup?.parent as THREE.Scene,
      camera: s.camera,
      renderer: null as any,
      sun: s.sun,
      pointLight: s.pointLight,
      hemi: s.hemi
    }, s.lightOn);

    s.autoRotate = true;
  }

  return s.interiorMode;
}

export function handleInteriorDrag(s: ControlState, deltaX: number, deltaY: number) {
  if (!s.interiorMode) return;

  // Convert mouse delta into camera rotation
  const sensitivity = 0.003;
  s.yaw -= deltaX * sensitivity;
  s.pitch -= deltaY * sensitivity;

  // Clamp pitch (±72°) to prevent camera flip
  const maxPitch = (72 * Math.PI) / 180;
  s.pitch = Math.max(-maxPitch, Math.min(maxPitch, s.pitch));

  updateInteriorCamera(s);
}

function updateInteriorCamera(s: ControlState) {
  if (!s.config) return;

  const eyeHeight = 5.5 * (s.config.heightFt / 8); // Relative to room height
  const hFt = s.config.heightFt;
  const yOffset = eyeHeight - (hFt * 0.3048) / 2; // THREE_FT_SCALE approximation

  // Calculate look direction from yaw and pitch
  const lookDir = new THREE.Vector3(
    Math.sin(s.yaw) * Math.cos(s.pitch),
    Math.sin(s.pitch),
    -Math.cos(s.yaw) * Math.cos(s.pitch)
  );

  // Update camera look-at
  const lookTarget = new THREE.Vector3(
    s.camera.position.x + lookDir.x,
    s.camera.position.y + lookDir.y,
    s.camera.position.z + lookDir.z
  );

  s.camera.lookAt(lookTarget);
}
