// ============================================================
//  three/ThreeCanvas.tsx
//  Web: full Three.js 3D via WebGLRenderer
//  Native (iOS/Android): full Three.js 3D via expo-gl + expo-three
//  Features: dark-themed controls, hover tooltips, object toggle, 360° panorama,
//  touch gestures (drag to rotate, pinch to zoom), live config updates
// ============================================================
import React, { useRef, useCallback, useState, useEffect } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Text,
  ActivityIndicator, Platform, Animated, PanResponder, AppState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as THREE from 'three';
import { Colors, Radii } from '../config/theme';
import { frameCameraToRoom, setLighting, SceneBundle, createScene, createWebScene, setupInteriorCamera, setInteriorLighting, setExteriorLighting } from './scene';
import { buildRoom, toggleWindows } from './room-builder';
import { clearTextureCache } from './materials';
import { RoomType, Tile, ZoneRow } from '../types';
import { useThreeScene } from './hooks/useThreeScene';
import { useSceneInput } from './hooks/useSceneInput';
import { useScreenshotCapture } from './hooks/useScreenshotCapture';
import { WebSceneState } from './hooks/sceneState';

const styles = StyleSheet.create({
  wrap:       { flex: 1 },
  loading:    { ...StyleSheet.absoluteFillObject, alignItems:'center', justifyContent:'center', backgroundColor:'rgba(232,226,216,0.9)', gap:12 },
  loadingTxt: { fontSize:13, color:Colors.text2, fontWeight:'500' },
  controls:   {
    position: 'absolute',
    right: 10,
    gap: 5,
  },
  // Dark navy themed buttons matching navbar
  ctrlBtn:    {
    width: Platform.OS === 'web' ? 42 : 40,
    height: Platform.OS === 'web' ? 42 : 40,
    backgroundColor: Colors.primary,
    borderWidth:1,
    borderColor:'rgba(124,111,247,0.25)',
    borderRadius: Radii.md,
    alignItems:'center', justifyContent:'center',
    shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.3, shadowRadius:6, elevation:5,
  },
  ctrlBtnActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  ctrlBtnText:{ fontSize:15, color:'#E0E3F5' },
  ctrlBtnTextActive:{ color: Colors.primary },
  ctrlBtnDisabled:{ opacity: 0.3 },
  ctrlBtnTextDisabled:{ color: '#888' },
  tooltip:    { position:'absolute', right:50, top:8, backgroundColor:'rgba(26,26,46,0.92)', paddingHorizontal:10, paddingVertical:5, borderRadius:6, minWidth:90 },
  tooltipText:{ fontSize:11, color:'#fff', fontWeight:'500', textAlign:'center' },
  badge:      { position:'absolute', left:12, top:12, backgroundColor:'rgba(0,0,0,0.7)', paddingHorizontal:10, paddingVertical:6, borderRadius:12, flexDirection:'row', alignItems:'center', gap:8 },
  badgeText:  { color:Colors.gold, fontWeight:'500', fontSize:12 },
  hint:       { position:'absolute', bottom:80, alignSelf:'center', backgroundColor:'rgba(0,0,0,0.8)', paddingHorizontal:14, paddingVertical:8, borderRadius:10, flexDirection:'row', alignItems:'center', gap:8 },
  hintText:   { color:'#fff', fontWeight:'400', fontSize:13, textAlign:'center' },
});

export interface RoomBuildConfig {
  roomType:     RoomType;
  widthFt:      number;
  lengthFt:     number;
  heightFt:     number;
  tileWidthIn:  number;
  tileHeightIn: number;
  selectedTile: Tile | null;
  zoneRows:     ZoneRow[];
  wallColor?:   string;
}

/** Function that captures a screenshot and returns a base64 data URI */
export type CaptureScreenshotFn = () => Promise<string | null>;

interface Props {
  config: RoomBuildConfig | null;
  onResetDesign?: () => void;
  /** Register a function that can be called to capture a screenshot of the 3D canvas */
  onCaptureReady?: (fn: CaptureScreenshotFn) => void;
  /** Pixels from the top of the canvas to start the controls column (phone only) */
  controlsTopOffset?: number;
}

// ── Helper: dispose a room group's geometries & materials ──
function disposeGroup(group: THREE.Group | null) {
  if (!group) return;
  group.traverse((child: any) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((m: any) => m.dispose());
      } else {
        child.material.dispose();
      }
    }
  });
}

// ── Helper: update camera look-at from yaw/pitch ─────────
function updateCameraFromYawPitch(cam: THREE.PerspectiveCamera, yaw: number, pitch: number) {
  const lookDir = new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    -Math.cos(yaw) * Math.cos(pitch)
  );
  const target = new THREE.Vector3(
    cam.position.x + lookDir.x,
    cam.position.y + lookDir.y,
    cam.position.z + lookDir.z
  );
  cam.lookAt(target);
}

// ── Tooltip — animated fade, positioned left of the button ───
function Tooltip({ label, visible }: { label: string; visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(opacity, { toValue: visible ? 1 : 0, duration: 150, useNativeDriver: true }).start();
  }, [visible]);
  return (
    <Animated.View style={[styles.tooltip, { opacity }]} pointerEvents="none">
      <Text style={styles.tooltipText}>{label}</Text>
    </Animated.View>
  );
}

// ── Control button — dark navy theme + hover/press tooltip ───
function CtrlBtn({ icon, label, onPress, active, disabled }: { icon: string; label: string; onPress: () => void; active?: boolean; disabled?: boolean }) {
  const [show, setShow] = useState(false);

  const webHoverProps = Platform.OS === 'web' ? {
    onMouseEnter: () => !disabled && setShow(true),
    onMouseLeave: () => setShow(false),
  } as any : {};

  return (
    <View style={{ alignItems: 'flex-end' }}>
      <TouchableOpacity
        collapsable={false}
        onPress={() => {
          if (disabled) return;
          onPress();
        }}
        onPressIn={() => !disabled && setShow(true)}
        onPressOut={() => setShow(false)}
        style={[styles.ctrlBtn, active && styles.ctrlBtnActive, disabled && styles.ctrlBtnDisabled]}
        activeOpacity={disabled ? 1 : 0.75}
        {...webHoverProps}
      >
        <Text style={[styles.ctrlBtnText, active && styles.ctrlBtnTextActive, disabled && styles.ctrlBtnTextDisabled]}>{icon}</Text>
      </TouchableOpacity>
      <Tooltip label={label} visible={show && !disabled} />
    </View>
  );
}

// ── Web 3D Canvas ─────────────────────────────────────────────
function WebCanvas({ config, onResetDesign, onCaptureReady, controlsTopOffset }: { config: RoomBuildConfig | null; onResetDesign?: () => void; onCaptureReady?: (fn: CaptureScreenshotFn) => void; controlsTopOffset?: number }) {
  const insets = useSafeAreaInsets();
  const nativeTop = controlsTopOffset ?? 52;
  const containerRef = useRef<any>(null);
  const configRef = useRef(config);
  const stateRef = useRef<WebSceneState | null>(null);
  const [ready,      setReady]      = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [lightOn,    setLightOnUI]  = useState(true);
  const [objectsOn,  setObjectsOn]  = useState(true);
  const [interiorMode, setInteriorMode] = useState(false);
  const [windowsOpen, setWindowsOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Keep config ref current
  useEffect(() => { configRef.current = config; }, [config]);

  // ── Scene lifecycle: canvas, renderer, room build, render loop, resize ──
  const canvasRef = useThreeScene({
    containerRef,
    configRef,
    stateRef,
    onReady:   () => setReady(true),
    onUnready: () => setReady(false),
  });

  // ── Mouse + touch + wheel input ───────────────────────────────
  useSceneInput({
    canvasRef,
    stateRef,
    onAutoRotateChange: setAutoRotate,
  });

  // ── Screenshot capture registration ───────────────────────────
  useScreenshotCapture({
    canvasRef,
    stateRef,
    ready,
    onCaptureReady,
  });

  // ── Rebuild room when config changes ────────────────────────
  useEffect(() => {
    const s = stateRef.current;
    if (!s || !config) return;

    // Preserve current rotation
    const prevRotation = s.roomGroup?.rotation.y ?? 0;

    // Remove old room group
    if (s.roomGroup) {
      s.bundle.scene.remove(s.roomGroup);
      disposeGroup(s.roomGroup);
    }

    // Build new room
    const { roomGroup, fixturesGroup } = buildRoom(s.bundle.scene, config, s.bundle.pointLight);
    s.roomGroup = roomGroup;
    s.fixturesGroup = fixturesGroup;
    s.fixturesGroup.visible = s.objectsOn;

    // Re-frame camera
    if (s.interiorMode) {
      setupInteriorCamera(s.bundle.camera, config.widthFt, config.lengthFt, config.heightFt);
      updateCameraFromYawPitch(s.bundle.camera, s.yaw, s.pitch);
    } else {
      s.roomGroup.rotation.y = prevRotation;
      frameCameraToRoom(s.bundle.camera, config.widthFt, config.lengthFt, config.heightFt);
    }
  }, [config]);

  const toggleInterior = () => {
    const s = stateRef.current;
    const cfg = configRef.current;
    if (!s || !cfg) return;

    s.interiorMode = !s.interiorMode;
    setInteriorMode(s.interiorMode);

    if (s.interiorMode) {
      s.yaw = 0;
      s.pitch = 0;
      setupInteriorCamera(s.bundle.camera, cfg.widthFt, cfg.lengthFt, cfg.heightFt);
      setInteriorLighting(s.bundle);
      setShowHint(true);
      setTimeout(() => setShowHint(false), 3000);
      const c = containerRef.current?.querySelector('canvas');
      if (c) c.style.cursor = 'grab';
    } else {
      frameCameraToRoom(s.bundle.camera, cfg.widthFt, cfg.lengthFt, cfg.heightFt);
      setExteriorLighting(s.bundle, s.lightOn);
      const c = containerRef.current?.querySelector('canvas');
      if (c) c.style.cursor = 'default';
    }
  };

  const BTNS = [
    { icon: '👁', label: 'Interior View', fn: toggleInterior, active: interiorMode },
    { icon: '◁', label: 'Rotate Left',   fn: () => { const s=stateRef.current; if(s){if(s.interiorMode){s.yaw-=0.28;updateCameraFromYawPitch(s.bundle.camera,s.yaw,s.pitch);}else if(s.roomGroup){s.autoRotate=false;s.roomGroup.rotation.y-=0.28;setAutoRotate(false);} } } },
    { icon: '▷', label: 'Rotate Right',  fn: () => { const s=stateRef.current; if(s){if(s.interiorMode){s.yaw+=0.28;updateCameraFromYawPitch(s.bundle.camera,s.yaw,s.pitch);}else if(s.roomGroup){s.autoRotate=false;s.roomGroup.rotation.y+=0.28;setAutoRotate(false);} } } },
    { icon: '+', label: 'Zoom In',       fn: () => { const s=stateRef.current; if(s){if(s.interiorMode){s.bundle.camera.fov=Math.max(35,s.bundle.camera.fov-5);s.bundle.camera.updateProjectionMatrix();}else{s.bundle.camera.position.multiplyScalar(0.88);s.bundle.camera.position.clampLength(1.5,30);} } } },
    { icon: '−', label: 'Zoom Out',      fn: () => { const s=stateRef.current; if(s){if(s.interiorMode){s.bundle.camera.fov=Math.min(100,s.bundle.camera.fov+5);s.bundle.camera.updateProjectionMatrix();}else{s.bundle.camera.position.multiplyScalar(1.12);s.bundle.camera.position.clampLength(1.5,30);} } } },
    { icon: '⊙', label: 'Reset View',    fn: () => { const s=stateRef.current; const c=configRef.current; if(s&&c){if(s.interiorMode){s.yaw=0;s.pitch=0;s.bundle.camera.fov=75;setupInteriorCamera(s.bundle.camera,c.widthFt,c.lengthFt,c.heightFt);}else{frameCameraToRoom(s.bundle.camera,c.widthFt,c.lengthFt,c.heightFt);if(s.roomGroup)s.roomGroup.rotation.y=0;s.autoRotate=true;setAutoRotate(true);} } } },
    { icon: autoRotate?'⏸':'▶', label: interiorMode?(autoRotate?'Freeze View':'Unfreeze View'):autoRotate?'Pause Rotation':'Resume Rotation', fn: () => { const s=stateRef.current; if(s){s.autoRotate=!s.autoRotate;setAutoRotate(s.autoRotate);} } },
    { icon: lightOn?'☀':'☽', label: lightOn?'Lights Off':'Lights On', fn: () => { const s=stateRef.current; if(s){s.lightOn=!s.lightOn;if(s.interiorMode){s.bundle.hemi.intensity=s.lightOn?1.2:0.55;s.bundle.sun.intensity=s.lightOn?0.6:0;s.bundle.pointLight.intensity=s.lightOn?1.5:0.1;}else{setLighting(s.bundle,s.lightOn);}setLightOnUI(s.lightOn);} } },
    { icon: objectsOn?'🚫':'🪑', label: objectsOn?'Remove Objects':'Add Objects', active: !objectsOn, fn: () => { const s=stateRef.current; if(s?.fixturesGroup){s.objectsOn=!s.objectsOn;s.fixturesGroup.visible=s.objectsOn;setObjectsOn(s.objectsOn);} } },
    ...(interiorMode ? [{ icon: windowsOpen?'🪟':'🏠', label: windowsOpen?'Close Windows':'Open Windows', active: windowsOpen, fn: () => { const s=stateRef.current; if(s?.fixturesGroup){const newState=!windowsOpen;toggleWindows(s.fixturesGroup,newState);setWindowsOpen(newState);} } }] : []),
    ...(onResetDesign ? [{ icon: '↺', label: 'Reset Design', fn: onResetDesign }] : []),
  ];

  return (
    // @ts-ignore — on web, View ref points to a div
    <View style={styles.wrap} ref={containerRef}>
      {!ready && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.gold} />
          <Text style={styles.loadingTxt}>Building 3D Room…</Text>
        </View>
      )}
      {ready && (
        <>
          <View style={[styles.controls, { top: Platform.OS === 'web' ? 8 : nativeTop, bottom: insets.bottom + 6 }]}>
            {BTNS.map((b, i) => <CtrlBtn key={i} icon={b.icon} label={b.label} onPress={b.fn} active={b.active} disabled={(b as any).disabled} />)}
          </View>
          {interiorMode && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>👁 360° Interior View</Text>
            </View>
          )}
          {showHint && (
            <Animated.View style={styles.hint}>
              <Text style={styles.hintText}>🔄 Drag to look around 360°</Text>
            </Animated.View>
          )}
        </>
      )}
    </View>
  );
}

// ── Native 3D canvas (iOS / Android) ──────────────────────────
function NativeCanvas({ config, onResetDesign, onCaptureReady, controlsTopOffset }: { config: RoomBuildConfig | null; onResetDesign?: () => void; onCaptureReady?: (fn: CaptureScreenshotFn) => void; controlsTopOffset?: number }) {
  const insets = useSafeAreaInsets();
  const nativeTop = controlsTopOffset ?? 52;
  const { GLView } = require('expo-gl');
  const configRef = useRef(config);
  // Track mount state and animation frame so the loop can be stopped on unmount
  const mountedRef = useRef(true);
  const animIdRef  = useRef(0);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    mountedRef.current = true;
    // Pause the render loop when the OS backgrounds the app to prevent ANR
    const sub = AppState.addEventListener('change', next => {
      appStateRef.current = next;
    });
    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(animIdRef.current);
      sub.remove();
    };
  }, []);

  const stateRef = useRef<{
    bundle: SceneBundle;
    roomGroup: THREE.Group | null;
    fixturesGroup: THREE.Group | null;
    autoRotate: boolean;
    lightOn: boolean;
    objectsOn: boolean;
    interiorMode: boolean;
    yaw: number;
    pitch: number;
  } | null>(null);

  const [ready,        setReady]        = useState(false);
  const [autoRotate,   setAutoRotate]   = useState(true);
  const [lightOn,      setLightOnUI]    = useState(true);
  const [objectsOn,    setObjectsOn]    = useState(true);
  const [interiorMode, setInteriorMode] = useState(false);
  const [windowsOpen,  setWindowsOpen]  = useState(false);
  const [showHint,     setShowHint]     = useState(false);

  // Keep config ref current
  useEffect(() => { configRef.current = config; }, [config]);

  // ── GL context creation (runs once) ─────────────────────────
  const onContextCreate = useCallback(async (gl: any) => {
    // Clear texture cache from any previous GL context.
    // Textures are tied to a specific WebGL context — reusing them after
    // NativeCanvas remounts (navigation away and back) causes blank surfaces.
    clearTextureCache();

    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const bundle = createScene(gl, w, h);

    const cfg = configRef.current ?? {
      roomType: 'bathroom' as RoomType, widthFt: 5, lengthFt: 6, heightFt: 8,
      tileWidthIn: 12, tileHeightIn: 12, selectedTile: null, zoneRows: [],
    };

    const result = buildRoom(bundle.scene, cfg, bundle.pointLight);
    frameCameraToRoom(bundle.camera, cfg.widthFt, cfg.lengthFt, cfg.heightFt);

    const state = {
      bundle,
      roomGroup: result.roomGroup,
      fixturesGroup: result.fixturesGroup,
      autoRotate: true,
      lightOn: true,
      objectsOn: true,
      interiorMode: false,
      yaw: 0,
      pitch: 0,
    };
    stateRef.current = state;
    setReady(true);

    // Register screenshot capture function (native: GLView.takeSnapshotAsync)
    if (onCaptureReady) {
      onCaptureReady(async () => {
        console.log('[TileViz] Native capture function CALLED');
        try {
          console.log('[TileViz] Native capture: requiring expo-gl...');
          const ExpoGL = require('expo-gl');
          const GLV = ExpoGL.GLView;
          console.log('[TileViz] Native capture: GLV exists:', !!GLV);
          console.log('[TileViz] Native capture: takeSnapshotAsync exists:', typeof GLV?.takeSnapshotAsync);
          console.log('[TileViz] Native capture: gl context id:', gl?.contextId);

          bundle.renderer.render(bundle.scene, bundle.camera);
          gl.endFrameEXP();

          console.log('[TileViz] Native capture: calling takeSnapshotAsync...');
          const snapshot = await GLV.takeSnapshotAsync(gl, { format: 'jpeg', compress: 0.85 });
          console.log('[TileViz] Native capture: snapshot:', JSON.stringify(snapshot));

          if (snapshot?.uri) {
            // SDK 55: use new File API, convert bytes to base64
            const { File } = require('expo-file-system');
            const file = new File(snapshot.uri);
            const bytes = await file.bytes();
            // Convert Uint8Array to base64 string
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const base64 = btoa(binary);
            console.log('[TileViz] Native capture: got base64, length:', base64?.length);
            return `data:image/jpeg;base64,${base64}`;
          }
          console.log('[TileViz] Native capture: no URI');
          return null;
        } catch (e: any) {
          console.error('[TileViz] Native capture ERROR:', e?.message || e, e?.stack);
          return null;
        }
      });
    }

    const loop = () => {
      if (!mountedRef.current) return; // Stop when component unmounts
      animIdRef.current = requestAnimationFrame(loop);
      // Skip rendering when app is backgrounded to prevent ANR
      if (appStateRef.current !== 'active') return;
      if (state.roomGroup && state.autoRotate) {
        state.roomGroup.rotation.y += 0.003;
      }
      bundle.renderer.render(bundle.scene, bundle.camera);
      gl.endFrameEXP();
    };
    loop();
  }, []); // Empty deps — only init GL context once

  // ── Rebuild room when config changes ────────────────────────
  useEffect(() => {
    const s = stateRef.current;
    if (!s || !config) return;

    // Preserve current rotation
    const prevRotation = s.roomGroup?.rotation.y ?? 0;

    // Clean up old room
    if (s.roomGroup) {
      s.bundle.scene.remove(s.roomGroup);
      disposeGroup(s.roomGroup);
    }

    // Build new room with updated config
    const { roomGroup, fixturesGroup } = buildRoom(s.bundle.scene, config, s.bundle.pointLight);
    s.roomGroup = roomGroup;
    s.fixturesGroup = fixturesGroup;
    s.fixturesGroup.visible = s.objectsOn;

    // Re-frame camera for new room dimensions
    if (s.interiorMode) {
      setupInteriorCamera(s.bundle.camera, config.widthFt, config.lengthFt, config.heightFt);
      updateCameraFromYawPitch(s.bundle.camera, s.yaw, s.pitch);
    } else {
      s.roomGroup.rotation.y = prevRotation;
      frameCameraToRoom(s.bundle.camera, config.widthFt, config.lengthFt, config.heightFt);
    }
  }, [config]);

  // ── Touch gesture handling via PanResponder ─────────────────
  const touchRef = useRef({ lastX: 0, lastY: 0, pinchDist: 0, isPinch: false });

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false, // Let buttons handle taps
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 4 || Math.abs(gs.dy) > 4,
    onShouldBlockNativeResponder: () => true,
    onPanResponderGrant: (evt, gs) => {
      const t = touchRef.current;
      t.lastX = gs.moveX || 0;
      t.lastY = gs.moveY || 0;
      t.isPinch = false;

      const touches = evt.nativeEvent.touches;
      if (touches && touches.length >= 2) {
        const dx = touches[1].pageX - touches[0].pageX;
        const dy = touches[1].pageY - touches[0].pageY;
        t.pinchDist = Math.sqrt(dx * dx + dy * dy);
        t.isPinch = true;
      }
    },
    onPanResponderMove: (evt, gs) => {
      const s = stateRef.current;
      if (!s) return;
      const t = touchRef.current;
      const touches = evt.nativeEvent.touches;

      if (touches && touches.length >= 2) {
        // ─── Pinch to zoom ──────────────────────────────────
        const dx = touches[1].pageX - touches[0].pageX;
        const dy = touches[1].pageY - touches[0].pageY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (t.pinchDist > 0) {
          const scale = dist / t.pinchDist;
          if (s.interiorMode) {
            s.bundle.camera.fov = Math.max(35, Math.min(100, s.bundle.camera.fov / scale));
            s.bundle.camera.updateProjectionMatrix();
          } else {
            const factor = scale > 1 ? 0.97 : 1.03;
            s.bundle.camera.position.multiplyScalar(factor);
            s.bundle.camera.position.clampLength(1.5, 30);
          }
        }

        t.pinchDist = dist;
        t.isPinch = true;
      } else if (!t.isPinch) {
        // ─── Single finger drag ─────────────────────────────
        const moveX = gs.moveX;
        const moveY = gs.moveY;
        const dx = moveX - t.lastX;
        const dy = moveY - t.lastY;

        if (s.interiorMode) {
          if (!s.autoRotate) { t.lastX = moveX; t.lastY = moveY; return; }
          s.yaw -= dx * 0.004;
          s.pitch -= dy * 0.004;
          const maxP = (72 * Math.PI) / 180;
          s.pitch = Math.max(-maxP, Math.min(maxP, s.pitch));
          updateCameraFromYawPitch(s.bundle.camera, s.yaw, s.pitch);
        } else if (s.roomGroup) {
          s.autoRotate = false;
          setAutoRotate(false);
          s.roomGroup.rotation.y += dx * 0.005;
        }

        t.lastX = moveX;
        t.lastY = moveY;
      }
    },
    onPanResponderRelease: () => {
      touchRef.current = { lastX: 0, lastY: 0, pinchDist: 0, isPinch: false };
    },
    onPanResponderTerminate: () => {
      touchRef.current = { lastX: 0, lastY: 0, pinchDist: 0, isPinch: false };
    },
  })).current;

  // ── Toggle interior 360° mode ───────────────────────────────
  const toggleInterior = () => {
    const s = stateRef.current;
    const cfg = configRef.current;
    if (!s || !cfg) return;

    s.interiorMode = !s.interiorMode;
    setInteriorMode(s.interiorMode);

    if (s.interiorMode) {
      // Enter 360° interior mode
      s.yaw = 0;
      s.pitch = 0;
      setupInteriorCamera(s.bundle.camera, cfg.widthFt, cfg.lengthFt, cfg.heightFt);
      setInteriorLighting(s.bundle);
      setShowHint(true);
      setTimeout(() => setShowHint(false), 3000);
    } else {
      // Exit to exterior view
      frameCameraToRoom(s.bundle.camera, cfg.widthFt, cfg.lengthFt, cfg.heightFt);
      setExteriorLighting(s.bundle, s.lightOn);
    }
  };

  // ── Control buttons (includes 360° panorama) ────────────────
  const BTNS = [
    { icon: '👁', label: '360° View', fn: toggleInterior, active: interiorMode },
    { icon: '◁', label: 'Rotate Left', fn: () => {
      const s = stateRef.current;
      if (s) {
        if (s.interiorMode) { s.yaw -= 0.28; updateCameraFromYawPitch(s.bundle.camera, s.yaw, s.pitch); }
        else if (s.roomGroup) { s.autoRotate = false; s.roomGroup.rotation.y -= 0.28; setAutoRotate(false); }
      }
    }},
    { icon: '▷', label: 'Rotate Right', fn: () => {
      const s = stateRef.current;
      if (s) {
        if (s.interiorMode) { s.yaw += 0.28; updateCameraFromYawPitch(s.bundle.camera, s.yaw, s.pitch); }
        else if (s.roomGroup) { s.autoRotate = false; s.roomGroup.rotation.y += 0.28; setAutoRotate(false); }
      }
    }},
    { icon: '+', label: 'Zoom In', fn: () => {
      const s = stateRef.current;
      if (s) {
        if (s.interiorMode) { s.bundle.camera.fov = Math.max(35, s.bundle.camera.fov - 5); s.bundle.camera.updateProjectionMatrix(); }
        else { s.bundle.camera.position.multiplyScalar(0.88); s.bundle.camera.position.clampLength(1.5, 30); }
      }
    }},
    { icon: '−', label: 'Zoom Out', fn: () => {
      const s = stateRef.current;
      if (s) {
        if (s.interiorMode) { s.bundle.camera.fov = Math.min(100, s.bundle.camera.fov + 5); s.bundle.camera.updateProjectionMatrix(); }
        else { s.bundle.camera.position.multiplyScalar(1.12); s.bundle.camera.position.clampLength(1.5, 30); }
      }
    }},
    { icon: '⊙', label: 'Reset View', fn: () => {
      const s = stateRef.current;
      const c = configRef.current;
      if (s && c) {
        if (s.interiorMode) {
          s.yaw = 0; s.pitch = 0; s.bundle.camera.fov = 75;
          setupInteriorCamera(s.bundle.camera, c.widthFt, c.lengthFt, c.heightFt);
        } else {
          frameCameraToRoom(s.bundle.camera, c.widthFt, c.lengthFt, c.heightFt);
          if (s.roomGroup) s.roomGroup.rotation.y = 0;
          s.autoRotate = true; setAutoRotate(true);
        }
      }
    }},
    { icon: autoRotate ? '⏸' : '▶', label: interiorMode ? (autoRotate ? 'Freeze View' : 'Unfreeze View') : autoRotate ? 'Pause' : 'Resume', fn: () => {
      const s = stateRef.current;
      if (s) { s.autoRotate = !s.autoRotate; setAutoRotate(s.autoRotate); }
    }},
    { icon: lightOn ? '☀' : '☽', label: lightOn ? 'Lights Off' : 'Lights On', fn: () => {
      const s = stateRef.current;
      if (s) {
        s.lightOn = !s.lightOn;
        if (s.interiorMode) {
          // properly toggle interior brightness
          s.bundle.hemi.intensity       = s.lightOn ? 1.2  : 0.55;
          s.bundle.sun.intensity        = s.lightOn ? 0.6  : 0.0;
          s.bundle.pointLight.intensity = s.lightOn ? 1.5  : 0.1;
        } else {
          setLighting(s.bundle, s.lightOn);
        }
        setLightOnUI(s.lightOn);
      }
    }},
    { icon: objectsOn ? '🚫' : '🪑', label: objectsOn ? 'Hide Objects' : 'Show Objects', active: !objectsOn, fn: () => {
      const s = stateRef.current;
      if (s?.fixturesGroup) { s.objectsOn = !s.objectsOn; s.fixturesGroup.visible = s.objectsOn; setObjectsOn(s.objectsOn); }
    }},
    ...(interiorMode ? [{ icon: windowsOpen?'🪟':'🏠', label: windowsOpen?'Close Windows':'Open Windows', active: windowsOpen, fn: () => { const s=stateRef.current; if(s?.fixturesGroup){const newState=!windowsOpen;toggleWindows(s.fixturesGroup,newState);setWindowsOpen(newState);} } }] : []),
    ...(onResetDesign ? [{ icon: '↺', label: 'Reset Design', fn: onResetDesign }] : []),
  ];

  return (
    <View style={styles.wrap} {...panResponder.panHandlers}>
      <GLView style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} />
      {!ready && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.gold} />
          <Text style={styles.loadingTxt}>Building 3D Room…</Text>
        </View>
      )}
      {ready && (
        <>
          <View style={[styles.controls, { top: nativeTop, bottom: insets.bottom + 6 }]}>
            {BTNS.map((b, i) => <CtrlBtn key={i} icon={b.icon} label={b.label} onPress={b.fn} active={b.active} disabled={(b as any).disabled} />)}
          </View>
          {interiorMode && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>👁 360° Interior View</Text>
            </View>
          )}
          {showHint && (
            <Animated.View style={styles.hint}>
              <Text style={styles.hintText}>🔄 Drag to look around • Pinch to zoom</Text>
            </Animated.View>
          )}
        </>
      )}
    </View>
  );
}

// ── Main export — routes web vs native ───────────────────────
export function ThreeCanvas({ config, onResetDesign, onCaptureReady, controlsTopOffset }: Props) {
  if (Platform.OS === 'web') {
    return <WebCanvas config={config} onResetDesign={onResetDesign} onCaptureReady={onCaptureReady} controlsTopOffset={controlsTopOffset} />;
  }
  return <NativeCanvas config={config} onResetDesign={onResetDesign} onCaptureReady={onCaptureReady} controlsTopOffset={controlsTopOffset} />;
}
