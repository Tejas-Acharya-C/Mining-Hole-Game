import type { GameState, Camera } from '../types';
import { CHUNK_SIZE } from '../types';
import { TILE_SIZE, TILE_COLORS, TILE_ACCENT, SURFACE_TILE_ROW, WORLD_WIDTH_CHUNKS } from '../data/tiles';
import { lightRadius } from '../data/upgrades';
import { BIOME_DEFS } from '../data/biomes';
import { WorldManager } from '../systems/WorldManager';
import type { ParticleManager } from '../systems/ParticleManager';

// ── Offscreen canvas for lighting pass ────────────────────────────────────────

let lightCanvas: OffscreenCanvas | null = null;
let lightCtx: OffscreenCanvasRenderingContext2D | null = null;

function getLightCanvas(w: number, h: number): [OffscreenCanvas, OffscreenCanvasRenderingContext2D] {
  if (!lightCanvas || lightCanvas.width !== w || lightCanvas.height !== h) {
    lightCanvas = new OffscreenCanvas(w, h);
    lightCtx = lightCanvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
  }
  return [lightCanvas, lightCtx!];
}

// ── Camera ────────────────────────────────────────────────────────────────────

export function computeCamera(state: GameState, canvasW: number, canvasH: number): Camera {
  const { player } = state;
  const px = player.x * TILE_SIZE + TILE_SIZE / 2;
  const py = player.y * TILE_SIZE + TILE_SIZE / 2;
  const leadY = 80;

  let cx = px - canvasW / 2;
  let cy = py - canvasH / 2 + leadY;

  const maxX = WORLD_WIDTH_CHUNKS * CHUNK_SIZE * TILE_SIZE - canvasW;
  cx = Math.max(0, Math.min(cx, maxX));
  cy = Math.max(0, cy);

  // Screen shake
  const shake = state.settings.screenShake ? player.shakeAmount : 0;
  const shakeX = shake > 0 ? (Math.random() - 0.5) * shake * 2 : 0;
  const shakeY = shake > 0 ? (Math.random() - 0.5) * shake * 2 : 0;

  return { x: cx, y: cy, width: canvasW, height: canvasH, shakeX, shakeY };
}

// ── Main render ───────────────────────────────────────────────────────────────

export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: Camera,
  pm: ParticleManager,
  wm: WorldManager,
  fps?: number,
): void {
  const { width: cw, height: ch } = camera;
  ctx.clearRect(0, 0, cw, ch);

  // Apply shake transform
  if (camera.shakeX !== 0 || camera.shakeY !== 0) {
    ctx.save();
    ctx.translate(camera.shakeX, camera.shakeY);
  }

  // Sky gradient
  const surfacePxY = SURFACE_TILE_ROW * TILE_SIZE - camera.y;
  if (surfacePxY > 0) {
    const sky = ctx.createLinearGradient(0, 0, 0, surfacePxY);
    sky.addColorStop(0, '#0d1b2a');
    sky.addColorStop(1, '#1a3a5c');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, cw, surfacePxY);
  }

  // Underground background — biome-tinted
  const biomeDef = BIOME_DEFS[state.currentBiome];
  ctx.fillStyle = biomeDef.ambientColor;
  ctx.fillRect(0, Math.max(0, surfacePxY), cw, ch);

  // Depth fog vignette
  const depth = WorldManager.tileDepth(state.player.y);
  if (depth > 5) {
    const fogAlpha = Math.min(0.3, depth / 200);
    const fog = ctx.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, Math.max(cw, ch));
    fog.addColorStop(0, 'transparent');
    fog.addColorStop(1, `rgba(0,0,0,${fogAlpha})`);
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, cw, ch);
  }

  // Tiles
  drawTiles(ctx, state, camera, wm);

  // Lighting pass
  drawLighting(ctx, state, camera, wm);

  // Player
  drawPlayer(ctx, state, camera);

  // Particles
  drawParticles(ctx, camera, pm);

  // Float texts
  drawFloatTexts(ctx, state, camera);

  // Scanner overlay
  if (state.player.upgrades.scanner > 0) drawScannerOverlay(ctx, state, camera, wm);

  // FPS counter
  if (state.settings.showFPS && fps !== undefined) {
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '11px monospace';
    ctx.fillText(`${fps} fps | ${pm.activeCount} particles`, 8, 16);
  }

  if (camera.shakeX !== 0 || camera.shakeY !== 0) ctx.restore();
}

// ── Tile rendering ────────────────────────────────────────────────────────────

function drawTiles(ctx: CanvasRenderingContext2D, _state: GameState, cam: Camera, wm: WorldManager): void {
  const startCol = Math.max(0, Math.floor(cam.x / TILE_SIZE));
  const endCol   = Math.min(WORLD_WIDTH_CHUNKS * CHUNK_SIZE - 1, Math.ceil((cam.x + cam.width) / TILE_SIZE));
  const startRow = Math.max(0, Math.floor(cam.y / TILE_SIZE));
  const endRow   = Math.ceil((cam.y + cam.height) / TILE_SIZE);
  // Hoist time-based animation value out of the inner loop
  const now = Date.now();

  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const tile = wm.getTile(row, col);
      if (!tile || tile.kind === 'air' || !tile.revealed) continue;

      const sx = col * TILE_SIZE - cam.x;
      const sy = row * TILE_SIZE - cam.y;
      const color = TILE_COLORS[tile.kind] ?? '#888';

      // Variant slightly darken/lighten base tile for visual noise
      const variantOffset = (tile.variant ?? 0) * 8 - 12;
      ctx.fillStyle = adjustBrightness(color, variantOffset);
      ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);

      // Tile border
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(sx + 0.25, sy + 0.25, TILE_SIZE - 0.5, TILE_SIZE - 0.5);

      // Grass top strip
      if (tile.kind === 'grass') {
        ctx.fillStyle = '#2d6a2d';
        ctx.fillRect(sx, sy, TILE_SIZE, 5);
      }

      // Sell point
      if (tile.kind === 'sell_point') {
        drawSellPoint(ctx, sx, sy);
        continue;
      }

      // Chest
      if (tile.kind === 'chest') {
        drawChest(ctx, sx, sy);
        continue;
      }

      // Ore face
      const accent = TILE_ACCENT[tile.kind];
      if (accent) drawOreFace(ctx, sx, sy, accent, tile.kind);

      // Ancient brick pattern
      if (tile.kind === 'ancient_brick') {
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx + 3, sy + 3, TILE_SIZE - 6, TILE_SIZE - 6);
      }

      // Damage cracks
      if (tile.maxHp > 0 && tile.hp < tile.maxHp) {
        const frac = 1 - tile.hp / tile.maxHp;
        ctx.fillStyle = `rgba(0,0,0,${frac * 0.45})`;
        ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
        if (frac > 0.25) drawCracks(ctx, sx, sy, frac);
      }

      // Glow pulse for glowing ores
      if (tile.glowing || tile.kind === 'crystal' || tile.kind === 'void_stone') {
        const pulse = Math.sin(now / 600) * 0.08 + 0.06;
        ctx.fillStyle = `rgba(150,50,255,${pulse})`;
        ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
      }
    }
  }
}

function drawSellPoint(ctx: CanvasRenderingContext2D, sx: number, sy: number): void {
  ctx.fillStyle = '#16a34a';
  ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = '#bbf7d0';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', sx + TILE_SIZE / 2, sy + TILE_SIZE / 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // Animated pulse ring
  const pulse = (Date.now() % 1500) / 1500;
  ctx.strokeStyle = `rgba(34,197,94,${0.5 - pulse * 0.5})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(sx - pulse * 4, sy - pulse * 4, TILE_SIZE + pulse * 8, TILE_SIZE + pulse * 8);
}

function drawChest(ctx: CanvasRenderingContext2D, sx: number, sy: number): void {
  ctx.fillStyle = '#6B4C0E';
  ctx.fillRect(sx + 2, sy + 6, TILE_SIZE - 4, TILE_SIZE - 8);
  ctx.fillStyle = '#d4a017';
  ctx.fillRect(sx + 2, sy + 6, TILE_SIZE - 4, 8);
  ctx.fillStyle = '#f0d060';
  ctx.fillRect(sx + TILE_SIZE / 2 - 3, sy + 8, 6, 6);
  // Glow
  const pulse = Math.sin(Date.now() / 400) * 0.1 + 0.12;
  ctx.fillStyle = `rgba(255,215,0,${pulse})`;
  ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
}

function drawOreFace(ctx: CanvasRenderingContext2D, sx: number, sy: number, accent: string, kind: string): void {
  const cx = sx + TILE_SIZE / 2;
  const cy = sy + TILE_SIZE / 2;

  if (kind === 'fossil') {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy); ctx.lineTo(cx + 6, cy);
    ctx.moveTo(cx, cy - 6); ctx.lineTo(cx, cy + 6);
    ctx.stroke();
    return;
  }

  const r = 6;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r * 0.7, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r * 0.7, cy);
  ctx.closePath();
  ctx.fill();

  // Shimmer facet
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 0.6);
  ctx.lineTo(cx + r * 0.35, cy - r * 0.1);
  ctx.lineTo(cx, cy + r * 0.1);
  ctx.lineTo(cx - r * 0.25, cy - r * 0.1);
  ctx.closePath();
  ctx.fill();
}

function drawCracks(ctx: CanvasRenderingContext2D, sx: number, sy: number, frac: number): void {
  ctx.strokeStyle = `rgba(0,0,0,${frac * 0.65})`;
  ctx.lineWidth = 1;
  const cx = sx + TILE_SIZE / 2;
  const cy = sy + TILE_SIZE / 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy); ctx.lineTo(cx + 7, cy - 9); ctx.lineTo(cx + 11, cy - 4);
  if (frac > 0.5) { ctx.moveTo(cx, cy); ctx.lineTo(cx - 9, cy + 7); ctx.lineTo(cx - 5, cy + 13); }
  if (frac > 0.75) { ctx.moveTo(cx + 3, cy - 3); ctx.lineTo(cx - 5, cy - 8); }
  ctx.stroke();
}

// ── Dynamic lighting ──────────────────────────────────────────────────────────

function drawLighting(ctx: CanvasRenderingContext2D, state: GameState, cam: Camera, wm: WorldManager): void {
  const depth = WorldManager.tileDepth(state.player.y);
  if (depth < 3) return;

  const { player } = state;
  const radius = lightRadius(player.upgrades.lantern);
  const px = player.x * TILE_SIZE + TILE_SIZE / 2 - cam.x;
  const py = player.y * TILE_SIZE + TILE_SIZE / 2 - cam.y;
  const lightPx = radius * TILE_SIZE;

  const [, lCtx] = getLightCanvas(cam.width, cam.height);
  lCtx.clearRect(0, 0, cam.width, cam.height);

  // Base darkness
  const overlayAlpha = Math.min(0.94, 0.3 + depth / 120 * 0.64);
  const surfacePixelY = SURFACE_TILE_ROW * TILE_SIZE - cam.y;
  lCtx.fillStyle = `rgba(0,0,0,${overlayAlpha})`;
  lCtx.fillRect(0, Math.max(0, surfacePixelY), cam.width, cam.height);

  // Player light cone (destination-out)
  lCtx.globalCompositeOperation = 'destination-out';
  const pGrad = lCtx.createRadialGradient(px, py, 0, px, py, lightPx);
  pGrad.addColorStop(0, 'rgba(0,0,0,1)');
  pGrad.addColorStop(0.55, 'rgba(0,0,0,0.9)');
  pGrad.addColorStop(1, 'rgba(0,0,0,0)');
  lCtx.fillStyle = pGrad;
  lCtx.beginPath();
  lCtx.arc(px, py, lightPx, 0, Math.PI * 2);
  lCtx.fill();

  // Glowing tile light contributions
  const startCol = Math.max(0, Math.floor(cam.x / TILE_SIZE));
  const endCol   = Math.min(WORLD_WIDTH_CHUNKS * CHUNK_SIZE - 1, Math.ceil((cam.x + cam.width) / TILE_SIZE));
  const startRow = Math.max(0, Math.floor(cam.y / TILE_SIZE));
  const endRow   = Math.ceil((cam.y + cam.height) / TILE_SIZE);

  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const tile = wm.getTile(row, col);
      if (!tile || !tile.revealed) continue;
      const isGlow = tile.kind === 'crystal' || tile.kind === 'void_stone'
        || tile.kind === 'energy_node' || tile.kind === 'magma_rock' || tile.kind === 'artifact';
      if (!isGlow) continue;
      const tx = col * TILE_SIZE + TILE_SIZE / 2 - cam.x;
      const ty = row * TILE_SIZE + TILE_SIZE / 2 - cam.y;
      const gGrad = lCtx.createRadialGradient(tx, ty, 0, tx, ty, TILE_SIZE * 3);
      gGrad.addColorStop(0, 'rgba(0,0,0,0.9)');
      gGrad.addColorStop(1, 'rgba(0,0,0,0)');
      lCtx.fillStyle = gGrad;
      lCtx.beginPath();
      lCtx.arc(tx, ty, TILE_SIZE * 3, 0, Math.PI * 2);
      lCtx.fill();
    }
  }

  lCtx.globalCompositeOperation = 'source-over';

  // Mask unrevealed tiles solid black
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const tile = wm.getTile(row, col);
      if (!tile || !tile.revealed) {
        const sx = col * TILE_SIZE - cam.x;
        const sy = row * TILE_SIZE - cam.y;
        lCtx.fillStyle = 'rgba(0,0,0,0.97)';
        lCtx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  // Blit light buffer onto main canvas
  ctx.drawImage(lightCanvas!, 0, 0);
}

// ── Player sprite ─────────────────────────────────────────────────────────────

function drawPlayer(ctx: CanvasRenderingContext2D, state: GameState, cam: Camera): void {
  const { player } = state;
  const sx = player.x * TILE_SIZE - cam.x;
  const sy = player.y * TILE_SIZE - cam.y;
  const s  = TILE_SIZE;
  const flip = player.facing === 'left';

  ctx.save();
  if (flip) {
    ctx.translate(sx + s / 2, sy);
    ctx.scale(-1, 1);
    ctx.translate(-(sx + s / 2), -sy);
  }

  // Body
  ctx.fillStyle = '#f0c070';
  roundRect(ctx, sx + 8, sy + 6, s - 16, s - 10, 4);
  ctx.fill();

  // Helmet/hat
  ctx.fillStyle = '#7a3a10';
  ctx.fillRect(sx + 5, sy + 2, s - 10, 7);
  ctx.fillStyle = '#5a2a08';
  ctx.fillRect(sx + 2, sy + 7, s - 4, 3);
  // Headlamp glow
  if (player.upgrades.lantern > 0) {
    const shine = ctx.createRadialGradient(sx + s - 8, sy + 5, 0, sx + s - 8, sy + 5, 10);
    shine.addColorStop(0, 'rgba(255,220,100,0.7)');
    shine.addColorStop(1, 'rgba(255,220,100,0)');
    ctx.fillStyle = shine;
    ctx.beginPath();
    ctx.arc(sx + s - 8, sy + 5, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  // Eyes
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(sx + 10, sy + 12, 3, 3);
  ctx.fillRect(sx + s - 13, sy + 12, 3, 3);

  // Tool based on shovel level
  const shovelLv = player.upgrades.shovel;
  const toolColors = ['#8B5E3C','#888888','#aaaaaa','#b87333','#d4a017','#c0c0d0','#4488ff','#ff6644','#cc44ff'];
  ctx.strokeStyle = toolColors[Math.min(shovelLv, toolColors.length - 1)];
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(sx + s - 3, sy + 8);
  ctx.lineTo(sx + s + 9, sy + s - 1);
  ctx.stroke();
  ctx.fillStyle = ctx.strokeStyle;
  ctx.fillRect(sx + s + 5, sy + s - 5, 8, 5);

  // Jetpack visual
  if (player.upgrades.jetpack > 0) {
    ctx.fillStyle = '#444466';
    ctx.fillRect(sx + 3, sy + 7, 6, 14);
    ctx.fillStyle = '#66aaff';
    ctx.fillRect(sx + 5, sy + 18, 3, 4);
  }

  ctx.restore();
}

// ── Particles ─────────────────────────────────────────────────────────────────

function drawParticles(ctx: CanvasRenderingContext2D, cam: Camera, pm: ParticleManager): void {
  pm.forEach(p => {
    const sx = p.x - cam.x;
    const sy = p.y - cam.y;
    if (sx < -20 || sx > cam.width + 20 || sy < -20 || sy > cam.height + 20) return;

    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;

    if (p.kind === 'spark' || p.kind === 'crystal' || p.kind === 'treasure') {
      // Star shape for sparks
      const r = p.size * alpha;
      ctx.beginPath();
      ctx.moveTo(sx, sy - r);
      ctx.lineTo(sx + r * 0.3, sy - r * 0.3);
      ctx.lineTo(sx + r, sy);
      ctx.lineTo(sx + r * 0.3, sy + r * 0.3);
      ctx.lineTo(sx, sy + r);
      ctx.lineTo(sx - r * 0.3, sy + r * 0.3);
      ctx.lineTo(sx - r, sy);
      ctx.lineTo(sx - r * 0.3, sy - r * 0.3);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(sx, sy, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.globalAlpha = 1;
}

// ── Float texts ───────────────────────────────────────────────────────────────

function drawFloatTexts(ctx: CanvasRenderingContext2D, state: GameState, cam: Camera): void {
  ctx.textAlign = 'center';
  for (const f of state.floatTexts) {
    const sx = f.x - cam.x;
    const sy = f.y - cam.y;
    const scale = f.scale ?? 1;
    ctx.globalAlpha = Math.max(0, f.life);
    ctx.font = `bold ${Math.round(13 * scale)}px sans-serif`;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(f.text, sx + 1, sy + 1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, sx, sy);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

// ── Scanner overlay ───────────────────────────────────────────────────────────

function drawScannerOverlay(ctx: CanvasRenderingContext2D, state: GameState, cam: Camera, wm: WorldManager): void {
  const { player } = state;
  const range = player.upgrades.scanner * 4;
  if (range === 0) return;

  for (let dr = -range; dr <= range; dr++) {
    for (let dc = -range; dc <= range; dc++) {
      const row = player.y + dr;
      const col = player.x + dc;
      const tile = wm.getTile(row, col);
      if (!tile || tile.revealed) continue;
      const isOre = ['coal','iron','silver','gold','ruby','sapphire','emerald','crystal',
        'fossil','relic','artifact','obsidian','magma_rock','void_stone','ancient_brick'].includes(tile.kind);
      if (!isOre) continue;

      const sx = col * TILE_SIZE - cam.x;
      const sy = row * TILE_SIZE - cam.y;
      const accent = TILE_ACCENT[tile.kind] ?? '#fff';
      const pulse = Math.sin(Date.now() / 400 + dr + dc) * 0.15 + 0.15;
      ctx.fillStyle = `rgba(${hexToRgb(accent)},${pulse})`;
      ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
    }
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function adjustBrightness(color: string, amount: number): string {
  if (color === 'transparent') return 'transparent';
  if (!color.startsWith('#') || color.length < 7) return color;
  const r = Math.min(255, Math.max(0, parseInt(color.slice(1, 3), 16) + amount));
  const g = Math.min(255, Math.max(0, parseInt(color.slice(3, 5), 16) + amount));
  const b = Math.min(255, Math.max(0, parseInt(color.slice(5, 7), 16) + amount));
  return `rgb(${r},${g},${b})`;
}

function hexToRgb(hex: string): string {
  if (!hex.startsWith('#') || hex.length < 7) return '255,255,255';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
