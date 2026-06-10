import type {
  GameState, Player, UpgradeId, ItemId, AchievementId,
  QuestId, GameMode, BiomeId,
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
import { WorldManager } from './WorldManager';
import { audioManager } from './AudioManager';
import type { ParticleManager } from './ParticleManager';
import { defaultSettings } from '../data/defaults';

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
    drill: 0, jetpack: 0, scanner: 0, auto_collect: 0, critical_chance: 0,
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
  };

  // Initialise quests — first 3 active, rest locked
  const quests = QUEST_ORDER.map((id, i) => ({
    id, status: (i < 3 ? 'active' : 'locked') as 'active' | 'locked',
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
    },
    settings: defaultSettings(),
    secretFound: false, tutorialStep: 0,
    challengeModeUnlocked: false,
    playTime: 0,
    currentBiome: 'surface',
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
  const radius = lightRadius(player.upgrades.lantern);
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
  if (state.settings.soundEnabled) audioManager.biomeEnter(biome);

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
  const energyCost = Math.max(0, baseCost - energyCostReduction(player.upgrades.reinforced_picks));
  if (player.energy < energyCost) {
    spawnFloat(state, targetCol * TILE_SIZE + TILE_SIZE / 2, targetRow * TILE_SIZE, 'Low energy!', '#ff4444');
    if (state.settings.soundEnabled) audioManager.lowEnergy();
    unlockAchievement(state, 'no_energy_dig');
    return { success: false, message: 'no_energy' };
  }

  player.energy = Math.max(0, player.energy - energyCost);

  // Damage calculation
  let dmg = shovelDamage(shovelLv);
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
    spawnFloat(state, targetCol * TILE_SIZE + TILE_SIZE / 2, targetRow * TILE_SIZE - 8, 'CRIT!', '#ffd700');
    player.shakeAmount = Math.max(player.shakeAmount, 5);
  } else {
    player.shakeAmount = Math.max(player.shakeAmount, 2);
  }

  if (tile.hp <= 0) {
    breakTile(state, wm, pm, targetRow, targetCol, tile.kind, dmg);
  }

  state.statistics.blocksDug++;
  updateQuestProgress(state, { type: 'dig', count: 1 });
  unlockAchievement(state, 'first_dig');
  checkDigAchievements(state);

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

      // Win condition
      if (drop === 'artifact') {
        state.secretFound = true;
        state.statistics.artifactsCollected++;
        if (state.settings.soundEnabled) { audioManager.secret(); setTimeout(() => audioManager.win(), 800); }
        state.screen = 'win';
        unlockAchievement(state, 'found_artifact');
        unlockAchievement(state, 'mythic_find');
        pm.emitTreasure(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2);
        if (state.playTime < 900) unlockAchievement(state, 'speed_runner');
      }
    }
  }

  // Chest gives coins + energy
  if (kind === 'chest') {
    const bonus = 200 + Math.floor(Math.random() * 400);
    player.money += bonus;
    state.statistics.moneyEarned += bonus;
    state.statistics.treasuresFound++;
    spawnFloat(state, col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE - TILE_SIZE * 2, `+$${bonus}`, '#ffd700');
    pm.emitTreasure(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2);
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
  if (!target || (target.kind !== 'air' && target.kind !== 'sell_point')) return false;

  // Upward movement: requires jetpack OR empty column above
  if (dy < 0 && player.upgrades.jetpack === 0) {
    const current = wm.getTile(player.y, player.x);
    if (!current || (current.kind !== 'air' && current.kind !== 'sell_point')) return false;
  }

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

  // Track surface returns for surface_sprinter achievement
  const prevDepth = WorldManager.tileDepth(player.y - dy);
  if (ny <= SURFACE_TILE_ROW && prevDepth > 0) {
    state.statistics.surfaceReturns++;
    if (state.statistics.surfaceReturns >= 20) unlockAchievement(state, 'surface_sprinter');
  }

  if (target.kind === 'sell_point' && state.settings.autoSell) {
    sellInventory(state);
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
  revealAround(state, wm);
  updateBiome(state, wm);
  if (state.settings.soundEnabled) audioManager.teleport();
  unlockAchievement(state, 'jetpack_user');
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
      // Apply permanent sell multiplier bonuses
      for (const b of player.permanentBonuses) {
        if (b.type === 'sell_multiplier') value = Math.round(value * (1 + b.value));
      }
      // Mode: randomized economy
      if (state.mode === 'randomized_economy') {
        value = Math.round(value * (0.5 + Math.random() * 1.5));
      }
      // Mode: double treasure — already baked into spawning, but double sell
      if (state.mode === 'double_treasure') value *= 2;
      total += value;
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

// ── Achievements ──────────────────────────────────────────────────────────────
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
      q.progress = obj.depth;
      claimQuestIfDone(state, q.id);
    } else if (obj.type === 'buy_upgrades' && event.type === 'buy_upgrades') {
      q.progress += event.count ?? 0;
      if (q.progress >= obj.count) claimQuestIfDone(state, q.id);
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
  if (state.settings.soundEnabled) audioManager.questComplete();

  // Unlock next quest in chain
  const nextId = QUEST_ORDER.find(qid => QUEST_DEFS[qid].unlockAfter === id);
  if (nextId) {
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
