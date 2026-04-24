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
}

/**
 * No-op placeholder — kept for backwards compatibility with scene.ts import.
 * The isVideoTexture approach on individual textures handles the expo-gl
 * compatibility; we do NOT patch the GL context globally because that
 * breaks procedural DataTextures which need real texStorage2D.
 */
export function patchGLForExpoThree(_gl: any): void {
  // intentionally empty
}

function buildDataTex(color: string, pattern: string): THREE.DataTexture {
  const SIZE=256, buf=new Uint8Array(SIZE*SIZE*4);
  const r=parseInt(color.slice(1,3),16)||200, g=parseInt(color.slice(3,5),16)||200, b=parseInt(color.slice(5,7),16)||200;
  for(let i=0;i<SIZE*SIZE;i++){buf[i*4]=r;buf[i*4+1]=g;buf[i*4+2]=b;buf[i*4+3]=255;}
  if(pattern==='marble'){for(let py=0;py<SIZE;py++)for(let px=0;px<SIZE;px++){const n=Math.sin((px+py*0.7)*0.08+Math.sin(px*0.04)*4)*0.5+0.5,br=Math.floor(n*60),i=(py*SIZE+px)*4;buf[i]=Math.min(255,r+br);buf[i+1]=Math.min(255,g+br);buf[i+2]=Math.min(255,b+br);}}
  else if(pattern==='wood'){for(let py=0;py<SIZE;py++)for(let px=0;px<SIZE;px++){const gr=Math.sin(py*0.18+Math.sin(px*0.04)*3)*24,i=(py*SIZE+px)*4;buf[i]=Math.max(0,Math.min(255,r+gr));buf[i+1]=Math.max(0,Math.min(255,g+gr*0.5));buf[i+2]=Math.max(0,Math.min(255,b+gr*0.2));}}
  else if(pattern==='mosaic'){const cs=28;for(let py=0;py<SIZE;py++)for(let px=0;px<SIZE;px++){const cx=Math.floor(px/cs),cy=Math.floor(py/cs),isG=(px%cs<2)||(py%cs<2),sh=((cx*7+cy*13)%40)-20,i=(py*SIZE+px)*4;if(isG){buf[i]=buf[i+1]=buf[i+2]=215;}else{buf[i]=Math.max(0,Math.min(255,r+sh));buf[i+1]=Math.max(0,Math.min(255,g+sh));buf[i+2]=Math.max(0,Math.min(255,b+sh));}}}
  else if(pattern==='stone'){for(let py=0;py<SIZE;py++)for(let px=0;px<SIZE;px++){const cr=(Math.sin(px*0.05)*Math.cos(py*0.05))*20,i=(py*SIZE+px)*4;buf[i]=Math.max(0,Math.min(255,r+cr));buf[i+1]=Math.max(0,Math.min(255,g+cr));buf[i+2]=Math.max(0,Math.min(255,b+cr));}}
  // Thin dark grout lines (1px) for realistic tile appearance
  const groutR=136,groutG=136,groutB=136; // #888 dark gray grout
  for(let j=0;j<SIZE;j++){
    const t=(0*SIZE+j)*4; buf[t]=groutR;buf[t+1]=groutG;buf[t+2]=groutB;
    const b=((SIZE-1)*SIZE+j)*4; buf[b]=groutR;buf[b+1]=groutG;buf[b+2]=groutB;
    const l=(j*SIZE+0)*4; buf[l]=groutR;buf[l+1]=groutG;buf[l+2]=groutB;
    const rr=(j*SIZE+(SIZE-1))*4; buf[rr]=groutR;buf[rr+1]=groutG;buf[rr+2]=groutB;
  }
  const tex=new THREE.DataTexture(buf,SIZE,SIZE,THREE.RGBAFormat);tex.needsUpdate=true;return tex;
}

export function makeProceduralMat(color:string,pattern:string,repX:number,repY:number):THREE.MeshStandardMaterial{
  const key=`${color}:${pattern}`;if(!texCache[key])texCache[key]=buildDataTex(color,pattern);
  const t=texCache[key].clone() as any;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(Math.max(0.5,repX),Math.max(0.5,repY));
  // Mipmaps make tiles sharp at angles/distance on web; expo-gl doesn't support them on native
  if(Platform.OS==='web'){t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;}
  t.needsUpdate=true;
  return new THREE.MeshStandardMaterial({map:t,roughness:pattern==='marble'?0.22:pattern==='wood'?0.6:0.82,metalness:pattern==='marble'?0.06:0});
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
  t.minFilter      = THREE.LinearFilter;
  t.magFilter      = THREE.LinearFilter;
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
            t.flipY           = false;
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
  const mat=new THREE.MeshStandardMaterial({roughness:0.5,metalness:0});

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
        // Keep mipmaps (generated by default by TextureLoader) for sharp tiles at distance
        t.minFilter=THREE.LinearMipmapLinearFilter;
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

export {texCache,imgTexCache};
