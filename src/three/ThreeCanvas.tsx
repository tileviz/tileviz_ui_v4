// ============================================================
//  three/ThreeCanvas.tsx
//  Web: full Three.js 3D via WebGLRenderer
//  Native (iOS/Android): full Three.js 3D via expo-gl + expo-three
//  Features: dark-themed controls, hover tooltips, object toggle, 360° panorama
// ============================================================
import React, { useRef, useCallback, useState, useEffect } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Text,
  ActivityIndicator, Platform, Animated,
} from 'react-native';
import * as THREE from 'three';
import { Colors, Radii } from '../config/theme';
import { frameCameraToRoom, setLighting, SceneBundle, createScene, createWebScene, setupInteriorCamera, setInteriorLighting, setExteriorLighting } from './scene';
import { buildRoom } from './room-builder';
import { RoomType, Tile, ZoneRow } from '../types';

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

interface Props { config: RoomBuildConfig | null; }

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
function CtrlBtn({ icon, label, onPress, active }: { icon: string; label: string; onPress: () => void; active?: boolean }) {
  const [show, setShow] = useState(false);

  // On web, use native mouse events for real hover
  const webHoverProps = Platform.OS === 'web' ? {
    onMouseEnter: () => setShow(true),
    onMouseLeave: () => setShow(false),
  } as any : {};

  return (
    <View style={{ alignItems: 'flex-end' }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => setShow(true)}
        onPressOut={() => setShow(false)}
        style={[styles.ctrlBtn, active && styles.ctrlBtnActive]}
        activeOpacity={0.75}
        {...webHoverProps}
      >
        <Text style={[styles.ctrlBtnText, active && styles.ctrlBtnTextActive]}>{icon}</Text>
      </TouchableOpacity>
      <Tooltip label={label} visible={show} />
    </View>
  );
}

// ── Web 3D Canvas ─────────────────────────────────────────────
function WebCanvas({ config }: { config: RoomBuildConfig | null }) {
  const containerRef = useRef<any>(null);
  const stateRef = useRef<{
    bundle: SceneBundle;
    roomGroup: THREE.Group | null;
    fixturesGroup: THREE.Group | null;
    autoRotate: boolean;
    lightOn: boolean;
    objectsOn: boolean;
    animId: number;
    // Interior view state
    interiorMode: boolean;
    yaw: number;
    pitch: number;
    isDragging: boolean;
    lastMouseX: number;
    lastMouseY: number;
  } | null>(null);
  const [ready,      setReady]      = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [lightOn,    setLightOnUI]  = useState(true);
  const [objectsOn,  setObjectsOn]  = useState(true);
  const [interiorMode, setInteriorMode] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // mount once — create renderer + loop
  useEffect(() => {
    const container = containerRef.current as HTMLDivElement | null;
    if (!container) return;
    const w = container.clientWidth  || 800;
    const h = container.clientHeight || 600;

    const canvas = document.createElement('canvas');
    canvas.style.display = 'block';
    canvas.style.width   = '100%';
    canvas.style.height  = '100%';
    container.appendChild(canvas);

    const bundle = createWebScene(canvas, w, h);
    const cfg = config ?? {
      roomType: 'bathroom' as RoomType, widthFt: 5, lengthFt: 6, heightFt: 8,
      tileWidthIn: 12, tileHeightIn: 12, selectedTile: null, zoneRows: [],
    };
    const { roomGroup, fixturesGroup } = buildRoom(bundle.scene, cfg, bundle.pointLight);
    frameCameraToRoom(bundle.camera, cfg.widthFt, cfg.lengthFt, cfg.heightFt);

    const state = {
      bundle, roomGroup, fixturesGroup,
      autoRotate: true, lightOn: true, objectsOn: true, animId: 0,
      interiorMode: false, yaw: 0, pitch: 0,
      isDragging: false, lastMouseX: 0, lastMouseY: 0
    };
    stateRef.current = state;
    setReady(true);

    const loop = () => {
      state.animId = requestAnimationFrame(loop);
      if (state.roomGroup && state.autoRotate && !state.interiorMode) state.roomGroup.rotation.y += 0.003;
      bundle.renderer.render(bundle.scene, bundle.camera);
    };
    loop();

    const ro = new ResizeObserver((entries) => {
      const e = entries[0]; if (!e) return;
      const nw = e.contentRect.width, nh = e.contentRect.height;
      if (nw > 0 && nh > 0) {
        bundle.renderer.setSize(nw, nh);
        bundle.camera.aspect = nw / nh;
        bundle.camera.updateProjectionMatrix();
      }
    });
    ro.observe(container);

    // ── Mouse/Touch event listeners for interior view (web only) ──
    const handleMouseDown = (e: MouseEvent | TouchEvent) => {
      const s = stateRef.current;
      if (!s || !s.interiorMode) return;
      s.isDragging = true;
      s.lastMouseX = (e as MouseEvent).clientX || (e as TouchEvent).touches?.[0]?.clientX || 0;
      s.lastMouseY = (e as MouseEvent).clientY || (e as TouchEvent).touches?.[0]?.clientY || 0;
      canvas.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      const s = stateRef.current;
      if (!s || !s.isDragging || !s.interiorMode) return;

      const clientX = (e as MouseEvent).clientX || (e as TouchEvent).touches?.[0]?.clientX || 0;
      const clientY = (e as MouseEvent).clientY || (e as TouchEvent).touches?.[0]?.clientY || 0;

      const deltaX = clientX - s.lastMouseX;
      const deltaY = clientY - s.lastMouseY;

      // Update yaw/pitch
      const sensitivity = 0.003;
      s.yaw -= deltaX * sensitivity;
      s.pitch -= deltaY * sensitivity;

      // Clamp pitch (±72°)
      const maxPitch = (72 * Math.PI) / 180;
      s.pitch = Math.max(-maxPitch, Math.min(maxPitch, s.pitch));

      // Update camera
      updateInteriorCamera(s, cfg);

      s.lastMouseX = clientX;
      s.lastMouseY = clientY;
    };

    const handleMouseUp = () => {
      const s = stateRef.current;
      if (!s) return;
      s.isDragging = false;
      canvas.style.cursor = s.interiorMode ? 'grab' : 'default';
    };

    const handleWheel = (e: WheelEvent) => {
      const s = stateRef.current;
      if (!s || !s.interiorMode) return;
      e.preventDefault();

      const delta = e.deltaY > 0 ? 5 : -5;
      s.bundle.camera.fov = Math.max(35, Math.min(100, s.bundle.camera.fov + delta));
      s.bundle.camera.updateProjectionMatrix();
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    canvas.addEventListener('touchstart', handleMouseDown);
    canvas.addEventListener('touchmove', handleMouseMove);
    canvas.addEventListener('touchend', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      cancelAnimationFrame(state.animId);
      ro.disconnect();
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
      canvas.removeEventListener('touchstart', handleMouseDown);
      canvas.removeEventListener('touchmove', handleMouseMove);
      canvas.removeEventListener('touchend', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      bundle.renderer.dispose();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      stateRef.current = null;
      setReady(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const updateInteriorCamera = (s: any, cfg: any) => {
    // Calculate look direction from yaw and pitch
    const lookDir = new THREE.Vector3(
      Math.sin(s.yaw) * Math.cos(s.pitch),
      Math.sin(s.pitch),
      -Math.cos(s.yaw) * Math.cos(s.pitch)
    );

    // Update camera look-at
    const lookTarget = new THREE.Vector3(
      s.bundle.camera.position.x + lookDir.x,
      s.bundle.camera.position.y + lookDir.y,
      s.bundle.camera.position.z + lookDir.z
    );

    s.bundle.camera.lookAt(lookTarget);
  };

  const toggleInterior = () => {
    const s = stateRef.current;
    if (!s || !config) return;

    s.interiorMode = !s.interiorMode;
    setInteriorMode(s.interiorMode);

    if (s.interiorMode) {
      // Enter interior mode
      s.autoRotate = false;
      setAutoRotate(false);
      s.yaw = 0;
      s.pitch = 0;

      setupInteriorCamera(s.bundle.camera, config.widthFt, config.lengthFt, config.heightFt);
      setInteriorLighting(s.bundle);

      // Show hint for 3 seconds
      setShowHint(true);
      setTimeout(() => setShowHint(false), 3000);

      // Set cursor
      const canvas = containerRef.current?.querySelector('canvas');
      if (canvas) canvas.style.cursor = 'grab';
    } else {
      // Exit to exterior mode
      frameCameraToRoom(s.bundle.camera, config.widthFt, config.lengthFt, config.heightFt);
      setExteriorLighting(s.bundle, s.lightOn);
      s.autoRotate = true;
      setAutoRotate(true);

      // Reset cursor
      const canvas = containerRef.current?.querySelector('canvas');
      if (canvas) canvas.style.cursor = 'default';
    }
  };

  const BTNS = [
    { icon: '👁', label: 'Interior View', fn: toggleInterior, active: interiorMode },
    { icon: '◁', label: 'Rotate Left',   fn: () => { const s=stateRef.current; if(s){if(s.interiorMode){s.yaw-=0.28;updateInteriorCamera(s,config);}else if(s.roomGroup){s.autoRotate=false;s.roomGroup.rotation.y-=0.28;setAutoRotate(false);} } } },
    { icon: '▷', label: 'Rotate Right',  fn: () => { const s=stateRef.current; if(s){if(s.interiorMode){s.yaw+=0.28;updateInteriorCamera(s,config);}else if(s.roomGroup){s.autoRotate=false;s.roomGroup.rotation.y+=0.28;setAutoRotate(false);} } } },
    { icon: '+', label: 'Zoom In',       fn: () => { const s=stateRef.current; if(s){if(s.interiorMode){s.bundle.camera.fov=Math.max(35,s.bundle.camera.fov-5);s.bundle.camera.updateProjectionMatrix();}else{s.bundle.camera.position.multiplyScalar(0.88);s.bundle.camera.position.clampLength(1.5,30);} } } },
    { icon: '−', label: 'Zoom Out',      fn: () => { const s=stateRef.current; if(s){if(s.interiorMode){s.bundle.camera.fov=Math.min(100,s.bundle.camera.fov+5);s.bundle.camera.updateProjectionMatrix();}else{s.bundle.camera.position.multiplyScalar(1.12);s.bundle.camera.position.clampLength(1.5,30);} } } },
    { icon: '⊙', label: 'Reset View',    fn: () => { const s=stateRef.current; if(s&&config){if(s.interiorMode){s.yaw=0;s.pitch=0;s.bundle.camera.fov=75;updateInteriorCamera(s,config);}else{frameCameraToRoom(s.bundle.camera,config.widthFt,config.lengthFt,config.heightFt);if(s.roomGroup)s.roomGroup.rotation.y=0;s.autoRotate=true;setAutoRotate(true);} } } },
    { icon: autoRotate?'⏸':'▶', label: autoRotate?'Pause Rotation':'Resume Rotation', fn: () => { const s=stateRef.current; if(s&&!s.interiorMode){s.autoRotate=!s.autoRotate;setAutoRotate(s.autoRotate);} } },
    { icon: lightOn?'☀':'☽', label: lightOn?'Lights Off':'Lights On', fn: () => { const s=stateRef.current; if(s){s.lightOn=!s.lightOn;if(s.interiorMode){setInteriorLighting(s.bundle);}else{setLighting(s.bundle,s.lightOn);}setLightOnUI(s.lightOn);} } },
    { icon: objectsOn?'🚫':'🪑', label: objectsOn?'Remove Objects':'Add Objects', active: !objectsOn, fn: () => { const s=stateRef.current; if(s?.fixturesGroup){s.objectsOn=!s.objectsOn;s.fixturesGroup.visible=s.objectsOn;setObjectsOn(s.objectsOn);} } },
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
          <View style={styles.controls}>
            {BTNS.map((b, i) => <CtrlBtn key={i} icon={b.icon} label={b.label} onPress={b.fn} active={b.active} />)}
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

// ── Native 3D canvas ──────────────────────────────────────────
function NativeCanvas({ config }: { config: RoomBuildConfig | null }) {
  const { GLView } = require('expo-gl');
  const stateRef = useRef<{
    bundle: SceneBundle;
    roomGroup: THREE.Group | null;
    fixturesGroup: THREE.Group | null;
    autoRotate: boolean;
    lightOn: boolean;
    objectsOn: boolean;
  } | null>(null);
  const [ready,      setReady]      = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [lightOn,    setLightOnUI]  = useState(true);
  const [objectsOn,  setObjectsOn]  = useState(true);

  const onContextCreate = useCallback(async (gl: any) => {
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const bundle = createScene(gl, w, h);
    const state  = { bundle, roomGroup: null as THREE.Group | null, fixturesGroup: null as THREE.Group | null, autoRotate: true, lightOn: true, objectsOn: true };
    stateRef.current = state;

    const cfg = config ?? {
      roomType: 'bathroom' as RoomType, widthFt: 5, lengthFt: 6, heightFt: 8,
      tileWidthIn: 12, tileHeightIn: 12, selectedTile: null, zoneRows: [],
    };

    const result = buildRoom(bundle.scene, cfg, bundle.pointLight);
    state.roomGroup = result.roomGroup;
    state.fixturesGroup = result.fixturesGroup;
    frameCameraToRoom(bundle.camera, cfg.widthFt, cfg.lengthFt, cfg.heightFt);
    setReady(true);

    const loop = () => {
      requestAnimationFrame(loop);
      if (state.roomGroup && state.autoRotate) state.roomGroup.rotation.y += 0.003;
      bundle.renderer.render(bundle.scene, bundle.camera);
      gl.endFrameEXP();
    };
    loop();
  }, [config]);

  const BTNS = [
    { icon: '◁', label: 'Rotate Left',        fn: () => { const s=stateRef.current; if(s?.roomGroup){s.autoRotate=false;s.roomGroup.rotation.y-=0.28;setAutoRotate(false);} } },
    { icon: '▷', label: 'Rotate Right',       fn: () => { const s=stateRef.current; if(s?.roomGroup){s.autoRotate=false;s.roomGroup.rotation.y+=0.28;setAutoRotate(false);} } },
    { icon: '+', label: 'Zoom In',            fn: () => { const s=stateRef.current; if(s){s.bundle.camera.position.multiplyScalar(0.88);s.bundle.camera.position.clampLength(1.5,30);} } },
    { icon: '−', label: 'Zoom Out',           fn: () => { const s=stateRef.current; if(s){s.bundle.camera.position.multiplyScalar(1.12);s.bundle.camera.position.clampLength(1.5,30);} } },
    { icon: '⊙', label: 'Reset View',         fn: () => { const s=stateRef.current; if(s&&config){frameCameraToRoom(s.bundle.camera,config.widthFt,config.lengthFt,config.heightFt);if(s.roomGroup)s.roomGroup.rotation.y=0;s.autoRotate=true;setAutoRotate(true);} } },
    { icon: autoRotate?'⏸':'▶', label: autoRotate?'Pause Rotation':'Resume Rotation', fn: () => { const s=stateRef.current; if(s){s.autoRotate=!s.autoRotate;setAutoRotate(s.autoRotate);} } },
    { icon: lightOn?'☀':'☽',    label: lightOn?'Lights Off':'Lights On', fn: () => { const s=stateRef.current; if(s){s.lightOn=!s.lightOn;setLighting(s.bundle,s.lightOn);setLightOnUI(s.lightOn);} } },
    { icon: objectsOn?'🚫':'🪑', label: objectsOn?'Remove Objects':'Add Objects', active: !objectsOn, fn: () => { const s=stateRef.current; if(s?.fixturesGroup){s.objectsOn=!s.objectsOn;s.fixturesGroup.visible=s.objectsOn;setObjectsOn(s.objectsOn);} } },
  ];

  return (
    <View style={styles.wrap}>
      <GLView style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} />
      {!ready && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.gold} />
          <Text style={styles.loadingTxt}>Building 3D Room…</Text>
        </View>
      )}
      {ready && (
        <View style={styles.controls}>
          {BTNS.map((b, i) => <CtrlBtn key={i} icon={b.icon} label={b.label} onPress={b.fn} active={b.active} />)}
        </View>
      )}
    </View>
  );
}

// ── Main export — routes web vs native ───────────────────────
export function ThreeCanvas({ config }: Props) {
  if (Platform.OS === 'web') {
    return <WebCanvas config={config} />;
  }
  return <NativeCanvas config={config} />;
}

const styles = StyleSheet.create({
  wrap:       { flex: 1 },
  loading:    { ...StyleSheet.absoluteFillObject, alignItems:'center', justifyContent:'center', backgroundColor:'rgba(232,226,216,0.9)', gap:12 },
  loadingTxt: { fontSize:13, color:Colors.text2, fontWeight:'500' },
  controls:   { position:'absolute', right:14, top:'18%', gap:8 },
  // Dark navy themed buttons matching navbar
  ctrlBtn:    {
    width:38, height:38,
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
  tooltip:    { position:'absolute', right:46, top:8, backgroundColor:'rgba(26,26,46,0.92)', paddingHorizontal:10, paddingVertical:5, borderRadius:6, minWidth:90 },
  tooltipText:{ fontSize:11, color:'#fff', fontWeight:'500', textAlign:'center' },
  badge:      { position:'absolute', left:12, top:12, backgroundColor:'rgba(0,0,0,0.7)', paddingHorizontal:10, paddingVertical:6, borderRadius:12, flexDirection:'row', alignItems:'center', gap:8 },
  badgeText:  { color:Colors.gold, fontWeight:'500', fontSize:12 },
  hint:       { position:'absolute', bottom:80, left:'50%', marginLeft:-75, backgroundColor:'rgba(0,0,0,0.8)', paddingHorizontal:12, paddingVertical:8, borderRadius:8, flexDirection:'row', alignItems:'center', gap:8 },
  hintText:   { color:'#fff', fontWeight:'400', fontSize:14, textAlign:'center' },
});
