import type {
  GameState, SaveData, SerializedPlayer, SerializedChunk,
  SerializedStatistics, Chunk, Tile,
} from '../types';
import { CHUNK_SIZE } from '../types';
import { defaultSettings } from '../data/defaults';

const SAVE_KEY = 'deepdig_save_v2';
const SAVE_VERSION = 2;

export class SaveManager {
  static save(state: GameState): void {
    try {
      const data = SaveManager.serialize(state);
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Save failed:', e);
    }
  }

  static load(): GameState | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as SaveData;
      return SaveManager.migrate(data);
    } catch (e) {
      console.warn('Load failed:', e);
      return null;
    }
  }

  static hasSave(): boolean {
    return !!localStorage.getItem(SAVE_KEY);
  }

  static deleteSave(): void {
    localStorage.removeItem(SAVE_KEY);
  }

  private static serialize(state: GameState): SaveData {
    const chunkData: SerializedChunk[] = [];
    for (const [, chunk] of state.chunks) {
      const flatTiles = chunk.tiles.flat().map(t => ({
        kind: t.kind, hp: t.hp, maxHp: t.maxHp, revealed: t.revealed,
        ...(t.variant !== undefined ? { variant: t.variant } : {}),
        ...(t.glowing ? { glowing: true } : {}),
      }));
      chunkData.push({ cx: chunk.cx, cy: chunk.cy, biome: chunk.biome, tiles: flatTiles });
    }

    const player: SerializedPlayer = {
      x: state.player.x,
      y: state.player.y,
      energy: state.player.energy,
      maxEnergy: state.player.maxEnergy,
      money: state.player.money,
      inventory: [...state.player.inventory],
      inventoryCapacity: state.player.inventoryCapacity,
      upgrades: { ...state.player.upgrades },
      deepestDepth: state.player.deepestDepth,
      facing: state.player.facing,
      teleportCharges: state.player.teleportCharges,
      permanentBonuses: [...state.player.permanentBonuses],
    };

    const stats: SerializedStatistics = {
      ...state.statistics,
      biomesDiscovered: [...state.statistics.biomesDiscovered],
    };

    return {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      mode: state.mode,
      seed: state.seed,
      player,
      chunkData,
      achievements: state.achievements.map(a => ({ ...a })),
      quests: state.quests.map(q => ({ ...q })),
      statistics: stats,
      settings: { ...state.settings },
      secretFound: state.secretFound,
      playTime: state.playTime,
      currentBiome: state.currentBiome,
    };
  }

  private static migrate(data: SaveData): GameState | null {
    if (!data.version || data.version < 1) return null;

    const chunks = new Map<string, Chunk>();
    for (const sc of data.chunkData) {
      const tiles: Tile[][] = [];
      for (let r = 0; r < CHUNK_SIZE; r++) {
        tiles[r] = [];
        for (let c = 0; c < CHUNK_SIZE; c++) {
          const flat = sc.tiles[r * CHUNK_SIZE + c];
          tiles[r][c] = {
            kind: flat.kind,
            hp: flat.hp,
            maxHp: flat.maxHp,
            revealed: flat.revealed,
            variant: flat.variant,
            glowing: flat.glowing,
          };
        }
      }
      chunks.set(`${sc.cx},${sc.cy}`, {
        cx: sc.cx, cy: sc.cy, biome: sc.biome,
        tiles,
        generated: true, dirty: true,
        lastAccessed: Date.now(),
      });
    }

    const rawStats = data.statistics;
    const stats = {
      ...rawStats,
      biomesDiscovered: new Set(rawStats.biomesDiscovered),
      // Migration: add surfaceReturns if loading an older save
      surfaceReturns: (rawStats as unknown as Record<string, number>)['surfaceReturns'] ?? 0,
    };

    const p = data.player;
    const state: GameState = {
      screen: 'playing',
      mode: data.mode ?? 'normal',
      player: {
        x: p.x, y: p.y,
        visualX: p.x, visualY: p.y,
        energy: p.energy, maxEnergy: p.maxEnergy,
        money: p.money,
        inventory: p.inventory,
        inventoryCapacity: p.inventoryCapacity,
        upgrades: p.upgrades,
        deepestDepth: p.deepestDepth,
        facing: p.facing ?? 'right',
        teleportCharges: p.teleportCharges ?? 0,
        shakeAmount: 0,
        permanentBonuses: p.permanentBonuses ?? [],
      },
      chunks,
      seed: data.seed,
      worldWidthChunks: 3,
      tick: 0,
      floatTexts: [],
      achievements: data.achievements,
      quests: data.quests,
      statistics: stats,
      settings: { ...defaultSettings(), ...data.settings },
      secretFound: data.secretFound,
      tutorialStep: 0,
      challengeModeUnlocked: data.secretFound,
      playTime: data.playTime,
      currentBiome: data.currentBiome ?? 'surface',
    };

    return state;
  }
}
