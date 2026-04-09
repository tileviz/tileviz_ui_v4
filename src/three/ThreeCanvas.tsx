// ============================================================
//  three/ThreeCanvas.tsx
//  Web: full Three.js 3D via WebGLRenderer
//  Native (iOS/Android): full Three.js 3D via expo-gl + expo-three
//  Features: dark-themed controls, hover tooltips, object toggle
// ============================================================
import React, { useRef, useCallback, useState, useEffect } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Text,
  ActivityIndicator, Platform, Animated,
} from 'react-native';
import * as THREE from 'three';
import { Colors, Radii, Shadows } from '../config/theme';
import { frameCameraToRoom, setLighting, SceneBundle, createScene, createWebScene } from './scene';
import { buildRoom, RoomBuildResult } from './room-builder';
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
  } | null>(null);
  const [ready,      setReady]      = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [lightOn,    setLightOnUI]  = useState(true);
  const [objectsOn,  setObjectsOn]  = useState(true);

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

    const state = { bundle, roomGroup, fixturesGroup, autoRotate: true, lightOn: true, objectsOn: true, animId: 0 };
    stateRef.current = state;
    setReady(true);

    const loop = () => {
      state.animId = requestAnimationFrame(loop);
      if (state.roomGroup && state.autoRotate) state.roomGroup.rotation.y += 0.003;
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

    return () => {
      cancelAnimationFrame(state.animId);
      ro.disconnect();
      bundle.renderer.dispose();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      stateRef.current = null;
      setReady(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const BTNS = [
    { icon: '◁', label: 'Rotate Left',   fn: () => { const s=stateRef.current; if(s?.roomGroup){s.autoRotate=false;s.roomGroup.rotation.y-=0.28;setAutoRotate(false);} } },
    { icon: '▷', label: 'Rotate Right',  fn: () => { const s=stateRef.current; if(s?.roomGroup){s.autoRotate=false;s.roomGroup.rotation.y+=0.28;setAutoRotate(false);} } },
    { icon: '+', label: 'Zoom In',       fn: () => { const s=stateRef.current; if(s){s.bundle.camera.position.multiplyScalar(0.88);s.bundle.camera.position.clampLength(1.5,30);} } },
    { icon: '−', label: 'Zoom Out',      fn: () => { const s=stateRef.current; if(s){s.bundle.camera.position.multiplyScalar(1.12);s.bundle.camera.position.clampLength(1.5,30);} } },
    { icon: '⊙', label: 'Reset View',    fn: () => { const s=stateRef.current; if(s&&config){frameCameraToRoom(s.bundle.camera,config.widthFt,config.lengthFt,config.heightFt);if(s.roomGroup)s.roomGroup.rotation.y=0;s.autoRotate=true;setAutoRotate(true);} } },
    { icon: autoRotate?'⏸':'▶', label: autoRotate?'Pause Rotation':'Resume Rotation', fn: () => { const s=stateRef.current; if(s){s.autoRotate=!s.autoRotate;setAutoRotate(s.autoRotate);} } },
    { icon: lightOn?'☀':'☽', label: lightOn?'Lights Off':'Lights On', fn: () => { const s=stateRef.current; if(s){s.lightOn=!s.lightOn;setLighting(s.bundle,s.lightOn);setLightOnUI(s.lightOn);} } },
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
        <View style={styles.controls}>
          {BTNS.map((b, i) => <CtrlBtn key={i} icon={b.icon} label={b.label} onPress={b.fn} active={b.active} />)}
        </View>
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
});
