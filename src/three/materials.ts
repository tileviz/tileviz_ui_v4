// three/materials.ts — PBR procedural texture system
import * as THREE from 'three';
import { Platform } from 'react-native';

const texCache: Record<string, THREE.DataTexture> = {};

// Web: cache loaded THREE.Texture objects (GL-context bound)
const imgTexCache: Record<string, THREE.Texture> = {};

// Native: cache the full THREE.Texture produced by expo-three's TextureLoader.
// On GL context recreation (NativeCanvas remount) we clear these since
// they are GL-context bound.
const nativeTexCache: Record<string, THREE.Texture> = {};

// In-flight load promises — ensures only ONE expo-three TextureLoader fires per URI.
const imgLoadingPromises: Record<string, Promise<THREE.Texture>> = {};

// Cached roughness/bump map for grout realism
let groutBumpTex: THREE.DataTexture | null = null;

// Cached simple environment map for tile reflections
let tileEnvMap: THREE.CubeTexture | null = null;

/**
 * Call this whenever the expo-gl context is recreated (NativeCanvas remount).
 * All GL-context-bound textures must be discarded.
 */
export function clearTextureCache(): void {
  Object.keys(imgTexCache).forEach(k => {
    try { imgTexCache[k].dispose(); } catch { /* ignore */ }
    delete imgTexCache[k];
  });
  Object.keys(nativeTexCache).forEach(k => {
    try { nativeTexCache[k].dispose(); } catch { /* ignore */ }
    delete nativeTexCache[k];
  });
  groutBumpTex = null;
  tileEnvMap = null;
}

/**
 * No-op placeholder — kept for backwards compatibility with scene.ts import.
 */
export function patchGLForExpoThree(_gl: any): void {
  // intentionally empty
}

// ── Max anisotropy (queried lazily from the renderer) ────────
let maxAniso = 1;
/** Call once with the renderer to enable anisotropic filtering globally. */
export function initTextureQuality(renderer: THREE.WebGLRenderer): void {
  maxAniso = renderer.capabilities.getMaxAnisotropy?.() ?? 1;
}

// ── Procedural environment cubemap for realistic tile reflections ──
// Creates a soft gradient cubemap simulating a bright room environment.
// This gives glossy tiles subtle reflections without loading external HDR images.
function getTileEnvMap(): THREE.CubeTexture {
  if (tileEnvMap) return tileEnvMap;

  const SIZE = 64;
  const faces: Uint8Array[] = [];

  for (let face = 0; face < 6; face++) {
    const buf = new Uint8Array(SIZE * SIZE * 4);
    for (let py = 0; py < SIZE; py++) {
      for (let px = 0; px < SIZE; px++) {
        const i = (py * SIZE + px) * 4;
        // Gradient from warm white (top) to soft gray (bottom) simulating room light
        const t = py / SIZE; // 0=top, 1=bottom
        let r: number, g: number, b: number;
        if (face === 2) {
          // +Y (ceiling) — bright warm white
          r = 255; g = 252; b = 245;
        } else if (face === 3) {
          // -Y (floor) — darker warm tone
          r = 180; g = 170; b = 155;
        } else {
          // Walls — gradient from bright top to medium bottom
          r = Math.round(245 - t * 50);
          g = Math.round(240 - t * 55);
          b = Math.round(232 - t * 60);
        }
        buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255;
      }
    }
    faces.push(buf);
  }

  const textures = faces.map(data => {
    const dt = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat);
    dt.needsUpdate = true;
    return dt;
  });

  tileEnvMap = new THREE.CubeTexture(textures.map(t => t.image));
  tileEnvMap.needsUpdate = true;
  return tileEnvMap;
}

// ── Grout bump/roughness map for tile realism ────────────────
// Creates a tileable bump map where the border pixels (grout lines)
// are raised, giving a subtle 3D depth effect to tile grout.
function getGroutBumpTex(repX: number, repY: number): THREE.DataTexture {
  if (!groutBumpTex) {
    const S = 128;
    const buf = new Uint8Array(S * S * 4);
    const GROUT_PX = 3; // slightly wider grout for more visible depth
    for (let py = 0; py < S; py++) {
      for (let px = 0; px < S; px++) {
        const i = (py * S + px) * 4;
        const isGrout = px < GROUT_PX || px >= S - GROUT_PX || py < GROUT_PX || py >= S - GROUT_PX;
        const v = isGrout ? 60 : 200; // stronger contrast = deeper grout look
        buf[i] = buf[i + 1] = buf[i + 2] = v;
        buf[i + 3] = 255;
      }
    }
    groutBumpTex = new THREE.DataTexture(buf, S, S, THREE.RGBAFormat);
    groutBumpTex.needsUpdate = true;
  }
  const t = groutBumpTex.clone() as any;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(Math.max(0.5, repX), Math.max(0.5, repY));
  t.needsUpdate = true;
  return t;
}

function buildDataTex(color: string, pattern: string): THREE.DataTexture {
  // Higher resolution procedural textures for sharper appearance
  const SIZE = 512, buf = new Uint8Array(SIZE * SIZE * 4);
  const r=parseInt(color.slice(1,3),16)||200, g=parseInt(color.slice(3,5),16)||200, b=parseInt(color.slice(5,7),16)||200;
  for(let i=0;i<SIZE*SIZE;i++){buf[i*4]=r;buf[i*4+1]=g;buf[i*4+2]=b;buf[i*4+3]=255;}
  if(pattern==='marble'){for(let py=0;py<SIZE;py++)for(let px=0;px<SIZE;px++){const n=Math.sin((px+py*0.7)*0.04+Math.sin(px*0.02)*4)*0.5+0.5,br=Math.floor(n*60),i=(py*SIZE+px)*4;buf[i]=Math.min(255,r+br);buf[i+1]=Math.min(255,g+br);buf[i+2]=Math.min(255,b+br);}}
  else if(pattern==='wood'){for(let py=0;py<SIZE;py++)for(let px=0;px<SIZE;px++){const gr=Math.sin(py*0.09+Math.sin(px*0.02)*3)*24,i=(py*SIZE+px)*4;buf[i]=Math.max(0,Math.min(255,r+gr));buf[i+1]=Math.max(0,Math.min(255,g+gr*0.5));buf[i+2]=Math.max(0,Math.min(255,b+gr*0.2));}}
  else if(pattern==='mosaic'){const cs=56;for(let py=0;py<SIZE;py++)for(let px=0;px<SIZE;px++){const cx=Math.floor(px/cs),cy=Math.floor(py/cs),isG=(px%cs<2)||(py%cs<2),sh=((cx*7+cy*13)%40)-20,i=(py*SIZE+px)*4;if(isG){buf[i]=buf[i+1]=buf[i+2]=215;}else{buf[i]=Math.max(0,Math.min(255,r+sh));buf[i+1]=Math.max(0,Math.min(255,g+sh));buf[i+2]=Math.max(0,Math.min(255,b+sh));}}}
  else if(pattern==='stone'){for(let py=0;py<SIZE;py++)for(let px=0;px<SIZE;px++){const cr=(Math.sin(px*0.025)*Math.cos(py*0.025))*20,i=(py*SIZE+px)*4;buf[i]=Math.max(0,Math.min(255,r+cr));buf[i+1]=Math.max(0,Math.min(255,g+cr));buf[i+2]=Math.max(0,Math.min(255,b+cr));}}
  // Grout lines (2px wide for better visibility at 512)
  const groutR=110,groutG=105,groutB=100;
  const GROUT = 2;
  for(let j=0;j<SIZE;j++){
    for(let gw=0;gw<GROUT;gw++){
      const t=(gw*SIZE+j)*4; buf[t]=groutR;buf[t+1]=groutG;buf[t+2]=groutB;
      const b2=((SIZE-1-gw)*SIZE+j)*4; buf[b2]=groutR;buf[b2+1]=groutG;buf[b2+2]=groutB;
      const l=(j*SIZE+gw)*4; buf[l]=groutR;buf[l+1]=groutG;buf[l+2]=groutB;
      const rr=(j*SIZE+(SIZE-1-gw))*4; buf[rr]=groutR;buf[rr+1]=groutG;buf[rr+2]=groutB;
    }
  }
  const tex=new THREE.DataTexture(buf,SIZE,SIZE,THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace; // Proper color rendering
  tex.needsUpdate=true;return tex;
}

/** Apply anisotropic filtering if available */
function applyAniso(tex: THREE.Texture): void {
  if (maxAniso > 1) tex.anisotropy = Math.min(maxAniso, 8);
}

export function makeProceduralMat(color:string,pattern:string,repX:number,repY:number):THREE.MeshStandardMaterial{
  const key=`${color}:${pattern}`;if(!texCache[key])texCache[key]=buildDataTex(color,pattern);
  const t=texCache[key].clone() as any;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(Math.max(0.5,repX),Math.max(0.5,repY));
  // Mipmaps + aniso for sharp tiles at angles/distance
  if(Platform.OS==='web'){
    t.generateMipmaps=true;
    t.minFilter=THREE.LinearMipmapLinearFilter;
    t.magFilter=THREE.LinearFilter;
    applyAniso(t);
  }
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate=true;
  // Realistic PBR values for common tile types
  const roughness = pattern==='marble'?0.12:pattern==='wood'?0.45:pattern==='stone'?0.55:0.25;
  const metalness = pattern==='marble'?0.05:0;
  const mat = new THREE.MeshStandardMaterial({
    map: t,
    roughness,
    metalness,
    bumpMap: getGroutBumpTex(repX, repY),
    bumpScale: 0.025,
    envMapIntensity: 0.6, // subtle environment reflections
  });
  return mat;
}

/**
 * Clone a texture produced by expo-three's TextureLoader.
 * Preserves the isDataTexture flag that THREE.Texture.clone() drops.
 *
 * Sets isVideoTexture = true so Three.js skips the texStorage2D path
 * and uses the 9-arg texImage2D that expo-gl supports for Asset objects.
 * A no-op update() method is added to satisfy the VideoTexture interface.
 */
function cloneNativeTexture(src: THREE.Texture, repX: number, repY: number): THREE.Texture {
  const t = src.clone();
  if ((src as any).isDataTexture) (t as any).isDataTexture = true;
  (t as any).isVideoTexture = true;
  (t as any).update = () => {};     // VideoTexture requires update()
  t.wrapS          = THREE.RepeatWrapping;
  t.wrapT          = THREE.RepeatWrapping;
  t.generateMipmaps = false;
  // Use nearest-mipmap for slightly sharper look on native
  t.minFilter      = THREE.LinearFilter;
  t.magFilter      = THREE.LinearFilter;
  t.flipY          = true;           // flip Y so image tiles render right-side-up
  t.colorSpace     = THREE.SRGBColorSpace; // Correct color reproduction
  t.repeat.set(Math.max(0.5, repX), Math.max(0.5, repY));
  t.needsUpdate    = true;
  return t;
}

/**
 * Load a texture via expo-three's TextureLoader (native only).
 * Deduplicates: only one load per URI.
 */
function loadNativeTexture(uri: string): Promise<THREE.Texture> {
  if (nativeTexCache[uri]) return Promise.resolve(nativeTexCache[uri]);

  if (!imgLoadingPromises[uri]) {
    imgLoadingPromises[uri] = new Promise<THREE.Texture>((resolve, reject) => {
      try {
        const { TextureLoader: ExpoTL } = require('expo-three');
        new ExpoTL().load(
          uri,
          (t: THREE.Texture) => {
            t.generateMipmaps = false;
            t.minFilter       = THREE.LinearFilter;
            t.magFilter       = THREE.LinearFilter;
            t.flipY           = true;
            t.colorSpace      = THREE.SRGBColorSpace;
            // Force Three.js to skip texStorage2D → use texImage2D instead
            (t as any).isVideoTexture = true;
            (t as any).update = () => {};
            nativeTexCache[uri] = t;
            delete imgLoadingPromises[uri];
            resolve(t);
          },
          undefined,
          (e: any) => { delete imgLoadingPromises[uri]; reject(e); },
        );
      } catch (e) {
        delete imgLoadingPromises[uri];
        reject(e);
      }
    });
  }

  return imgLoadingPromises[uri];
}

export function makeImageMat(uri:string,repX:number,repY:number,fbColor:string,fbPattern:string):THREE.MeshStandardMaterial{
  // Tile-appropriate PBR: glossy ceramic/porcelain look
  const mat=new THREE.MeshStandardMaterial({
    roughness: 0.18,       // Glossy ceramic tile — low roughness for visible reflections
    metalness: 0.0,        // Non-metallic
    bumpMap: getGroutBumpTex(repX, repY),
    bumpScale: 0.03,       // More pronounced grout depth
    envMapIntensity: 0.8,  // Clear environment reflections on glossy tiles
  });

  const fallback=()=>{
    mat.map=(makeProceduralMat(fbColor,fbPattern,repX,repY) as any).map;
    mat.needsUpdate=true;
  };

  if(Platform.OS!=='web'){
    // ── Native path ──────────────────────────────────────────────
    if(nativeTexCache[uri]){
      mat.map=cloneNativeTexture(nativeTexCache[uri],repX,repY);
      mat.needsUpdate=true;
    }else{
      loadNativeTexture(uri)
        .then((srcTex:THREE.Texture)=>{
          mat.map=cloneNativeTexture(srcTex,repX,repY);
          mat.needsUpdate=true;
        })
        .catch(fallback);
    }
  }else{
    // ── Web path: standard THREE.TextureLoader + clone ───────────
    const applyTexture=(src:THREE.Texture)=>{
      const c=src.clone() as any;
      c.wrapS=c.wrapT=THREE.RepeatWrapping;
      c.repeat.set(Math.max(0.5,repX),Math.max(0.5,repY));
      // Mipmaps + anisotropic for crisp tiles at distance and angles
      c.generateMipmaps=true;
      c.minFilter=THREE.LinearMipmapLinearFilter;
      c.magFilter=THREE.LinearFilter;
      c.colorSpace=THREE.SRGBColorSpace;
      applyAniso(c);
      c.needsUpdate=true;
      mat.map=c;
      mat.needsUpdate=true;
    };

    if(imgTexCache[uri]){
      applyTexture(imgTexCache[uri]);
    }else{
      const loader=new THREE.TextureLoader();
      loader.crossOrigin='anonymous';
      loader.load(uri,(t)=>{
        t.generateMipmaps=true;
        t.minFilter=THREE.LinearMipmapLinearFilter;
        t.colorSpace=THREE.SRGBColorSpace;
        applyAniso(t);
        imgTexCache[uri]=t;
        applyTexture(t);
      },undefined,fallback);
    }
  }
  return mat;
}

export function resolveRowMat(row:any,tile:any,repX:number,repY:number):THREE.MeshStandardMaterial{
  // Only use the global selectedTile as fallback if this row has an explicit tile assignment
  const hasTile = row?.tileId || row?.tileImageUri;
  const effectiveTile = hasTile ? tile : null;
  const color=row?.color??effectiveTile?.color??'#c8b89a';
  const pattern=effectiveTile?.pattern??row?.pattern??'solid';
  const uri=row?.tileImageUri??effectiveTile?.imageUri;
  if(uri)return makeImageMat(uri,repX,repY,color,pattern);
  return makeProceduralMat(color,pattern,repX,repY);
}

export function resolveRowMatB(row:any,tile:any,repX:number,repY:number):THREE.MeshStandardMaterial{
  // Only use the global selectedTile as fallback if this row has an explicit accent tile assignment
  const hasTileB = row?.tileBId || row?.tileBImageUri;
  const effectiveTile = hasTileB ? tile : null;
  const color=row?.tileBColor??effectiveTile?.color??'#c8b89a';
  const pattern=effectiveTile?.pattern??'solid';
  const uri=row?.tileBImageUri??effectiveTile?.imageUri;
  if(uri)return makeImageMat(uri,repX,repY,color,pattern);
  return makeProceduralMat(color,pattern,repX,repY);
}

export function resolveRowMatC(row:any,tile:any,repX:number,repY:number):THREE.MeshStandardMaterial{
  const hasTileC = row?.tileCId || row?.tileCImageUri;
  const effectiveTile = hasTileC ? tile : null;
  const color=row?.tileCColor??effectiveTile?.color??'#c8b89a';
  const pattern=effectiveTile?.pattern??'solid';
  const uri=row?.tileCImageUri??effectiveTile?.imageUri;
  if(uri)return makeImageMat(uri,repX,repY,color,pattern);
  return makeProceduralMat(color,pattern,repX,repY);
}

export function resolveRowMatD(row:any,tile:any,repX:number,repY:number):THREE.MeshStandardMaterial{
  const hasTileD = row?.tileDId || row?.tileDImageUri;
  const effectiveTile = hasTileD ? tile : null;
  const color=row?.tileDColor??effectiveTile?.color??'#c8b89a';
  const pattern=effectiveTile?.pattern??'solid';
  const uri=row?.tileDImageUri??effectiveTile?.imageUri;
  if(uri)return makeImageMat(uri,repX,repY,color,pattern);
  return makeProceduralMat(color,pattern,repX,repY);
}

export {texCache,imgTexCache};
