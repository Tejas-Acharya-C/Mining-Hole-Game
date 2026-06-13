import type { ItemDef, ItemId } from '../types';

export const ITEM_DEFS: Record<ItemId, ItemDef> = {
  coal: {
    id: 'coal', label: 'Coal Chunk', description: 'Compressed carbon. Burns well.',
    sellValue: 5, rarity: 'common', color: '#55556a', stackSize: 99,
  },
  iron: {
    id: 'iron', label: 'Iron Ore', description: 'A rusty but valuable metal ore.',
    sellValue: 18, rarity: 'common', color: '#b87333', stackSize: 99,
  },
  silver: {
    id: 'silver', label: 'Silver Ore', description: 'Gleaming silver, prized by merchants.',
    sellValue: 45, rarity: 'uncommon', color: '#c0c0d0', stackSize: 64,
  },
  gold: {
    id: 'gold', label: 'Gold Nugget', description: 'Pure gold. Everyone wants this.',
    sellValue: 120, rarity: 'rare', color: '#ffd700', stackSize: 64,
  },
  ruby: {
    id: 'ruby', label: 'Ruby', description: 'A brilliant crimson gemstone.',
    sellValue: 300, rarity: 'rare', color: '#e0234e', stackSize: 32,
  },
  sapphire: {
    id: 'sapphire', label: 'Sapphire', description: 'Cool blue, hard as stone.',
    sellValue: 350, rarity: 'epic', color: '#1e6fff', stackSize: 32,
  },
  emerald: {
    id: 'emerald', label: 'Emerald', description: 'Deep green, grown in darkness.',
    sellValue: 400, rarity: 'epic', color: '#00c853', stackSize: 32,
  },
  crystal: {
    id: 'crystal', label: 'Void Crystal', description: 'It pulses with unknown energy.',
    sellValue: 900, rarity: 'legendary', color: '#cc44ff', stackSize: 16,
  },
  fossil: {
    id: 'fossil', label: 'Ancient Fossil', description: 'Remnants of something long gone.',
    sellValue: 70, rarity: 'uncommon', color: '#c8a96e', stackSize: 64,
  },
  relic: {
    id: 'relic', label: 'Strange Relic', description: 'Its purpose is long forgotten.',
    sellValue: 550, rarity: 'epic', color: '#ff9900', stackSize: 16,
  },
  artifact: {
    id: 'artifact', label: 'Lost Artifact', description: 'The reason you dug this far.',
    sellValue: 5000, rarity: 'mythic', color: '#ffffff', stackSize: 1,
  },
  obsidian_shard: {
    id: 'obsidian_shard', label: 'Obsidian Shard', description: 'Razor-sharp volcanic glass.',
    sellValue: 80, rarity: 'uncommon', color: '#2d1b4e', stackSize: 64,
  },
  ice_core: {
    id: 'ice_core', label: 'Frozen Core', description: 'Impossibly cold at this depth.',
    sellValue: 180, rarity: 'rare', color: '#a8d8ea', stackSize: 32,
  },
  magma_gem: {
    id: 'magma_gem', label: 'Magma Gem', description: 'Hot to the touch. Very valuable. Stack size: 64.',
    sellValue: 600, rarity: 'epic', color: '#ff4500', stackSize: 64,
  },
  void_crystal: {
    id: 'void_crystal', label: 'Void Shard', description: 'A fragment of nothingness. Stack size: 32.',
    sellValue: 2500, rarity: 'legendary', color: '#6600cc', stackSize: 32,
  },
  ancient_coin: {
    id: 'ancient_coin', label: 'Ancient Coin', description: 'Currency from a lost civilization. Stack size: 32.',
    sellValue: 1200, rarity: 'legendary', color: '#d4af37', stackSize: 32,
  },
  energy_cell: {
    id: 'energy_cell', label: 'Energy Cell', description: 'Restores 80 energy when used.',
    sellValue: 0, rarity: 'uncommon', color: '#44ffaa', stackSize: 16,
    isConsumable: true, consumeEffect: { type: 'energy', amount: 80 },
  },
  scrap_metal: {
    id: 'scrap_metal', label: 'Scrap Metal', description: 'Bent pieces of old machinery.',
    sellValue: 8, rarity: 'common', color: '#888899', stackSize: 99,
  },
  deep_pearl: {
    id: 'deep_pearl', label: 'Deep Pearl', description: 'Formed in underground lakes.',
    sellValue: 850, rarity: 'legendary', color: '#f0f0ff', stackSize: 8,
  },
  sun_stone: {
    id: 'sun_stone', label: 'Sun Stone', description: 'Radiates warmth from deep within.',
    sellValue: 400, rarity: 'epic', color: '#ffcc00', stackSize: 16,
  },
  facility_key: {
    id: 'facility_key', label: 'Facility Keycard', description: 'Grants entry to the ancient core levels.',
    sellValue: 0, rarity: 'epic', color: '#a855f7', stackSize: 1,
  },
  core_stabilizer: {
    id: 'core_stabilizer', label: 'Core Stabilizer', description: 'A high-density stabilizer from the volcanic core.',
    sellValue: 0, rarity: 'legendary', color: '#f97316', stackSize: 1,
  },
  fracture_shard: {
    id: 'fracture_shard', label: 'Fracture Shard', description: 'An unstable shard reflecting other dimensions.',
    sellValue: 0, rarity: 'mythic', color: '#ec4899', stackSize: 1,
  },
};

export const RARITY_COLORS: Record<string, string> = {
  common:    '#94a3b8',
  uncommon:  '#4ade80',
  rare:      '#60a5fa',
  epic:      '#c084fc',
  legendary: '#fbbf24',
  mythic:    '#ff69b4',
};

export const RARITY_ORDER: Record<string, number> = {
  common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythic: 5,
};
