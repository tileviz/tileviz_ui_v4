// ============================================================
//  utils/sharePdf.ts — Generate & share/download a design PDF
//  Produces a tile catalog-style quotation sheet with:
//    - TileViz header/branding
//    - Design details (room, dimensions, wall color)
//    - Table of tiles used (name, size, zone, image thumbnail)
//    - Timestamp
//  Works on Web (download) and Native (share sheet).
// ============================================================
import { Platform } from 'react-native';
import { ZoneRow, RoomType, Tile } from '../types';

interface DesignPdfData {
  roomType: RoomType;
  dimensions: { width: number; length: number; height: number };
  tileSize: string;           // e.g. "12x12"
  wallColor: string;
  zoneRows: ZoneRow[];
  selectedTile: Tile | null;
  tilesNeeded: number;
  totalSqFt: number;
  /** Base64 data URI of the 3D canvas screenshot */
  screenshotDataUri?: string;
}

function formatTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function roomLabel(rt: RoomType): string {
  return rt.charAt(0).toUpperCase() + rt.slice(1);
}

/** Collect unique tiles from zoneRows + selectedTile into a deduplicated list */
function collectTiles(data: DesignPdfData): Array<{
  name: string; size: string; zone: string; imageUri?: string; color: string; id: string;
}> {
  const seen = new Set<string>();
  const tiles: Array<{ name: string; size: string; zone: string; imageUri?: string; color: string; id: string }> = [];

  for (const row of data.zoneRows) {
    const key = row.tileId || row.tileName || '';
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const w = row.tileWidthIn ?? 12;
    const h = row.tileHeightIn ?? 12;
    tiles.push({
      name: row.tileName || 'Custom Tile',
      size: `${Math.round(w * 25.4)} x ${Math.round(h * 25.4)} mm`,
      zone: row.wallKey === 'floor' ? 'Floor' : row.wallKey === 'walls' ? 'Walls' : row.wallKey.replace('wall_', 'Wall ').toUpperCase(),
      imageUri: row.tileImageUri,
      color: row.color || '#cccccc',
      id: row.tileId || '-',
    });
  }

  if (data.selectedTile) {
    const key = data.selectedTile.id;
    if (!seen.has(key)) {
      tiles.push({
        name: data.selectedTile.name,
        size: `${Math.round(data.selectedTile.widthIn * 25.4)} x ${Math.round(data.selectedTile.heightIn * 25.4)} mm`,
        zone: 'Selected',
        imageUri: data.selectedTile.imageUri,
        color: data.selectedTile.color,
        id: data.selectedTile.id,
      });
    }
  }

  return tiles;
}

function buildHtml(data: DesignPdfData): string {
  const ts = formatTimestamp();
  const tiles = collectTiles(data);
  const room = roomLabel(data.roomType);
  const dims = `${data.dimensions.length} x ${data.dimensions.width} x ${data.dimensions.height} ft`;

  // Build product cards for the grid
  const productCards = tiles.map(t => {
    const thumb = t.imageUri
      ? `<img src="${t.imageUri}" class="product-img" />`
      : `<div class="product-img" style="background:${t.color}"></div>`;

    return `
      <div class="product-card">
        ${thumb}
        <div class="product-info">
          <div class="product-name">${t.name}</div>
          <div class="product-detail">${t.size}</div>
          <div class="product-detail">ID: ${t.id}</div>
          <div class="product-zone">${t.zone}</div>
        </div>
      </div>`;
  }).join('');

  const emptyState = tiles.length === 0
    ? '<div style="text-align:center;padding:60px 20px;color:#999;font-size:14px">No tiles assigned to this design yet</div>'
    : '';

  // Hero: screenshot image or gradient fallback
  const heroContent = data.screenshotDataUri
    ? `<!-- Hero with Screenshot -->
    <div class="hero hero-with-image">
      <img src="${data.screenshotDataUri}" class="hero-bg-img" />
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <div>
          <div class="hero-brand">
            <div class="hero-icon">TV</div>
            <div>
              <div class="hero-title">Tile<span>VIZ</span></div>
              <div class="hero-sub">Design Catalog</div>
            </div>
          </div>
        </div>
        <div class="hero-meta">
          <strong>${room} Design Report</strong><br/>
          ${dims}<br/>
          ${ts}
        </div>
      </div>
    </div>`
    : `<!-- Hero without Screenshot -->
    <div class="hero">
      <div class="hero-content">
        <div>
          <div class="hero-brand">
            <div class="hero-icon">TV</div>
            <div>
              <div class="hero-title">Tile<span>VIZ</span></div>
              <div class="hero-sub">Design Catalog</div>
            </div>
          </div>
        </div>
        <div class="hero-meta">
          <strong>${room} Design Report</strong><br/>
          ${dims}<br/>
          ${ts}
        </div>
      </div>
    </div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }

    body {
      font-family: 'Poppins', 'Helvetica Neue', Arial, sans-serif;
      color: #333;
      background: #fff;
      /* subtle marble veining background */
      background-image:
        linear-gradient(135deg, rgba(220,218,230,0.12) 25%, transparent 25%),
        linear-gradient(225deg, rgba(220,218,230,0.08) 25%, transparent 25%),
        linear-gradient(45deg,  rgba(200,200,210,0.06) 25%, transparent 25%);
    }

    /* ── Hero Banner ──────────────────────────── */
    .hero {
      width: 100%;
      height: 260px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: flex-end;
    }
    .hero::before {
      content: '';
      position: absolute; inset: 0;
      background:
        radial-gradient(ellipse at 20% 80%, rgba(124,111,247,0.25) 0%, transparent 60%),
        radial-gradient(ellipse at 80% 20%, rgba(59,130,246,0.2) 0%, transparent 60%);
    }
    .hero-with-image { height: 320px; }
    .hero-bg-img {
      position: absolute; inset: 0;
      width: 100%; height: 100%;
      object-fit: cover;
    }
    .hero-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(
        to bottom,
        rgba(26,26,46,0.15) 0%,
        rgba(26,26,46,0.4) 50%,
        rgba(26,26,46,0.85) 100%
      );
    }
    .hero-content {
      position: relative; z-index: 1;
      width: 100%; padding: 32px 40px;
      display: flex; justify-content: space-between; align-items: flex-end;
    }
    .hero-brand {
      display: flex; align-items: center; gap: 12px;
    }
    .hero-icon {
      width: 48px; height: 48px;
      background: linear-gradient(135deg, #7c6ff7, #3b82f6);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-weight: 700; font-size: 20px;
      box-shadow: 0 4px 20px rgba(124,111,247,0.4);
    }
    .hero-title {
      font-size: 28px; font-weight: 700; color: #fff;
      letter-spacing: -0.5px;
    }
    .hero-title span { color: #c8a96e; }
    .hero-sub {
      font-size: 11px; color: rgba(255,255,255,0.5);
      letter-spacing: 2px; text-transform: uppercase; margin-top: 2px;
    }
    .hero-meta {
      text-align: right; color: rgba(255,255,255,0.7); font-size: 12px;
      line-height: 1.6;
    }
    .hero-meta strong { color: #fff; font-weight: 600; }

    /* ── Content Area ─────────────────────────── */
    .content { padding: 32px 40px; max-width: 900px; margin: 0 auto; }

    /* ── Design Info Strip ─────────────────────── */
    .info-strip {
      display: flex; gap: 0; margin-bottom: 32px;
      background: #fff;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 2px 16px rgba(0,0,0,0.05);
    }
    .info-item {
      flex: 1; padding: 18px 20px;
      border-right: 1px solid #f0f0f5;
    }
    .info-item:last-child { border-right: none; }
    .info-lbl {
      font-size: 9px; text-transform: uppercase; letter-spacing: 1.2px;
      color: #999; font-weight: 500; margin-bottom: 4px;
    }
    .info-val {
      font-size: 15px; font-weight: 600; color: #1a1a2e;
      display: flex; align-items: center; gap: 6px;
    }
    .color-dot {
      width: 14px; height: 14px; border-radius: 4px;
      border: 1px solid rgba(0,0,0,0.1); display: inline-block;
    }

    /* ── Section Title ────────────────────────── */
    .section-head {
      display: flex; align-items: center; gap: 12px;
      margin-bottom: 20px;
    }
    .section-head::after {
      content: ''; flex: 1; height: 1px;
      background: linear-gradient(90deg, #e0e0e8, transparent);
    }
    .section-label {
      font-size: 13px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 1.5px; color: #888;
    }

    /* ── Product Grid ─────────────────────────── */
    .product-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-bottom: 32px;
    }
    .product-card {
      background: #fff;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 2px 20px rgba(0,0,0,0.04);
      display: flex;
      transition: box-shadow 0.2s;
    }
    .product-card:hover { box-shadow: 0 4px 28px rgba(0,0,0,0.08); }
    .product-img {
      width: 110px; min-height: 110px;
      object-fit: cover;
      flex-shrink: 0;
    }
    .product-info {
      padding: 16px 18px;
      display: flex; flex-direction: column; justify-content: center;
      gap: 3px;
    }
    .product-name {
      font-size: 15px; font-weight: 600;
      color: #c62828;
      line-height: 1.3;
    }
    .product-detail {
      font-size: 12px; color: #777;
      font-weight: 400;
    }
    .product-zone {
      font-size: 10px; text-transform: uppercase; letter-spacing: 1px;
      color: #aaa; font-weight: 500; margin-top: 4px;
    }

    /* ── Summary Bar ──────────────────────────── */
    .summary-bar {
      display: flex; justify-content: space-around; align-items: center;
      background: #fff;
      border-radius: 14px;
      padding: 20px;
      box-shadow: 0 2px 16px rgba(0,0,0,0.05);
      margin-bottom: 32px;
    }
    .summary-item { text-align: center; }
    .summary-val {
      font-size: 22px; font-weight: 700; color: #c62828;
    }
    .summary-lbl {
      font-size: 9px; text-transform: uppercase; letter-spacing: 1px;
      color: #999; font-weight: 500; margin-top: 2px;
    }
    .summary-divider {
      width: 1px; height: 36px; background: #f0f0f5;
    }

    /* ── Footer ───────────────────────────────── */
    .footer {
      display: flex; justify-content: space-between; align-items: center;
      padding: 16px 0; margin-top: 8px;
      border-top: 1px solid #eee;
    }
    .footer-text { font-size: 10px; color: #bbb; font-weight: 400; }
    .footer-text strong { color: #999; font-weight: 500; }

    /* ── Print overrides ──────────────────────── */
    @media print {
      body { background: #fff !important; }
      .hero { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .product-card { break-inside: avoid; }
    }
  </style>
</head>
<body>

  ${heroContent}

  <div class="content">

    <!-- Design Info Strip -->
    <div class="info-strip">
      <div class="info-item">
        <div class="info-lbl">Room</div>
        <div class="info-val">${room}</div>
      </div>
      <div class="info-item">
        <div class="info-lbl">Dimensions</div>
        <div class="info-val">${dims}</div>
      </div>
      <div class="info-item">
        <div class="info-lbl">Tile Size</div>
        <div class="info-val">${data.tileSize}</div>
      </div>
      <div class="info-item">
        <div class="info-lbl">Wall Color</div>
        <div class="info-val">
          <div class="color-dot" style="background:${data.wallColor}"></div>
          ${data.wallColor}
        </div>
      </div>
    </div>

    <!-- Product Showcase -->
    <div class="section-head">
      <span class="section-label">Products Used</span>
    </div>

    <div class="product-grid">
      ${productCards}
    </div>
    ${emptyState}

    <!-- Summary -->
    <div class="section-head">
      <span class="section-label">Summary</span>
    </div>

    <div class="summary-bar">
      <div class="summary-item">
        <div class="summary-val">${data.tilesNeeded.toLocaleString()}</div>
        <div class="summary-lbl">Total Tiles</div>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-item">
        <div class="summary-val">${data.totalSqFt}</div>
        <div class="summary-lbl">Sq Ft</div>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-item">
        <div class="summary-val">${tiles.length}</div>
        <div class="summary-lbl">Tile Types</div>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-item">
        <div class="summary-val">${data.zoneRows.length}</div>
        <div class="summary-lbl">Zones</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-text">Generated by <strong>TileVIZ</strong></div>
      <div class="footer-text">${ts}</div>
    </div>

  </div>

</body>
</html>`;
}

/** Generate PDF and trigger download (web) or share sheet (native) */
export async function shareDesignPdf(data: DesignPdfData): Promise<void> {
  const html = buildHtml(data);

  if (Platform.OS === 'web') {
    // Web: open print dialog (user can save as PDF or print)
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      // Small delay to let images load before print dialog
      setTimeout(() => printWindow.print(), 500);
    }
  } else {
    // Native: use expo-print to generate PDF, then expo-sharing to share
    const { printToFileAsync } = require('expo-print');
    const { shareAsync } = require('expo-sharing');

    const { uri } = await printToFileAsync({ html, base64: false });
    await shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share Design Report',
      UTI: 'com.adobe.pdf',
    });
  }
}
