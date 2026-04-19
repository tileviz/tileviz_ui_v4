// three/room-builder.ts — builds room + fixtures. Center FIX: g.position.y = -H/2
import * as THREE from 'three';
import { THREE_FT_SCALE, KITCHEN_COUNTER_FT } from '../config';
import { resolveRowMat, resolveRowMatB } from './materials';
import { RoomType, ZoneRow, Tile } from '../types';

export interface RoomBuildConfig {
  roomType:RoomType;widthFt:number;lengthFt:number;heightFt:number;
  tileWidthIn:number;tileHeightIn:number;selectedTile:Tile|null;zoneRows:ZoneRow[];
  wallColor?:string;
}

// Export alias for backwards compatibility
export type RoomConfig = RoomBuildConfig;

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
  const isParking=cfg.roomType==='parking';
  const rt=cfg.roomType;

  // Kitchen tiles start above the counter — matches cabH+ctH in kitchen() fixture function
  const kitchenCounterY = rt==='kitchen' ? (0.88+0.05) : 0; // scene units
  const tileableH = H - kitchenCounterY;
  const tilingFt = cfg.heightFt - (rt==='kitchen' ? KITCHEN_COUNTER_FT : 0);
  const numRows = Math.max(1, Math.round(tilingFt/(cfg.tileHeightIn/12)));
  const rowH = tileableH/numRows;

  // ── Floor — tiled from catalog (checker pattern for parking) ──
  const fr=cfg.zoneRows.find(r=>r.wallKey==='floor');
  if(fr?.patternType==='checker'){
    const numX=Math.max(1,Math.round(W/tw));
    const numZ=Math.max(1,Math.round(L/tw));
    const cellW=W/numX, cellL=L/numZ;
    // Create only 2 shared materials + 1 shared geometry — avoids 300+ draw calls on mobile
    const geo=new THREE.PlaneGeometry(cellW,cellL);
    const matBase=resolveRowMat(fr,cfg.selectedTile,1,1);
    const matAccent=resolveRowMatB(fr,cfg.selectedTile,1,1);
    for(let xi=0;xi<numX;xi++){
      for(let zi=0;zi<numZ;zi++){
        const tile=new THREE.Mesh(geo,(xi+zi)%2===1?matAccent:matBase);
        tile.rotation.x=-Math.PI/2;
        tile.position.set(-W/2+xi*cellW+cellW/2,0,-L/2+zi*cellL+cellL/2);
        tile.receiveShadow=true;
        g.add(tile);
      }
    }
  }else{
    const fm=resolveRowMat(fr,cfg.selectedTile,W/tw,L/tw);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(W,L),fm);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;g.add(floor);
  }

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
        // Below counter: plain painted wall (kitchen only)
        if(kitchenCounterY>0){
          const bm=new THREE.Mesh(new THREE.PlaneGeometry(wd.pw,kitchenCounterY),plainWallMat);
          bm.rotation.y=wd.rotY;bm.position.set(wd.px,kitchenCounterY/2,wd.pz);bm.receiveShadow=true;g.add(bm);
        }
        // Tiled rows above counter
        for(let r=0;r<numRows;r++){
          const tileY=kitchenCounterY+rowH*r+rowH/2;
          const zr=cfg.zoneRows.find(z=>z.wallKey===wd.key&&z.rowIndex===r)
                ??cfg.zoneRows.find(z=>z.wallKey==='walls'&&z.rowIndex===r);
          const pt=zr?.patternType;
          if(pt==='pattern1'||pt==='pattern2'){
            const rg=new THREE.Group();
            rg.rotation.y=wd.rotY;
            rg.position.set(wd.px,tileY,wd.pz);
            const numCols=Math.max(1,Math.round(wd.pw/tw));
            const colW=wd.pw/numCols;
            const accentEvery=pt==='pattern1'?3:2;
            // 2 shared materials + 1 shared geometry per row — avoids N new materials on mobile
            const colGeo=new THREE.PlaneGeometry(colW,rowH);
            const repY=Math.max(0.5,rowH/th);
            const matBase=resolveRowMat(zr,cfg.selectedTile,1,repY);
            const matAccent=resolveRowMatB(zr,cfg.selectedTile,1,repY);
            for(let col=0;col<numCols;col++){
              const isAccent=(col%accentEvery===(accentEvery-1));
              const cm=new THREE.Mesh(colGeo,isAccent?matAccent:matBase);
              cm.position.x=-wd.pw/2+col*colW+colW/2;
              cm.receiveShadow=true;
              rg.add(cm);
            }
            g.add(rg);
          }else{
            const m=resolveRowMat(zr,cfg.selectedTile,wd.rh,Math.max(0.5,rowH/th));
            const wm=new THREE.Mesh(new THREE.PlaneGeometry(wd.pw,rowH),m);
            wm.rotation.y=wd.rotY;wm.position.set(wd.px,tileY,wd.pz);wm.receiveShadow=true;g.add(wm);
          }
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
  else if(cfg.roomType==='parking')parking(W,L,H,fg,wallColorHex);
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
  const cabH=0.88,cabD=0.6,ctH=0.05;

  // ── North wall (back wall): main cooking counter ──────────
  const nW=W-0.1;
  // Base cabinets
  mesh(new THREE.BoxGeometry(nW,cabH,cabD),cab,0,cabH/2,-L/2+cabD/2,g,true);
  // Countertop
  mesh(new THREE.BoxGeometry(nW,ctH,cabD+0.04),ctr,0,cabH+ctH/2,-L/2+cabD/2,g);
  // Sink area (offset left of center)
  mesh(new THREE.BoxGeometry(0.55,ctH+0.08,0.42),stl,-W*0.1,cabH,-L/2+cabD/2,g);
  mesh(new THREE.BoxGeometry(0.42,0.10,0.30),drk,-W*0.1,cabH+0.01,-L/2+cabD/2,g);
  // Faucet
  mesh(new THREE.CylinderGeometry(0.02,0.02,0.14,10),chr,-W*0.1,cabH+ctH+0.07,-L/2+cabD/2-0.1,g);
  // Stove area (right side of north wall)
  mesh(new THREE.BoxGeometry(0.65,0.06,0.56),stl,W*0.25,cabH+ctH/2,-L/2+cabD/2,g);
  // Burners
  [[-0.12,-0.08],[-0.12,0.12],[0.12,-0.08],[0.12,0.12]].forEach(([bx,bz])=>mesh(new THREE.CylinderGeometry(0.06,0.06,0.03,12),drk,W*0.25+bx,cabH+ctH+0.015,-L/2+cabD/2+bz,g));

  // ── North wall: upper cabinets (wall-mounted) ─────────────
  const ucH=0.5,ucD=0.35,ucY=H*0.55+ucH/2;
  // Left upper cabinet (above sink)
  mesh(new THREE.BoxGeometry(nW*0.4,ucH,ucD),cab,-nW*0.2,ucY,-L/2+ucD/2,g,true);
  // Right upper cabinet (above stove area)
  mesh(new THREE.BoxGeometry(nW*0.35,ucH,ucD),cab,nW*0.25,ucY,-L/2+ucD/2,g,true);

  // ── West wall (left wall): L-shaped extension ─────────────
  // Leave space for the fridge in the corner (north-west)
  const wCabLen=L-cabD-0.8; // length along Z, leaving gap for fridge + some clearance
  const wCabZ=-L/2+cabD+0.4+wCabLen/2; // offset from north wall + fridge space
  // Base cabinets
  mesh(new THREE.BoxGeometry(cabD,cabH,wCabLen),cab,-W/2+cabD/2,cabH/2,wCabZ,g,true);
  // Countertop
  mesh(new THREE.BoxGeometry(cabD+0.04,ctH,wCabLen),ctr,-W/2+cabD/2,cabH+ctH/2,wCabZ,g);
  // Upper cabinets on west wall
  mesh(new THREE.BoxGeometry(ucD,ucH,wCabLen*0.7),cab,-W/2+ucD/2,ucY,wCabZ,g,true);

  // ── East wall (right wall): cabinets from north wall to just before window ──
  // Window is centered at Z=0, spans L*0.3 wide, so its north edge is at Z = -(L*0.15)
  // Cabinets run from north counter edge to window with a small gap
  const winNorthEdge = -(L * 0.15);
  const eCabStart = -L/2 + cabD + 0.35;         // start Z (after north counter overlap)
  const eCabEnd = winNorthEdge - 0.1;            // end Z (gap before window)
  const eCabLen = eCabEnd - eCabStart;
  if (eCabLen > 0.3) {
    const eCabZ = eCabStart + eCabLen / 2;
    // Base cabinets
    mesh(new THREE.BoxGeometry(cabD,cabH,eCabLen),cab,W/2-cabD/2,cabH/2,eCabZ,g,true);
    // Countertop
    mesh(new THREE.BoxGeometry(cabD+0.04,ctH,eCabLen),ctr,W/2-cabD/2,cabH+ctH/2,eCabZ,g);
    // Upper cabinets on east wall (shorter, only above the base cabinets)
    mesh(new THREE.BoxGeometry(ucD,ucH,eCabLen*0.8),cab,W/2-ucD/2,ucY,eCabZ,g,true);
  }

  // ── Fridge (north-west corner) ────────────────────────────
  const fH=H*0.85;
  mesh(new THREE.BoxGeometry(0.72,fH,0.7),frg,-W/2+0.38,fH/2,-L/2+0.37,g,true);
  mesh(new THREE.BoxGeometry(0.05,0.25,0.04),chr,-W/2+0.73,fH*0.7,-L/2+0.37,g);

  // ── Window on east wall (above the east counter) ──────────
  addWindow(0,H*0.55,W/2-0.02,L*0.3,H*0.3,g,'z');
  // ── Door on south wall (the only open side) ───────────────
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
// Realistic carport with shade structure, bay markings, SUV, gate.
function parking(W:number,L:number,H:number,g:THREE.Group,wallHex:number=0xf0e4d0){
  const white=std(0xfafafa,0.85);
  const plaster=new THREE.MeshStandardMaterial({color:wallHex,roughness:0.88});
  const concrete=std(0xc0b8a8,0.9);
  const brown=std(0x5c3318,0.7);
  const black=std(0x1a1a1a,0.95);
  const green=std(0x2a7a35,0.85);
  const terracotta=std(0xc4632a,0.8);
  const iron=std(0x2a2a2a,0.3,0.7);
  const steel=std(0x7a7a7a,0.2,0.8);

  // ═══════════════════════════════════════════════════════════
  // HOUSE FACADE (back wall, -Z side)
  // ═══════════════════════════════════════════════════════════
  const houseH=H*1.25;
  const houseD=0.14;
  const plinthH=houseH*0.1;

  // Plinth (lower concrete band) — separate non-overlapping piece
  mesh(new THREE.BoxGeometry(W+0.44,plinthH,houseD+0.04),concrete,0,plinthH/2,-L/2,g);
  // Main plastered wall above plinth — starts exactly at plinthH, no overlap
  const wallBodyH=houseH-plinthH;
  mesh(new THREE.BoxGeometry(W+0.4,wallBodyH,houseD),plaster,0,plinthH+wallBodyH/2,-L/2,g);
  // Parapet at top — sits on top edge, no overlap
  mesh(new THREE.BoxGeometry(W+0.5,0.18,0.22),concrete,0,houseH+0.09,-L/2,g);

  // ── Double door with frame ──
  const doorW=W*0.2, doorH=houseH*0.55;
  mesh(new THREE.BoxGeometry(doorW+0.12,doorH+0.08,0.05),brown,0,doorH/2+plinthH,-L/2+0.01,g);
  [-1,1].forEach(side=>{
    mesh(new THREE.BoxGeometry(doorW/2-0.03,doorH-0.04,0.04),std(0x8b5e3c,0.7),side*doorW/4,doorH/2+plinthH,-L/2+0.02,g);
    mesh(new THREE.BoxGeometry(doorW/2-0.08,doorH*0.33,0.02),std(0x7a4f2d,0.8),side*doorW/4,doorH*0.62+plinthH,-L/2+0.03,g);
    mesh(new THREE.BoxGeometry(doorW/2-0.08,doorH*0.33,0.02),std(0x7a4f2d,0.8),side*doorW/4,doorH*0.25+plinthH,-L/2+0.03,g);
  });
  const handleMat=std(0xd4a840,0.2,0.8);
  [-1,1].forEach(side=>mesh(new THREE.BoxGeometry(0.025,0.1,0.03),handleMat,side*0.045,doorH*0.48+plinthH,-L/2+0.04,g));

  // ── Windows with grilles ──
  const winW=W*0.15, winH=houseH*0.27;
  const winY=houseH*0.6;
  const glass=new THREE.MeshStandardMaterial({color:0x88aacc,transparent:true,opacity:0.45,roughness:0.08});
  [-1,1].forEach(side=>{
    const wx=side*W*0.3;
    mesh(new THREE.BoxGeometry(winW+0.06,winH+0.06,0.04),white,wx,winY,-L/2+0.01,g);
    mesh(new THREE.BoxGeometry(winW,winH,0.02),glass,wx,winY,-L/2+0.03,g);
    for(let b=0;b<3;b++) mesh(new THREE.BoxGeometry(0.012,winH-0.02,0.025),iron,wx-winW/2+winW/6+b*winW/3,winY,-L/2+0.04,g);
    [-0.28,0.28].forEach(f=>mesh(new THREE.BoxGeometry(winW-0.02,0.012,0.025),iron,wx,winY+winH*f,-L/2+0.04,g));
    mesh(new THREE.BoxGeometry(winW+0.1,0.04,0.08),concrete,wx,winY-winH/2-0.02,-L/2+0.02,g);
    mesh(new THREE.BoxGeometry(winW+0.1,0.04,0.06),concrete,wx,winY+winH/2+0.02,-L/2+0.02,g);
  });

  // Nameplate
  mesh(new THREE.BoxGeometry(W*0.16,0.07,0.02),std(0x1a3355,0.5),0,houseH*0.82,-L/2+0.01,g);

  // Wall-mounted lanterns (both sides of door)
  const lampGlow=new THREE.MeshStandardMaterial({color:0xffffdd,emissive:new THREE.Color(0xffee88),emissiveIntensity:0.9,roughness:0.2});
  [-1,1].forEach(side=>{
    const lx=side*W*0.13;
    mesh(new THREE.BoxGeometry(0.06,0.14,0.06),std(0x333333,0.4),lx,doorH+plinthH+0.12,-L/2+0.04,g);
    mesh(new THREE.SphereGeometry(0.038,8,8),lampGlow,lx,doorH+plinthH+0.06,-L/2+0.06,g);
  });

  // ═══════════════════════════════════════════════════════════
  // COMPOUND WALLS (sides — brick with plaster inner face)
  // ═══════════════════════════════════════════════════════════
  const wallH=H*0.3;
  const wallT=0.1;
  const capMat=concrete;
  const sideWallMat=new THREE.MeshStandardMaterial({color:wallHex,roughness:0.88});
  [-1,1].forEach(side=>{
    const wx=side*W/2;
    mesh(new THREE.BoxGeometry(wallT,wallH,L),sideWallMat,wx,wallH/2,0,g);
    mesh(new THREE.BoxGeometry(wallT+0.06,0.04,L+0.06),capMat,wx,wallH+0.02,0,g);
  });

  // ═══════════════════════════════════════════════════════════
  // CARPORT / SHADE CANOPY — shifted right, leaving left side open
  // ═══════════════════════════════════════════════════════════
  const cpH=H*0.78;
  const cpW=W*0.58;          // narrower — only covers right portion
  const cpL=L*0.6;
  const cpCX=W*0.18;         // centre shifted right of overall centre
  const cpZ=-L/2+cpL/2+0.06;
  const pillarSz=0.08;

  [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([sx,sz])=>{
    const px=cpCX+sx*cpW/2, pz=cpZ+sz*cpL/2;
    mesh(new THREE.BoxGeometry(pillarSz,cpH,pillarSz),steel,px,cpH/2,pz,g);
    mesh(new THREE.BoxGeometry(pillarSz+0.06,0.025,pillarSz+0.06),steel,px,0.012,pz,g);
  });
  [-1,1].forEach(sx=>mesh(new THREE.BoxGeometry(0.06,0.06,cpL+0.08),steel,cpCX+sx*cpW/2,cpH,cpZ,g));
  for(let i=0;i<3;i++) mesh(new THREE.BoxGeometry(cpW+0.08,0.05,0.05),steel,cpCX,cpH,cpZ-cpL/2+i*(cpL/2),g);

  const roofPanelMat=new THREE.MeshStandardMaterial({color:0x607080,roughness:0.35,metalness:0.65,transparent:true,opacity:0.85});
  for(let i=0;i<6;i++){
    const pz2=cpZ-cpL/2+(i+0.5)*(cpL/6);
    mesh(new THREE.BoxGeometry(cpW+0.1,0.016,cpL/6-0.008),roofPanelMat,cpCX,cpH+0.01,pz2,g);
  }
  mesh(new THREE.BoxGeometry(cpW+0.12,0.1,0.022),std(0x2a2a2a,0.5),cpCX,cpH-0.05,cpZ+cpL/2,g);

  // ═══════════════════════════════════════════════════════════
  // GATE (front, +Z side)
  // ═══════════════════════════════════════════════════════════
  const gateOpenW=W*0.55;
  const gPillarH=wallH*2.3;
  const gPillarSz=0.18;
  [-1,1].forEach(side=>{
    const px=side*gateOpenW/2;
    mesh(new THREE.BoxGeometry(gPillarSz,gPillarH,gPillarSz),concrete,px,gPillarH/2,L/2,g,true);
    mesh(new THREE.BoxGeometry(0.03,gPillarH-0.12,gPillarSz+0.01),std(0xb0a090,0.9),px,gPillarH/2,L/2,g);
    mesh(new THREE.BoxGeometry(gPillarSz+0.06,0.06,gPillarSz+0.06),concrete,px,gPillarH+0.03,L/2,g);
    mesh(new THREE.SphereGeometry(0.06,8,8),std(0xd4a840,0.2,0.5),px,gPillarH+0.12,L/2,g);
  });
  const segW=W/2-gateOpenW/2-gPillarSz/2;
  if(segW>0.05){
    [-1,1].forEach(side=>{
      const cx=side*(gateOpenW/2+gPillarSz/2+segW/2);
      mesh(new THREE.BoxGeometry(segW,wallH,wallT),sideWallMat,cx,wallH/2,L/2,g);
      mesh(new THREE.BoxGeometry(segW+0.04,0.04,wallT+0.06),capMat,cx,wallH+0.02,L/2,g);
    });
  }
  const gH=wallH*1.55;
  const slatMat=new THREE.MeshStandardMaterial({color:0x2a3a4a,roughness:0.28,metalness:0.75});
  const nSlats=9;
  for(let i=0;i<nSlats;i++) mesh(new THREE.BoxGeometry(gateOpenW/2-0.03,(gH/nSlats)*0.96,0.025),slatMat,-gateOpenW/4,0.05+i*(gH/nSlats),L/2,g);
  mesh(new THREE.BoxGeometry(0.04,gH+0.04,0.04),iron,-gateOpenW/2+0.02,gH/2,L/2,g);
  mesh(new THREE.BoxGeometry(0.04,gH+0.04,0.04),iron,-0.02,gH/2,L/2,g);
  for(let i=0;i<nSlats;i++) mesh(new THREE.BoxGeometry(gateOpenW/2-0.03,(gH/nSlats)*0.96,0.025),slatMat,gateOpenW*0.62,0.05+i*(gH/nSlats),L/2,g);
  mesh(new THREE.BoxGeometry(0.04,gH+0.04,0.04),iron,gateOpenW*0.62-(gateOpenW/4-0.02),gH/2,L/2,g);
  mesh(new THREE.BoxGeometry(0.04,gH+0.04,0.04),iron,gateOpenW*0.62+(gateOpenW/4-0.02),gH/2,L/2,g);

  // ═══════════════════════════════════════════════════════════
  // REALISTIC PLANTERS — 3 per side wall, based on reference pot designs
  // ═══════════════════════════════════════════════════════════
  const potDarkMat=std(0x1e1e1e,0.45,0.15);
  const potRimMat =std(0x2d2d2d,0.35,0.2);
  const potWhiteMat=std(0xf2efea,0.55);
  const soilDark=std(0x231208,0.95);
  const leafA=std(0x1c5c22,0.8);
  const leafB=std(0x2a7832,0.75);
  const metalDark=std(0x181818,0.3,0.8);

  // ── Style A: Tall tapered dark pot + dracaena spiky leaves ──
  function potStyleA(px:number,pz:number){
    const ph=0.55;
    const p=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.08,ph,14),potDarkMat);
    p.position.set(px,ph/2,pz); g.add(p);
    const r=new THREE.Mesh(new THREE.CylinderGeometry(0.145,0.132,0.028,14),potRimMat);
    r.position.set(px,ph+0.014,pz); g.add(r);
    const s=new THREE.Mesh(new THREE.CylinderGeometry(0.128,0.128,0.02,12),soilDark);
    s.position.set(px,ph+0.01,pz); g.add(s);
    // Spiky dracaena leaves — 10 thin panels at varying angles
    const lHeights=[0.38,0.44,0.36,0.42,0.4,0.35,0.43,0.38,0.41,0.36];
    for(let i=0;i<10;i++){
      const ang=(i/10)*Math.PI*2;
      const lh=lHeights[i];
      const lf=new THREE.Mesh(new THREE.BoxGeometry(0.022,lh,0.005),i%2===0?leafA:leafB);
      lf.position.set(px+Math.cos(ang)*0.038, ph+lh*0.52+0.02, pz+Math.sin(ang)*0.038);
      lf.rotation.y=ang; lf.rotation.z=0.3+(i%3)*0.06;
      g.add(lf);
    }
    // 4 central upright leaves
    for(let i=0;i<4;i++){
      const ang=(i/4)*Math.PI*2+0.4;
      const lf=new THREE.Mesh(new THREE.BoxGeometry(0.018,0.45,0.005),leafA);
      lf.position.set(px+Math.cos(ang)*0.012, ph+0.24, pz+Math.sin(ang)*0.012);
      lf.rotation.y=ang; lf.rotation.z=0.08;
      g.add(lf);
    }
  }

  // ── Style B: Tall white oval pot + broad tropical leaves ──
  function potStyleB(px:number,pz:number){
    const ph=0.62;
    const p=new THREE.Mesh(new THREE.CylinderGeometry(0.155,0.09,ph,14),potWhiteMat);
    p.position.set(px,ph/2,pz); g.add(p);
    const r=new THREE.Mesh(new THREE.CylinderGeometry(0.162,0.155,0.025,14),std(0xe4e0da,0.55));
    r.position.set(px,ph+0.012,pz); g.add(r);
    const s=new THREE.Mesh(new THREE.CylinderGeometry(0.148,0.148,0.02,12),soilDark);
    s.position.set(px,ph+0.01,pz); g.add(s);
    // Broad bird-of-paradise style leaves
    const angles=[0,1.15,-1.15,2.3,-2.3,3.14];
    const lws=[0.1,0.085,0.085,0.09,0.09,0.08];
    const lhs=[0.5,0.44,0.44,0.4,0.4,0.46];
    angles.forEach((ang,i)=>{
      const lf=new THREE.Mesh(new THREE.BoxGeometry(lws[i],lhs[i],0.005),i%2===0?leafA:leafB);
      lf.position.set(px+Math.cos(ang)*0.055, ph+lhs[i]*0.5, pz+Math.sin(ang)*0.055);
      lf.rotation.y=ang; lf.rotation.z=0.2+(i%3)*0.08;
      g.add(lf);
    });
  }

  // ── Style C: Elevated metal-stand planter + large monstera leaves ──
  function potStyleC(px:number,pz:number){
    const standH=0.42, ph=0.3;
    // Pot
    const p=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,ph,12),potDarkMat);
    p.position.set(px,standH+ph/2,pz); g.add(p);
    const r=new THREE.Mesh(new THREE.CylinderGeometry(0.128,0.12,0.024,12),potRimMat);
    r.position.set(px,standH+ph+0.012,pz); g.add(r);
    const s=new THREE.Mesh(new THREE.CylinderGeometry(0.115,0.115,0.018,10),soilDark);
    s.position.set(px,standH+ph+0.009,pz); g.add(s);
    // 4 angled metal legs
    [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([sx,sz])=>{
      const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.009,0.009,standH,6),metalDark);
      leg.position.set(px+sx*0.09, standH/2, pz+sz*0.09);
      g.add(leg);
    });
    // Ring brace at 40% height
    const brace=new THREE.Mesh(new THREE.TorusGeometry(0.09,0.007,6,16),metalDark);
    brace.rotation.x=Math.PI/2; brace.position.set(px,standH*0.42,pz); g.add(brace);
    // Large tropical leaves
    const lDefs=[[0,0.55,0.11],[1.2,0.5,0.1],[-1.2,0.5,0.1],[2.4,0.45,0.09],[-2.4,0.45,0.09]];
    lDefs.forEach(([ang,lh,lw],i)=>{
      const lf=new THREE.Mesh(new THREE.BoxGeometry(lw,lh,0.005),i%2===0?leafA:leafB);
      lf.position.set(px+Math.cos(ang)*0.04, standH+ph+lh*0.52, pz+Math.sin(ang)*0.04);
      lf.rotation.y=ang; lf.rotation.z=0.18+(i%3)*0.07;
      g.add(lf);
    });
  }

  // 3 pots per side wall — evenly spaced, tight against wall
  const potX=W/2-wallT/2-0.2;
  const potZPos=[-L*0.33, -L*0.02, L*0.24];
  potStyleA(-potX, potZPos[0]); potStyleC(-potX, potZPos[1]); potStyleB(-potX, potZPos[2]);
  potStyleB( potX, potZPos[0]); potStyleA( potX, potZPos[1]); potStyleC( potX, potZPos[2]);

  // ── Kerb border strips ──
  mesh(new THREE.BoxGeometry(W*0.9,0.025,0.06),concrete,0,0.012,L/2-0.03,g);
  [-1,1].forEach(s=>mesh(new THREE.BoxGeometry(0.055,0.025,L),concrete,s*(W/2-0.028),0.012,0,g));
}
