import type { UpgradeDef, UpgradeId, TileKind } from '../types';

export const UPGRADE_DEFS: Record<UpgradeId, UpgradeDef> = {
  shovel: {
    id: 'shovel', label: 'Shovel Tier', icon: '⛏',
    description: 'Increases dig damage. Higher tiers unlock harder rocks.',
    maxLevel: 8, baseCost: 60, costMultiplier: 3.0, category: 'combat',
  },
  backpack: {
    id: 'backpack', label: 'Backpack', icon: '🎒',
    description: '+10 inventory capacity per level.',
    maxLevel: 6, baseCost: 80, costMultiplier: 2.6, category: 'utility',
  },
  battery: {
    id: 'battery', label: 'Battery Pack', icon: '🔋',
    description: '+50 max energy and +2 regen/s per level.',
    maxLevel: 6, baseCost: 70, costMultiplier: 2.4, category: 'utility',
  },
  lantern: {
    id: 'lantern', label: 'Lantern', icon: '🔦',
    description: '+2 light radius per level.',
    maxLevel: 5, baseCost: 130, costMultiplier: 2.8, category: 'exploration',
  },
  boots: {
    id: 'boots', label: 'Power Boots', icon: '👟',
    description: 'Reduces movement cooldown by 22ms per level.',
    maxLevel: 5, baseCost: 110, costMultiplier: 2.8, category: 'utility',
  },
  drill: {
    id: 'drill', label: 'Drill Attachment', icon: '🔩',
    description: '25% chance per level to break adjacent tiles while digging.',
    maxLevel: 4, baseCost: 350, costMultiplier: 3.5, category: 'combat',
  },
  jetpack: {
    id: 'jetpack', label: 'Jetpack', icon: '🚀',
    description: 'Removes movement restrictions. Move freely in any direction.',
    maxLevel: 1, baseCost: 2000, costMultiplier: 1, category: 'special',
    unlockDepth: 30,
  },
  scanner: {
    id: 'scanner', label: 'Ground Scanner', icon: '📡',
    description: 'Reveals hidden ores through walls. Stacks with Ore Detector.',
    maxLevel: 4, baseCost: 500, costMultiplier: 3.2, category: 'exploration',
    unlockDepth: 20,
  },
  critical_chance: {
    id: 'critical_chance', label: 'Critical Strike', icon: '⚡',
    description: '10% critical hit chance per level. Crits deal 3× damage.',
    maxLevel: 5, baseCost: 400, costMultiplier: 3.2, category: 'combat',
    unlockDepth: 25,
  },
  ore_detector: {
    id: 'ore_detector', label: 'Ore Detector', icon: '🔮',
    description: 'Nearby ores pulse and glow. Good before buying a Scanner.',
    maxLevel: 3, baseCost: 450, costMultiplier: 3.0, category: 'exploration',
    unlockDepth: 15,
  },
  teleport: {
    id: 'teleport', label: 'Teleporter', icon: '✨',
    description: 'Gain 2 teleport charges per level. Teleport to surface instantly.',
    maxLevel: 3, baseCost: 1800, costMultiplier: 4.0, category: 'special',
    unlockDepth: 50,
  },
  artifact_sense: {
    id: 'artifact_sense', label: 'Artifact Sense', icon: '🗺',
    description: 'Compass points toward the buried artifact while you search deeper.',
    maxLevel: 1, baseCost: 1800, costMultiplier: 1, category: 'special',
    unlockDepth: 80,
  },
  reinforced_picks: {
    id: 'reinforced_picks', label: 'Reinforced Picks', icon: '🪨',
    description: 'Reduces energy cost per dig by 1 per level.',
    maxLevel: 4, baseCost: 200, costMultiplier: 2.8, category: 'combat',
    unlockDepth: 10,
  },
};

// ── Stat formulas ─────────────────────────────────────────────────────────────

/** Damage per swing. Exponential curve with significant spikes at key tiers. */
export function shovelDamage(level: number): number {
  const base = 12;
  return Math.floor(base * Math.pow(1.65, level));
}

/** Max energy. Linear with diminishing returns at high levels. */
export function maxEnergy(level: number): number {
  return 80 + level * 50;
}

/** Energy regen per second. */
export function energyRegen(level: number): number {
  return 3 + level * 2;
}

/** Inventory capacity. */
export function inventoryCapacity(level: number): number {
  return 20 + level * 10;
}

/** Light radius in tiles. */
export function lightRadius(level: number, activeModifiers?: string[]): number {
  let r = 5 + level * 2;
  if (activeModifiers?.includes('darkness')) {
    r = Math.max(2, Math.floor(r / 2));
  }
  return r;
}

/** Move cooldown in ms. Floor at 60ms. */
export function moveCooldown(level: number): number {
  return Math.max(60, 200 - level * 22);
}

/** Dig cooldown in ms. Floor at 80ms. */
export function digCooldown(level: number): number {
  return Math.max(80, 320 - level * 30);
}

/** Minimum shovel level required to damage a tile type. */
export const TILE_MIN_SHOVEL: Partial<Record<TileKind, number>> = {
  grass: 0, soil: 0, clay: 0, coal: 0, fossil: 0, energy_node: 0,
  iron: 1, silver: 2, stone: 1, gold: 2, ancient_brick: 2, permafrost: 1,
  ruby: 3, sapphire: 3, emerald: 3, hardstone: 3, relic: 2,
  crystal: 4, obsidian: 4, magma_rock: 4,
  void_stone: 5, artifact: 6,
  bedrock: 99, sell_point: 99,
};

/** Cost to upgrade from currentLevel → currentLevel+1 */
export function upgradeCost(id: UpgradeId, currentLevel: number): number {
  const def = UPGRADE_DEFS[id];
  return Math.floor(def.baseCost * Math.pow(def.costMultiplier, currentLevel));
}

/** Critical hit chance (0..1). */
export function critChance(level: number): number {
  return level * 0.10;
}

/** Energy cost reduction per dig from reinforced picks. */
export function energyCostReduction(level: number): number {
  return level;
}

/** Teleport charges total. */
export function teleportCharges(level: number): number {
  return level * 2;
}
