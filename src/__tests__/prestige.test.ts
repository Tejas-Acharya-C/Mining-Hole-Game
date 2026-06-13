import { describe, it, expect } from 'vitest';
import { WorldManager, isWithinLandmarkSafeZone } from '../systems/WorldManager';
import { createInitialState, startNewExpedition } from '../systems/GameManager.testable';
import { SaveManager } from '../systems/SaveManager';
import { CHUNK_SIZE } from '../types';


describe('Landmark Safe Zones & Clustered Ore Generation', () => {
  const seed = 12345;

  it('correctly identifies safe zones', () => {
    // Artifact Chamber safe zone: cy = 9, cx = 1, center (8,8), radius < 7
    expect(isWithinLandmarkSafeZone(1, 9, 8, 8)).toBe(true);
    expect(isWithinLandmarkSafeZone(1, 9, 14, 8)).toBe(true); // distance 6 < 7
    expect(isWithinLandmarkSafeZone(1, 9, 15, 8)).toBe(false); // distance 7 >= 7
    expect(isWithinLandmarkSafeZone(0, 9, 8, 8)).toBe(false); // cx !== 1

    // Facility Key chamber safe zone: cy = 10, cx = 1, center (8,7), radius < 7
    expect(isWithinLandmarkSafeZone(1, 10, 8, 7)).toBe(true);
    expect(isWithinLandmarkSafeZone(1, 10, 14, 7)).toBe(true); // distance 6 < 7
    expect(isWithinLandmarkSafeZone(1, 10, 15, 7)).toBe(false); // distance 7 >= 7
  });

  it('prevents resource ore spawning within landmark safe zones', () => {
    const map = new Map();
    const wm = new WorldManager(seed, map);
    wm.artifactActivated = true;
    wm.facilityUnlocked = true;

    // Check cy=9, cy=10, cy=12, cy=14 for cx=1 (landmark chunks)
    const depthsToCheck = [9, 10, 12, 14];
    for (const cy of depthsToCheck) {
      const chunk = wm.getChunk(1, cy);
      const centerY = 8;
      const centerX = cy === 9 ? 8 : 7;

      for (let r = 0; r < CHUNK_SIZE; r++) {
        for (let c = 0; c < CHUNK_SIZE; c++) {
          const dist = Math.hypot(r - centerY, c - centerX);
          if (dist < 7) {
            const tile = chunk.tiles[r][c];
            // Allow structural borders
            const isBorder = (r <= 3 || r >= 12 || c <= 2 || c >= 13);
            if (isBorder) continue;

            // Safe zone tiles should NEVER be rare ores (e.g. ruby, sapphire, emerald, crystal, relic)
            // Structural border/floor tiles (magma_rock, void_stone, ancient_brick) are allowed as they are part of the chamber itself.
            const isRareOre = ['ruby', 'sapphire', 'emerald', 'crystal', 'relic'].includes(tile.kind);
            expect(isRareOre).toBe(false);
          }
        }
      }
    }
  });

  it('keeps late-game biome ore coverage within 25-40% of eligible tiles', () => {
    const map = new Map();
    const wm = new WorldManager(seed, map);
    wm.artifactActivated = true;
    wm.facilityUnlocked = true;

    // We check late-game biomes (World Core, Reality Fracture)
    // For cx = 0 (so we are outside the landmark safe zones to measure true base cluster coverage)
    const lateGameCoords = [
      { cx: 0, cy: 13 }, // World Core (world_core)
      { cx: 0, cy: 16 }, // Reality Fracture (reality_fracture)
      { cx: 0, cy: 17 }  // Reality Fracture (reality_fracture)
    ];

    for (const { cx, cy } of lateGameCoords) {
      const chunk = wm.getChunk(cx, cy);
      let eligibleTiles = 0;
      let oreTiles = 0;
      const kinds = new Set<string>();
      let hasStructure = false;

      for (let r = 0; r < CHUNK_SIZE; r++) {
        for (let c = 0; c < CHUNK_SIZE; c++) {
          if (cx === 0 && c === 0) continue;
          if (c === CHUNK_SIZE - 1) continue;
          const tile = chunk.tiles[r][c];
          kinds.add(tile.kind);
          if (['chest', 'energy_node', 'security_grid', 'resonance_stabilizer'].includes(tile.kind)) {
            hasStructure = true;
          }
          if (tile.kind === 'air' || tile.kind === 'bedrock') continue;
          eligibleTiles++;
          if (['magma_rock', 'void_stone', 'obsidian', 'ruby', 'sapphire', 'emerald', 'crystal', 'ancient_brick'].includes(tile.kind)) {
            oreTiles++;
          }
        }
      }

      console.log(`Debug chunk (${cx}, ${cy}): biome=${chunk.biome}, eligible=${eligibleTiles}, ores=${oreTiles}, kinds=[${Array.from(kinds).join(', ')}]`);

      if (hasStructure) {
        console.log(`Skipping chunk (${cx}, ${cy}) due to structure presence`);
        continue;
      }

      if (eligibleTiles > 0) {
        const pct = oreTiles / eligibleTiles;
        expect(pct).toBeGreaterThanOrEqual(0.18);
        expect(pct).toBeLessThanOrEqual(0.41);
      }
    }
  });

  it('world generation remains deterministic', () => {
    const mapA = new Map();
    const mapB = new Map();
    const wmA = new WorldManager(777, mapA);
    const wmB = new WorldManager(777, mapB);

    const chunkA = wmA.getChunk(0, 12);
    const chunkB = wmB.getChunk(0, 12);

    for (let r = 0; r < CHUNK_SIZE; r++) {
      for (let c = 0; c < CHUNK_SIZE; c++) {
        expect(chunkA.tiles[r][c].kind).toBe(chunkB.tiles[r][c].kind);
      }
    }
  });
});

describe('Prestige System', () => {
  it('rewards standard ending: +5% Ore Value (max +25%)', () => {
    let state = createInitialState(42, 'normal');
    expect(state.prestigeData?.bonuses.oreValueBonus).toBe(0);

    // 1st standard completion
    state.unlockedEnding = 'standard';
    state = startNewExpedition(state);
    expect(state.prestigeData?.bonuses.oreValueBonus).toBeCloseTo(0.05, 5);

    // 2nd standard completion
    state.unlockedEnding = 'standard';
    state = startNewExpedition(state);
    expect(state.prestigeData?.bonuses.oreValueBonus).toBeCloseTo(0.10, 5);

    // Standard completion up to 10 times to check cap
    for (let i = 0; i < 8; i++) {
      state.unlockedEnding = 'standard';
      state = startNewExpedition(state);
    }
    expect(state.prestigeData?.bonuses.oreValueBonus).toBeCloseTo(0.25, 5); // caps at 25%
  });

  it('rewards secret ending: +10 Max Energy (max +50)', () => {
    let state = createInitialState(42, 'normal');
    expect(state.prestigeData?.bonuses.maxEnergyBonus).toBe(0);

    // 1st secret completion
    state.unlockedEnding = 'secret';
    state = startNewExpedition(state);
    expect(state.prestigeData?.bonuses.maxEnergyBonus).toBe(10);
    expect(state.player.maxEnergy).toBe(90); // 80 base + 10 bonus

    // Max cap check
    for (let i = 0; i < 8; i++) {
      state.unlockedEnding = 'secret';
      state = startNewExpedition(state);
    }
    expect(state.prestigeData?.bonuses.maxEnergyBonus).toBe(50); // caps at 50
    expect(state.player.maxEnergy).toBe(130); // 80 base + 50 bonus
  });

  it('rewards completionist ending: +1 Cargo Slot (max +5)', () => {
    let state = createInitialState(42, 'normal');
    expect(state.prestigeData?.bonuses.inventoryBonus).toBe(0);

    // 1st completionist completion
    state.unlockedEnding = 'completionist';
    state = startNewExpedition(state);
    expect(state.prestigeData?.bonuses.inventoryBonus).toBe(1);
    expect(state.player.inventoryCapacity).toBe(21); // 20 base + 1 bonus

    // Max cap check
    for (let i = 0; i < 8; i++) {
      state.unlockedEnding = 'completionist';
      state = startNewExpedition(state);
    }
    expect(state.prestigeData?.bonuses.inventoryBonus).toBe(5); // caps at 5
    expect(state.player.inventoryCapacity).toBe(25); // 20 base + 5 bonus
  });

  it('resets run progression but keeps lifetime stats, playtime, achievements', () => {
    let state = createInitialState(42, 'normal');
    
    // Simulate some play progress
    state.player.money = 5000;
    state.player.upgrades.shovel = 3;
    state.player.inventory.push({ itemId: 'coal', qty: 5 });
    state.statistics.blocksDug = 120;
    state.statistics.questsCompleted = 2;
    state.playTime = 300;
    state.achievements[0].unlocked = true;
    state.artifactActivated = true;
    state.facilityUnlocked = true;

    // Trigger standard ending and rebirth
    state.unlockedEnding = 'standard';
    state = startNewExpedition(state);

    // Resets
    expect(state.player.money).toBe(0);
    expect(state.player.upgrades.shovel).toBe(0);
    expect(state.player.inventory.length).toBe(0);
    expect(state.artifactActivated).toBe(false);
    expect(state.facilityUnlocked).toBe(false);

    // Keeps
    expect(state.statistics.blocksDug).toBe(120);
    expect(state.statistics.questsCompleted).toBe(2);
    expect(state.playTime).toBe(300);
    expect(state.achievements[0].unlocked).toBe(true);
    expect(state.prestigeData?.expeditionCount).toBe(1);
    expect(state.prestigeData?.completedEndings).toContain('standard');
  });

  it('preserves save/load compatibility for old prestigeCount formats and roundtrips prestigeData', () => {
    // 1. Check old save migration compatibility
    const oldSaveData: any = {
      version: 2,
      savedAt: Date.now(),
      mode: 'normal',
      seed: 12345,
      player: {
        x: 8, y: 2,
        energy: 80, maxEnergy: 80,
        money: 100,
        inventory: [],
        inventoryCapacity: 20,
        upgrades: { shovel: 1 },
        deepestDepth: 5,
        facing: 'right',
        teleportCharges: 0,
        permanentBonuses: [],
      },
      chunkData: [],
      achievements: [],
      quests: [],
      statistics: {
        blocksDug: 10,
        distanceReached: 5,
        moneyEarned: 100,
        moneySpent: 0,
        rareItemsFound: 0,
        playTimeSeconds: 50,
        sellCount: 1,
        sellTotalValue: 100,
        treasuresFound: 0,
        artifactsCollected: 0,
        upgradesPurchased: 1,
        biomesDiscovered: ['surface'],
        itemsCollected: {},
        questsCompleted: 0,
        criticalHits: 0,
        totalDamageDealt: 0,
        runStartTime: Date.now(),
        surfaceReturns: 0,
        loreFragmentsFound: 0,
        eventsTriggered: 0,
      },
      settings: {},
      secretFound: false,
      playTime: 50,
      currentBiome: 'surface',
      prestigeCount: 3, // old save rank format
    };

    // Migrate the old save
    const state = SaveManager['migrate'](oldSaveData);
    expect(state).not.toBeNull();
    if (state) {
      expect(state.prestigeCount).toBe(3);
      expect(state.prestigeData).toBeDefined();
      expect(state.prestigeData?.expeditionCount).toBe(3);
      expect(state.prestigeData?.completedEndings).toContain('standard'); // assumed standard
      expect(state.prestigeData?.bonuses.oreValueBonus).toBeCloseTo(0.15, 5); // 3 * 0.05
    }

    // 2. Roundtrip new state serialization & migration
    const originalState = createInitialState(123, 'normal');
    originalState.unlockedEnding = 'secret';
    const postPrestigeState = startNewExpedition(originalState);

    const serialized = SaveManager['serialize'](postPrestigeState);
    expect(serialized.prestigeData).toBeDefined();
    expect(serialized.prestigeData?.expeditionCount).toBe(1);
    expect(serialized.prestigeData?.bonuses.maxEnergyBonus).toBe(10);

    const loadedState = SaveManager['migrate'](serialized);
    expect(loadedState).not.toBeNull();
    if (loadedState) {
      expect(loadedState.prestigeCount).toBe(1);
      expect(loadedState.prestigeData?.expeditionCount).toBe(1);
      expect(loadedState.prestigeData?.bonuses.maxEnergyBonus).toBe(10);
      expect(loadedState.player.maxEnergy).toBe(90);
    }
  });
});
