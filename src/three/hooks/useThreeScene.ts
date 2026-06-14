// three/hooks/useThreeScene.ts
// Owns the Three.js scene lifecycle for the web canvas:
// - creates the <canvas> element and inserts it into the container
// - rAF-deferred init to fix mobile high-DPI zero-size container bug
// - builds the scene/room, populates the shared state ref
// - runs the render loop (animation frame)
// - watches container size via ResizeObserver
// - disposes everything on unmount
import { MutableRefObject, useEffect, useRef } from 'react';
import { createWebScene, frameCameraToRoom } from '../scene';
import { buildRoom } from '../room-builder';
import { RoomBuildConfig } from '../ThreeCanvas';
import { RoomType } from '../../types';
import { WebSceneState } from './sceneState';

interface Params {
  containerRef: MutableRefObject<any>;
  configRef: MutableRefObject<RoomBuildConfig | null>;
  stateRef: MutableRefObject<WebSceneState | null>;
  onReady: () => void;
  onUnready: () => void;
}

/** Returns a ref that points to the live <canvas> element (null until mounted). */
export function useThreeScene({
  containerRef,
  configRef,
  stateRef,
  onReady,
  onUnready,
}: Params): MutableRefObject<HTMLCanvasElement | null> {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const container = containerRef.current as HTMLDivElement | null;
    if (!container) return;

    let cancelled = false;
    let localBundle: WebSceneState['bundle'] | null = null;
    let localRo: ResizeObserver | null = null;

    const canvas = document.createElement('canvas');
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.touchAction = 'none'; // Prevent browser scroll on mobile web
    container.appendChild(canvas);
    canvasRef.current = canvas;

    // Use rAF to ensure container layout is complete before reading dimensions.
    // This fixes the "stuck in corner" bug on high-DPI mobile phones where
    // clientWidth/clientHeight return 0 before layout finishes.
    const initFrame = requestAnimationFrame(() => {
      if (cancelled) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 600;

      const bundle = createWebScene(canvas, w, h);
      localBundle = bundle;

      const cfg = configRef.current ?? {
        roomType: 'bathroom' as RoomType,
        widthFt: 5,
        lengthFt: 6,
        heightFt: 8,
        tileWidthIn: 12,
        tileHeightIn: 12,
        selectedTile: null,
        zoneRows: [],
      };
      const { roomGroup, fixturesGroup } = buildRoom(bundle.scene, cfg, bundle.pointLight);
      frameCameraToRoom(bundle.camera, cfg.widthFt, cfg.lengthFt, cfg.heightFt);

      const state: WebSceneState = {
        bundle,
        roomGroup,
        fixturesGroup,
        autoRotate: true,
        lightOn: true,
        objectsOn: true,
        animId: 0,
        interiorMode: false,
        yaw: 0,
        pitch: 0,
        isDragging: false,
        lastMouseX: 0,
        lastMouseY: 0,
      };
      stateRef.current = state;
      onReady();

      const loop = () => {
        state.animId = requestAnimationFrame(loop);
        if (state.roomGroup && state.autoRotate) state.roomGroup.rotation.y += 0.003;
        bundle.renderer.render(bundle.scene, bundle.camera);
      };
      loop();

      const ro = new ResizeObserver((entries) => {
        const e = entries[0];
        if (!e) return;
        const nw = e.contentRect.width;
        const nh = e.contentRect.height;
        if (nw > 0 && nh > 0) {
          bundle.renderer.setSize(nw, nh, false); // false = preserve canvas CSS (100%)
          bundle.camera.aspect = nw / nh;
          bundle.camera.updateProjectionMatrix();
        }
      });
      localRo = ro;
      ro.observe(container);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(initFrame);
      if (localBundle) localBundle.renderer.dispose();
      if (localRo) localRo.disconnect();
      const s = stateRef.current;
      if (s) cancelAnimationFrame(s.animId);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      canvasRef.current = null;
      stateRef.current = null;
      onUnready();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return canvasRef;
}
