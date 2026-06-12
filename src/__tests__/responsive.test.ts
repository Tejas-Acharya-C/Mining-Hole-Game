import { describe, expect, it } from 'vitest';
import { computeCamera, getZoomFactor } from '../engine/renderer';
import { TILE_SIZE } from '../data/tiles';

describe('responsive rendering utilities', () => {
  it('returns a mobile-friendly zoom factor for small phones', () => {
    expect(getZoomFactor(360, 780, true)).toBeCloseTo(0.68, 2);
  });

  it('returns a tablet zoom factor for medium mobile screens', () => {
    expect(getZoomFactor(768, 1024, true)).toBeCloseTo(0.82, 2);
  });

  it('returns a smaller phone zoom factor for extra-small mobile viewports', () => {
    expect(getZoomFactor(320, 720, true)).toBeCloseTo(0.68, 2);
    expect(getZoomFactor(390, 800, true)).toBeCloseTo(0.68, 2);
    expect(getZoomFactor(412, 870, true)).toBeCloseTo(0.68, 2);
  });

  it('keeps desktop zoom at 1.0', () => {
    expect(getZoomFactor(1200, 900, false)).toBe(1.0);
  });

  it('computes a valid mobile camera viewport without negative coordinates', () => {
    const state = {
      player: { x: 5, y: 2, shakeAmount: 0 },
      settings: { touchControls: true, screenShake: false },
      currentBiome: 'surface',
      depthPressureAlpha: 0,
      tick: 0,
    } as any;

    const cam = computeCamera(state, 360, 780, true);
    expect(cam.zoom).toBeCloseTo(0.68, 2);
    expect(cam.x).toBeGreaterThanOrEqual(0);
    expect(cam.y).toBeGreaterThanOrEqual(0);
    expect(cam.width).toBeCloseTo(360 / cam.zoom, 5);
  });

  it('keeps the player visible below the mobile top bar on phones', () => {
    const state = {
      player: { x: 8, y: 6, shakeAmount: 0 },
      settings: { touchControls: true, screenShake: false },
      currentBiome: 'surface',
      depthPressureAlpha: 0,
      tick: 0,
    } as any;

    const cam = computeCamera(state, 360, 780, true);
    const playerY = state.player.y * TILE_SIZE + TILE_SIZE / 2;
    expect(playerY - cam.y).toBeGreaterThan(84);
  });
});
