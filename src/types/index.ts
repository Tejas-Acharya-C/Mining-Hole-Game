// ═══════════════════════════════════════════════════════════════════════════════
// DEEP DIG — Master Type Definitions
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Tile ──────────────────────────────────────────────────────────────────────

export type TileKind =
  | 'air' | 'grass' | 'soil' | 'clay' | 'stone' | 'hardstone' | 'bedrock'
  | 'coal' | 'iron' | 'silver' | 'gold' | 'ruby' | 'sapphire' | 'emerald'
  | 'crystal' | 'fossil' | 'relic' | 'artifact'
  | 'obsidian' | 'permafrost' | 'magma_rock' | 'void_stone' | 'ancient_brick'
  | 'ladder' | 'sell_point' | 'chest' | 'energy_node'
  | 'ancient_terminal' | 'security_grid' | 'resonance_stabilizer';

export interface Tile {
  kind: TileKind;
  hp: number;
  maxHp: number;
  revealed: boolean;
  glowing?: boolean;     // emits light
  variant?: number;      // 0..3 visual variant for terrain variety
}

// ─── Chunks ────────────────────────────────────────────────────────────────────

export const CHUNK_SIZE = 16; // tiles per chunk (width and height)

export interface Chunk {
  cx: number;            // chunk column index
  cy: number;            // chunk row index
  tiles: Tile[][];       // [row][col], size CHUNK_SIZE × CHUNK_SIZE
  biome: BiomeId;
  generated: boolean;
  dirty: boolean;        // needs re-render to offscreen canvas
  lastAccessed: number;  // timestamp for LRU eviction
}

export type BiomeId =
  | 'surface'
  | 'soil_layer'
  | 'clay_layer'
  | 'stone_layer'
  | 'deep_stone'
  | 'crystal_cavern'
  | 'fossil_zone'
  | 'lava_zone'
  | 'void_realm'
  | 'secret_chamber'
  | 'ancient_facility'
  | 'world_core'
  | 'reality_fracture';

export interface BiomeDef {
  id: BiomeId;
  label: string;
  minDepth: number;   // chunk rows below surface
  maxDepth: number;
  baseTile: TileKind;
  ambientColor: string;
  fogColor: string;
  ores: OreEntry[];
  specialFeatures: SpecialFeature[];
  ambientParticle?: ParticleKind;
  lightLevel: number; // 0..1 base brightness (1 = surface, 0 = void)
}

export interface OreEntry {
  kind: TileKind;   // tile placed in world
  weight: number;
  minDepth: number;
  clusterSize?: number;
  veinsPerChunk?: number;
  veinSizeMin?: number;
  veinSizeMax?: number;
  spawnChance?: number;
}

export type SpecialFeature = 'cave' | 'lake' | 'vein' | 'chamber' | 'shaft' | 'fossil_bed';

// ─── Dynamic Events ────────────────────────────────────────────────────────────

export type EventKind =
  | 'treasure_vault'    // buried chest cluster
  | 'crystal_bloom'     // crystal patch spawns in wall
  | 'lost_cache'        // coins + items scattered
  | 'fossil_discovery'  // fossil bed with lore fragment
  | 'energy_surge'      // nearby energy nodes refill energy
  | 'ore_vein_rich'     // extra-dense ore streak nearby
  | 'cave_echo'         // reveals a large nearby cave
  | 'ancient_inscription'; // lore fragment + permanent bonus

export interface ActiveEvent {
  id: number;
  kind: EventKind;
  worldRow: number;
  worldCol: number;
  radius: number;
  label: string;
  description: string;
  color: string;
  lifeSeconds: number;  // 0 = permanent until triggered
  triggered: boolean;
}

export interface LoreFragment {
  id: string;
  title: string;
  text: string;
  depth: number;
}

// ─── Items ─────────────────────────────────────────────────────────────────────

export type ItemId =
  | 'coal' | 'iron' | 'silver' | 'gold'
  | 'ruby' | 'sapphire' | 'emerald' | 'crystal'
  | 'fossil' | 'relic' | 'artifact'
  | 'obsidian_shard' | 'ice_core' | 'magma_gem' | 'void_crystal' | 'ancient_coin'
  | 'energy_cell' | 'scrap_metal' | 'deep_pearl' | 'sun_stone'
  | 'facility_key' | 'core_stabilizer' | 'fracture_shard';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface ItemDef {
  id: ItemId;
  label: string;
  description: string;
  sellValue: number;
  rarity: Rarity;
  color: string;
  stackSize: number;
  isConsumable?: boolean;
  consumeEffect?: ConsumeEffect;
}

export type ConsumeEffect = { type: 'energy'; amount: number } | { type: 'money'; amount: number };

export interface InventorySlot {
  itemId: ItemId;
  qty: number;
  favorite?: boolean;
}

// ─── Upgrades ──────────────────────────────────────────────────────────────────

export type UpgradeId =
  | 'shovel' | 'backpack' | 'battery' | 'lantern' | 'boots'
  | 'drill' | 'jetpack' | 'scanner' | 'critical_chance'
  | 'ore_detector' | 'teleport' | 'artifact_sense' | 'reinforced_picks';

export interface UpgradeDef {
  id: UpgradeId;
  label: string;
  description: string;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;   // cost[n] = baseCost * costMultiplier^n
  icon: string;
  category: 'combat' | 'utility' | 'exploration' | 'special';
  unlockDepth?: number;     // only visible/purchasable after reaching this depth
}

// ─── Quests ────────────────────────────────────────────────────────────────────

export type QuestId =
  | 'q_dig_100' | 'q_sell_500' | 'q_find_crystal' | 'q_reach_50' | 'q_reach_100'
  | 'q_find_fossil_zone' | 'q_collect_gold_10' | 'q_buy_3_upgrades' | 'q_sell_relic'
  | 'q_reach_200' | 'q_find_void' | 'q_max_battery' | 'q_collect_all_gems'
  | 'q_speed_50' | 'q_no_surface_run';

export type QuestStatus = 'locked' | 'active' | 'completed' | 'claimed';

export interface QuestDef {
  id: QuestId;
  title: string;
  description: string;
  objective: QuestObjective;
  reward: QuestReward;
  unlockAfter?: QuestId;
}

export type QuestObjective =
  | { type: 'dig'; count: number }
  | { type: 'sell'; totalValue: number }
  | { type: 'collect'; itemId: ItemId; count: number }
  | { type: 'depth'; depth: number }
  | { type: 'buy_upgrades'; count: number }
  | { type: 'find_biome'; biome: BiomeId }
  | { type: 'sell_item'; itemId: ItemId; count: number }
  | { type: 'max_battery'; count: number }
  | { type: 'collect_all_gems' };

export interface QuestReward {
  money?: number;
  permanentBonus?: PermanentBonus;
  unlockCosmetic?: string;
}

export type PermanentBonus =
  | { type: 'sell_multiplier'; value: number }
  | { type: 'energy_regen'; value: number }
  | { type: 'dig_efficiency'; value: number };

export interface QuestState {
  id: QuestId;
  status: QuestStatus;
  progress: number;
}

// ─── Achievements ──────────────────────────────────────────────────────────────

export type AchievementId =
  | 'first_dig' | 'first_sale' | 'first_upgrade'
  | 'depth_10' | 'depth_25' | 'depth_50' | 'depth_100' | 'depth_200' | 'depth_500'
  | 'found_relic' | 'found_artifact' | 'found_void_crystal' | 'found_ancient_coin'
  | 'broke' | 'rich_1k' | 'rich_10k' | 'rich_100k'
  | 'max_shovel' | 'max_battery' | 'max_lantern' | 'all_upgrades'
  | 'dig_100' | 'dig_500' | 'dig_1000' | 'dig_5000'
  | 'sell_10_times' | 'sell_total_1k' | 'sell_total_10k'
  | 'collect_coal_50' | 'collect_gold_25' | 'collect_crystal_5'
  | 'speed_runner' | 'marathon_miner' | 'insomniac'
  | 'completionist' | 'secret_hunter' | 'biome_explorer'
  | 'crystal_cavern' | 'fossil_zone_found' | 'void_realm_found'
  | 'quest_complete_3' | 'quest_complete_all'
  | 'inventory_full' | 'no_energy_dig' | 'jetpack_user'
  | 'sold_while_full' | 'deep_diver' | 'surface_sprinter'
  | 'ore_collector' | 'legendary_find' | 'mythic_find';

export type AchievementCategory = 'exploration' | 'economy' | 'collection' | 'speed' | 'completion' | 'secrets';

export interface AchievementDef {
  id: AchievementId;
  label: string;
  description: string;
  category: AchievementCategory;
  hidden?: boolean;     // revealed only when unlocked
  points: number;
}

export interface AchievementState {
  id: AchievementId;
  unlocked: boolean;
  unlockedAt?: number;
  progress?: number;    // for progress-based achievements
}

// ─── Statistics ────────────────────────────────────────────────────────────────

export interface Statistics {
  blocksDug: number;
  distanceReached: number;
  moneyEarned: number;
  moneySpent: number;
  rareItemsFound: number;
  /** Total play time in seconds — single source of truth */
  playTimeSeconds: number;
  sellCount: number;
  sellTotalValue: number;
  treasuresFound: number;
  artifactsCollected: number;
  upgradesPurchased: number;
  biomesDiscovered: Set<BiomeId>;
  itemsCollected: Partial<Record<ItemId, number>>;
  questsCompleted: number;
  criticalHits: number;
  totalDamageDealt: number;
  runStartTime: number;
  /** Times the player has returned to the surface */
  surfaceReturns: number;
  /** Lore fragments collected */
  loreFragmentsFound: number;
  /** Dynamic events triggered */
  eventsTriggered: number;
}

// ─── Particles ─────────────────────────────────────────────────────────────────

export type ParticleKind = 'dirt' | 'stone' | 'spark' | 'crystal' | 'treasure' | 'smoke' | 'ember' | 'snow' | 'bubble';

export interface Particle {
  active: boolean;       // pool: is this slot in use?
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;          // 0..1 decreasing
  maxLife: number;
  color: string;
  size: number;
  gravity: number;
  fade: number;          // life reduction per second
}

export interface FloatText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  scale?: number;
}

// ─── Player ────────────────────────────────────────────────────────────────────

export interface Player {
  x: number;
  y: number;
  // World-space sub-pixel position for smooth movement
  visualX: number;
  visualY: number;
  energy: number;
  maxEnergy: number;
  money: number;
  inventory: InventorySlot[];
  inventoryCapacity: number;
  upgrades: Record<UpgradeId, number>;
  deepestDepth: number;          // tiles below surface
  facing: 'left' | 'right';
  // Teleport charges
  teleportCharges: number;
  // Screen shake accumulator
  shakeAmount: number;
  // Permanent bonuses from quests
  permanentBonuses: PermanentBonus[];
  surfacedThisTrip?: boolean;
}

// ─── Screens & Modes ───────────────────────────────────────────────────────────

export type Screen =
  | 'title' | 'loading' | 'playing' | 'paused'
  | 'shop' | 'inventory' | 'settings' | 'statistics'
  | 'quests' | 'achievements' | 'gameover' | 'win';

export type GameMode = 'normal' | 'hard' | 'no_battery' | 'no_shop' | 'randomized_economy' | 'double_treasure';

// ─── Settings ──────────────────────────────────────────────────────────────────

export type ColorblindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
export type UIScale = 'small' | 'normal' | 'large' | 'xlarge';

export interface Settings {
  // Audio
  soundEnabled: boolean;
  musicEnabled: boolean;
  volume: number;
  musicVolume: number;
  // Graphics
  showFPS: boolean;
  screenShake: boolean;
  particleQuality: 'low' | 'medium' | 'high';
  lightingQuality: 'low' | 'medium' | 'high';
  // Gameplay
  showTutorial: boolean;
  touchControls: boolean;
  autoSell: boolean;
  autosaveInterval: number;   // seconds, 15/30/60
  // Accessibility
  colorblindMode: ColorblindMode;
  reducedMotion: boolean;
  reducedFlashing: boolean;
  highContrast: boolean;
  uiScale: UIScale;
  largerText: boolean;
}

// ─── Camera ────────────────────────────────────────────────────────────────────

export interface Camera {
  x: number;
  y: number;
  width: number;
  height: number;
  shakeX: number;
  shakeY: number;
  zoom: number;
}

// ─── Full Game State ────────────────────────────────────────────────────────────

export interface GameState {
  screen: Screen;
  mode: GameMode;
  player: Player;

  // Chunk-based world
  chunks: Map<string, Chunk>;
  seed: number;
  worldWidthChunks: number;

  tick: number;
  floatTexts: FloatText[];

  achievements: AchievementState[];
  quests: QuestState[];
  statistics: Statistics;
  settings: Settings;

  secretFound: boolean;
  tutorialStep: number;
  challengeModeUnlocked: boolean;
  playTime: number;

  currentBiome: BiomeId;

  // Dynamic events
  activeEvents: ActiveEvent[];
  eventCooldown: number;       // seconds before next event can trigger

  // Combo / streak system
  digCombo: number;            // consecutive digs without moving
  comboMultiplier: number;     // sell bonus from combo (1.0 = normal)
  lastDigTime: number;         // timestamp

  // Hit flash for juice
  hitFlashTile: { row: number; col: number; life: number } | null;

  // Depth pressure effect
  depthPressureAlpha: number;  // 0..1 vignette intensity

  // First-run intro done
  introComplete: boolean;

  // Biome transition announcement
  biomeTransition?: {
    name: string;
    life: number;
    maxLife: number;
  };
  artifactActivated?: boolean;
  facilityUnlocked?: boolean;
  prestigeCount?: number;
  unlockedEnding?: 'standard' | 'completionist' | 'secret';
  chosenSeed?: number;
  activeModifiers?: string[];
  atEndgameStabilizer?: boolean;
  hitStopTimer?: number;
}

// ─── Save format ───────────────────────────────────────────────────────────────

export interface SaveData {
  version: number;                      // bump on breaking changes
  savedAt: number;
  mode: GameMode;
  seed: number;
  player: SerializedPlayer;
  chunkData: SerializedChunk[];
  achievements: AchievementState[];
  quests: QuestState[];
  statistics: SerializedStatistics;
  settings: Settings;
  secretFound: boolean;
  playTime: number;
  currentBiome: BiomeId;
  artifactActivated?: boolean;
  facilityUnlocked?: boolean;
  prestigeCount?: number;
  unlockedEnding?: 'standard' | 'completionist' | 'secret';
  chosenSeed?: number;
  activeModifiers?: string[];
}

export interface SerializedPlayer {
  x: number; y: number;
  energy: number; maxEnergy: number;
  money: number;
  inventory: InventorySlot[];
  inventoryCapacity: number;
  upgrades: Record<UpgradeId, number>;
  deepestDepth: number;
  facing: 'left' | 'right';
  teleportCharges: number;
  permanentBonuses: PermanentBonus[];
  surfacedThisTrip?: boolean;
}

export interface SerializedChunk {
  cx: number; cy: number;
  biome: BiomeId;
  tiles: Array<{ kind: TileKind; hp: number; maxHp: number; revealed: boolean; variant?: number; glowing?: boolean }>;
}

export interface SerializedStatistics {
  blocksDug: number;
  distanceReached: number;
  moneyEarned: number;
  moneySpent: number;
  rareItemsFound: number;
  playTimeSeconds: number;
  sellCount: number;
  sellTotalValue: number;
  treasuresFound: number;
  artifactsCollected: number;
  upgradesPurchased: number;
  biomesDiscovered: BiomeId[];
  itemsCollected: Partial<Record<ItemId, number>>;
  questsCompleted: number;
  criticalHits: number;
  totalDamageDealt: number;
  runStartTime: number;
  surfaceReturns: number;
  loreFragmentsFound: number;
  eventsTriggered: number;
}

