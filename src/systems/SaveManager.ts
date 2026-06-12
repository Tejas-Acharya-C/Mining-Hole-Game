import type {
  GameState, SaveData, SerializedPlayer, SerializedChunk,
  SerializedStatistics, Chunk, Tile, UpgradeId, AchievementId,
} from '../types';
import { CHUNK_SIZE } from '../types';
import { defaultSettings } from '../data/defaults';
import { ACHIEVEMENT_DEFS } from '../data/achievements';
import { QUEST_ORDER } from '../data/quests';

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
      surfacedThisTrip: state.player.surfacedThisTrip,
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
      objectiveStage: state.objectiveStage,
      journalEntries: state.journalEntries ?? [],
      hintsShown: state.hintsShown ?? [],
      milestonesSeen: state.milestonesSeen ?? [],
      artifactActivated: state.artifactActivated,
      facilityUnlocked: state.facilityUnlocked,
      prestigeCount: state.prestigeCount,
      unlockedEnding: state.unlockedEnding,
      chosenSeed: state.chosenSeed,
      activeModifiers: state.activeModifiers,
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
      // Migration: add new stat fields for older saves
      surfaceReturns:      (rawStats as unknown as Record<string, number>)['surfaceReturns']      ?? 0,
      loreFragmentsFound:  (rawStats as unknown as Record<string, number>)['loreFragmentsFound']  ?? 0,
      eventsTriggered:     (rawStats as unknown as Record<string, number>)['eventsTriggered']      ?? 0,
    };

    const p = data.player;

    const defaultUpgrades = {
      shovel: 0, backpack: 0, battery: 0, lantern: 0, boots: 0,
      drill: 0, jetpack: 0, scanner: 0, critical_chance: 0,
      ore_detector: 0, teleport: 0, artifact_sense: 0, reinforced_picks: 0,
    };
    const upgrades = { ...defaultUpgrades, ...p.upgrades };
    delete (upgrades as any).auto_collect;

    const achievements = Object.keys(ACHIEVEMENT_DEFS).map(id => {
      const existing = data.achievements?.find(a => a.id === id);
      return {
        id: id as AchievementId,
        unlocked: existing ? existing.unlocked : false,
        unlockedAt: existing ? existing.unlockedAt : undefined,
        progress: existing ? existing.progress : undefined,
      };
    });

    const quests = QUEST_ORDER.map((id, i) => {
      const existing = data.quests?.find(q => q.id === id);
      return {
        id,
        status: existing ? existing.status : (i < 3 ? 'active' as const : 'locked' as const),
        progress: existing ? existing.progress : 0,
      };
    });

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
        upgrades: upgrades as Record<UpgradeId, number>,
        deepestDepth: p.deepestDepth,
        facing: p.facing ?? 'right',
        teleportCharges: p.teleportCharges ?? 0,
        shakeAmount: 0,
        permanentBonuses: p.permanentBonuses ?? [],
        surfacedThisTrip: p.surfacedThisTrip ?? true,
      },
      chunks,
      seed: data.seed,
      worldWidthChunks: 3,
      tick: 0,
      floatTexts: [],
      achievements,
      quests,
      statistics: stats,
      settings: { ...defaultSettings(), ...data.settings },
      secretFound: data.secretFound,
      tutorialStep: 0,
      challengeModeUnlocked: data.secretFound,
      playTime: data.playTime,
      currentBiome: data.currentBiome ?? 'surface',
      objectiveStage: data.objectiveStage ?? 'new_game',
      journalEntries: data.journalEntries ?? [],
      hintsShown: data.hintsShown ?? [],
      milestonesSeen: data.milestonesSeen ?? [],
      showHintPanel: false,
      showJournal: false,
      showObjectiveTracker: true,
      activeMilestonePopup: null,
      artifactActivated: data.artifactActivated ?? false,
      facilityUnlocked: data.facilityUnlocked ?? false,
      prestigeCount: data.prestigeCount ?? 0,
      unlockedEnding: data.unlockedEnding,
      chosenSeed: data.chosenSeed,
      activeModifiers: data.activeModifiers ?? [],
      // New gameplay fields — defaults on load
      activeEvents: [],
      eventCooldown: 30,
      digCombo: 0,
      comboMultiplier: 1.0,
      lastDigTime: 0,
      hitFlashTile: null,
      depthPressureAlpha: 0,
      introComplete: true, // loaded save = already seen intro
    };

    return state;
  }
}
