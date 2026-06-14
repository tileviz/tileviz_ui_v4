// three/hooks/useSceneInput.ts
// Owns mouse + touch + wheel input handlers attached to the 3D canvas.
// Reads/writes the shared scene state via the provided ref so handlers
// always see fresh values without re-rendering the parent component.
import { MutableRefObject, useEffect } from 'react';
import { updateCameraFromYawPitch, WebSceneState } from './sceneState';

interface Params {
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  stateRef: MutableRefObject<WebSceneState | null>;
  /** Notify React state when auto-rotate is toggled off by drag. */
  onAutoRotateChange: (next: boolean) => void;
}

export function useSceneInput({ canvasRef, stateRef, onAutoRotateChange }: Params): void {
  useEffect(() => {
    // The canvas is created synchronously in useThreeScene's effect,
    // which runs before this effect (declaration order matters for React 18 effects
    // running in the same commit phase). Guard anyway in case of re-mount races.
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ── Mouse ─────────────────────────────────────────────────
    const handleMouseDown = (e: MouseEvent) => {
      const s = stateRef.current;
      if (!s) return;
      s.isDragging = true;
      s.lastMouseX = e.clientX;
      s.lastMouseY = e.clientY;
      canvas.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: MouseEvent) => {
      const s = stateRef.current;
      if (!s || !s.isDragging) return;
      const deltaX = e.clientX - s.lastMouseX;
      const deltaY = e.clientY - s.lastMouseY;

      if (s.interiorMode) {
        if (!s.autoRotate) {
          s.lastMouseX = e.clientX;
          s.lastMouseY = e.clientY;
          return;
        }
        s.yaw -= deltaX * 0.003;
        s.pitch -= deltaY * 0.003;
        const maxPitch = (72 * Math.PI) / 180;
        s.pitch = Math.max(-maxPitch, Math.min(maxPitch, s.pitch));
        updateCameraFromYawPitch(s.bundle.camera, s.yaw, s.pitch);
      } else if (s.roomGroup) {
        s.autoRotate = false;
        onAutoRotateChange(false);
        s.roomGroup.rotation.y += deltaX * 0.005;
      }

      s.lastMouseX = e.clientX;
      s.lastMouseY = e.clientY;
    };

    const handleMouseUp = () => {
      const s = stateRef.current;
      if (!s) return;
      s.isDragging = false;
      canvas.style.cursor = s.interiorMode ? 'grab' : 'default';
    };

    const handleWheel = (e: WheelEvent) => {
      const s = stateRef.current;
      if (!s) return;
      e.preventDefault();
      if (s.interiorMode) {
        const delta = e.deltaY > 0 ? 5 : -5;
        s.bundle.camera.fov = Math.max(35, Math.min(100, s.bundle.camera.fov + delta));
        s.bundle.camera.updateProjectionMatrix();
      } else {
        const factor = e.deltaY > 0 ? 1.05 : 0.95;
        s.bundle.camera.position.multiplyScalar(factor);
        s.bundle.camera.position.clampLength(1.5, 30);
      }
    };

    // ── Touch ─────────────────────────────────────────────────
    let lastPinchDist = 0;

    const handleTouchStart = (e: TouchEvent) => {
      const s = stateRef.current;
      if (!s) return;
      if (e.touches.length === 2) {
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        lastPinchDist = Math.sqrt(dx * dx + dy * dy);
        s.isDragging = false;
      } else if (e.touches.length === 1) {
        s.isDragging = true;
        s.lastMouseX = e.touches[0].clientX;
        s.lastMouseY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const s = stateRef.current;
      if (!s) return;

      if (e.touches.length === 2 && lastPinchDist > 0) {
        // Pinch to zoom
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const scale = dist / lastPinchDist;

        if (s.interiorMode) {
          s.bundle.camera.fov = Math.max(35, Math.min(100, s.bundle.camera.fov / scale));
          s.bundle.camera.updateProjectionMatrix();
        } else {
          s.bundle.camera.position.multiplyScalar(scale > 1 ? 0.97 : 1.03);
          s.bundle.camera.position.clampLength(1.5, 30);
        }
        lastPinchDist = dist;
      } else if (e.touches.length === 1 && s.isDragging) {
        // Single finger drag
        const clientX = e.touches[0].clientX;
        const clientY = e.touches[0].clientY;
        const deltaX = clientX - s.lastMouseX;
        const deltaY = clientY - s.lastMouseY;

        if (s.interiorMode) {
          s.yaw -= deltaX * 0.003;
          s.pitch -= deltaY * 0.003;
          const maxPitch = (72 * Math.PI) / 180;
          s.pitch = Math.max(-maxPitch, Math.min(maxPitch, s.pitch));
          updateCameraFromYawPitch(s.bundle.camera, s.yaw, s.pitch);
        } else if (s.roomGroup) {
          s.autoRotate = false;
          onAutoRotateChange(false);
          s.roomGroup.rotation.y += deltaX * 0.005;
        }

        s.lastMouseX = clientX;
        s.lastMouseY = clientY;
      }
    };

    const handleTouchEnd = () => {
      const s = stateRef.current;
      if (s) s.isDragging = false;
      lastPinchDist = 0;
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('wheel', handleWheel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
