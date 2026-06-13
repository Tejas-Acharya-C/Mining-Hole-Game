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

export function isWithinLandmarkSafeZone(cx: number, cy: number, r: number, c: number): boolean {
  if (cx !== 1) return false;
  if (cy === 9) {
    const dist = Math.hypot(r - 8, c - 8);
    return dist < 7;
  }
  if (cy === 10 || cy === 12 || cy === 14) {
    const dist = Math.hypot(r - 8, c - 7);
    return dist < 7;
  }
  return false;
}

function pickOreKindForBiome(biome: BiomeId, rng: () => number): TileKind | null {
  const biomeDef = BIOME_DEFS[biome];
  if (!biomeDef || biomeDef.ores.length === 0) return null;
  const totalWeight = biomeDef.ores.reduce((sum, ore) => sum + ore.weight, 0);
  if (totalWeight <= 0) return null;
  let r = rng() * totalWeight;
  for (const ore of biomeDef.ores) {
    r -= ore.weight;
    if (r <= 0) return ore.kind;
  }
  return biomeDef.ores[0].kind;
}

function getOreSizeLimit(kind: TileKind): number {
  if (kind === 'relic') return 1;
  if (kind === 'void_stone') return 2;
  if (kind === 'ruby' || kind === 'sapphire' || kind === 'emerald') return 3;
  if (kind === 'gold' || kind === 'ancient_brick') return 4;
  if (kind === 'iron') return 6;
  if (kind === 'coal') return 8;
  return Infinity;
}

function getFillerOreForBiome(biome: BiomeId): TileKind | null {
  if (biome === 'lava_zone' || biome === 'world_core') return 'magma_rock';
  if (biome === 'reality_fracture') return 'crystal';
  return null;
}

function carveVeinBranching(
  tiles: Tile[][],
  rng: () => number,
  startRow: number,
  startCol: number,
  kind: TileKind,
  maxSize: number,
  cx?: number,
  cy?: number,
  fillerKind?: TileKind
): void {
  let placed = 0;
  const queue: [number, number][] = [[startRow, startCol]];
  const visited = new Set<string>();
  const limit = getOreSizeLimit(kind);
  
  while (queue.length > 0 && placed < maxSize) {
    const idx = Math.floor(rng() * queue.length);
    const [r, c] = queue.splice(idx, 1)[0];
    
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    visited.add(key);
    
    if (r >= 0 && r < CHUNK_SIZE && c >= 1 && c < CHUNK_SIZE - 1) {
      if (cx !== undefined && cy !== undefined && isWithinLandmarkSafeZone(cx, cy, r, c)) {
        continue;
      }
      const tile = tiles[r][c];
      if (tile.kind !== 'air' && tile.kind !== 'bedrock' && tile.kind !== 'sell_point') {
        const placeKind = (placed >= limit && fillerKind) ? fillerKind : kind;
        tiles[r][c] = makeTile(placeKind);
        placed++;
      }
    }
    
    const neighbors: [number, number][] = [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1]
    ];
    
    for (let i = neighbors.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]];
    }
    
    for (const [nr, nc] of neighbors) {
      if (nr >= 0 && nr < CHUNK_SIZE && nc >= 1 && nc < CHUNK_SIZE - 1) {
        if (cx !== undefined && cy !== undefined && isWithinLandmarkSafeZone(cx, cy, nr, nc)) {
          continue;
        }
        const dist = Math.hypot(nr - startRow, nc - startCol);
        const spawnProb = Math.max(0.2, 1.0 - dist * 0.25);
        if (rng() < spawnProb) {
          queue.push([nr, nc]);
        }
      }
    }
  }
}

// ── Main chunk generator ──────────────────────────────────────────────────────

export class WorldManager {
  private seed: number;
  private chunks: Map<string, Chunk>;
  private maxCachedChunks = 64;
  public artifactActivated = false;
  public facilityUnlocked = false;

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
      // Ancient Terminal
      tiles[SURFACE_TILE_ROW][mid - 7] = makeTile('ancient_terminal');
      tiles[SURFACE_TILE_ROW - 1][mid - 7] = makeTile('air');
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
    if (cy >= 10 && !this.artifactActivated) {
      for (let r = 0; r < CHUNK_SIZE; r++) {
        for (let c = 0; c < CHUNK_SIZE; c++) {
          tiles[r][c] = makeTile('bedrock');
        }
      }
      return;
    }
    if (cy >= 12 && !this.facilityUnlocked) {
      for (let r = 0; r < CHUNK_SIZE; r++) {
        for (let c = 0; c < CHUNK_SIZE; c++) {
          tiles[r][c] = makeTile('bedrock');
        }
      }
      return;
    }

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
        tiles[r][c] = makeTile(biomeDef.baseTile, variant);
      }
    }

    // Balanced branching ore veins or clustered ore generation for late-game biomes
    const isLateGameBiome = biome === 'secret_chamber' || biome === 'lava_zone' || biome === 'world_core' || biome === 'reality_fracture';

    if (isLateGameBiome) {
      // Clustered ore generation
      // Target 25-40% coverage of eligible (non-air, non-bedrock, non-safezone) tiles in the chunk
      let eligibleCoords: [number, number][] = [];
      for (let r = 0; r < CHUNK_SIZE; r++) {
        for (let c = 0; c < CHUNK_SIZE; c++) {
          if (cx === 0 && c === 0) continue;
          if (cx === WORLD_WIDTH_CHUNKS - 1 && c === CHUNK_SIZE - 1) continue;
          if (tiles[r][c].kind === 'air' || tiles[r][c].kind === 'bedrock') continue;
          if (isWithinLandmarkSafeZone(cx, cy, r, c)) continue;
          eligibleCoords.push([r, c]);
        }
      }

      if (eligibleCoords.length > 0) {
        const targetCoveragePct = 0.34 + rng() * 0.08; // 34% to 42%
        const targetTileCount = Math.floor(eligibleCoords.length * targetCoveragePct);
        const numClusters = 3 + Math.floor(rng() * 4); // 3 to 6 clusters

        let remainingTiles = targetTileCount;
        for (let i = 0; i < numClusters && remainingTiles > 0; i++) {
          const isLast = i === numClusters - 1;
          const clusterSize = isLast ? remainingTiles : Math.max(5, Math.floor((remainingTiles / (numClusters - i)) * (0.7 + rng() * 0.6)));
          remainingTiles -= clusterSize;

          const startIdx = Math.floor(rng() * eligibleCoords.length);
          const startCoord = eligibleCoords[startIdx];
          const oreKind = pickOreKindForBiome(biome, rng);
          if (oreKind && startCoord) {
            const fillerKind = getFillerOreForBiome(biome) ?? undefined;
            carveVeinBranching(tiles, rng, startCoord[0], startCoord[1], oreKind, clusterSize, cx, cy, fillerKind);
          }
        }
      }
    } else {
      // Balanced branching ore veins (standard)
      for (const ore of biomeDef.ores) {
        if (ore.minDepth <= cy && ore.veinsPerChunk !== undefined) {
          for (let i = 0; i < ore.veinsPerChunk; i++) {
            if (ore.spawnChance !== undefined && rng() >= ore.spawnChance) continue;
            
            const startR = Math.floor(rng() * CHUNK_SIZE);
            const startC = 1 + Math.floor(rng() * (CHUNK_SIZE - 2));
            const sizeMin = ore.veinSizeMin ?? 1;
            const sizeMax = ore.veinSizeMax ?? 1;
            const targetSize = sizeMin + Math.floor(rng() * (sizeMax - sizeMin + 1));
            
            carveVeinBranching(tiles, rng, startR, startC, ore.kind, targetSize, cx, cy);
          }
        }
      }
    }

    // Procedural structures (exclude surface and secret chamber)
    if (biome !== 'secret_chamber' && cy > 0) {
      const isEndgameGuaranteed = cx === 1 && (cy === 10 || cy === 12 || cy === 14);
      if (isEndgameGuaranteed) {
        if (cy === 10) {
          this.carveFacilityContainmentChamber(tiles, rng);
        } else if (cy === 12) {
          this.carveGeothermalCore(tiles, rng);
        } else if (cy === 14) {
          this.carveFractureRift(tiles, rng);
        }
      } else {
        const structRoll = rng();
        if (structRoll < 0.08) {
          if (biome === 'crystal_cavern') {
            this.carveCrystalCathedral(tiles, rng);
          } else if (biome === 'fossil_zone') {
            this.carveFossilChamber(tiles, rng);
          } else if (biome === 'void_realm') {
            if (rng() < 0.5) this.carveAncientMachinery(tiles, rng);
            else this.carveBuriedVault(tiles, rng);
          } else if (biome === 'soil_layer' || biome === 'clay_layer') {
            this.carveAbandonedMine(tiles, rng);
          } else {
            if (rng() < 0.5) this.carveBuriedVault(tiles, rng);
            else this.carveAncientMachinery(tiles, rng);
          }
        }
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

  private carveAbandonedMine(tiles: Tile[][], rng: () => number): void {
    const row = 4 + Math.floor(rng() * 6);
    for (let c = 1; c < CHUNK_SIZE - 1; c++) {
      tiles[row][c] = makeTile('air');
      tiles[row - 1][c] = makeTile('air');
    }
    for (let c = 3; c < CHUNK_SIZE - 2; c += 4) {
      tiles[row][c] = makeTile('ladder');
      tiles[row][c + 2] = makeTile('ladder');
      tiles[row - 1][c] = makeTile('ladder');
      tiles[row - 2][c] = makeTile('ladder');
      tiles[row - 2][c + 1] = makeTile('ladder');
      tiles[row - 2][c + 2] = makeTile('ladder');
    }
    const chestCol = rng() < 0.5 ? 2 : CHUNK_SIZE - 3;
    tiles[row][chestCol] = makeTile('chest');
  }

  private carveCrystalCathedral(tiles: Tile[][], _rng: () => number): void {
    const centerR = 8;
    const centerC = 8;
    const radius = 4;
    
    for (let r = centerR - radius; r <= centerR + radius; r++) {
      for (let c = centerC - radius; c <= centerC + radius; c++) {
        const dist = Math.hypot(r - centerR, c - centerC);
        if (dist <= radius) {
          if (r >= 0 && r < CHUNK_SIZE && c >= 1 && c < CHUNK_SIZE - 1) {
            tiles[r][c] = makeTile('air');
          }
        }
      }
    }
    
    for (let r = centerR - radius - 1; r <= centerR + radius + 1; r++) {
      for (let c = centerC - radius - 1; c <= centerC + radius + 1; c++) {
        const dist = Math.hypot(r - centerR, c - centerC);
        if (dist > radius && dist <= radius + 1.2) {
          if (r >= 0 && r < CHUNK_SIZE && c >= 1 && c < CHUNK_SIZE - 1) {
            const t = tiles[r][c];
            if (t.kind !== 'bedrock' && t.kind !== 'air') {
              tiles[r][c] = { kind: 'crystal', hp: 85, maxHp: 85, revealed: false, glowing: true };
            }
          }
        }
      }
    }
    
    tiles[centerR][centerC] = makeTile('chest');
    tiles[centerR + 1][centerC] = makeTile('ancient_brick');
  }

  private carveFossilChamber(tiles: Tile[][], _rng: () => number): void {
    const startR = 4;
    const endR = 11;
    const startC = 3;
    const endC = 12;
    for (let r = startR; r <= endR; r++) {
      for (let c = startC; c <= endC; c++) {
        tiles[r][c] = makeTile('air');
      }
    }
    
    for (let c = startC + 1; c <= endC - 1; c++) {
      tiles[startR + 2][c] = makeTile('fossil');
    }
    for (let c = startC + 2; c <= endC - 2; c += 2) {
      tiles[startR + 1][c] = makeTile('fossil');
      tiles[startR + 3][c] = makeTile('fossil');
    }
    tiles[startR + 2][endC - 1] = makeTile('relic');
  }

  private carveAncientMachinery(tiles: Tile[][], _rng: () => number): void {
    const centerR = 8;
    const centerC = 8;
    const radius = 3;
    
    for (let r = centerR - radius; r <= centerR + radius; r++) {
      for (let c = centerC - radius; c <= centerC + radius; c++) {
        if (Math.hypot(r - centerR, c - centerC) <= radius) {
          if (r >= 0 && r < CHUNK_SIZE && c >= 1 && c < CHUNK_SIZE - 1) {
            tiles[r][c] = makeTile('air');
          }
        }
      }
    }
    
    tiles[centerR][centerC] = makeTile('energy_node');
    tiles[centerR - 1][centerC] = makeTile('ancient_brick');
    tiles[centerR + 1][centerC] = makeTile('ancient_brick');
    tiles[centerR][centerC - 1] = makeTile('ancient_brick');
    tiles[centerR][centerC + 1] = makeTile('ancient_brick');
    
    tiles[centerR + 1][centerC + 1] = makeTile('chest');
  }

  private carveBuriedVault(tiles: Tile[][], rng: () => number): void {
    const startR = 5;
    const startC = 5;
    const wallKind = rng() < 0.5 ? 'ancient_brick' : 'obsidian';
    for (let r = startR; r < startR + 5; r++) {
      for (let c = startC; c < startC + 5; c++) {
        tiles[r][c] = makeTile(wallKind);
      }
    }
    for (let r = startR + 1; r < startR + 4; r++) {
      for (let c = startC + 1; c < startC + 4; c++) {
        tiles[r][c] = makeTile('air');
      }
    }
    tiles[startR + 2][startC + 2] = makeTile('chest');
    tiles[startR + 2][startC + 1] = makeTile('gold');
    tiles[startR + 2][startC + 3] = makeTile('gold');
  }

  private carveFacilityContainmentChamber(tiles: Tile[][], _rng: () => number): void {
    for (let r = 3; r <= 12; r++) {
      for (let c = 2; c <= 13; c++) {
        if (r === 3 || r === 12 || c === 2 || c === 13) {
          tiles[r][c] = makeTile('ancient_brick');
        } else {
          tiles[r][c] = makeTile('air');
        }
      }
    }
    tiles[4][3] = makeTile('security_grid');
    tiles[4][12] = makeTile('security_grid');
    tiles[11][3] = makeTile('security_grid');
    tiles[11][12] = makeTile('security_grid');
    tiles[8][7] = makeTile('chest');
  }

  private carveGeothermalCore(tiles: Tile[][], _rng: () => number): void {
    for (let r = 3; r <= 12; r++) {
      for (let c = 2; c <= 13; c++) {
        if (r === 3 || r === 12 || c === 2 || c === 13) {
          tiles[r][c] = makeTile('magma_rock');
        } else {
          tiles[r][c] = makeTile('air');
        }
      }
    }
    for (let c = 3; c <= 12; c++) {
      tiles[11][c] = makeTile('magma_rock');
    }
    tiles[10][7] = makeTile('chest');
    tiles[11][7] = makeTile('obsidian');
  }

  private carveFractureRift(tiles: Tile[][], _rng: () => number): void {
    for (let r = 2; r <= 13; r++) {
      for (let c = 2; c <= 13; c++) {
        if (r === 2 || r === 13 || c === 2 || c === 13) {
          tiles[r][c] = makeTile('void_stone');
        } else {
          tiles[r][c] = makeTile('air');
        }
      }
    }
    tiles[8][7] = makeTile('resonance_stabilizer');
    tiles[8][6] = makeTile('chest');
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
