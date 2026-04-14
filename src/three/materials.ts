// three/materials.ts — PBR procedural texture system
import * as THREE from 'three';
import { Platform } from 'react-native';
const texCache: Record<string, THREE.DataTexture> = {};
const imgTexCache: Record<string, THREE.Texture>  = {};

/**
 * Call this whenever the expo-gl context is recreated (NativeCanvas remount).
 * Stale textures from the old context will crash or render blank in the new one.
 */
export function clearTextureCache(): void {
  Object.keys(imgTexCache).forEach(k => {
    try { imgTexCache[k].dispose(); } catch { /* ignore */ }
    delete imgTexCache[k];
  });
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
    // Top edge (1px)
    const t=(0*SIZE+j)*4; buf[t]=groutR;buf[t+1]=groutG;buf[t+2]=groutB;
    // Bottom edge (1px)
    const b=((SIZE-1)*SIZE+j)*4; buf[b]=groutR;buf[b+1]=groutG;buf[b+2]=groutB;
    // Left edge (1px)
    const l=(j*SIZE+0)*4; buf[l]=groutR;buf[l+1]=groutG;buf[l+2]=groutB;
    // Right edge (1px)
    const rr=(j*SIZE+(SIZE-1))*4; buf[rr]=groutR;buf[rr+1]=groutG;buf[rr+2]=groutB;
  }
  const tex=new THREE.DataTexture(buf,SIZE,SIZE,THREE.RGBAFormat);tex.needsUpdate=true;return tex;
}

export function makeProceduralMat(color:string,pattern:string,repX:number,repY:number):THREE.MeshStandardMaterial{
  const key=`${color}:${pattern}`;if(!texCache[key])texCache[key]=buildDataTex(color,pattern);
  const t=texCache[key].clone() as any;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(Math.max(0.5,repX),Math.max(0.5,repY));t.needsUpdate=true;
  return new THREE.MeshStandardMaterial({map:t,roughness:pattern==='marble'?0.22:pattern==='wood'?0.6:0.82,metalness:pattern==='marble'?0.06:0});
}

export function makeImageMat(uri:string,repX:number,repY:number,fbColor:string,fbPattern:string):THREE.MeshStandardMaterial{
  const mat=new THREE.MeshStandardMaterial({roughness:0.5,metalness:0});

  /**
   * Apply a loaded source texture to the material.
   *
   * On native: the SOURCE texture is pre-configured with expo-gl-safe settings
   *   (generateMipmaps=false, minFilter=LinearFilter, flipY=false) before being
   *   cached. clone() inherits all these settings, so each surface gets its own
   *   clone with correct repeat values without triggering mipmap incompleteness.
   *
   * WHY NOT new THREE.Texture() + v.image = src.image:
   *   expo-three's TextureLoader stores image data in GL-internal format, not as
   *   a plain HTMLImageElement. Copying .image to a fresh Texture and setting
   *   needsUpdate=true does NOT re-upload the data — nothing renders.
   */
  const applyTexture=(src:THREE.Texture)=>{
    const c=src.clone() as any;
    c.wrapS=c.wrapT=THREE.RepeatWrapping;
    c.repeat.set(Math.max(0.5,repX),Math.max(0.5,repY));
    c.needsUpdate=true;
    mat.map=c;
    mat.needsUpdate=true;
  };

  const onError=()=>{
    mat.map=(makeProceduralMat(fbColor,fbPattern,repX,repY) as any).map;
    mat.needsUpdate=true;
  };

  if(imgTexCache[uri]){
    applyTexture(imgTexCache[uri]);
  }else if(Platform.OS!=='web'){
    // Use expo-three's TextureLoader which handles React Native image URIs.
    // THREE.TextureLoader relies on browser Image API (unavailable in expo-gl).
    try{
      const {TextureLoader:ExpoTL}=require('expo-three');
      new ExpoTL().load(uri,(t:THREE.Texture)=>{
        // Configure BEFORE caching — clone() inherits these expo-gl-safe settings,
        // preventing mipmap incompleteness (black surfaces) on non-power-of-2 images.
        t.generateMipmaps=false;         // non-POT safe: skip mipmap generation
        t.minFilter=THREE.LinearFilter;  // no mipmaps → LinearFilter required
        t.flipY=false;                   // expo-gl: OpenGL ES bottom-left origin
        t.needsUpdate=true;
        imgTexCache[uri]=t;
        applyTexture(t);
      },undefined,onError);
    }catch{
      onError();
    }
  }else{
    const loader=new THREE.TextureLoader();
    loader.crossOrigin='anonymous';
    loader.load(uri,(t)=>{imgTexCache[uri]=t;applyTexture(t);},undefined,onError);
  }
  return mat;
}

export function resolveRowMat(row:any,tile:any,repX:number,repY:number):THREE.MeshStandardMaterial{
  const color=row?.color??tile?.color??'#c8b89a';
  const pattern=tile?.pattern??row?.pattern??'solid';
  const uri=row?.tileImageUri??tile?.imageUri;
  if(uri)return makeImageMat(uri,repX,repY,color,pattern);
  return makeProceduralMat(color,pattern,repX,repY);
}
export {texCache,imgTexCache};
