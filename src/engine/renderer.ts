import type { GameState, Camera } from '../types';
import { CHUNK_SIZE } from '../types';
import { TILE_SIZE, TILE_COLORS, TILE_ACCENT, SURFACE_TILE_ROW, WORLD_WIDTH_CHUNKS } from '../data/tiles';
import { lightRadius } from '../data/upgrades';
import { BIOME_DEFS } from '../data/biomes';
import { WorldManager } from '../systems/WorldManager';
import type { ParticleManager } from '../systems/ParticleManager';
import { getTouchState } from './input';

// ── Offscreen canvas for lighting pass ────────────────────────────────────────
// Fallback to regular canvas for browsers without OffscreenCanvas (Firefox < 105, Safari < 16.4)

type LightingSurface = OffscreenCanvas | HTMLCanvasElement;
type LightingContext = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

let lightSurface: LightingSurface | null = null;
let lightCtx2: LightingContext | null = null;

function getLightCanvas(w: number, h: number): [LightingSurface, LightingContext] {
  if (!lightSurface || lightSurface.width !== w || lightSurface.height !== h) {
    if (typeof OffscreenCanvas !== 'undefined') {
      lightSurface = new OffscreenCanvas(w, h);
      lightCtx2 = lightSurface.getContext('2d') as OffscreenCanvasRenderingContext2D;
    } else {
      const el = document.createElement('canvas');
      el.width = w;
      el.height = h;
      lightSurface = el;
      lightCtx2 = el.getContext('2d') as CanvasRenderingContext2D;
    }
  }
  return [lightSurface!, lightCtx2!];
}

// ── Camera ────────────────────────────────────────────────────────────────────

export function getZoomFactor(canvasW: number, canvasH: number, isMobile: boolean): number {
  if (!isMobile) return 1.0;
  const minDim = Math.min(canvasW, canvasH);
  if (minDim <= 420) {
    return 0.68; // phone / smaller screens need more world view
  }
  if (minDim <= 560) {
    return 0.72; // compact phones
  }
  if (minDim <= 900) {
    return 0.82; // tablets
  }
  return 0.92;
}

export function computeCamera(state: GameState, canvasW: number, canvasH: number, isMobile?: boolean): Camera {
  const { player } = state;
  const mobileUI = typeof isMobile === 'boolean' ? isMobile : state.settings.touchControls;
  const zoom = getZoomFactor(canvasW, canvasH, mobileUI);

  const virtualW = canvasW / zoom;
  const virtualH = canvasH / zoom;

  const px = player.x * TILE_SIZE + TILE_SIZE / 2;
  const py = player.y * TILE_SIZE + TILE_SIZE / 2;
  // Bias camera slightly below center so terrain fills the view without excess sky
  const leadY = mobileUI ? 76 : 52;

  let cx = px - virtualW / 2;
  let cy = py - virtualH / 2 + leadY;

  const maxX = WORLD_WIDTH_CHUNKS * CHUNK_SIZE * TILE_SIZE - virtualW;
  cx = Math.max(0, Math.min(cx, maxX));
  cy = Math.max(0, cy);

  // Screen shake
  const shake = state.settings.screenShake ? player.shakeAmount : 0;
  const shakeX = shake > 0 ? (Math.random() - 0.5) * shake * 2 : 0;
  const shakeY = shake > 0 ? (Math.random() - 0.5) * shake * 2 : 0;

  return { x: cx, y: cy, width: virtualW, height: virtualH, shakeX, shakeY, zoom };
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
  const { width: cw, height: ch, zoom } = camera;
  
  // Clear the actual screen area
  ctx.clearRect(0, 0, cw * zoom, ch * zoom);

  ctx.save();
  ctx.scale(zoom, zoom);

  // Apply shake transform in virtual space
  if (camera.shakeX !== 0 || camera.shakeY !== 0) {
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
    // Stars in sky
    drawStars(ctx, cw, Math.min(surfacePxY, ch), state.tick);
  }

  // Underground background — biome-tinted
  const biomeDef = BIOME_DEFS[state.currentBiome];
  ctx.fillStyle = biomeDef.ambientColor;
  ctx.fillRect(0, Math.max(0, surfacePxY), cw, ch);

  // Depth fog vignette
  const depth = WorldManager.tileDepth(state.player.y);
  if (depth > 5) {
    const fogAlpha = Math.min(0.35, depth / 160);
    const fog = ctx.createRadialGradient(cw / 2, ch / 2, cw * 0.2, cw / 2, ch / 2, Math.max(cw, ch) * 0.7);
    fog.addColorStop(0, 'transparent');
    fog.addColorStop(1, `rgba(0,0,0,${fogAlpha})`);
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, cw, ch);
  }

  // Depth pressure vignette (separate intense ring at edges)
  if (state.depthPressureAlpha > 0) {
    const pv = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.35,
      cw / 2, ch / 2, Math.min(cw, ch) * 0.7);
    pv.addColorStop(0, 'transparent');
    pv.addColorStop(1, `rgba(0,0,30,${state.depthPressureAlpha * 0.6})`);
    ctx.fillStyle = pv;
    ctx.fillRect(0, 0, cw, ch);
  }

  // Tiles
  drawTiles(ctx, state, camera, wm);

  // Event markers (before lighting so they get dimmed too)
  drawEventMarkers(ctx, state, camera);

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

  // Combo indicator
  if (state.digCombo >= 5) drawComboIndicator(ctx, state, cw, ch);

  // Depth milestone flash
  drawDepthMilestoneEffect(ctx, state, cw, ch);

  // Biome transition banner
  drawBiomeTransition(ctx, state, cw, ch);

  if (state.settings.showFPS && fps !== undefined) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.font = '11px monospace';
    ctx.fillText(`${fps} FPS`, 8, 16);
  }

  // Touch joystick overlay
  if (state.settings.touchControls) {
    drawTouchJoystick(ctx);
  }

  ctx.restore();
}

// ── Tile rendering ────────────────────────────────────────────────────────────

function drawTiles(ctx: CanvasRenderingContext2D, state: GameState, cam: Camera, wm: WorldManager): void {
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

      // Ancient terminal
      if (tile.kind === 'ancient_terminal') {
        drawAncientTerminal(ctx, sx, sy, state);
        continue;
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
      if (accent) drawOreFace(ctx, sx, sy, accent, tile.kind, state);

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

      // Hit flash — white burst on recently-hit tile
      if (state.hitFlashTile &&
          state.hitFlashTile.row === row && state.hitFlashTile.col === col &&
          state.hitFlashTile.life > 0) {
        ctx.fillStyle = `rgba(255,255,255,${state.hitFlashTile.life * 0.55})`;
        ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
      }
    }
  }
}

function drawAncientTerminal(ctx: CanvasRenderingContext2D, sx: number, sy: number, state: GameState): void {
  // Draw terminal block
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(sx + 2, sy + 2, TILE_SIZE - 4, TILE_SIZE - 4);
  
  // Screen on terminal
  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(sx + 4, sy + 4, TILE_SIZE - 8, TILE_SIZE - 10);
  ctx.fillStyle = '#60a5fa';
  ctx.fillRect(sx + 5, sy + 5, TILE_SIZE - 10, TILE_SIZE - 12);
  
  // Keyboard/console area
  ctx.fillStyle = '#1e40af';
  ctx.fillRect(sx + 3, sy + TILE_SIZE - 5, TILE_SIZE - 6, 3);
  
  // Floating label when terminal guidance is active
  const hasArtifact = state.player.inventory.some(s => s.itemId === 'artifact' && s.qty > 0);
  const hasKey = state.player.inventory.some(s => s.itemId === 'facility_key' && s.qty > 0);
  const relevant = (hasArtifact && !state.artifactActivated) || (hasKey && !state.facilityUnlocked);
  
  if (relevant) {
    ctx.save();
    // Pulsing alpha
    const pulse = Math.sin(Date.now() / 300) * 0.15 + 0.85;
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    
    // Label background
    const labelText = "ANCIENT TERMINAL";
    const labelWidth = ctx.measureText(labelText).width;
    ctx.fillStyle = 'rgba(10, 8, 24, 0.88)';
    ctx.fillRect(sx + TILE_SIZE / 2 - labelWidth / 2 - 4, sy - 17, labelWidth + 8, 13);
    
    // Border
    ctx.strokeStyle = `rgba(59, 130, 246, ${pulse})`;
    ctx.lineWidth = 0.75;
    ctx.strokeRect(sx + TILE_SIZE / 2 - labelWidth / 2 - 4, sy - 17, labelWidth + 8, 13);
    
    // Text
    ctx.fillStyle = `rgba(96, 165, 250, ${pulse})`;
    ctx.fillText(labelText, sx + TILE_SIZE / 2, sy - 8);
    ctx.restore();
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

function drawOreFace(ctx: CanvasRenderingContext2D, sx: number, sy: number, accent: string, kind: string, state: GameState): void {
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

  // Dynamic diagonal shimmer reflection for rare ores (ruby, sapphire, emerald, crystal, relic, etc.)
  const rareOres = ['ruby', 'sapphire', 'emerald', 'crystal', 'relic', 'artifact', 'void_stone'];
  if (rareOres.includes(kind) && !state.settings.reducedMotion) {
    const time = Date.now();
    const shimmerPos = (time % 2500) / 2500; // 0 to 1 every 2.5 seconds
    ctx.save();
    // Clip to the diamond path
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.7, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r * 0.7, cy);
    ctx.closePath();
    ctx.clip();

    // Draw the moving diagonal white line
    const xOffset = -r * 2 + shimmerPos * r * 4;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + xOffset - r, cy + r);
    ctx.lineTo(cx + xOffset + r, cy - r);
    ctx.stroke();
    ctx.restore();
  }
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
  const radius = lightRadius(player.upgrades.lantern, state.activeModifiers);
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

  // Glowing tile light contributions (skipped on low lighting quality to optimize mobile CPU/GPU render speed)
  const startCol = Math.max(0, Math.floor(cam.x / TILE_SIZE));
  const endCol   = Math.min(WORLD_WIDTH_CHUNKS * CHUNK_SIZE - 1, Math.ceil((cam.x + cam.width) / TILE_SIZE));
  const startRow = Math.max(0, Math.floor(cam.y / TILE_SIZE));
  const endRow   = Math.ceil((cam.y + cam.height) / TILE_SIZE);

  if (state.settings.lightingQuality !== 'low') {
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const tile = wm.getTile(row, col);
        if (!tile || !tile.revealed) continue;
        let isGlow = tile.kind === 'crystal' || tile.kind === 'void_stone'
          || tile.kind === 'energy_node' || tile.kind === 'magma_rock' || tile.kind === 'artifact';
        if (!isGlow && player.upgrades.ore_detector > 0) {
          const isOre = ['coal', 'iron', 'silver', 'gold', 'ruby', 'sapphire', 'emerald',
            'fossil', 'relic', 'obsidian', 'permafrost', 'ancient_brick'].includes(tile.kind);
          if (isOre) {
            const dist = Math.hypot(player.x - col, player.y - row);
            if (dist <= player.upgrades.ore_detector * 3) {
              isGlow = true;
            }
          }
        }
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
  ctx.drawImage(lightSurface as CanvasImageSource, 0, 0);
}

// ── Player sprite ─────────────────────────────────────────────────────────────

function drawPlayer(ctx: CanvasRenderingContext2D, state: GameState, cam: Camera): void {
  const { player } = state;
  const sx = player.x * TILE_SIZE - cam.x;
  const sy = player.y * TILE_SIZE - cam.y;
  const s  = TILE_SIZE;
  const flip = player.facing === 'left';

  // Ground shadow for silhouette readability
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  ctx.ellipse(sx + s / 2, sy + s - 2, s * 0.34, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  if (flip) {
    ctx.translate(sx + s / 2, sy);
    ctx.scale(-1, 1);
    ctx.translate(-(sx + s / 2), -sy);
  }

  // Body
  ctx.fillStyle = '#ffd08a';
  roundRect(ctx, sx + 8, sy + 6, s - 16, s - 10, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, sx + 8, sy + 6, s - 16, s - 10, 4);
  ctx.stroke();

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

  // Discovery Scanner Compass
  const scannerLevel = player.upgrades.artifact_sense ?? 0;
  if (scannerLevel > 0) {
    let targetCol = 24;
    let targetRow = 152;
    let requiredLevel = 1;

    const midCol = Math.floor((WORLD_WIDTH_CHUNKS * CHUNK_SIZE) / 2);
    const terminalCol = midCol - 7;
    const terminalRow = SURFACE_TILE_ROW;

    const stage = state.objectiveStage || 'new_game';
    const hasArtifact = player.inventory.some(s => s.itemId === 'artifact');
    const hasFacilityKey = player.inventory.some(s => s.itemId === 'facility_key');
    const hasCoreStabilizer = player.inventory.some(s => s.itemId === 'core_stabilizer');
    const hasFractureShard = player.inventory.some(s => s.itemId === 'fracture_shard');

    if (!state.secretFound && !hasArtifact && (stage === 'new_game' || stage === 'early_dig' || stage === 'find_artifact')) {
      targetCol = 24;
      targetRow = 152;
      requiredLevel = 1;
    } else if (hasArtifact && !state.artifactActivated) {
      targetCol = terminalCol;
      targetRow = terminalRow;
      requiredLevel = 1;
    } else if (!hasFacilityKey && !state.facilityUnlocked && (stage === 'terminal_activated' || stage === 'find_facility_key')) {
      targetCol = 23;
      targetRow = 168;
      requiredLevel = 2;
    } else if (hasFacilityKey && !state.facilityUnlocked) {
      targetCol = terminalCol;
      targetRow = terminalRow;
      requiredLevel = 1;
    } else if (!state.statistics.biomesDiscovered.has('world_core') && (stage === 'facility_unlocked' || stage === 'find_world_core')) {
      targetCol = 23;
      targetRow = 202;
      requiredLevel = 3;
    } else if (!hasCoreStabilizer && (stage === 'core_reached' || stage === 'find_fracture' || !state.statistics.biomesDiscovered.has('reality_fracture'))) {
      targetCol = 23;
      targetRow = 202;
      requiredLevel = 4;
    } else if (!hasFractureShard && (stage === 'fracture_reached' || !state.atEndgameStabilizer)) {
      targetCol = 22;
      targetRow = 232;
      requiredLevel = 5;
    } else {
      targetCol = 23;
      targetRow = 232;
      requiredLevel = 6;
    }

    if (scannerLevel >= requiredLevel) {
      const targetX = targetCol * TILE_SIZE + TILE_SIZE / 2;
      const targetY = targetRow * TILE_SIZE + TILE_SIZE / 2;
      const px = player.x * TILE_SIZE + TILE_SIZE / 2;
      const py = player.y * TILE_SIZE + TILE_SIZE / 2;
      const dx = targetX - px;
      const dy = targetY - py;
      const dist = Math.hypot(dx, dy) / TILE_SIZE; // in tiles
      const maxRange = scannerLevel * 50;

      if (dist <= maxRange) {
        const angle = Math.atan2(dy, dx);
        const arrowDist = 24;
        const ax = sx + s / 2 + Math.cos(angle) * arrowDist;
        const ay = sy + s / 2 + Math.sin(angle) * arrowDist;

        ctx.save();
        ctx.translate(ax, ay);
        ctx.rotate(angle);
        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(-4, -5);
        ctx.lineTo(-1, 0);
        ctx.lineTo(-4, 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
  }
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
    } else if (p.kind === 'bubble') {
      ctx.beginPath();
      ctx.arc(sx, sy, p.size * alpha, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
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

// ── Stars in sky ──────────────────────────────────────────────────────────────

// Pre-baked star positions (consistent per session)
const STAR_POSITIONS: Array<[number, number, number]> = Array.from({ length: 60 }, (_, i) => {
  const s = Math.sin(i * 1732.15) * 0.5 + 0.5;
  const t = Math.cos(i * 2431.77) * 0.5 + 0.5;
  return [s, t, 0.4 + Math.sin(i * 983.3) * 0.35];
});

function drawStars(ctx: CanvasRenderingContext2D, cw: number, skyH: number, tick: number): void {
  if (skyH < 4) return;
  for (const [sx, sy, brightness] of STAR_POSITIONS) {
    const x = sx * cw;
    const y = sy * skyH;
    const twinkle = Math.sin(tick * 0.05 + sx * 10) * 0.2 + brightness;
    ctx.fillStyle = `rgba(255,255,255,${Math.max(0, twinkle)})`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }
}

// ── Event markers ─────────────────────────────────────────────────────────────

function drawEventMarkers(ctx: CanvasRenderingContext2D, state: GameState, cam: Camera): void {
  for (const ev of state.activeEvents) {
    if (ev.triggered) continue;
    const sx = ev.worldCol * TILE_SIZE + TILE_SIZE / 2 - cam.x;
    const sy = ev.worldRow * TILE_SIZE + TILE_SIZE / 2 - cam.y;
    // Skip if offscreen
    if (sx < -TILE_SIZE || sx > cam.width + TILE_SIZE || sy < -TILE_SIZE || sy > cam.height + TILE_SIZE) continue;

    const pulse = Math.sin(Date.now() / 350) * 0.3 + 0.5;
    const r = TILE_SIZE * (1.2 + pulse * 0.4);

    // Pulsing glow ring
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    grad.addColorStop(0, `${ev.color}66`);
    grad.addColorStop(0.5, `${ev.color}22`);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();

    // Exclamation marker
    ctx.fillStyle = ev.color;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.8 + pulse * 0.2;
    ctx.fillText('!', sx, sy - TILE_SIZE);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
}

// ── Combo indicator ───────────────────────────────────────────────────────────

function drawComboIndicator(ctx: CanvasRenderingContext2D, state: GameState, cw: number, _ch: number): void {
  const combo = state.digCombo;
  if (combo < 5) return;
  const tier = combo >= 20 ? 3 : combo >= 15 ? 2 : combo >= 10 ? 1 : 0;
  const colors = ['#fbbf24', '#f97316', '#ef4444', '#ff69b4'];
  const color  = colors[tier];

  const pulse = Math.sin(Date.now() / 200) * 0.15 + 0.85;
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.font = `bold ${14 + tier * 2}px sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillText(`COMBO ×${combo}`, cw - 11, 45);
  ctx.fillStyle = color;
  ctx.fillText(`COMBO ×${combo}`, cw - 12, 44);
  if (state.comboMultiplier > 1) {
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#86efac';
    ctx.fillText(`+${Math.round((state.comboMultiplier - 1) * 100)}% sell`, cw - 12, 60);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  ctx.restore();
}

// ── Depth milestone flash ─────────────────────────────────────────────────────

const DEPTH_MILESTONES = new Set([10, 25, 50, 100, 200]);
let _lastMilestoneDepth = -1;
let _milestoneFlash = 0;

function drawDepthMilestoneEffect(ctx: CanvasRenderingContext2D, state: GameState, cw: number, ch: number): void {
  const depth = WorldManager.tileDepth(state.player.y);
  if (DEPTH_MILESTONES.has(depth) && depth !== _lastMilestoneDepth) {
    _lastMilestoneDepth = depth;
    _milestoneFlash = 1.0;
  }
  if (_milestoneFlash > 0) {
    ctx.fillStyle = `rgba(255,255,200,${_milestoneFlash * 0.18})`;
    ctx.fillRect(0, 0, cw, ch);
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(255,255,180,${_milestoneFlash})`;
    ctx.fillText(`Depth ${depth}m`, cw / 2, ch / 2 - 40);
    ctx.textAlign = 'left';
    _milestoneFlash -= 0.016; // approx 60fps decay
    if (_milestoneFlash < 0) _milestoneFlash = 0;
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

function drawTouchJoystick(ctx: CanvasRenderingContext2D): void {
  const touch = getTouchState();
  if (!touch.joyActive) return;

  ctx.save();
  // Draw outer circle
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(touch.joyOriginX, touch.joyOriginY, 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Draw inner knob
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.arc(touch.joyCurrentX, touch.joyCurrentY, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBiomeTransition(ctx: CanvasRenderingContext2D, state: GameState, cw: number, _ch: number): void {
  const trans = state.biomeTransition;
  if (!trans) return;

  ctx.save();
  let alpha = 1;
  let yOffset = 0;

  // Animate slide-in and fade-out based on 2.5s duration
  if (trans.life > 2.0) {
    alpha = (2.5 - trans.life) / 0.5; // fade in over 0.5s
    yOffset = -20 * (trans.life - 2.0) / 0.5; // slide down from y - 20
  } else if (trans.life < 0.7) {
    alpha = trans.life / 0.7; // fade out over 0.7s
    yOffset = 20 * (1 - trans.life / 0.7); // slide down out of view
  }
  alpha = Math.max(0, Math.min(1, alpha));
  
  ctx.globalAlpha = alpha;

  const w = 340;
  const h = 54;
  const x = (cw - w) / 2;
  const y = 74 + yOffset; // place below HUD

  // Dynamic biome tinted background
  const biomeDef = BIOME_DEFS[state.currentBiome];
  const biomeColor = biomeDef ? (biomeDef.ambientColor === '#05050c' ? '#a855f7' : biomeDef.ambientColor) : '#a855f7';
  const rgb = hexToRgb(biomeColor);

  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, 'rgba(10, 8, 20, 0.96)');
  grad.addColorStop(0.5, `rgba(${rgb}, 0.16)`);
  grad.addColorStop(1, 'rgba(10, 8, 20, 0.96)');
  ctx.fillStyle = grad;

  ctx.strokeStyle = `rgba(${rgb}, 0.65)`;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = `rgba(${rgb}, 0.35)`;
  ctx.shadowBlur = 12;

  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  ctx.font = 'bold 9px sans-serif';
  ctx.fillStyle = '#a8b2c1';
  ctx.fillText('BIOME DISCOVERED', cw / 2, y + 17);

  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = '#f59e0b'; // Warm amber name
  ctx.fillText(trans.name.toUpperCase(), cw / 2, y + 35);

  ctx.restore();
}
