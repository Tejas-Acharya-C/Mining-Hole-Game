import type { TileKind } from '../types';

export const TILE_SIZE = 32;

// World layout constants
export const WORLD_WIDTH_CHUNKS = 3;
export const SURFACE_TILE_ROW   = 3;
export const SECRET_CHUNK_DEPTH = 9;

// Per-tile color palette
export const TILE_COLORS: Record<TileKind, string> = {
  air:          'transparent',
  grass:        '#3a7d3a',
  soil:         '#7a5c3a',
  clay:         '#9e6b4a',
  stone:        '#6b7280',
  hardstone:    '#374151',
  bedrock:      '#1f2937',
  coal:         '#444455',
  iron:         '#b05a2f',
  silver:       '#9ca3af',
  gold:         '#d4a017',
  ruby:         '#cc1133',
  sapphire:     '#1155cc',
  emerald:      '#007744',
  crystal:      '#9933cc',
  fossil:       '#b8964e',
  relic:        '#cc7700',
  artifact:     '#f0f0ff',
  obsidian:     '#2d1b4e',
  permafrost:   '#a8d8ea',
  magma_rock:   '#8b1a1a',
  void_stone:   '#0a0a15',
  ancient_brick:'#6b5a3e',
  ladder:       '#8B5E3C',
  sell_point:   '#22c55e',
  chest:        '#d4a017',
  energy_node:  '#44ffaa',
};

// Accent/gem colours drawn inside tiles
export const TILE_ACCENT: Partial<Record<TileKind, string>> = {
  coal:          '#777788',
  iron:          '#e08060',
  silver:        '#e2e8f0',
  gold:          '#ffe066',
  ruby:          '#ff4466',
  sapphire:      '#4488ff',
  emerald:       '#22ee88',
  crystal:       '#dd88ff',
  fossil:        '#e8c880',
  relic:         '#ffaa22',
  artifact:      '#ccddff',
  obsidian:      '#8855cc',
  permafrost:    '#c8eeff',
  magma_rock:    '#ff6622',
  void_stone:    '#6622cc',
  ancient_brick: '#c8a870',
  chest:         '#ffe066',
  energy_node:   '#88ffcc',
};

// Tile HP (durability). 0 = indestructible / instantly air.
export const TILE_HP: Record<TileKind, number> = {
  air: 0, grass: 6, soil: 12, clay: 20, stone: 45, hardstone: 90, bedrock: 99999,
  coal: 28, iron: 38, silver: 50, gold: 55, ruby: 65, sapphire: 70, emerald: 70,
  crystal: 85, fossil: 35, relic: 60, artifact: 100,
  obsidian: 70, permafrost: 55, magma_rock: 80, void_stone: 95, ancient_brick: 50,
  ladder: 6, sell_point: 99999, chest: 30, energy_node: 40,
};

// Energy consumed per dig swing on a tile type
export const TILE_ENERGY_COST: Record<TileKind, number> = {
  air: 0, grass: 1, soil: 2, clay: 3, stone: 5, hardstone: 10, bedrock: 0,
  coal: 3, iron: 4, silver: 5, gold: 6, ruby: 7, sapphire: 8, emerald: 8,
  crystal: 12, fossil: 4, relic: 8, artifact: 15,
  obsidian: 9, permafrost: 6, magma_rock: 11, void_stone: 14, ancient_brick: 7,
  ladder: 1, sell_point: 0, chest: 4, energy_node: 5,
};

// Tile → item drop mapping
export const TILE_DROPS: Partial<Record<TileKind, string>> = {
  coal: 'coal', iron: 'iron', silver: 'silver', gold: 'gold',
  ruby: 'ruby', sapphire: 'sapphire', emerald: 'emerald',
  crystal: 'crystal', fossil: 'fossil', relic: 'relic', artifact: 'artifact',
  obsidian: 'obsidian_shard', permafrost: 'ice_core', magma_rock: 'magma_gem',
  void_stone: 'void_crystal', ancient_brick: 'ancient_coin',
  energy_node: 'energy_cell', chest: 'ancient_coin',
};
