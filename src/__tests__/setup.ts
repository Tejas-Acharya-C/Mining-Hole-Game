import { vi } from 'vitest';

// ── Mock Web Audio API ────────────────────────────────────────────────────────
// jsdom doesn't implement AudioContext. Stub the whole module so tests that
// import GameManager (which imports AudioManager) don't blow up.

vi.mock('../systems/AudioManager', () => {
  const noOp = () => {};
  const manager = {
    setVolume: noOp, setMusicVolume: noOp,
    setEnabled: noOp, setMusicEnabled: noOp,
    dig: noOp, break: noOp, pickup: noOp, sell: noOp,
    upgrade: noOp, step: noOp, lowEnergy: noOp,
    achievement: noOp, secret: noOp, win: noOp,
    menuClick: noOp, teleport: noOp, criticalHit: noOp,
    questComplete: noOp, biomeEnter: noOp,
    updateDepthMusic: noOp, stopAmbient: noOp,
    discovery: noOp, eventTrigger: noOp, combo: noOp,
  };
  return { audioManager: manager, AudioManager: vi.fn(() => manager) };
});

// ── Mock OffscreenCanvas ──────────────────────────────────────────────────────
if (typeof OffscreenCanvas === 'undefined') {
  (globalThis as unknown as Record<string, unknown>).OffscreenCanvas = class {
    width: number; height: number;
    constructor(w: number, h: number) { this.width = w; this.height = h; }
    getContext() { return null; }
  };
}
