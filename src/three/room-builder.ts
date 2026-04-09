// three/room-builder.ts — builds room + fixtures. Center FIX: g.position.y = -H/2
import * as THREE from 'three';
import { THREE_FT_SCALE } from '../config';
import { resolveRowMat } from './materials';
import { RoomType, ZoneRow, Tile } from '../types';

export interface RoomBuildConfig {
  roomType:RoomType;widthFt:number;lengthFt:number;heightFt:number;
  tileWidthIn:number;tileHeightIn:number;selectedTile:Tile|null;zoneRows:ZoneRow[];
  wallColor?:string;
}
const FT=THREE_FT_SCALE;

function std(col:number,rough=0.7,metal=0){return new THREE.MeshStandardMaterial({color:col,roughness:rough,metalness:metal});}
function mesh(geo:THREE.BufferGeometry,mat:THREE.Material,x:number,y:number,z:number,g:THREE.Group,cast=false){
  const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);if(cast)m.castShadow=true;g.add(m);
}

export interface RoomBuildResult {
  roomGroup: THREE.Group;
  fixturesGroup: THREE.Group;
}

export function buildRoom(scene:THREE.Scene,cfg:RoomBuildConfig,pl:THREE.PointLight):RoomBuildResult{
  const g=new THREE.Group();
  const fg=new THREE.Group();
  fg.name='fixtures';
  const W=cfg.widthFt*FT,L=cfg.lengthFt*FT,H=cfg.heightFt*FT;
  const tw=(cfg.tileWidthIn/12)*FT,th=(cfg.tileHeightIn/12)*FT;
  const numRows=Math.max(1,Math.round(cfg.heightFt/(cfg.tileHeightIn/12))),rowH=H/numRows;
  const isParking=cfg.roomType==='parking';
  const rt=cfg.roomType;

  // ── Floor — always tiled from catalog ──
  const fr=cfg.zoneRows.find(r=>r.wallKey==='floor');
  const fm=resolveRowMat(fr,cfg.selectedTile,W/tw,L/tw);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(W,L),fm);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;g.add(floor);

  if(!isParking){
    const ceil=new THREE.Mesh(new THREE.PlaneGeometry(W,L),new THREE.MeshStandardMaterial({color:0xf8f8f4,roughness:1,transparent:true,opacity:0.1,side:THREE.BackSide}));
    ceil.rotation.x=Math.PI/2;ceil.position.y=H;g.add(ceil);
  }

  // ── Wall tile rules per room type ──
  // bathroom: all 4 walls tiled
  // kitchen: front (N), left (W), right (E) tiled; back (S) = plain
  // bedroom, balcony: all walls plain paint (floor-only tile)
  const wallColorHex=cfg.wallColor?new THREE.Color(cfg.wallColor).getHex():0xf0ebe4;
  const plainWallMat=new THREE.MeshStandardMaterial({color:wallColorHex,roughness:0.9});

  function shouldTileWall(wallKey:string):boolean{
    if(rt==='bathroom') return true;
    if(rt==='kitchen') return wallKey==='wall_n'||wallKey==='wall_e'||wallKey==='wall_w';
    return false; // bedroom, balcony = no wall tiles
  }

  if(isParking){
    // open-air — no walls
  } else {
    [{key:'wall_n',pw:W,rotY:0,px:0,pz:-L/2,rh:W/tw},{key:'wall_s',pw:W,rotY:Math.PI,px:0,pz:L/2,rh:W/tw},
     {key:'wall_e',pw:L,rotY:-Math.PI/2,px:W/2,pz:0,rh:L/tw},{key:'wall_w',pw:L,rotY:Math.PI/2,px:-W/2,pz:0,rh:L/tw}
    ].forEach(wd=>{
      if(shouldTileWall(wd.key)){
        for(let r=0;r<numRows;r++){
          // Look for per-wall assignment first (wall_n, wall_e, etc.)
          // then fall back to generic 'walls' key from CatalogSidebar
          const zr=cfg.zoneRows.find(z=>z.wallKey===wd.key&&z.rowIndex===r)
                ??cfg.zoneRows.find(z=>z.wallKey==='walls'&&z.rowIndex===r);
          const m=resolveRowMat(zr,cfg.selectedTile,wd.rh,Math.max(0.5,rowH/th));
          const wm=new THREE.Mesh(new THREE.PlaneGeometry(wd.pw,rowH),m);
          wm.rotation.y=wd.rotY;wm.position.set(wd.px,rowH*r+rowH/2,wd.pz);wm.receiveShadow=true;g.add(wm);
        }
      } else {
        // Plain painted wall
        const wm=new THREE.Mesh(new THREE.PlaneGeometry(wd.pw,H),plainWallMat);
        wm.rotation.y=wd.rotY;wm.position.set(wd.px,H/2,wd.pz);wm.receiveShadow=true;g.add(wm);
      }
    });
    // Trim (floor & ceiling edges)
    const tm=new THREE.MeshStandardMaterial({color:0xfafafa,roughness:0.9});
    [[W+0.02,0.04,0.04,0,0.02,-L/2+0.02],[W+0.02,0.04,0.04,0,0.02,L/2-0.02],[0.04,0.04,L,-W/2+0.02,0.02,0],[0.04,0.04,L,W/2-0.02,0.02,0],
     [W+0.02,0.04,0.04,0,H-0.02,-L/2+0.02],[W+0.02,0.04,0.04,0,H-0.02,L/2-0.02],[0.04,0.04,L,-W/2+0.02,H-0.02,0],[0.04,0.04,L,W/2-0.02,H-0.02,0]
    ].forEach(([gw,gh,gd,px,py,pz])=>{const m=new THREE.Mesh(new THREE.BoxGeometry(gw,gh,gd),tm);m.position.set(px,py,pz);g.add(m);});
  }

  if(cfg.roomType==='bathroom')bathroom(W,L,H,fg);
  else if(cfg.roomType==='kitchen')kitchen(W,L,H,fg);
  else if(cfg.roomType==='bedroom')bedroom(W,L,H,fg);
  else if(cfg.roomType==='balcony')balcony(W,L,H,fg);
  else if(cfg.roomType==='parking')parking(W,L,H,fg);
  g.add(fg);

  g.position.set(0,-H/2,0);
  pl.position.set(0,H*0.4,0);
  scene.add(g);
  return { roomGroup: g, fixturesGroup: fg };
}

// ── Shared: Indian-style door ─────────────────────────────────
function addDoor(W:number,H:number,L:number,g:THREE.Group,wallZ:number,offsetX=0){
  const doorW=Math.min(W*0.22,0.7), doorH=H*0.65;
  const brown=std(0x6b3a2a,0.65);
  const frame=std(0x5a2d1a,0.6);
  const handle=std(0xd4a84a,0.3,0.7);
  // Door panel
  mesh(new THREE.BoxGeometry(doorW,doorH,0.04),brown,offsetX,doorH/2,wallZ,g);
  // Frame
  mesh(new THREE.BoxGeometry(doorW+0.06,0.04,0.06),frame,offsetX,doorH,wallZ,g);
  mesh(new THREE.BoxGeometry(0.03,doorH,0.06),frame,offsetX-doorW/2-0.015,doorH/2,wallZ,g);
  mesh(new THREE.BoxGeometry(0.03,doorH,0.06),frame,offsetX+doorW/2+0.015,doorH/2,wallZ,g);
  // Handle
  mesh(new THREE.BoxGeometry(0.02,0.06,0.04),handle,offsetX+doorW/4,doorH*0.48,wallZ+0.03,g);
}

// ── Shared: Realistic Indian window ──────────────────────────
function addWindow(cx:number,cy:number,wallPos:number,ww:number,wh:number,g:THREE.Group,axis:'x'|'z'){
  const frameMat=std(0x5c3d1e,0.65);
  const glassMat=new THREE.MeshStandardMaterial({color:0x88bbdd,transparent:true,opacity:0.45,roughness:0.08});
  const grilleMat=std(0x3a3a3a,0.4,0.6);
  const shutterMat=std(0x4a7a5a,0.7); // green shutters — common in India

  if(axis==='z'){
    // Window on X-facing wall (east/west)
    // Outer frame
    mesh(new THREE.BoxGeometry(0.06,wh+0.08,ww+0.08),frameMat,wallPos,cy,cx,g);
    // Glass pane
    mesh(new THREE.BoxGeometry(0.02,wh,ww),glassMat,wallPos+(wallPos>0?-0.01:0.01),cy,cx,g);
    // Window sill
    mesh(new THREE.BoxGeometry(0.08,0.03,ww+0.1),std(0xd8d0c4,0.8),wallPos,cy-wh/2-0.015,cx,g);
    // Horizontal grille bars
    for(let b=1;b<4;b++) mesh(new THREE.BoxGeometry(0.025,0.012,ww-0.02),grilleMat,wallPos,cy-wh/2+b*wh/4,cx,g);
    // Vertical grille bars
    for(let b=1;b<3;b++) mesh(new THREE.BoxGeometry(0.025,wh-0.02,0.012),grilleMat,wallPos,cy,cx-ww/2+b*ww/3,g);
    // Shutters (one on each side, slightly angled)
    [-1,1].forEach(s=>{
      const shutter=new THREE.Mesh(new THREE.BoxGeometry(0.02,wh-0.04,ww/2-0.06),shutterMat);
      shutter.position.set(wallPos+(wallPos>0?-0.03:0.03),cy,cx+s*(ww/4));
      g.add(shutter);
    });
  } else {
    // Window on Z-facing wall (north/south)
    mesh(new THREE.BoxGeometry(ww+0.08,wh+0.08,0.06),frameMat,cx,cy,wallPos,g);
    mesh(new THREE.BoxGeometry(ww,wh,0.02),glassMat,cx,cy,wallPos+(wallPos>0?-0.01:0.01),g);
    mesh(new THREE.BoxGeometry(ww+0.1,0.03,0.08),std(0xd8d0c4,0.8),cx,cy-wh/2-0.015,wallPos,g);
    for(let b=1;b<4;b++) mesh(new THREE.BoxGeometry(ww-0.02,0.012,0.025),grilleMat,cx,cy-wh/2+b*wh/4,wallPos,g);
    for(let b=1;b<3;b++) mesh(new THREE.BoxGeometry(0.012,wh-0.02,0.025),grilleMat,cx-ww/2+b*ww/3,cy,wallPos,g);
    [-1,1].forEach(s=>{
      const shutter=new THREE.Mesh(new THREE.BoxGeometry(ww/2-0.06,wh-0.04,0.02),shutterMat);
      shutter.position.set(cx+s*(ww/4),cy,wallPos+(wallPos>0?-0.03:0.03));
      g.add(shutter);
    });
  }
}

function bathroom(W:number,L:number,H:number,g:THREE.Group){
  const por=std(0xf5f5f5,0.15,0.05),chr=std(0xd0d0d0,0.1,0.9),
    gls=new THREE.MeshStandardMaterial({color:0xaaddff,transparent:true,opacity:0.25,roughness:0.05}),drk=std(0x2a2a2a,0.6),
    mir=new THREE.MeshStandardMaterial({color:0xd0e8f0,roughness:0.05,metalness:0.8,transparent:true,opacity:0.7});
  // Toilet
  mesh(new THREE.BoxGeometry(0.5,0.42,0.65),por,W/2-0.3,0.21,-L/2+0.4,g,true);
  mesh(new THREE.BoxGeometry(0.45,0.38,0.16),por,W/2-0.3,0.61,-L/2+0.11,g);
  mesh(new THREE.CylinderGeometry(0.19,0.16,0.08,16),por,W/2-0.3,0.46,-L/2+0.45,g);
  // Wash basin
  mesh(new THREE.CylinderGeometry(0.22,0.18,0.12,20),por,-W/2+0.35,0.75,-L/2+0.24,g,true);
  mesh(new THREE.CylinderGeometry(0.025,0.025,0.12,10),chr,-W/2+0.35,0.88,-L/2+0.22,g);
  // Mirror
  mesh(new THREE.BoxGeometry(0.55,0.65,0.03),mir,-W/2+0.35,1.2,-L/2+0.015,g);
  // Shower area
  mesh(new THREE.BoxGeometry(0.02,H*0.55,0.7),gls,-W/2+0.72,H*0.28,L/2-0.4,g);
  mesh(new THREE.BoxGeometry(0.7,H*0.55,0.02),gls,-W/2+0.4,H*0.28,L/2-0.72,g);
  mesh(new THREE.BoxGeometry(0.75,0.04,0.75),drk,-W/2+0.42,0.02,L/2-0.42,g);
  mesh(new THREE.CylinderGeometry(0.015,0.015,H*0.5,8),chr,-W/2+0.08,H*0.25,L/2-0.08,g);
  const sh=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.06,0.04,14),chr);sh.position.set(-W/2+0.08,H*0.5,L/2-0.08);sh.rotation.x=0.35;g.add(sh);
  // ── Door on south wall ──
  addDoor(W,H,L,g,L/2-0.02,W*0.2);
  // ── Small window (ventilation) on east wall ──
  addWindow(0,H*0.7,W/2-0.02,L*0.2,H*0.18,g,'z');
}

function kitchen(W:number,L:number,H:number,g:THREE.Group){
  const cab=std(0xf4f0e8,0.7),ctr=std(0x5a4a3a,0.4,0.1),stl=std(0xcccccc,0.3,0.7),
    frg=std(0xe8e8e8,0.4,0.2),drk=std(0x333333,0.8),chr=std(0xdddddd,0.1,0.9);
  const cabH=0.88,cabD=0.6,ctH=0.05,bcW=W-0.1;
  // Base cabinets
  mesh(new THREE.BoxGeometry(bcW,cabH,cabD),cab,0,cabH/2,-L/2+cabD/2,g,true);
  // Countertop
  mesh(new THREE.BoxGeometry(bcW,ctH,cabD+0.04),ctr,0,cabH+ctH/2,-L/2+cabD/2,g);
  // Sink area
  mesh(new THREE.BoxGeometry(0.55,ctH+0.08,0.42),stl,-W*0.1,cabH,-L/2+cabD/2,g);
  mesh(new THREE.BoxGeometry(0.42,0.10,0.30),drk,-W*0.1,cabH+0.01,-L/2+cabD/2,g);
  // Faucet
  mesh(new THREE.CylinderGeometry(0.02,0.02,0.14,10),chr,-W*0.1,cabH+ctH+0.07,-L/2+cabD/2-0.1,g);
  // Stove area (moved burners up onto countertop properly)
  mesh(new THREE.BoxGeometry(0.65,0.06,0.56),stl,W*0.25,cabH+ctH/2,-L/2+cabD/2,g);
  // Burners on stove (moved up onto countertop — fixed position)
  [[-0.12,-0.08],[-0.12,0.12],[0.12,-0.08],[0.12,0.12]].forEach(([bx,bz])=>mesh(new THREE.CylinderGeometry(0.06,0.06,0.03,12),drk,W*0.25+bx,cabH+ctH+0.015,-L/2+cabD/2+bz,g));
  // Fridge
  const fH=H*0.85;
  mesh(new THREE.BoxGeometry(0.72,fH,0.7),frg,-W/2+0.38,fH/2,-L/2+0.37,g,true);
  mesh(new THREE.BoxGeometry(0.05,0.25,0.04),chr,-W/2+0.73,fH*0.7,-L/2+0.37,g);
  // ── Indian window on east wall ──
  addWindow(0,H*0.55,W/2-0.02,L*0.3,H*0.3,g,'z');
  // ── Door on south wall ──
  addDoor(W,H,L,g,L/2-0.02,-W*0.15);
}

function bedroom(W:number,L:number,H:number,g:THREE.Group){
  const wd=std(0x5c3d1e,0.7),wl=std(0xa0784a,0.7),wht=std(0xfafafa,0.9),ow=std(0xf0e8e0,0.9),
    bl=std(0x3a5a8a,0.85),pl=std(0xffffff,0.9),lb=std(0xd4b483,0.6),
    ls=new THREE.MeshStandardMaterial({color:0xf5e6c8,transparent:true,opacity:0.85,roughness:0.8});
  const bW=Math.min(W*0.55,1.85),bL=Math.min(L*0.55,2.2);
  // Bed
  mesh(new THREE.BoxGeometry(bW,0.28,bL),wd,0,0.14,-L/2+bL/2+0.06,g,true);
  mesh(new THREE.BoxGeometry(bW-0.08,0.22,bL-0.06),ow,0,0.39,-L/2+bL/2+0.06,g);
  mesh(new THREE.BoxGeometry(bW-0.1,0.1,bL*0.65),bl,0,0.56,-L/2+bL/2+0.06+bL*0.15,g);
  // Pillows
  mesh(new THREE.BoxGeometry(bW/2-0.08,0.1,0.42),pl,-bW/4,0.56,-L/2+0.28,g);
  mesh(new THREE.BoxGeometry(bW/2-0.08,0.1,0.42),pl,bW/4,0.56,-L/2+0.28,g);
  // Headboard
  mesh(new THREE.BoxGeometry(bW+0.08,0.85,0.1),wd,0,0.6,-L/2+0.05,g,true);
  // Nightstands + lamps
  [-1,1].forEach(s=>{
    mesh(new THREE.BoxGeometry(0.45,0.52,0.42),wl,s*(bW/2+0.27),0.26,-L/2+0.26,g,true);
    mesh(new THREE.CylinderGeometry(0.04,0.06,0.28,10),lb,s*(bW/2+0.27),0.66,-L/2+0.26,g);
    mesh(new THREE.CylinderGeometry(0.14,0.08,0.18,12),ls,s*(bW/2+0.27),0.88,-L/2+0.26,g);
  });
  // Wardrobe
  const wardH=H*0.88,wardW=Math.min(W*0.45,1.6);
  mesh(new THREE.BoxGeometry(0.62,wardH,wardW),wl,-W/2+0.31,wardH/2,-L/2+wardW/2+0.15,g,true);
  // ── Realistic Indian window on east wall ──
  addWindow(0,H*0.52,W/2-0.02,L*0.35,H*0.35,g,'z');
  // Ceiling fan mount + bulb
  mesh(new THREE.CylinderGeometry(0.2,0.15,0.1,16),wht,0,H-0.05,-L/6,g);
  const blb=new THREE.Mesh(new THREE.SphereGeometry(0.1,12,12),new THREE.MeshStandardMaterial({color:0xffffee,emissive:new THREE.Color(0xffff99),emissiveIntensity:0.8,roughness:0.2}));blb.position.set(0,H-0.18,-L/6);g.add(blb);
  // Rug
  mesh(new THREE.BoxGeometry(bW+0.6,0.015,bL+0.5),std(0x7a4a3a,0.95),0,0.008,-L/2+bL/2+0.2,g);
  // ── Door on south wall ──
  addDoor(W,H,L,g,L/2-0.02,W*0.2);
}

function balcony(W:number,L:number,H:number,g:THREE.Group){
  const rail=std(0x888888,0.3,0.6);
  // Railing
  mesh(new THREE.BoxGeometry(W,0.08,0.08),rail,0,0.9,L/2-0.1,g);
  for(let x=-W/2;x<=W/2;x+=0.5)mesh(new THREE.BoxGeometry(0.05,0.9,0.05),rail,x,0.45,L/2-0.1,g);
  // Flower pot
  mesh(new THREE.CylinderGeometry(0.12,0.09,0.22,12),std(0x8B4513,0.9),W/2-0.25,0.11,L/2-0.35,g);
  // Table + stand
  mesh(new THREE.CylinderGeometry(0.4,0.4,0.06,16),std(0xf4ede0,0.7),0,0.72,0,g);
  mesh(new THREE.CylinderGeometry(0.025,0.025,0.72,8),std(0x888888,0.3,0.7),0,0.36,0,g);
  // Hanging plant
  mesh(new THREE.SphereGeometry(0.1,8,6),std(0x2d6b3a,0.85),-W/4,H*0.7,L/4,g);
  mesh(new THREE.CylinderGeometry(0.01,0.01,H*0.3,6),std(0x888888,0.5),-W/4,H*0.85,L/4,g);
  // ── Sliding door to inside (on north wall) ──
  const doorW=W*0.45,doorH=H*0.75;
  const doorFrame=std(0x5c3d1e,0.65);
  const doorGlass=new THREE.MeshStandardMaterial({color:0x88bbcc,transparent:true,opacity:0.35,roughness:0.05});
  mesh(new THREE.BoxGeometry(doorW+0.08,doorH+0.04,0.06),doorFrame,0,doorH/2,-L/2+0.02,g);
  mesh(new THREE.BoxGeometry(doorW,doorH,0.03),doorGlass,0,doorH/2,-L/2+0.02,g);
  // Door division line
  mesh(new THREE.BoxGeometry(0.02,doorH,0.065),doorFrame,0,doorH/2,-L/2+0.02,g);
}

// ── Indian outdoor residential parking area ───────────────────
// The FLOOR is the hero — catalog tiles are applied here.
// House facade at back, compound wall on sides, gate at front.
function parking(W:number,L:number,H:number,g:THREE.Group){
  const white=std(0xffffff,0.9);
  const cream=std(0xf5e6c8,0.85);
  const brown=std(0x6b3a2a,0.7);
  const darkBrown=std(0x4a2a1a,0.6);
  const gray=std(0x888888,0.7);
  const darkGray=std(0x555555,0.8);
  const black=std(0x222222,0.9);
  const green=std(0x2d6b3a,0.85);
  const terracotta=std(0xc4632a,0.8);
  const iron=std(0x3a3a3a,0.4,0.6);

  // ═══════════════════════════════════════════════════════════
  // HOUSE FACADE (at the back, -Z side)
  // ═══════════════════════════════════════════════════════════
  const houseH=H*1.1; // house is taller than the parking height param
  const houseD=0.12; // thin facade depth

  // Main house wall (cream/off-white painted wall)
  const houseWallMat=new THREE.MeshStandardMaterial({color:0xf0e4d0,roughness:0.85});
  mesh(new THREE.BoxGeometry(W+0.4,houseH,houseD),houseWallMat,0,houseH/2,-L/2-houseD/2,g,true);

  // House base strip (darker band at bottom)
  const baseMat=std(0x8a7a6a,0.9);
  mesh(new THREE.BoxGeometry(W+0.42,houseH*0.08,houseD+0.02),baseMat,0,houseH*0.04,-L/2-houseD/2,g);

  // Roof overhang / sunshade (concrete slab extending forward)
  const roofMat=std(0x888888,0.8);
  mesh(new THREE.BoxGeometry(W+0.6,0.08,L*0.18),roofMat,0,houseH,-L/2-houseD/2+L*0.07,g);
  // Roof edge finishing
  mesh(new THREE.BoxGeometry(W+0.62,0.04,0.06),std(0x777777,0.7),0,houseH+0.04,-L/2+L*0.09-0.03,g);

  // ── Main door (wooden, center) ──
  const doorW=W*0.18, doorH=houseH*0.6;
  mesh(new THREE.BoxGeometry(doorW,doorH,0.05),brown,0,doorH/2,-L/2+0.01,g);
  // Door frame
  mesh(new THREE.BoxGeometry(doorW+0.06,0.04,0.06),brown,0,doorH,-L/2+0.01,g); // top
  mesh(new THREE.BoxGeometry(0.03,doorH,0.06),brown,-doorW/2-0.015,doorH/2,-L/2+0.01,g); // left
  mesh(new THREE.BoxGeometry(0.03,doorH,0.06),brown,doorW/2+0.015,doorH/2,-L/2+0.01,g); // right
  // Door handle
  mesh(new THREE.BoxGeometry(0.02,0.06,0.03),std(0xd4a84a,0.3,0.7),doorW/4,doorH*0.48,-L/2+0.04,g);

  // ── Windows (one on each side of door) ──
  const winW=W*0.14, winH=houseH*0.28;
  const winY=houseH*0.52;
  const winMat=new THREE.MeshStandardMaterial({color:0x88bbdd,transparent:true,opacity:0.5,roughness:0.1});
  [-1,1].forEach(side=>{
    const wx=side*(W*0.28);
    // Window frame
    mesh(new THREE.BoxGeometry(winW+0.04,winH+0.04,0.04),white,wx,winY,-L/2+0.01,g);
    // Glass
    mesh(new THREE.BoxGeometry(winW,winH,0.02),winMat,wx,winY,-L/2+0.03,g);
    // Window grille (horizontal bars)
    for(let b=0;b<3;b++){
      mesh(new THREE.BoxGeometry(winW-0.02,0.012,0.03),iron,wx,winY-winH/3+b*winH/3,-L/2+0.04,g);
    }
    // Window sill
    mesh(new THREE.BoxGeometry(winW+0.06,0.03,0.06),white,wx,winY-winH/2-0.015,-L/2+0.02,g);
  });

  // ── Nameplate on wall ──
  mesh(new THREE.BoxGeometry(W*0.18,0.08,0.02),std(0x1a3355,0.5),0,houseH*0.78,-L/2+0.01,g);

  // ── Wall-mounted lamp above door ──
  const lampMat=new THREE.MeshStandardMaterial({color:0xffffdd,emissive:new THREE.Color(0xffff88),emissiveIntensity:0.5,roughness:0.3});
  mesh(new THREE.BoxGeometry(0.06,0.08,0.06),std(0x444444,0.5),0,doorH+0.1,-L/2+0.04,g);
  mesh(new THREE.SphereGeometry(0.04,8,8),lampMat,0,doorH+0.06,-L/2+0.06,g);

  // ═══════════════════════════════════════════════════════════
  // COMPOUND WALL (sides — low wall ~3ft height)
  // ═══════════════════════════════════════════════════════════
  const wallH=H*0.28; // compound wall height (~3ft feel)
  const wallThick=0.08;
  const wallMat=std(0xd8ccb8,0.85); // plastered compound wall color

  // Left compound wall
  mesh(new THREE.BoxGeometry(wallThick,wallH,L),wallMat,-W/2,wallH/2,0,g);
  // Right compound wall
  mesh(new THREE.BoxGeometry(wallThick,wallH,L),wallMat,W/2,wallH/2,0,g);

  // Wall cap (flat stone on top)
  const capMat=std(0xaaa090,0.7);
  mesh(new THREE.BoxGeometry(wallThick+0.04,0.03,L+0.04),capMat,-W/2,wallH,0,g);
  mesh(new THREE.BoxGeometry(wallThick+0.04,0.03,L+0.04),capMat,W/2,wallH,0,g);

  // ═══════════════════════════════════════════════════════════
  // GATE (front — +Z side)
  // ═══════════════════════════════════════════════════════════
  const gateW=W*0.45; // gate opening width
  const pillarH=wallH*2.2;
  const pillarW=0.14;

  // Gate pillars (brick/concrete)
  const pillarMat=std(0xc8b8a0,0.8);
  [-1,1].forEach(side=>{
    const px=side*gateW/2;
    mesh(new THREE.BoxGeometry(pillarW,pillarH,pillarW),pillarMat,px,pillarH/2,L/2,g,true);
    // Pillar top cap (decorative)
    mesh(new THREE.BoxGeometry(pillarW+0.04,0.04,pillarW+0.04),std(0xaa9880,0.7),px,pillarH,L/2,g);
    // Small pyramid on top
    mesh(new THREE.ConeGeometry(0.06,0.08,4),std(0xaa9880,0.7),px,pillarH+0.06,L/2,g);
  });

  // Front wall segments (from compound wall to gate pillars)
  const leftSegW=(W/2-gateW/2-pillarW/2);
  if(leftSegW>0.05){
    mesh(new THREE.BoxGeometry(leftSegW,wallH,wallThick),wallMat,-(gateW/2+pillarW/2+leftSegW/2),wallH/2,L/2,g);
    mesh(new THREE.BoxGeometry(leftSegW+0.04,0.03,wallThick+0.04),capMat,-(gateW/2+pillarW/2+leftSegW/2),wallH,L/2,g);
    mesh(new THREE.BoxGeometry(leftSegW,wallH,wallThick),wallMat,(gateW/2+pillarW/2+leftSegW/2),wallH/2,L/2,g);
    mesh(new THREE.BoxGeometry(leftSegW+0.04,0.03,wallThick+0.04),capMat,(gateW/2+pillarW/2+leftSegW/2),wallH,L/2,g);
  }

  // Iron gate (vertical bars — one side open, one closed)
  const gateH=wallH*1.6;
  const barSpacing=0.06;
  const numBars=Math.max(3,Math.floor(gateW/(2*barSpacing)));
  // Left gate leaf (closed)
  const gateLeft=new THREE.Group();
  const topRail=new THREE.Mesh(new THREE.BoxGeometry(gateW/2-0.04,0.025,0.025),iron);
  topRail.position.set(gateW/4,gateH,0);gateLeft.add(topRail);
  const botRail=new THREE.Mesh(new THREE.BoxGeometry(gateW/2-0.04,0.025,0.025),iron);
  botRail.position.set(gateW/4,0.06,0);gateLeft.add(botRail);
  const midRail=new THREE.Mesh(new THREE.BoxGeometry(gateW/2-0.04,0.025,0.025),iron);
  midRail.position.set(gateW/4,gateH*0.5,0);gateLeft.add(midRail);
  for(let b=0;b<numBars;b++){
    const bx=0.04+b*(gateW/2-0.04)/numBars;
    const bar=new THREE.Mesh(new THREE.BoxGeometry(0.015,gateH,0.015),iron);
    bar.position.set(bx,gateH/2,0);gateLeft.add(bar);
  }
  gateLeft.position.set(-gateW/2,0,L/2);
  g.add(gateLeft);

  // Right gate leaf (slightly open — rotated)
  const gateRight=gateLeft.clone();
  gateRight.position.set(gateW/2-0.02,0,L/2);
  gateRight.scale.x=-1; // mirror
  gateRight.rotation.y=0.4; // slightly open
  g.add(gateRight);

  // ═══════════════════════════════════════════════════════════
  // PARKED VEHICLES
  // ═══════════════════════════════════════════════════════════

  // ── Car (parked on left side) ──
  const carX=-W*0.22;
  const carZ=-L*0.08;
  const carW=Math.min(W*0.28,0.8);
  const carL=Math.min(L*0.45,1.4);

  // Car body (lower)
  const carBody=std(0xeeeeee,0.4,0.15); // silver/white car
  mesh(new THREE.BoxGeometry(carW,0.2,carL),carBody,carX,0.14,carZ,g,true);
  // Car cabin (upper)
  mesh(new THREE.BoxGeometry(carW*0.85,0.16,carL*0.5),carBody,carX,0.32,carZ-carL*0.05,g);
  // Windshield (front)
  const carWin=new THREE.MeshStandardMaterial({color:0x6699bb,transparent:true,opacity:0.55,roughness:0.08});
  mesh(new THREE.BoxGeometry(carW*0.78,0.13,0.015),carWin,carX,0.3,carZ+carL*0.2,g);
  // Rear window
  mesh(new THREE.BoxGeometry(carW*0.72,0.1,0.015),carWin,carX,0.3,carZ-carL*0.3,g);
  // Side windows
  [-1,1].forEach(s=>mesh(new THREE.BoxGeometry(0.015,0.1,carL*0.35),carWin,carX+s*carW*0.42,0.3,carZ-carL*0.05,g));
  // Wheels
  [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([sx,sz])=>{
    const whl=new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.055,0.03,12),black);
    whl.rotation.z=Math.PI/2;
    whl.position.set(carX+sx*carW*0.38,0.055,carZ+sz*carL*0.32);
    g.add(whl);
    // Hub cap
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.032,8),gray);
    hub.rotation.z=Math.PI/2;
    hub.position.set(carX+sx*(carW*0.38+0.001),0.055,carZ+sz*carL*0.32);
    g.add(hub);
  });
  // Headlights
  const hlMat=new THREE.MeshStandardMaterial({color:0xffffdd,emissive:new THREE.Color(0xffff88),emissiveIntensity:0.2,roughness:0.2});
  [-1,1].forEach(s=>mesh(new THREE.BoxGeometry(0.05,0.035,0.015),hlMat,carX+s*carW*0.32,0.16,carZ+carL/2+0.008,g));
  // Tail lights
  const tailMat=std(0xcc2222,0.5);
  [-1,1].forEach(s=>mesh(new THREE.BoxGeometry(0.05,0.035,0.015),tailMat,carX+s*carW*0.32,0.16,carZ-carL/2-0.008,g));
  // Number plate (rear)
  mesh(new THREE.BoxGeometry(carW*0.35,0.05,0.012),white,carX,0.1,carZ-carL/2-0.008,g);

  // ── Scooter/Two-wheeler (parked on right side) ──
  const scoX=W*0.25;
  const scoZ=-L*0.15;
  const scoBody=std(0x1a4488,0.5); // blue scooter
  // Body
  mesh(new THREE.BoxGeometry(0.14,0.14,0.55),scoBody,scoX,0.12,scoZ,g,true);
  // Seat
  mesh(new THREE.BoxGeometry(0.12,0.04,0.3),black,scoX,0.2,scoZ-0.02,g);
  // Handle bar
  mesh(new THREE.BoxGeometry(0.22,0.025,0.025),std(0xcccccc,0.3,0.7),scoX,0.26,scoZ+0.22,g);
  // Mirrors
  [-1,1].forEach(s=>mesh(new THREE.BoxGeometry(0.04,0.015,0.025),std(0x444444,0.3,0.5),scoX+s*0.13,0.28,scoZ+0.2,g));
  // Front & rear wheels
  [1,-1].forEach(s=>{
    const wh=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.028,12),black);
    wh.rotation.z=Math.PI/2;wh.position.set(scoX,0.05,scoZ+s*0.26);g.add(wh);
  });
  // Headlight
  mesh(new THREE.SphereGeometry(0.025,8,8),hlMat,scoX,0.2,scoZ+0.28,g);

  // ═══════════════════════════════════════════════════════════
  // GARDEN & OUTDOOR ELEMENTS
  // ═══════════════════════════════════════════════════════════

  // ── Potted plants along compound wall ──
  const potMat=terracotta;
  const leafMat=green;
  [[-W/2+0.18,-L*0.3],[-W/2+0.18,L*0.1],[W/2-0.18,-L*0.25]].forEach(([px,pz])=>{
    // Pot
    mesh(new THREE.CylinderGeometry(0.06,0.05,0.1,10),potMat,px,0.05,pz,g);
    // Soil
    mesh(new THREE.CylinderGeometry(0.055,0.055,0.02,10),std(0x4a3520,0.95),px,0.11,pz,g);
    // Plant (sphere of leaves)
    mesh(new THREE.SphereGeometry(0.08,8,6),leafMat,px,0.22,pz,g);
  });

  // ── Tulsi pot (sacred basil — Indian tradition) near door ──
  mesh(new THREE.BoxGeometry(0.12,0.2,0.12),terracotta,W*0.15,0.1,-L/2+0.15,g);
  mesh(new THREE.CylinderGeometry(0.04,0.04,0.02,8),std(0x4a3520,0.95),W*0.15,0.21,-L/2+0.15,g);
  mesh(new THREE.SphereGeometry(0.06,8,6),std(0x1a7a2a,0.9),W*0.15,0.3,-L/2+0.15,g);
  mesh(new THREE.SphereGeometry(0.04,6,6),std(0x228833,0.9),W*0.15,0.36,-L/2+0.15,g);

  // ── Shoe rack near door ──
  mesh(new THREE.BoxGeometry(0.25,0.12,0.12),darkBrown,-W*0.18,0.06,-L/2+0.12,g);
  // Shoes on rack
  mesh(new THREE.BoxGeometry(0.06,0.03,0.08),std(0x2a2a2a,0.8),-W*0.18-0.06,0.13,-L/2+0.12,g);
  mesh(new THREE.BoxGeometry(0.06,0.03,0.08),std(0x663322,0.8),-W*0.18+0.06,0.13,-L/2+0.12,g);

  // ── Dustbin ──
  mesh(new THREE.CylinderGeometry(0.05,0.04,0.14,10),std(0x446644,0.7),W/2-0.15,0.07,L*0.3,g);
  mesh(new THREE.CylinderGeometry(0.055,0.055,0.015,10),std(0x446644,0.6),W/2-0.15,0.15,L*0.3,g);

  // ── Rangoli / doorstep pattern (small colored dots near entrance) ──
  const rangoliMat=std(0xff6633,0.7);
  const rangoliW=std(0xffffff,0.7);
  [0,-0.06,0.06].forEach(rx=>{
    [-0.06,0,0.06].forEach(rz=>{
      if(Math.abs(rx)+Math.abs(rz)<=0.06){
        mesh(new THREE.CylinderGeometry(0.012,0.012,0.004,6),(rx===0&&rz===0)?rangoliW:rangoliMat,rx,0.003,-L/2+0.06+rz,g);
      }
    });
  });

  // ── Driveway edge strip (subtle border on tiled area) ──
  mesh(new THREE.BoxGeometry(W+0.02,0.02,0.04),gray,0,0.01,-L/2+0.02,g);
  mesh(new THREE.BoxGeometry(0.04,0.02,L),gray,-W/2+0.02,0.01,0,g);
  mesh(new THREE.BoxGeometry(0.04,0.02,L),gray,W/2-0.02,0.01,0,g);
}
