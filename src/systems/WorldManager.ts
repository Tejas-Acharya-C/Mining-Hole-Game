import type { Chunk, Tile, TileKind, BiomeId } from '../types';
import { CHUNK_SIZE } from '../types';
import { TILE_HP, SURFACE_TILE_ROW, WORLD_WIDTH_CHUNKS, TILE_SIZE, SECRET_CHUNK_DEPTH } from '../data/tiles';
import { BIOME_DEFS, getBiomeForDepth } from '../data/biomes';

// ── Seeded PRNG (mulberry32) ──────────────────────────────────────────────────

export function makePrng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s += 0x6D2B79F5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic seed for a specific chunk */
function chunkSeed(worldSeed: number, cx: number, cy: number): number {
  return (worldSeed ^ (cx * 374761393) ^ (cy * 668265263)) >>> 0;
}

// ── Tile factory ──────────────────────────────────────────────────────────────

function makeTile(kind: TileKind, variant = 0): Tile {
  const hp = TILE_HP[kind] ?? 0;
  return { kind, hp, maxHp: hp, revealed: false, variant };
}

// ── Cave generation ───────────────────────────────────────────────────────────

function generateCaveMap(rng: () => number, biome: BiomeId): boolean[][] {
  const map: boolean[][] = Array.from({ length: CHUNK_SIZE }, () =>
    Array<boolean>(CHUNK_SIZE).fill(false)
  );
  const caveDensity = biome === 'crystal_cavern' ? 0.18 : biome === 'void_realm' ? 0.22 : 0.10;

  for (let r = 0; r < CHUNK_SIZE; r++) {
    for (let c = 1; c < CHUNK_SIZE - 1; c++) {
      if (rng() < caveDensity) map[r][c] = true;
    }
  }
  for (let pass = 0; pass < 3; pass++) {
    const next = map.map(row => [...row]);
    for (let r = 1; r < CHUNK_SIZE - 1; r++) {
      for (let c = 1; c < CHUNK_SIZE - 1; c++) {
        let n = 0;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          if (map[r + dr]?.[c + dc]) n++;
        }
        next[r][c] = n >= 5 ? true : n <= 1 ? false : map[r][c];
      }
    }
    for (let r = 0; r < CHUNK_SIZE; r++) map[r] = next[r];
  }
  return map;
}

// ── Ore vein generator ────────────────────────────────────────────────────────

function carveVein(
  tiles: Tile[][], rng: () => number,
  startR: number, startC: number, kind: TileKind, length: number,
) {
  let r = startR, c = startC;
  for (let i = 0; i < length; i++) {
    if (r >= 0 && r < CHUNK_SIZE && c >= 0 && c < CHUNK_SIZE) {
      if (tiles[r][c].kind !== 'air' && tiles[r][c].kind !== 'bedrock') {
        tiles[r][c] = makeTile(kind);
      }
    }
    const dir = Math.floor(rng() * 4);
    if (dir === 0) r--;
    else if (dir === 1) r++;
    else if (dir === 2) c--;
    else c++;
  }
}

// ── Main chunk generator ──────────────────────────────────────────────────────

export class WorldManager {
  private seed: number;
  private chunks: Map<string, Chunk>;
  private maxCachedChunks = 64;

  constructor(seed: number, chunksMap: Map<string, Chunk>) {
    this.seed = seed;
    this.chunks = chunksMap;
  }

  key(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  getChunk(cx: number, cy: number): Chunk {
    const k = this.key(cx, cy);
    let chunk = this.chunks.get(k);
    if (!chunk) {
      chunk = this.generateChunk(cx, cy);
      this.chunks.set(k, chunk);
      this.evictIfNeeded();
    }
    chunk.lastAccessed = Date.now();
    return chunk;
  }

  getTile(worldRow: number, worldCol: number): Tile | null {
    if (worldCol < 0 || worldCol >= WORLD_WIDTH_CHUNKS * CHUNK_SIZE) return null;
    const cx = Math.floor(worldCol / CHUNK_SIZE);
    const cy = Math.floor(worldRow / CHUNK_SIZE);
    const localRow = worldRow - cy * CHUNK_SIZE;
    const localCol = worldCol - cx * CHUNK_SIZE;
    const chunk = this.getChunk(cx, cy);
    return chunk.tiles[localRow]?.[localCol] ?? null;
  }

  setTile(worldRow: number, worldCol: number, tile: Tile): void {
    if (worldCol < 0 || worldCol >= WORLD_WIDTH_CHUNKS * CHUNK_SIZE) return;
    const cx = Math.floor(worldCol / CHUNK_SIZE);
    const cy = Math.floor(worldRow / CHUNK_SIZE);
    const localRow = worldRow - cy * CHUNK_SIZE;
    const localCol = worldCol - cx * CHUNK_SIZE;
    const chunk = this.getChunk(cx, cy);
    if (chunk.tiles[localRow] && chunk.tiles[localRow][localCol] !== undefined) {
      chunk.tiles[localRow][localCol] = tile;
      chunk.dirty = true;
    }
  }

  private generateChunk(cx: number, cy: number): Chunk {
    const rng = makePrng(chunkSeed(this.seed, cx, cy));
    const biome = this.determineBiome(cy, rng);
    const tiles: Tile[][] = Array.from({ length: CHUNK_SIZE }, () =>
      Array.from({ length: CHUNK_SIZE }, () => makeTile('air'))
    );

    // Surface chunk special handling
    if (cy === 0) {
      this.generateSurfaceChunk(tiles, cx, rng);
    } else if (cy > 0) {
      this.generateUndergroundChunk(tiles, cx, cy, biome, rng);
    }

    const chunk: Chunk = { cx, cy, tiles, biome, generated: true, dirty: true, lastAccessed: Date.now() };

    // Reveal surface chunk
    if (cy === 0) {
      for (let r = 0; r < CHUNK_SIZE; r++) {
        for (let c = 0; c < CHUNK_SIZE; c++) {
          tiles[r][c].revealed = true;
        }
      }
    }

    return chunk;
  }

  private determineBiome(cy: number, rng: () => number): BiomeId {
    if (cy <= 0) return 'surface';
    // Secret chamber: only one per world, fixed at depth 9 chunk, centre column (cx=1).
    // determineBiome is called with the chunk's cy; the cx check happens in carveSecretChamber.
    if (cy === SECRET_CHUNK_DEPTH) return 'secret_chamber';
    return getBiomeForDepth(cy, rng);
  }

  private generateSurfaceChunk(tiles: Tile[][], cx: number, rng: () => number): void {
    // Sky rows
    for (let r = 0; r < SURFACE_TILE_ROW; r++) {
      for (let c = 0; c < CHUNK_SIZE; c++) {
        tiles[r][c] = makeTile('air');
      }
    }
    // Grass row
    for (let c = 0; c < CHUNK_SIZE; c++) {
      tiles[SURFACE_TILE_ROW][c] = makeTile('grass');
    }
    // Soil below grass
    for (let r = SURFACE_TILE_ROW + 1; r < CHUNK_SIZE; r++) {
      for (let c = 0; c < CHUNK_SIZE; c++) {
        const kind: TileKind = rng() < 0.07 ? 'coal' : 'soil';
        tiles[r][c] = makeTile(kind);
      }
    }
    // Dig opening in centre chunk only
    if (cx === 1) {
      const mid = Math.floor(CHUNK_SIZE / 2);
      tiles[SURFACE_TILE_ROW][mid - 1] = makeTile('air');
      tiles[SURFACE_TILE_ROW][mid]     = makeTile('air');
      tiles[SURFACE_TILE_ROW][mid + 1] = makeTile('air');
      // Sell point
      tiles[SURFACE_TILE_ROW][mid - 5] = makeTile('sell_point');
      tiles[SURFACE_TILE_ROW - 1][mid - 5] = makeTile('air');
    }
    // Border bedrock
    for (let r = 0; r < CHUNK_SIZE; r++) {
      if (cx === 0) tiles[r][0] = makeTile('bedrock');
      if (cx === WORLD_WIDTH_CHUNKS - 1) tiles[r][CHUNK_SIZE - 1] = makeTile('bedrock');
    }
  }

  private generateUndergroundChunk(
    tiles: Tile[][], cx: number, cy: number, biome: BiomeId, rng: () => number,
  ): void {
    const biomeDef = BIOME_DEFS[biome];
    const caveMap = biomeDef.specialFeatures.includes('cave') ? generateCaveMap(rng, biome) : null;

    for (let r = 0; r < CHUNK_SIZE; r++) {
      for (let c = 0; c < CHUNK_SIZE; c++) {
        // Hard borders
        if (cx === 0 && c === 0) { tiles[r][c] = makeTile('bedrock'); continue; }
        if (cx === WORLD_WIDTH_CHUNKS - 1 && c === CHUNK_SIZE - 1) { tiles[r][c] = makeTile('bedrock'); continue; }

        // Cave air pockets
        if (caveMap && caveMap[r][c]) { tiles[r][c] = makeTile('air'); continue; }

        // Base tile with variation
        const variant = Math.floor(rng() * 4);
        let kind: TileKind = biomeDef.baseTile;

        // Ore placement
        for (const ore of biomeDef.ores) {
          if (ore.minDepth <= cy && rng() < ore.weight) {
            kind = ore.kind;
            break;
          }
        }

        tiles[r][c] = makeTile(kind, variant);
      }
    }

    // Ore veins — special clusters
    for (const ore of biomeDef.ores) {
      if (ore.clusterSize && ore.minDepth <= cy && rng() < 0.15) {
        const startR = Math.floor(rng() * CHUNK_SIZE);
        const startC = 1 + Math.floor(rng() * (CHUNK_SIZE - 2));
        carveVein(tiles, rng, startR, startC, ore.kind, ore.clusterSize * 3);
      }
    }

    // Secret chamber in deep chunks
    if (biome === 'secret_chamber') {
      this.carveSecretChamber(tiles, cx, rng);
    }

    // Underground lakes (void biome)
    if (biomeDef.specialFeatures.includes('lake') && rng() < 0.25) {
      this.carveLake(tiles, rng);
    }

    // Abandoned shaft vertical corridor
    if (biomeDef.specialFeatures.includes('shaft') && rng() < 0.1 && cx === 1) {
      for (let r = 0; r < CHUNK_SIZE; r++) {
        tiles[r][Math.floor(CHUNK_SIZE / 2)] = makeTile('air');
      }
    }
  }

  private carveSecretChamber(tiles: Tile[][], cx: number, rng: () => number): void {
    if (cx !== 1) return; // only centre chunk
    // Outer walls
    for (let r = 2; r < CHUNK_SIZE - 2; r++) {
      for (let c = 2; c < CHUNK_SIZE - 2; c++) {
        tiles[r][c] = makeTile('ancient_brick');
      }
    }
    // Hollow interior
    for (let r = 4; r < CHUNK_SIZE - 4; r++) {
      for (let c = 4; c < CHUNK_SIZE - 4; c++) {
        tiles[r][c] = makeTile('air');
      }
    }
    // Place artifact in centre
    const mid = Math.floor(CHUNK_SIZE / 2);
    tiles[mid][mid] = makeTile('artifact');
    // Scatter ancient coins around the artifact
    for (let i = 0; i < 6; i++) {
      const r = 5 + Math.floor(rng() * (CHUNK_SIZE - 10));
      const c = 5 + Math.floor(rng() * (CHUNK_SIZE - 10));
      if (tiles[r][c].kind === 'air') tiles[r][c] = makeTile('ancient_brick');
    }
  }

  private carveLake(tiles: Tile[][], rng: () => number): void {
    const lakeR = 2 + Math.floor(rng() * (CHUNK_SIZE - 6));
    const lakeC = 2 + Math.floor(rng() * (CHUNK_SIZE - 6));
    const radius = 2 + Math.floor(rng() * 3);
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (dr * dr + dc * dc <= radius * radius) {
          const r = lakeR + dr; const c = lakeC + dc;
          if (r >= 0 && r < CHUNK_SIZE && c >= 1 && c < CHUNK_SIZE - 1) {
            tiles[r][c] = makeTile('air');
          }
        }
      }
    }
  }

  /** Evict least-recently-used chunks once over cap */
  private evictIfNeeded(): void {
    if (this.chunks.size <= this.maxCachedChunks) return;
    let oldest = Infinity;
    let oldestKey = '';
    for (const [k, c] of this.chunks) {
      if (c.lastAccessed < oldest) { oldest = c.lastAccessed; oldestKey = k; }
    }
    if (oldestKey) this.chunks.delete(oldestKey);
  }

  /** World-space pixel position → world tile row/col */
  static worldPixelToTile(px: number, py: number): { row: number; col: number } {
    return { row: Math.floor(py / TILE_SIZE), col: Math.floor(px / TILE_SIZE) };
  }

  /** Tile row → depth below surface in tiles */
  static tileDepth(tileRow: number): number {
    return Math.max(0, tileRow - SURFACE_TILE_ROW);
  }

  /** Tile row → chunk row */
  static tileToChunkRow(tileRow: number): number {
    return Math.floor(tileRow / CHUNK_SIZE);
  }
}
