// gen-icons.js — pixel-perfect recreation of favicon.png for all icon slots
const { PNG } = require('../node_modules/pngjs/lib/png.js');
const fs   = require('fs');
const path = require('path');

const ASSETS = path.join(__dirname, '..', 'assets');
const SIZE   = 1024;

// ── helpers ──────────────────────────────────────────────────
function makePNG(w, h) {
  const png = new PNG({ width: w, height: h, filterType: -1 });
  png.data = Buffer.alloc(w * h * 4, 0);
  return png;
}

function setPixel(png, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const i = (y * png.width + x) * 4;
  png.data[i] = r; png.data[i+1] = g; png.data[i+2] = b; png.data[i+3] = a;
}

function fillRect(png, x0, y0, w, h, radius, r, g, b, a = 255) {
  const x1 = x0 + w, y1 = y0 + h;
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      const cx = Math.max(x0 + radius - px, px - (x1 - radius), 0);
      const cy = Math.max(y0 + radius - py, py - (y1 - radius), 0);
      if (cx * cx + cy * cy <= radius * radius) setPixel(png, px, py, r, g, b, a);
    }
  }
}

function savePNG(png, filePath) {
  return new Promise((res, rej) => {
    const buf = [];
    png.pack()
      .on('data', d => buf.push(d))
      .on('end',  () => { fs.writeFileSync(filePath, Buffer.concat(buf)); res(); })
      .on('error', rej);
  });
}

// ── Favicon-exact palette (flat, no gradient) ─────────────────
// Reading directly from favicon.png appearance:
//   corners/sides: bright violet  #8a60d4  → [138, 96, 212]
//   center+cols2:  dark indigo    #402a80  → [ 64, 42, 128]
//   mid-row sides: bright violet  #9870de  → [152,112, 222]
// Rule: col=1 (middle column) is always the dark shade
const TILE_FLAT = [
  [138,  96, 212],  // [0] top-left
  [ 64,  42, 128],  // [1] top-mid    ← dark
  [148, 104, 218],  // [2] top-right
  [152, 112, 222],  // [3] mid-left
  [ 52,  34, 106],  // [4] centre     ← darkest
  [152, 112, 222],  // [5] mid-right
  [138,  96, 212],  // [6] bot-left
  [ 64,  42, 128],  // [7] bot-mid    ← dark
  [148, 104, 218],  // [8] bot-right
];

// Background — matches favicon's dark outer area
const BG = [20, 14, 36];  // #140e24

/**
 * Draw the 3×3 tile grid into `png`.
 * @param {object} png
 * @param {number} cx   centre-x of grid
 * @param {number} cy   centre-y of grid
 * @param {number} gs   total grid size (px, square)
 * @param {number} gap  px gap between tiles (keep tiny → matches favicon)
 */
function drawGrid(png, cx, cy, gs, gap) {
  const COLS = 3, ROWS = 3;
  const ts   = Math.round((gs - gap * (COLS - 1)) / COLS);  // tile size
  const rad  = Math.round(ts * 0.20);                        // 20% radius → matches favicon
  const ox   = Math.round(cx - gs / 2);
  const oy   = Math.round(cy - gs / 2);

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const [r, g, b] = TILE_FLAT[row * COLS + col];
      const tx = ox + col * (ts + gap);
      const ty = oy + row * (ts + gap);
      fillRect(png, tx, ty, ts, ts, rad, r, g, b);
    }
  }
}

// ── 1. Main icon (used by iOS + web fallback) ─────────────────
// Full-bleed dark background + centred tile grid.
// iOS clips to a squircle (~10% off each edge), so keep the grid
// well inside: 52% of canvas gives clean padding on all sides.
async function genMainIcon() {
  const png = makePNG(SIZE, SIZE);

  // Solid dark background (iOS clips to squircle, no need for rounded rect here)
  fillRect(png, 0, 0, SIZE, SIZE, 0, BG[0], BG[1], BG[2]);

  // Grid: 52% of canvas, tiny gap (1.2% of grid)
  const gs  = Math.round(SIZE * 0.52);
  const gap = Math.max(6, Math.round(gs * 0.012));
  drawGrid(png, SIZE / 2, SIZE / 2, gs, gap);

  await savePNG(png, path.join(ASSETS, 'app-icon-1024.png'));
  console.log('✓  app-icon-1024.png');
}

// ── 2. Adaptive foreground (transparent bg, grid in safe zone) ─
// Android safe zone = inner 66% of 1024 = 676px.
// We use 46% so the grid sits comfortably inside with good padding.
async function genForeground() {
  const png = makePNG(SIZE, SIZE);   // starts transparent

  const gs  = Math.round(SIZE * 0.46);
  const gap = Math.max(6, Math.round(gs * 0.012));
  drawGrid(png, SIZE / 2, SIZE / 2, gs, gap);

  await savePNG(png, path.join(ASSETS, 'android-icon-foreground.png'));
  console.log('✓  android-icon-foreground.png');
}

// ── 3. Adaptive background ─────────────────────────────────────
async function genBackground() {
  const png = makePNG(SIZE, SIZE);
  fillRect(png, 0, 0, SIZE, SIZE, 0, BG[0], BG[1], BG[2]);
  await savePNG(png, path.join(ASSETS, 'android-icon-background.png'));
  console.log('✓  android-icon-background.png');
}

// ── 4. Monochrome (for Android themed icons) ──────────────────
async function genMonochrome() {
  const png = makePNG(SIZE, SIZE);
  const gs  = Math.round(SIZE * 0.46);
  const gap = Math.max(6, Math.round(gs * 0.012));
  const ts  = Math.round((gs - gap * 2) / 3);
  const rad = Math.round(ts * 0.20);
  const ox  = Math.round(SIZE / 2 - gs / 2);
  const oy  = Math.round(SIZE / 2 - gs / 2);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      fillRect(png, ox + col * (ts + gap), oy + row * (ts + gap), ts, ts, rad, 255, 255, 255);
    }
  }
  await savePNG(png, path.join(ASSETS, 'android-icon-monochrome.png'));
  console.log('✓  android-icon-monochrome.png');
}

(async () => {
  try {
    await genMainIcon();
    await genForeground();
    await genBackground();
    await genMonochrome();
    console.log('\nAll icons generated successfully.');
  } catch (e) { console.error(e); process.exit(1); }
})();
