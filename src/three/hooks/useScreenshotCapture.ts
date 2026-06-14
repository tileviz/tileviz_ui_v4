// three/hooks/useScreenshotCapture.ts
// Registers a screenshot-capture function with the parent via onCaptureReady.
// Two strategies:
//   1) canvas.toDataURL — fast, fails if canvas is CORS-tainted.
//   2) WebGLRenderTarget + readRenderTargetPixels — bypasses CORS taint.
import { MutableRefObject, useEffect } from 'react';
import * as THREE from 'three';
import { CaptureScreenshotFn } from '../ThreeCanvas';
import { WebSceneState } from './sceneState';

interface Params {
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  stateRef: MutableRefObject<WebSceneState | null>;
  ready: boolean;
  onCaptureReady?: (fn: CaptureScreenshotFn) => void;
}

export function useScreenshotCapture({
  canvasRef,
  stateRef,
  ready,
  onCaptureReady,
}: Params): void {
  useEffect(() => {
    if (!ready) return;
    if (!onCaptureReady) return;

    const canvas = canvasRef.current;
    const state = stateRef.current;
    if (!canvas || !state) return;
    const { bundle } = state;

    const capture: CaptureScreenshotFn = async () => {
      // Render one clean frame
      bundle.renderer.render(bundle.scene, bundle.camera);

      // Attempt 1: direct toDataURL (works if canvas isn't CORS-tainted)
      try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        if (dataUrl && dataUrl.length > 100) {
          console.log('[TileViz] Screenshot via toDataURL:', dataUrl.length, 'chars');
          return dataUrl;
        }
      } catch (e) {
        console.warn('[TileViz] toDataURL failed (CORS tainted?):', e);
      }

      // Attempt 2: render target + readPixels (bypasses CORS)
      try {
        const w = canvas.width;
        const h = canvas.height;
        const rt = new THREE.WebGLRenderTarget(w, h, {
          format: THREE.RGBAFormat,
          type: THREE.UnsignedByteType,
        });
        bundle.renderer.setRenderTarget(rt);
        bundle.renderer.render(bundle.scene, bundle.camera);
        const pixels = new Uint8Array(w * h * 4);
        bundle.renderer.readRenderTargetPixels(rt, 0, 0, w, h, pixels);
        bundle.renderer.setRenderTarget(null);
        rt.dispose();

        // Check if we got actual pixel data
        let hasData = false;
        for (let i = 0; i < Math.min(pixels.length, 1000); i += 4) {
          if (pixels[i] !== 0 || pixels[i + 1] !== 0 || pixels[i + 2] !== 0) {
            hasData = true;
            break;
          }
        }
        console.log('[TileViz] readRenderTargetPixels hasData:', hasData, 'size:', w, 'x', h);

        if (hasData) {
          const offscreen = document.createElement('canvas');
          offscreen.width = w;
          offscreen.height = h;
          const ctx = offscreen.getContext('2d');
          if (!ctx) return null;
          const imgData = ctx.createImageData(w, h);
          for (let row = 0; row < h; row++) {
            const srcOff = (h - row - 1) * w * 4;
            const dstOff = row * w * 4;
            imgData.data.set(pixels.subarray(srcOff, srcOff + w * 4), dstOff);
          }
          ctx.putImageData(imgData, 0, 0);
          return offscreen.toDataURL('image/jpeg', 0.85);
        }
      } catch (e) {
        console.warn('[TileViz] readRenderTargetPixels failed:', e);
      }

      return null;
    };

    onCaptureReady(capture);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
}
