// ThumbnailGenerator — offscreen renderer that generates 3D thumbnails for
// inventory items that don't have one yet. Renders one item at a time in a
// hidden view, captures the screenshot, saves locally, then moves to the next.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThreeCanvas, RoomBuildConfig, CaptureScreenshotFn } from '../three/ThreeCanvas';
import { saveThumbnail } from '../utils/thumbnail';
import { InventoryItem } from '../types';
import { Tile } from '../types';

interface Job {
  id: string;
  config: RoomBuildConfig;
}

interface Props {
  /** Items that need thumbnails generated */
  queue: InventoryItem[];
  /** Called when a thumbnail is captured, with the item ID and local file URI */
  onCaptured: (id: string, uri: string) => void;
}

function itemToConfig(item: InventoryItem): RoomBuildConfig {
  const parts = (item.tileSize || '12x12').split('x').map(Number);
  const tw = parts[0] || 12;
  const th = parts[1] || 12;

  const selectedTile: Tile | null = item.selectedTileId ? {
    id:           item.selectedTileId,
    name:         item.selectedTileName || item.tileName || '',
    category:     'marble' as any,
    widthIn:      tw,
    heightIn:     th,
    color:        item.selectedTileColor || item.tileColor || '#cccccc',
    pattern:      'solid' as any,
    pricePerSqFt: 0,
    imageUri:     item.selectedTileImageUri || item.tileImageUri,
  } : null;

  return {
    roomType:     item.roomType,
    widthFt:      item.dimensions.width,
    lengthFt:     item.dimensions.length,
    heightFt:     item.dimensions.height,
    tileWidthIn:  tw,
    tileHeightIn: th,
    selectedTile,
    zoneRows:     item.zoneRows || [],
    wallColor:    item.wallColor,
  };
}

export function ThumbnailGenerator({ queue, onCaptured }: Props) {
  const [jobIndex, setJobIndex] = useState(0);
  const captureRef = useRef<CaptureScreenshotFn | null>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneRef   = useRef<Set<string>>(new Set());

  const currentJob: Job | null = jobIndex < queue.length
    ? { id: queue[jobIndex].id, config: itemToConfig(queue[jobIndex]) }
    : null;

  const advance = useCallback(() => {
    setJobIndex(i => i + 1);
    captureRef.current = null;
  }, []);

  const handleCaptureReady = useCallback((fn: CaptureScreenshotFn) => {
    captureRef.current = fn;
    if (timerRef.current) clearTimeout(timerRef.current);

    // Wait for the 3D scene to fully render before capturing
    timerRef.current = setTimeout(async () => {
      if (!captureRef.current || !currentJob || doneRef.current.has(currentJob.id)) {
        advance();
        return;
      }
      try {
        const uri = await captureRef.current();
        if (uri) {
          await saveThumbnail(currentJob.id, uri);
          doneRef.current.add(currentJob.id);
          onCaptured(currentJob.id, uri);
        }
      } catch {}
      advance();
    }, 2800);
  }, [currentJob, advance, onCaptured]);

  // Cleanup timer on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  if (!currentJob) return null;

  return (
    // Positioned far off-screen — still mounted so GL renders, but invisible to user
    <View style={s.offscreen} pointerEvents="none">
      <ThreeCanvas
        key={currentJob.id}
        config={currentJob.config}
        onCaptureReady={handleCaptureReady}
      />
    </View>
  );
}

const s = StyleSheet.create({
  offscreen: {
    position:  'absolute',
    top:       -2000,
    left:      0,
    width:     320,
    height:    220,
    opacity:   0,
  },
});
