// three/hooks/sceneState.ts — shared scene state shape + helpers
import * as THREE from 'three';
import { SceneBundle } from '../scene';

/** Mutable runtime state for the web 3D scene. Stored in a ref so handlers
 *  always read fresh values without forcing React re-renders. */
export interface WebSceneState {
  bundle: SceneBundle;
  roomGroup: THREE.Group | null;
  fixturesGroup: THREE.Group | null;
  autoRotate: boolean;
  lightOn: boolean;
  objectsOn: boolean;
  animId: number;
  interiorMode: boolean;
  yaw: number;
  pitch: number;
  isDragging: boolean;
  lastMouseX: number;
  lastMouseY: number;
}

/** Update a perspective camera's lookAt from yaw/pitch (interior mode). */
export function updateCameraFromYawPitch(
  cam: THREE.PerspectiveCamera,
  yaw: number,
  pitch: number,
): void {
  const lookDir = new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    -Math.cos(yaw) * Math.cos(pitch),
  );
  const target = new THREE.Vector3(
    cam.position.x + lookDir.x,
    cam.position.y + lookDir.y,
    cam.position.z + lookDir.z,
  );
  cam.lookAt(target);
}
