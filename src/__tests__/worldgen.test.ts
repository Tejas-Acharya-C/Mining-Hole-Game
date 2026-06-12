import { describe, it, expect } from 'vitest';
import { WorldManager, makePrng } from '../systems/WorldManager';
import { CHUNK_SIZE } from '../types';
import { WORLD_WIDTH_CHUNKS, SURFACE_TILE_ROW, SECRET_CHUNK_DEPTH } from '../data/tiles';

// ── PRNG ──────────────────────────────────────────────────────────────────────

describe('makePrng', () => {
  it('produces values in [0, 1)', () => {
    const rng = makePrng(12345);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is deterministic for the same seed', () => {
    const a = makePrng(99999);
    const b = makePrng(99999);
    for (let i = 0; i < 20; i++) {
      expect(a()).toBeCloseTo(b(), 10);
    }
  });

  it('produces different sequences for different seeds', () => {
    const a = makePrng(1);
    const b = makePrng(2);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });
});

// ── WorldManager chunk generation ────────────────────────────────────────────

describe('WorldManager', () => {
  const seed = 42;

  function makeWM(s = seed) {
    const m = new Map<string, import('../types').Chunk>();
    return new WorldManager(s, m);
  }

  it('generates surface chunk with grass row', () => {
    const wm2 = makeWM();
    const chunk = wm2.getChunk(1, 0);
    expect(chunk.biome).toBe('surface');
    // Grass tiles on surface row
    const grassTile = chunk.tiles[SURFACE_TILE_ROW][0];
    expect(grassTile.kind).toBe('grass');
  });

  it('places sell_point on surface chunk cx=1', () => {
    const wm2 = makeWM();
    const chunk = wm2.getChunk(1, 0);
    let hasSellPoint = false;
    for (const row of chunk.tiles) {
      for (const tile of row) {
        if (tile.kind === 'sell_point') { hasSellPoint = true; break; }
      }
    }
    expect(hasSellPoint).toBe(true);
  });

  it('generates underground chunk with non-air tiles', () => {
    const wm2 = makeWM();
    const chunk = wm2.getChunk(1, 2);
    let solidCount = 0;
    for (const row of chunk.tiles) {
      for (const tile of row) {
        if (tile.kind !== 'air') solidCount++;
      }
    }
    expect(solidCount).toBeGreaterThan(CHUNK_SIZE * CHUNK_SIZE * 0.3);
  });

  it('is deterministic — same seed produces identical chunks', () => {
    const wmA = makeWM(777);
    const wmB = makeWM(777);
    const cA = wmA.getChunk(1, 3);
    const cB = wmB.getChunk(1, 3);
    for (let r = 0; r < CHUNK_SIZE; r++) {
      for (let c = 0; c < CHUNK_SIZE; c++) {
        expect(cA.tiles[r][c].kind).toBe(cB.tiles[r][c].kind);
      }
    }
  });

  it('produces different chunks for different seeds', () => {
    const wmA = makeWM(1);
    const wmB = makeWM(2);
    const cA = wmA.getChunk(1, 3);
    const cB = wmB.getChunk(1, 3);
    let differ = false;
    outer: for (let r = 0; r < CHUNK_SIZE; r++) {
      for (let c = 0; c < CHUNK_SIZE; c++) {
        if (cA.tiles[r][c].kind !== cB.tiles[r][c].kind) { differ = true; break outer; }
      }
    }
    expect(differ).toBe(true);
  });

  it('places bedrock border on leftmost column of cx=0', () => {
    const wm2 = makeWM();
    const chunk = wm2.getChunk(0, 2);
    for (let r = 0; r < CHUNK_SIZE; r++) {
      expect(chunk.tiles[r][0].kind).toBe('bedrock');
    }
  });

  it('places bedrock border on rightmost column of cx=WORLD_WIDTH_CHUNKS-1', () => {
    const wm2 = makeWM();
    const chunk = wm2.getChunk(WORLD_WIDTH_CHUNKS - 1, 2);
    for (let r = 0; r < CHUNK_SIZE; r++) {
      expect(chunk.tiles[r][CHUNK_SIZE - 1].kind).toBe('bedrock');
    }
  });

  it('secret chamber is only at SECRET_CHUNK_DEPTH', () => {
    const wm2 = makeWM();
    const secretChunk = wm2.getChunk(1, SECRET_CHUNK_DEPTH);
    expect(secretChunk.biome).toBe('secret_chamber');
    // Adjacent chunks should NOT be secret
    const aboveChunk = wm2.getChunk(1, SECRET_CHUNK_DEPTH - 1);
    expect(aboveChunk.biome).not.toBe('secret_chamber');
  });

  it('artifact is placed in secret chamber', () => {
    const wm2 = makeWM();
    const chunk = wm2.getChunk(1, SECRET_CHUNK_DEPTH);
    let hasArtifact = false;
    for (const row of chunk.tiles) {
      for (const tile of row) {
        if (tile.kind === 'artifact') { hasArtifact = true; break; }
      }
    }
    expect(hasArtifact).toBe(true);
  });

  it('getTile returns null for out-of-bounds columns', () => {
    const wm2 = makeWM();
    expect(wm2.getTile(5, -1)).toBeNull();
    expect(wm2.getTile(5, WORLD_WIDTH_CHUNKS * CHUNK_SIZE + 1)).toBeNull();
  });

  it('setTile updates the tile correctly', () => {
    const wm2 = makeWM();
    wm2.getChunk(1, 1); // ensure generated
    const row = CHUNK_SIZE + 5;
    const col = CHUNK_SIZE + 3;
    wm2.setTile(row, col, { kind: 'gold', hp: 55, maxHp: 55, revealed: true });
    const updated = wm2.getTile(row, col);
    expect(updated?.kind).toBe('gold');
    expect(updated?.hp).toBe(55);
  });

  it('tileDepth returns 0 at or above surface', () => {
    expect(WorldManager.tileDepth(SURFACE_TILE_ROW)).toBe(0);
    expect(WorldManager.tileDepth(0)).toBe(0);
  });

  it('tileDepth returns correct depth below surface', () => {
    expect(WorldManager.tileDepth(SURFACE_TILE_ROW + 10)).toBe(10);
    expect(WorldManager.tileDepth(SURFACE_TILE_ROW + 50)).toBe(50);
  });

  it('tileToChunkRow is correct', () => {
    expect(WorldManager.tileToChunkRow(0)).toBe(0);
    expect(WorldManager.tileToChunkRow(CHUNK_SIZE)).toBe(1);
    expect(WorldManager.tileToChunkRow(CHUNK_SIZE * 3)).toBe(3);
  });
});
