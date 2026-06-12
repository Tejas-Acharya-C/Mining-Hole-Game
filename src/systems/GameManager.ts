import type {
  GameState, Player, UpgradeId, ItemId, AchievementId,
  QuestId, GameMode, BiomeId, ActiveEvent,
} from '../types';
import { CHUNK_SIZE } from '../types';
import { ITEM_DEFS, RARITY_ORDER } from '../data/items';
import { UPGRADE_DEFS, upgradeCost, shovelDamage, maxEnergy, energyRegen,
  inventoryCapacity, lightRadius, critChance, energyCostReduction,
  teleportCharges, TILE_MIN_SHOVEL } from '../data/upgrades';
import { ACHIEVEMENT_DEFS } from '../data/achievements';
import { QUEST_DEFS, QUEST_ORDER } from '../data/quests';
import { TILE_ENERGY_COST, TILE_DROPS, TILE_COLORS,
  SURFACE_TILE_ROW, TILE_SIZE, WORLD_WIDTH_CHUNKS } from '../data/tiles';
import { pickEvent, getLoreForDepth } from '../data/events';
import { makePrng, WorldManager } from './WorldManager';
import { audioManager } from './AudioManager';
import type { ParticleManager } from './ParticleManager';
import { defaultSettings } from '../data/defaults';
import { BIOME_DEFS } from '../data/biomes';
import { addJournalEntry } from './ProgressionSystem';

// ── FloatText ID counter ──────────────────────────────────────────────────────
let _ftid = 0;
const ftid = () => ++_ftid;

export function createInitialState(seed?: number, mode: GameMode = 'normal'): GameState {
  const s = seed ?? ((Math.random() * 0xffffffff) >>> 0);
  const totalCols = WORLD_WIDTH_CHUNKS * CHUNK_SIZE;
  const startCol  = Math.floor(totalCols / 2);
  const startRow  = SURFACE_TILE_ROW - 1;

  const upgrades: Record<UpgradeId, number> = {
    shovel: 0, backpack: 0, battery: 0, lantern: 0, boots: 0,
    drill: 0, jetpack: 0, scanner: 0, critical_chance: 0,
    ore_detector: 0, teleport: 0, artifact_sense: 0, reinforced_picks: 0,
  };

  const player: Player = {
    x: startCol, y: startRow,
    visualX: startCol, visualY: startRow,
    energy: 80, maxEnergy: 80,
    money: mode === 'hard' ? 0 : 0,
    inventory: [], inventoryCapacity: 20,
    upgrades, deepestDepth: 0,
    facing: 'right',
    teleportCharges: 0,
    shakeAmount: 0,
    permanentBonuses: [],
    surfacedThisTrip: true,
  };

  // Initialise quests — quests without dependencies start active, others remain locked until unlocked
  const quests = QUEST_ORDER.map((id) => ({
    id,
    status: QUEST_DEFS[id].unlockAfter ? 'locked' : 'active' as 'active' | 'locked',
    progress: 0,
  }));

  const achievements = Object.keys(ACHIEVEMENT_DEFS).map(id => ({
    id: id as AchievementId, unlocked: false,
  }));

  const chunks = new Map();

  const state: GameState = {
    screen: 'playing', mode,
    player, chunks,
    seed: s,
    worldWidthChunks: WORLD_WIDTH_CHUNKS,
    tick: 0,
    floatTexts: [],
    achievements, quests,
    statistics: {
      blocksDug: 0, distanceReached: 0,
      moneyEarned: 0, moneySpent: 0,
      rareItemsFound: 0, playTimeSeconds: 0,
      sellCount: 0, sellTotalValue: 0,
      treasuresFound: 0, artifactsCollected: 0,
      upgradesPurchased: 0,
      biomesDiscovered: new Set<BiomeId>(['surface']),
      itemsCollected: {},
      questsCompleted: 0, criticalHits: 0, totalDamageDealt: 0,
      runStartTime: Date.now(),
      surfaceReturns: 0,
      loreFragmentsFound: 0,
      eventsTriggered: 0,
    },
    settings: defaultSettings(),
    secretFound: false, tutorialStep: 0,
    challengeModeUnlocked: false,
    playTime: 0,
    currentBiome: 'surface',
    activeEvents: [],
    eventCooldown: 20,      // 20s before first event
    digCombo: 0,
    comboMultiplier: 1.0,
    lastDigTime: 0,
    hitFlashTile: null,
    depthPressureAlpha: 0,
    introComplete: false,
    objectiveStage: 'new_game',
    journalEntries: [{ type: 'milestone', title: 'Began the dig beneath the old site.', date: Date.now() }],
    hintsShown: [],
    milestonesSeen: [],
    showObjectiveTracker: true,
    showHintPanel: false,
    showJournal: false,
    activeMilestonePopup: null,
  };

  // Pre-generate visible chunks
  const wm = new WorldManager(s, chunks);
  for (let cx = 0; cx < WORLD_WIDTH_CHUNKS; cx++) {
    wm.getChunk(cx, 0);
    wm.getChunk(cx, 1);
  }

  revealAround(state, wm);
  return state;
}

// ── Light reveal ──────────────────────────────────────────────────────────────
export function revealAround(state: GameState, wm: WorldManager): void {
  const { player } = state;
  const radius = lightRadius(player.upgrades.lantern, state.activeModifiers);
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      if (dr * dr + dc * dc > radius * radius) continue;
      const tile = wm.getTile(player.y + dr, player.x + dc);
      if (tile) tile.revealed = true;
    }
  }
}

// ── Biome detection ───────────────────────────────────────────────────────────
export function updateBiome(state: GameState, wm: WorldManager): void {
  const chunkDepth = WorldManager.tileToChunkRow(state.player.y);
  const chunk = wm.getChunk(Math.floor(state.player.x / CHUNK_SIZE), chunkDepth);
  const biome = chunk.biome;
  if (biome === state.currentBiome) return;

  state.currentBiome = biome;
  state.statistics.biomesDiscovered.add(biome);
  addJournalEntry(state, 'discovery', `Entered ${BIOME_DEFS[biome].label}.`);
  if (state.settings.soundEnabled) audioManager.biomeEnter(biome);

  // Trigger transition banner
  state.biomeTransition = {
    name: BIOME_DEFS[biome].label,
    life: 3.0,
    maxLife: 3.0,
  };

  if (biome === 'crystal_cavern') unlockAchievement(state, 'crystal_cavern');
  if (biome === 'fossil_zone')    unlockAchievement(state, 'fossil_zone_found');
  if (biome === 'void_realm')     unlockAchievement(state, 'void_realm_found');
  if (biome === 'secret_chamber') unlockAchievement(state, 'secret_hunter');
  if (state.statistics.biomesDiscovered.size >= 5) unlockAchievement(state, 'biome_explorer');

  for (const q of state.quests) {
    if (q.status !== 'active') continue;
    const def = QUEST_DEFS[q.id];
    if (def.objective.type === 'find_biome' && def.objective.biome === biome) {
      q.progress = 1;
      claimQuestIfDone(state, q.id);
    }
  }
}

// ── Dig action ────────────────────────────────────────────────────────────────
export function tryDig(
  state: GameState, wm: WorldManager, pm: ParticleManager,
  targetRow: number, targetCol: number,
): { success: boolean; message?: string } {
  const tile = wm.getTile(targetRow, targetCol);
  if (!tile || tile.kind === 'air' || tile.kind === 'sell_point' || tile.kind === 'bedrock') {
    return { success: false };
  }

  const { player } = state;
  const shovelLv = player.upgrades.shovel;
  const minShovel = TILE_MIN_SHOVEL[tile.kind] ?? 0;

  if (shovelLv < minShovel) {
    spawnFloat(state, targetCol * TILE_SIZE + TILE_SIZE / 2, targetRow * TILE_SIZE, 'Need better tool!', '#ff8844');
    return { success: false, message: 'need_upgrade' };
  }

  const baseCost = TILE_ENERGY_COST[tile.kind] ?? 2;
  let energyCost = Math.max(0, baseCost - energyCostReduction(player.upgrades.reinforced_picks));
  if (energyCost > 0 && state.prestigeCount) {
    energyCost = Math.max(1, energyCost - state.prestigeCount);
  }
  if (player.energy < energyCost) {
    spawnFloat(state, targetCol * TILE_SIZE + TILE_SIZE / 2, targetRow * TILE_SIZE, 'Low energy!', '#ff4444');
    if (state.settings.soundEnabled) audioManager.lowEnergy();
    unlockAchievement(state, 'no_energy_dig');
    return { success: false, message: 'no_energy' };
  }

  player.energy = Math.max(0, player.energy - energyCost);

  // Damage calculation
  let dmg = shovelDamage(shovelLv);
  if (state.activeModifiers?.includes('low_gravity')) {
    dmg *= 2;
  }
  let isCrit = false;
  if (critChance(player.upgrades.critical_chance) > Math.random()) {
    dmg *= 3;
    isCrit = true;
    state.statistics.criticalHits++;
    if (state.settings.soundEnabled) audioManager.criticalHit();
  }
  tile.hp -= dmg;
  state.statistics.totalDamageDealt += dmg;

  // Sound + particles
  const hardness = minShovel;
  if (state.settings.soundEnabled) audioManager.dig(hardness);

  pm.emitDigDebris(
    targetCol * TILE_SIZE + TILE_SIZE / 2,
    targetRow * TILE_SIZE + TILE_SIZE / 2,
    TILE_COLORS[tile.kind] ?? '#888', hardness > 2,
    state.settings.particleQuality,
  );

  if (isCrit) {
    state.hitStopTimer = 0.045;
    spawnFloat(state, targetCol * TILE_SIZE + TILE_SIZE / 2, targetRow * TILE_SIZE - 8, 'CRIT!', '#ffd700');
    player.shakeAmount = Math.max(player.shakeAmount, 6);
  } else {
    player.shakeAmount = Math.max(player.shakeAmount, 2.5);
  }

  if (tile.hp <= 0) {
    const isRare = ['ruby', 'sapphire', 'emerald', 'crystal', 'relic', 'artifact', 'void_stone', 'ancient_terminal', 'resonance_stabilizer'].includes(tile.kind);
    if (isRare) {
      state.hitStopTimer = 0.06;
    }
    breakTile(state, wm, pm, targetRow, targetCol, tile.kind, dmg);
  }

  // Combo tracking
  const now = Date.now();
  if (now - state.lastDigTime < 600) {
    state.digCombo = Math.min(state.digCombo + 1, 20);
    state.comboMultiplier = 1 + Math.floor(state.digCombo / 5) * 0.1;
    if (state.digCombo === 5 || state.digCombo === 10 || state.digCombo === 15 || state.digCombo === 20) {
      spawnFloat(state, targetCol * TILE_SIZE + TILE_SIZE / 2, targetRow * TILE_SIZE - TILE_SIZE * 2,
        `COMBO ×${state.digCombo}!`, state.digCombo >= 15 ? '#ff69b4' : '#fbbf24', 1.3);
    }
  } else {
    state.digCombo = 1;
    state.comboMultiplier = 1.0;
  }
  state.lastDigTime = now;

  // Hit flash
  state.hitFlashTile = { row: targetRow, col: targetCol, life: 1.0 };

  state.statistics.blocksDug++;
  updateQuestProgress(state, { type: 'dig', count: 1 });
  unlockAchievement(state, 'first_dig');
  checkDigAchievements(state);

  // Depth pressure effect
  const depth = WorldManager.tileDepth(state.player.y);
  state.depthPressureAlpha = Math.min(0.5, depth / 200);

  return { success: true };
}

// Tile colours — imported at top of file

function breakTile(
  state: GameState, wm: WorldManager,
  pm: ParticleManager,
  row: number, col: number, kind: string, dmg: number,
): void {
  const { player } = state;
  if (state.settings.soundEnabled) {
    const rarityDef = ITEM_DEFS[TILE_DROPS[kind as keyof typeof TILE_DROPS] as ItemId];
    audioManager.break(rarityDef ? RARITY_ORDER[rarityDef.rarity] : 0);
  }

  // Sparkle for rare ores
  const drop = TILE_DROPS[kind as keyof typeof TILE_DROPS];
  if (drop) {
    const def = ITEM_DEFS[drop as ItemId];
    if (def) {
      pm.emitSparkle(
        col * TILE_SIZE + TILE_SIZE / 2,
        row * TILE_SIZE + TILE_SIZE / 2,
        def.color,
        state.settings.particleQuality,
      );
    }
  }

  wm.setTile(row, col, { kind: 'air', hp: 0, maxHp: 0, revealed: true });

  // Collect item
  if (drop) {
    const collected = tryCollectItem(state, drop as ItemId, 1);
    if (!collected) {
      spawnFloat(state, col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE, 'Inventory full!', '#ff8844');
    } else {
      const def = ITEM_DEFS[drop as ItemId];
      if (state.settings.soundEnabled) audioManager.pickup(RARITY_ORDER[def.rarity]);
      spawnFloat(state, col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE - TILE_SIZE, `+${def.label}`, def.color);
      trackItemCollection(state, drop as ItemId, def.rarity);

      // Win condition is now replaced with midgame event trigger
      if (drop === 'artifact') {
        state.secretFound = true;
        state.statistics.artifactsCollected++;
        if (state.settings.soundEnabled) audioManager.secret();
        unlockAchievement(state, 'found_artifact');
        unlockAchievement(state, 'mythic_find');
        pm.emitTreasure(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2);
        if (state.playTime < 900) unlockAchievement(state, 'speed_runner');

        spawnFloat(state, col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE - TILE_SIZE * 2, 'CORE ARTIFACT ACQUIRED!', '#ffd700', 1.4);
        spawnFloat(state, col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE - TILE_SIZE * 3.5, 'Activate at surface terminal!', '#fbbf24', 1.2);

        state.biomeTransition = {
          name: 'Core Artifact Acquired',
          life: 4.0,
          maxLife: 4.0,
        };
        addJournalEntry(state, 'milestone', 'Recovered the buried artifact.');
      }
    }
  }

  // Chest gives coins + energy + endgame keys
  if (kind === 'chest') {
    const bonus = 200 + Math.floor(Math.random() * 400);
    player.money += bonus;
    state.statistics.moneyEarned += bonus;
    state.statistics.treasuresFound++;
    spawnFloat(state, col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE - TILE_SIZE * 2, `+$${bonus}`, '#ffd700');
    pm.emitTreasure(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2);

    const chunkDepth = WorldManager.tileToChunkRow(row);
    if (chunkDepth === 10 && !player.inventory.some(s => s.itemId === 'facility_key')) {
      player.inventory.push({ itemId: 'facility_key', qty: 1 });
      addJournalEntry(state, 'discovery', 'Recovered the Facility Key from the Ancient Facility.');
      spawnFloat(state, col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE - TILE_SIZE * 3, 'Found Facility Keycard!', '#a855f7', 1.2);
      if (state.settings.soundEnabled) audioManager.discovery();
    } else if (chunkDepth === 12 && !player.inventory.some(s => s.itemId === 'core_stabilizer')) {
      player.inventory.push({ itemId: 'core_stabilizer', qty: 1 });
      spawnFloat(state, col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE - TILE_SIZE * 3, 'Found Core Stabilizer!', '#f97316', 1.2);
      if (state.settings.soundEnabled) audioManager.discovery();
    } else if (chunkDepth === 14 && !player.inventory.some(s => s.itemId === 'fracture_shard')) {
      player.inventory.push({ itemId: 'fracture_shard', qty: 1 });
      spawnFloat(state, col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE - TILE_SIZE * 3, 'Found Fracture Shard!', '#ec4899', 1.2);
      if (state.settings.soundEnabled) audioManager.discovery();
    }
  }

  // Drill: splash damage to adjacent tiles
  if (player.upgrades.drill > 0 && kind !== 'artifact') {
    const drillChance = player.upgrades.drill * 0.25;
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]] as const;
    for (const [dr, dc] of dirs) {
      const adj = wm.getTile(row + dr, col + dc);
      if (adj && adj.kind !== 'air' && adj.kind !== 'bedrock' && adj.kind !== 'sell_point') {
        if (Math.random() < drillChance) {
          adj.hp -= dmg * 0.6;
          if (adj.hp <= 0) {
            const adjDrop = TILE_DROPS[adj.kind as keyof typeof TILE_DROPS];
            wm.setTile(row + dr, col + dc, { kind: 'air', hp: 0, maxHp: 0, revealed: true });
            if (adjDrop) tryCollectItem(state, adjDrop as ItemId, 1);
          }
        }
      }
    }
  }
}

// ── Item collection ────────────────────────────────────────────────────────────
function tryCollectItem(state: GameState, itemId: ItemId, qty = 1): boolean {
  const { player } = state;

  if (state.activeModifiers?.includes('double_ore') && itemId !== 'facility_key' && itemId !== 'core_stabilizer' && itemId !== 'fracture_shard' && itemId !== 'artifact') {
    qty *= 2;
  }

  const cap = inventoryCapacity(player.upgrades.backpack);
  const current = player.inventory.reduce((s, sl) => s + sl.qty, 0);
  if (current + qty > cap) return false;

  const slot = player.inventory.find(s => s.itemId === itemId);
  if (slot) {
    slot.qty += qty;
  } else {
    player.inventory.push({ itemId, qty });
  }

  // Full inventory achievement
  if (current + qty >= cap) unlockAchievement(state, 'inventory_full');

  return true;
}

function trackItemCollection(state: GameState, itemId: ItemId, rarity: string): void {
  const stats = state.statistics;
  stats.itemsCollected[itemId] = (stats.itemsCollected[itemId] ?? 0) + 1;

  if (RARITY_ORDER[rarity] >= 3) stats.rareItemsFound++;
  if (rarity === 'legendary') unlockAchievement(state, 'legendary_find');

  if (itemId === 'relic')        unlockAchievement(state, 'found_relic');
  if (itemId === 'void_crystal') unlockAchievement(state, 'found_void_crystal');
  if (itemId === 'ancient_coin') unlockAchievement(state, 'found_ancient_coin');

  updateQuestProgress(state, { type: 'collect', itemId, qty: 1 });

  if (itemId === 'ruby' || itemId === 'sapphire' || itemId === 'emerald') {
    updateQuestProgress(state, { type: 'collect_all_gems' });
  }

  const coalCount    = state.statistics.itemsCollected['coal']    ?? 0;
  const goldCount    = state.statistics.itemsCollected['gold']    ?? 0;
  const crystalCount = state.statistics.itemsCollected['crystal'] ?? 0;
  if (coalCount    >= 50) unlockAchievement(state, 'collect_coal_50');
  if (goldCount    >= 25) unlockAchievement(state, 'collect_gold_25');
  if (crystalCount >=  5) unlockAchievement(state, 'collect_crystal_5');

  const oreTypes: ItemId[] = ['coal','iron','silver','gold','ruby','sapphire','emerald','crystal'];
  if (oreTypes.every(id => (state.statistics.itemsCollected[id] ?? 0) > 0)) {
    unlockAchievement(state, 'ore_collector');
  }
}

// ── Movement ──────────────────────────────────────────────────────────────────
export function tryMove(
  state: GameState, wm: WorldManager,
  dx: number, dy: number,
): boolean {
  const { player } = state;
  const nx = player.x + dx;
  const ny = player.y + dy;

  if (nx < 0 || nx >= WORLD_WIDTH_CHUNKS * CHUNK_SIZE) return false;
  if (ny < 0) return false;

  const target = wm.getTile(ny, nx);
  if (!target || (target.kind !== 'air' &&
                  target.kind !== 'sell_point' &&
                  target.kind !== 'ancient_terminal' &&
                  target.kind !== 'resonance_stabilizer')) return false;

  // Upward movement: requires jetpack OR wall to climb (solid tile on left or right)
  if (dy < 0 && player.upgrades.jetpack === 0 && player.y > SURFACE_TILE_ROW) {
    const leftTile = wm.getTile(player.y, player.x - 1);
    const rightTile = wm.getTile(player.y, player.x + 1);
    const hasWall = (leftTile && leftTile.kind !== 'air' && leftTile.kind !== 'sell_point') ||
                    (rightTile && rightTile.kind !== 'air' && rightTile.kind !== 'sell_point');
    if (!hasWall) return false;
  }

  const prevDepth = WorldManager.tileDepth(player.y);

  if (dx > 0) player.facing = 'right';
  if (dx < 0) player.facing = 'left';

  player.x = nx;
  player.y = ny;
  if (state.settings.soundEnabled) audioManager.step();

  const depth = WorldManager.tileDepth(ny);
  if (depth > player.deepestDepth) {
    player.deepestDepth = depth;
    state.statistics.distanceReached = Math.max(state.statistics.distanceReached, depth);
    checkDepthAchievements(state, depth);
    updateQuestProgress(state, { type: 'depth', depth });
    audioManager.updateDepthMusic(depth);
  }

  // Surface trip tracking for deep_diver achievement
  if (ny <= SURFACE_TILE_ROW) {
    player.surfacedThisTrip = true;
  } else if (prevDepth === 0) {
    player.surfacedThisTrip = false;
  }

  if (depth >= 50 && !player.surfacedThisTrip) {
    unlockAchievement(state, 'deep_diver');
  }

  // Track surface returns for surface_sprinter achievement
  if (ny <= SURFACE_TILE_ROW && prevDepth > 0) {
    state.statistics.surfaceReturns++;
    if (state.statistics.surfaceReturns >= 20) unlockAchievement(state, 'surface_sprinter');
    const quest = state.quests.find(q => q.id === 'q_no_surface_run');
    if (quest && quest.status === 'active') {
      quest.progress = 0;
    }
  }

  if (target.kind === 'sell_point' && state.settings.autoSell) {
    sellInventory(state);
  }
  if (target.kind === 'ancient_terminal') {
    interactAncientTerminal(state, wm);
  }
  if (target.kind === 'resonance_stabilizer') {
    interactResonanceStabilizer(state);
  }
  if (state.activeModifiers?.includes('low_gravity')) {
    player.energy = Math.max(0, player.energy - 1);
  }

  revealAround(state, wm);
  updateBiome(state, wm);
  return true;
}

// ── Teleport ──────────────────────────────────────────────────────────────────
export function useTeleport(state: GameState, wm: WorldManager): boolean {
  if (state.player.teleportCharges <= 0) return false;
  state.player.teleportCharges--;
  // Find surface open column
  const totalCols = WORLD_WIDTH_CHUNKS * CHUNK_SIZE;
  const startCol = Math.floor(totalCols / 2);
  state.player.x = startCol;
  state.player.y = SURFACE_TILE_ROW - 1;
  state.player.surfacedThisTrip = true;
  revealAround(state, wm);
  updateBiome(state, wm);
  if (state.settings.soundEnabled) audioManager.teleport();
  return true;
}

// ── Sell ──────────────────────────────────────────────────────────────────────
export function sellInventory(state: GameState): number {
  const { player, statistics } = state;
  let total = 0;
  const isFull = player.inventory.reduce((s, sl) => s + sl.qty, 0) >= inventoryCapacity(player.upgrades.backpack);

  for (const slot of player.inventory) {
    const def = ITEM_DEFS[slot.itemId];
    if (def.sellValue > 0) {
      let value = def.sellValue * slot.qty;
      // Prestige sell bonus
      if (state.prestigeCount) {
        value = Math.round(value * (1 + state.prestigeCount * 0.5));
      }
      // Apply permanent sell multiplier bonuses
      for (const b of player.permanentBonuses) {
        if (b.type === 'sell_multiplier') value = Math.round(value * (1 + b.value));
      }
      // Combo bonus
      if (state.comboMultiplier > 1) value = Math.round(value * state.comboMultiplier);
      // Mode: randomized economy
      if (state.mode === 'randomized_economy') {
        value = Math.round(value * (0.5 + Math.random() * 1.5));
      }
      if (state.mode === 'double_treasure') value *= 2;
      total += value;
      updateQuestProgress(state, { type: 'sell_item', itemId: slot.itemId, qty: slot.qty });
    }
  }
  if (total === 0) return 0;

  player.inventory = player.inventory.filter(s => ITEM_DEFS[s.itemId].sellValue === 0);
  player.money += total;
  statistics.moneyEarned += total;
  statistics.sellCount++;
  statistics.sellTotalValue += total;

  if (state.settings.soundEnabled) audioManager.sell(total);
  spawnFloat(state, player.x * TILE_SIZE + TILE_SIZE / 2, player.y * TILE_SIZE - TILE_SIZE * 2, `+$${total}`, '#22c55e');

  // Achievements
  unlockAchievement(state, 'first_sale');
  if (isFull) unlockAchievement(state, 'sold_while_full');
  if (statistics.moneyEarned >= 1000)   unlockAchievement(state, 'rich_1k');
  if (statistics.moneyEarned >= 10000)  unlockAchievement(state, 'rich_10k');
  if (statistics.moneyEarned >= 100000) unlockAchievement(state, 'rich_100k');
  if (statistics.sellCount >= 10)       unlockAchievement(state, 'sell_10_times');
  if (statistics.sellTotalValue >= 1000)  unlockAchievement(state, 'sell_total_1k');
  if (statistics.sellTotalValue >= 10000) unlockAchievement(state, 'sell_total_10k');

  updateQuestProgress(state, { type: 'sell', totalValue: total });

  return total;
}

// ── Upgrade purchase ──────────────────────────────────────────────────────────
export function buyUpgrade(state: GameState, id: UpgradeId): boolean {
  const { player } = state;
  // No shop challenge mode
  if (state.mode === 'no_shop') return false;
  const def = UPGRADE_DEFS[id];
  const level = player.upgrades[id];
  if (level >= def.maxLevel) return false;

  const locked = (def.unlockDepth ?? 0) > player.deepestDepth;
  if (locked) return false;

  const cost = upgradeCost(id, level);
  if (player.money < cost) return false;

  player.money -= cost;
  state.statistics.moneySpent += cost;
  player.upgrades[id] = level + 1;

  // Apply immediate stat updates
  player.maxEnergy = maxEnergy(player.upgrades.battery);
  player.energy = Math.min(player.energy, player.maxEnergy);
  player.inventoryCapacity = inventoryCapacity(player.upgrades.backpack);
  player.teleportCharges = teleportCharges(player.upgrades.teleport);

  state.statistics.upgradesPurchased++;
  if (state.settings.soundEnabled) audioManager.upgrade();
  if (player.money === 0) unlockAchievement(state, 'broke');

  // Achievements
  unlockAchievement(state, 'first_upgrade');
  if (player.upgrades.shovel >= UPGRADE_DEFS.shovel.maxLevel) unlockAchievement(state, 'max_shovel');
  if (player.upgrades.battery >= UPGRADE_DEFS.battery.maxLevel) unlockAchievement(state, 'max_battery');
  if (player.upgrades.lantern >= UPGRADE_DEFS.lantern.maxLevel) unlockAchievement(state, 'max_lantern');
  if (id === 'jetpack') unlockAchievement(state, 'jetpack_user');

  // Check all upgrades bought
  const allBought = (Object.keys(UPGRADE_DEFS) as UpgradeId[]).every(uid => player.upgrades[uid] > 0);
  if (allBought) unlockAchievement(state, 'all_upgrades');

  updateQuestProgress(state, { type: 'buy_upgrades', count: 1 });
  if (id === 'battery' && player.upgrades.battery >= 6) {
    updateQuestProgress(state, { type: 'max_battery' });
  }

  return true;
}

// ── Energy regen ──────────────────────────────────────────────────────────────
export function tickEnergy(state: GameState, dt: number): void {
  const { player } = state;
  let regen = energyRegen(player.upgrades.battery);
  for (const b of player.permanentBonuses) {
    if (b.type === 'energy_regen') regen += b.value;
  }
  // Hard mode: reduced regen
  if (state.mode === 'hard') regen *= 0.6;
  // No battery mode: very slow
  if (state.mode === 'no_battery') regen = 1;
  player.energy = Math.min(player.maxEnergy, player.energy + regen * dt);
}

// ── Screen shake decay ────────────────────────────────────────────────────────
export function tickScreenShake(state: GameState, dt: number): void {
  if (state.player.shakeAmount > 0) {
    state.player.shakeAmount = Math.max(0, state.player.shakeAmount - dt * 20);
  }
}

// ── Float text helpers ────────────────────────────────────────────────────────
export function spawnFloat(state: GameState, x: number, y: number, text: string, color: string, scale = 1): void {
  state.floatTexts.push({ id: ftid(), x, y, text, color, life: 1, scale });
}

export function tickFloatTexts(state: GameState, dt: number): void {
  for (const f of state.floatTexts) {
    f.y  -= dt * 45;
    f.life -= dt * 1.4;
  }
  // Remove dead — only filter when there are expired items
  let hasExpired = false;
  for (const f of state.floatTexts) if (f.life <= 0) { hasExpired = true; break; }
  if (hasExpired) state.floatTexts = state.floatTexts.filter(f => f.life > 0);
}

export function tickBiomeTransition(state: GameState, dt: number): void {
  if (state.biomeTransition) {
    state.biomeTransition.life -= dt;
    if (state.biomeTransition.life <= 0) {
      state.biomeTransition = undefined;
    }
  }
}

// ── Dynamic event tick ────────────────────────────────────────────────────────

export function tickEvents(state: GameState, wm: WorldManager, pm: ParticleManager, dt: number): void {
  state.eventCooldown -= dt;

  // Tick existing events' proximity effects
  for (const event of state.activeEvents) {
    if (event.triggered) continue;
    const dx = Math.abs(state.player.x - event.worldCol);
    const dy = Math.abs(state.player.y - event.worldRow);
    if (dx <= event.radius && dy <= event.radius) {
      triggerEvent(state, wm, pm, event);
    }
  }
  // Remove triggered events
  state.activeEvents = state.activeEvents.filter(e => !e.triggered);

  // Maybe spawn a new event
  if (state.eventCooldown <= 0 && state.screen === 'playing') {
    const depth = WorldManager.tileDepth(state.player.y);
    const rng = makePrng((state.seed ^ state.tick ^ Date.now()) >>> 0);
    const template = pickEvent(depth, rng);
    if (template) {
      const eventId = state.tick;
      const spread = 8;
      const ev: ActiveEvent = {
        id: eventId,
        kind: template.kind,
        worldRow: state.player.y + 2 + Math.floor(rng() * spread),
        worldCol: state.player.x + Math.floor((rng() - 0.5) * 10),
        radius: template.radius,
        label: template.label,
        description: template.description,
        color: template.color,
        lifeSeconds: 0,
        triggered: false,
      };
      state.activeEvents.push(ev);
      // Show indicator
      spawnFloat(state, ev.worldCol * TILE_SIZE + TILE_SIZE / 2,
        ev.worldRow * TILE_SIZE - TILE_SIZE, ev.label, ev.color, 1.1);
    }
    // Randomize next cooldown: 30–90s, gets shorter with depth
    const baseCooldown = Math.max(20, 70 - depth * 0.3);
    state.eventCooldown = baseCooldown * (0.7 + Math.random() * 0.6);
  }

  // Lore fragment discovery check
  const lore = getLoreForDepth(
    WorldManager.tileDepth(state.player.y),
    state.statistics.loreFragmentsFound,
  );
  if (lore && state.statistics.blocksDug > 0 && state.statistics.blocksDug % 30 === 0) {
    state.statistics.loreFragmentsFound++;
    spawnFloat(state,
      state.player.x * TILE_SIZE + TILE_SIZE / 2,
      state.player.y * TILE_SIZE - TILE_SIZE * 3,
      `📜 ${lore.title}`, '#e8c880', 1.2);
    if (state.settings.soundEnabled) audioManager.discovery();
  }
}

// (event IDs use state.tick — no separate counter needed)

function triggerEvent(state: GameState, wm: WorldManager, pm: ParticleManager, event: ActiveEvent): void {
  event.triggered = true;
  state.statistics.eventsTriggered++;
  if (state.settings.soundEnabled) audioManager.eventTrigger(event.kind);

  switch (event.kind) {
    case 'treasure_vault':
      triggerTreasureVault(state, wm, pm, event);
      break;
    case 'crystal_bloom':
      triggerCrystalBloom(state, wm, pm, event);
      break;
    case 'lost_cache':
      triggerLostCache(state, pm, event);
      break;
    case 'energy_surge':
      triggerEnergySurge(state, pm, event);
      break;
    case 'ore_vein_rich':
      triggerRichVein(state, wm, event);
      break;
    case 'fossil_discovery':
      triggerFossilDiscovery(state, wm, pm, event);
      break;
    case 'cave_echo':
      triggerCaveEcho(state, wm, event);
      break;
    case 'ancient_inscription':
      triggerAncientInscription(state, pm, event);
      break;
  }
}

function triggerTreasureVault(state: GameState, wm: WorldManager, pm: ParticleManager, event: ActiveEvent): void {
  const count = 3 + Math.floor(Math.random() * 4);
  for (let i = 0; i < count; i++) {
    const r = event.worldRow + Math.floor((Math.random() - 0.5) * event.radius * 2);
    const c = event.worldCol + Math.floor((Math.random() - 0.5) * event.radius * 2);
    const tile = wm.getTile(r, c);
    if (tile && tile.kind !== 'air' && tile.kind !== 'bedrock' && tile.kind !== 'sell_point') {
      wm.setTile(r, c, { kind: 'chest', hp: 30, maxHp: 30, revealed: tile.revealed });
      pm.emitTreasure(c * TILE_SIZE + TILE_SIZE / 2, r * TILE_SIZE + TILE_SIZE / 2);
    }
  }
  spawnFloat(state, event.worldCol * TILE_SIZE + TILE_SIZE / 2,
    event.worldRow * TILE_SIZE - TILE_SIZE * 2, '🏆 VAULT UNSEALED!', '#ffd700', 1.5);
}

function triggerCrystalBloom(state: GameState, wm: WorldManager, pm: ParticleManager, event: ActiveEvent): void {
  const count = 5 + Math.floor(Math.random() * 6);
  for (let i = 0; i < count; i++) {
    const r = event.worldRow + Math.floor((Math.random() - 0.5) * event.radius * 2);
    const c = event.worldCol + Math.floor((Math.random() - 0.5) * event.radius * 2);
    const tile = wm.getTile(r, c);
    if (tile && tile.kind !== 'air' && tile.kind !== 'bedrock') {
      wm.setTile(r, c, { kind: 'crystal', hp: 85, maxHp: 85, revealed: tile.revealed, glowing: true });
      pm.emitSparkle(c * TILE_SIZE + TILE_SIZE / 2, r * TILE_SIZE + TILE_SIZE / 2, '#cc44ff', 'high');
    }
  }
  spawnFloat(state, event.worldCol * TILE_SIZE + TILE_SIZE / 2,
    event.worldRow * TILE_SIZE - TILE_SIZE * 2, '💎 CRYSTAL BLOOM!', '#cc44ff', 1.4);
}

function triggerLostCache(state: GameState, pm: ParticleManager, event: ActiveEvent): void {
  const bonus = 150 + Math.floor(Math.random() * 350);
  state.player.money += Math.round(bonus * state.comboMultiplier);
  state.statistics.moneyEarned += bonus;
  spawnFloat(state, event.worldCol * TILE_SIZE + TILE_SIZE / 2,
    event.worldRow * TILE_SIZE - TILE_SIZE, `+$${bonus} Found!`, '#22c55e', 1.3);
  pm.emitTreasure(event.worldCol * TILE_SIZE + TILE_SIZE / 2, event.worldRow * TILE_SIZE + TILE_SIZE / 2);
  state.statistics.treasuresFound++;
}

function triggerEnergySurge(state: GameState, pm: ParticleManager, event: ActiveEvent): void {
  const restored = Math.min(state.player.maxEnergy, state.player.maxEnergy * 0.6);
  state.player.energy = Math.min(state.player.maxEnergy, state.player.energy + restored);
  spawnFloat(state, event.worldCol * TILE_SIZE + TILE_SIZE / 2,
    event.worldRow * TILE_SIZE - TILE_SIZE, '⚡ Energy Restored!', '#44ffaa', 1.3);
  pm.emit({ kind: 'spark', x: state.player.x * TILE_SIZE + TILE_SIZE / 2,
    y: state.player.y * TILE_SIZE + TILE_SIZE / 2, color: '#44ffaa',
    count: 16, speedMin: 2, speedMax: 5, gravity: 0, fade: 1.5 });
}

function triggerRichVein(state: GameState, wm: WorldManager, event: ActiveEvent): void {
  const oresByDepth = ['coal','iron','silver','gold','ruby','crystal'];
  const depth = WorldManager.tileDepth(event.worldRow);
  const tier = Math.min(Math.floor(depth / 20), oresByDepth.length - 1);
  const kind = oresByDepth[tier] as import('../types').TileKind;
  const count = 8 + Math.floor(Math.random() * 8);
  for (let i = 0; i < count; i++) {
    const r = event.worldRow + Math.floor((Math.random() - 0.5) * event.radius * 2);
    const c = event.worldCol + Math.floor((Math.random() - 0.5) * event.radius * 2);
    const tile = wm.getTile(r, c);
    if (tile && tile.kind !== 'air' && tile.kind !== 'bedrock') {
      const hp = 28 + tier * 10;
      wm.setTile(r, c, { kind, hp, maxHp: hp, revealed: tile.revealed });
    }
  }
  spawnFloat(state, event.worldCol * TILE_SIZE + TILE_SIZE / 2,
    event.worldRow * TILE_SIZE - TILE_SIZE * 2, `⛏ RICH VEIN!`, '#fbbf24', 1.4);
}

function triggerFossilDiscovery(state: GameState, wm: WorldManager, pm: ParticleManager, event: ActiveEvent): void {
  const count = 6 + Math.floor(Math.random() * 6);
  for (let i = 0; i < count; i++) {
    const r = event.worldRow + Math.floor((Math.random() - 0.5) * event.radius * 2);
    const c = event.worldCol + Math.floor((Math.random() - 0.5) * event.radius * 2);
    const tile = wm.getTile(r, c);
    if (tile && tile.kind !== 'air' && tile.kind !== 'bedrock') {
      wm.setTile(r, c, { kind: 'fossil', hp: 35, maxHp: 35, revealed: tile.revealed });
    }
  }
  state.statistics.loreFragmentsFound++;
  spawnFloat(state, event.worldCol * TILE_SIZE + TILE_SIZE / 2,
    event.worldRow * TILE_SIZE - TILE_SIZE * 2, '🦕 FOSSIL BED!', '#c8a96e', 1.3);
  pm.emitSparkle(event.worldCol * TILE_SIZE + TILE_SIZE / 2, event.worldRow * TILE_SIZE, '#c8a96e', 'medium');
}

function triggerCaveEcho(state: GameState, wm: WorldManager, event: ActiveEvent): void {
  // Reveal a large area around event
  for (let dr = -event.radius; dr <= event.radius; dr++) {
    for (let dc = -event.radius; dc <= event.radius; dc++) {
      if (dr * dr + dc * dc <= event.radius * event.radius) {
        const tile = wm.getTile(event.worldRow + dr, event.worldCol + dc);
        if (tile) tile.revealed = true;
      }
    }
  }
  spawnFloat(state, event.worldCol * TILE_SIZE + TILE_SIZE / 2,
    event.worldRow * TILE_SIZE - TILE_SIZE * 2, '🗺 Area Revealed!', '#60a5fa', 1.3);
}

function triggerAncientInscription(state: GameState, pm: ParticleManager, event: ActiveEvent): void {
  state.statistics.loreFragmentsFound++;
  // Small permanent energy bonus
  state.player.permanentBonuses.push({ type: 'energy_regen', value: 0.3 });
  spawnFloat(state, event.worldCol * TILE_SIZE + TILE_SIZE / 2,
    event.worldRow * TILE_SIZE - TILE_SIZE * 2, '📜 Inscription Found!', '#e8c880', 1.4);
  pm.emitSparkle(event.worldCol * TILE_SIZE + TILE_SIZE / 2, event.worldRow * TILE_SIZE, '#e8c880', 'high');
}

// ── Energy cell consume ───────────────────────────────────────────────────────

export function consumeEnergyCell(state: GameState, pm: ParticleManager): boolean {
  const slot = state.player.inventory.find(s => s.itemId === 'energy_cell');
  if (!slot || slot.qty === 0) return false;
  slot.qty--;
  if (slot.qty === 0) {
    state.player.inventory = state.player.inventory.filter(s => s.itemId !== 'energy_cell');
  }
  state.player.energy = Math.min(state.player.maxEnergy, state.player.energy + 40);
  spawnFloat(state, state.player.x * TILE_SIZE + TILE_SIZE / 2,
    state.player.y * TILE_SIZE - TILE_SIZE, '+40 Energy', '#44ffaa', 1.1);
  pm.emit({ kind: 'spark', x: state.player.x * TILE_SIZE + TILE_SIZE / 2,
    y: state.player.y * TILE_SIZE + TILE_SIZE / 2, color: '#44ffaa',
    count: 10, speedMin: 1.5, speedMax: 3, gravity: -30, fade: 2 });
  if (state.settings.soundEnabled) audioManager.pickup(1);
  return true;
}

// ── Sell with combo bonus ─────────────────────────────────────────────────────
export function unlockAchievement(state: GameState, id: AchievementId): void {
  const ach = state.achievements.find(a => a.id === id);
  if (!ach || ach.unlocked) return;
  ach.unlocked = true;
  ach.unlockedAt = Date.now();
  if (state.settings.soundEnabled) audioManager.achievement();

  // Completionist check
  const others = state.achievements.filter(a => a.id !== 'completionist');
  if (others.every(a => a.unlocked)) unlockAchievement(state, 'completionist');
}

function checkDepthAchievements(state: GameState, depth: number): void {
  if (depth >= 10)  unlockAchievement(state, 'depth_10');
  if (depth >= 25)  unlockAchievement(state, 'depth_25');
  if (depth >= 50)  unlockAchievement(state, 'depth_50');
  if (depth >= 100) unlockAchievement(state, 'depth_100');
  if (depth >= 200) unlockAchievement(state, 'depth_200');
  if (depth >= 500) unlockAchievement(state, 'depth_500');
}

function checkDigAchievements(state: GameState): void {
  const dug = state.statistics.blocksDug;
  if (dug >= 100)  unlockAchievement(state, 'dig_100');
  if (dug >= 500)  unlockAchievement(state, 'dig_500');
  if (dug >= 1000) unlockAchievement(state, 'dig_1000');
  if (dug >= 5000) unlockAchievement(state, 'dig_5000');
}

// ── Quests ────────────────────────────────────────────────────────────────────
export function updateQuestProgress(
  state: GameState,
  event: { type: string; count?: number; totalValue?: number; itemId?: string; depth?: number; qty?: number },
): void {
  for (const q of state.quests) {
    if (q.status !== 'active') continue;
    const def = QUEST_DEFS[q.id];
    const obj = def.objective;

    if (obj.type === 'dig' && event.type === 'dig') {
      q.progress += event.count ?? 0;
      if (q.progress >= obj.count) claimQuestIfDone(state, q.id);
    } else if (obj.type === 'sell' && event.type === 'sell') {
      q.progress += event.totalValue ?? 0;
      if (q.progress >= obj.totalValue) claimQuestIfDone(state, q.id);
    } else if (obj.type === 'collect' && event.type === 'collect' && event.itemId === obj.itemId) {
      q.progress += event.qty ?? 0;
      if (q.progress >= obj.count) claimQuestIfDone(state, q.id);
    } else if (obj.type === 'depth' && event.type === 'depth' && (event.depth ?? 0) >= obj.depth) {
      if (q.id === 'q_speed_50') {
        if (state.playTime <= 300) {
          q.progress = obj.depth;
          claimQuestIfDone(state, q.id);
        }
      } else {
        q.progress = obj.depth;
        claimQuestIfDone(state, q.id);
      }
    } else if (obj.type === 'buy_upgrades' && event.type === 'buy_upgrades') {
      q.progress += event.count ?? 0;
      if (q.progress >= obj.count) claimQuestIfDone(state, q.id);
    } else if (obj.type === 'sell_item' && event.type === 'sell_item' && event.itemId === obj.itemId) {
      q.progress += event.qty ?? 0;
      if (q.progress >= obj.count) claimQuestIfDone(state, q.id);
    } else if (obj.type === 'max_battery') {
      if (state.player.upgrades.battery >= 6) {
        q.progress = 1;
        claimQuestIfDone(state, q.id);
      }
    } else if (obj.type === 'collect_all_gems' && event.type === 'collect_all_gems') {
      const hasRuby = (state.statistics.itemsCollected['ruby'] ?? 0) >= 1;
      const hasSapphire = (state.statistics.itemsCollected['sapphire'] ?? 0) >= 1;
      const hasEmerald = (state.statistics.itemsCollected['emerald'] ?? 0) >= 1;
      let count = 0;
      if (hasRuby) count++;
      if (hasSapphire) count++;
      if (hasEmerald) count++;
      q.progress = count;
      if (count >= 3) claimQuestIfDone(state, q.id);
    }
  }
}

function claimQuestIfDone(state: GameState, id: QuestId): void {
  const q = state.quests.find(qq => qq.id === id);
  if (!q || q.status !== 'active') return;
  q.status = 'completed';

  const def = QUEST_DEFS[id];
  if (def.reward.money) {
    state.player.money += def.reward.money;
    state.statistics.moneyEarned += def.reward.money;
    spawnFloat(state, state.player.x * TILE_SIZE, state.player.y * TILE_SIZE - TILE_SIZE * 3, `Quest: +$${def.reward.money}`, '#ffd700', 1.2);
  }
  if (def.reward.permanentBonus) {
    state.player.permanentBonuses.push(def.reward.permanentBonus);
  }

  state.statistics.questsCompleted++;
  addJournalEntry(state, 'quest', `Completed quest: ${def.title}.`);
  if (state.settings.soundEnabled) audioManager.questComplete();

  // Unlock any quests that are waiting on this quest
  for (const nextId of QUEST_ORDER.filter(qid => QUEST_DEFS[qid].unlockAfter === id)) {
    const nextQ = state.quests.find(qq => qq.id === nextId);
    if (nextQ && nextQ.status === 'locked') nextQ.status = 'active';
  }

  if (state.statistics.questsCompleted >= 3) unlockAchievement(state, 'quest_complete_3');
  if (state.statistics.questsCompleted >= QUEST_ORDER.length) unlockAchievement(state, 'quest_complete_all');
}

// ── Game helpers ──────────────────────────────────────────────────────────────

export function playerDepth(player: Player): number {
  return WorldManager.tileDepth(player.y);
}

export function interactAncientTerminal(state: GameState, wm: WorldManager): void {
  const { player } = state;
  
  // Case 1: Has artifact, activate Facility
  if (player.inventory.some(s => s.itemId === 'artifact') && !state.artifactActivated) {
    player.inventory = player.inventory.filter(s => s.itemId !== 'artifact');
    state.artifactActivated = true;
    wm.artifactActivated = true;
    
    // Clear cached deep chunks (cy >= 10)
    for (const key of Array.from(state.chunks.keys())) {
      const [, cyStr] = key.split(',');
      if (parseInt(cyStr) >= 10) {
        state.chunks.delete(key);
      }
    }
    
    if (state.settings.soundEnabled) audioManager.secret();
    player.shakeAmount = 15;
    spawnFloat(state, player.x * TILE_SIZE + TILE_SIZE / 2, player.y * TILE_SIZE - TILE_SIZE, 'OVERLINK ESTABLISHED!', '#3b82f6', 1.3);
    state.biomeTransition = {
      name: 'ANCIENT FACILITY UNLOCKED',
      life: 4.0,
      maxLife: 4.0,
    };
    addJournalEntry(state, 'milestone', 'Activated the ancient terminal.');
    return;
  }
  
  // Case 2: Has facility_key, unlock World Core
  if (player.inventory.some(s => s.itemId === 'facility_key') && !state.facilityUnlocked) {
    player.inventory = player.inventory.filter(s => s.itemId !== 'facility_key');
    state.facilityUnlocked = true;
    wm.facilityUnlocked = true;
    
    // Clear cached core chunks (cy >= 12)
    for (const key of Array.from(state.chunks.keys())) {
      const [, cyStr] = key.split(',');
      if (parseInt(cyStr) >= 12) {
        state.chunks.delete(key);
      }
    }
    
    if (state.settings.soundEnabled) audioManager.secret();
    player.shakeAmount = 15;
    spawnFloat(state, player.x * TILE_SIZE + TILE_SIZE / 2, player.y * TILE_SIZE - TILE_SIZE, 'GEOTHERMAL Core Online!', '#f97316', 1.3);
    state.biomeTransition = {
      name: 'WORLD CORE UNLOCKED',
      life: 4.0,
      maxLife: 4.0,
    };
    addJournalEntry(state, 'milestone', 'Unlocked the path to the World Core.');
    return;
  }
  
  if (!state.artifactActivated) {
    spawnFloat(state, player.x * TILE_SIZE + TILE_SIZE / 2, player.y * TILE_SIZE - TILE_SIZE, 'Requires Core Artifact', '#ff4444');
  } else if (!state.facilityUnlocked) {
    spawnFloat(state, player.x * TILE_SIZE + TILE_SIZE / 2, player.y * TILE_SIZE - TILE_SIZE, 'Requires Facility Keycard', '#a855f7');
  } else {
    spawnFloat(state, player.x * TILE_SIZE + TILE_SIZE / 2, player.y * TILE_SIZE - TILE_SIZE, 'Terminal fully initialized', '#44ffaa');
  }
}

export function interactResonanceStabilizer(state: GameState): void {
  state.atEndgameStabilizer = true;
  addJournalEntry(state, 'milestone', 'Unlocked the final ending choice.');
}

export function tickHazards(state: GameState, wm: WorldManager, dt: number): void {
  const { player } = state;
  if (player.y <= SURFACE_TILE_ROW + 10) return;
  
  const coords = [
    [player.y, player.x],
    [player.y - 1, player.x],
    [player.y + 1, player.x],
    [player.y, player.x - 1],
    [player.y, player.x + 1],
  ];
  
  let totalDrain = 0;
  for (const [r, c] of coords) {
    const tile = wm.getTile(r, c);
    if (tile) {
      if (tile.kind === 'security_grid') {
        totalDrain += 1.5 * dt;
      } else if (tile.kind === 'magma_rock' && state.currentBiome === 'world_core') {
        totalDrain += 1.0 * dt;
      } else if (tile.kind === 'void_stone' && state.currentBiome === 'reality_fracture') {
        totalDrain += 2.0 * dt;
      }
    }
  }
  
  if (totalDrain > 0) {
    player.energy = Math.max(0, player.energy - totalDrain);
    if (state.tick % 90 === 0) {
      spawnFloat(state, player.x * TILE_SIZE + TILE_SIZE / 2, player.y * TILE_SIZE - TILE_SIZE, '⚡ HAZARD DRAIN!', '#ef4444', 0.95);
    }
  }
}
