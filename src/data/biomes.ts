import type { BiomeDef, BiomeId } from '../types';

export const BIOME_DEFS: Record<BiomeId, BiomeDef> = {
  surface: {
    id: 'surface', label: 'Surface',
    minDepth: -2, maxDepth: 0,
    baseTile: 'grass',
    ambientColor: '#1a3a5c', fogColor: '#0d1b2a',
    lightLevel: 1.0,
    ores: [],
    specialFeatures: [],
  },
  soil_layer: {
    id: 'soil_layer', label: 'Soil Layer',
    minDepth: 0, maxDepth: 4,
    baseTile: 'soil',
    ambientColor: '#1a1a2e', fogColor: '#111120',
    lightLevel: 0.8,
    ores: [
      { kind: 'coal',  weight: 0.08, minDepth: 0 },
      { kind: 'iron',  weight: 0.04, minDepth: 1 },
    ],
    specialFeatures: ['cave'],
  },
  clay_layer: {
    id: 'clay_layer', label: 'Clay Beds',
    minDepth: 4, maxDepth: 10,
    baseTile: 'clay',
    ambientColor: '#181825', fogColor: '#0f0f1a',
    lightLevel: 0.65,
    ores: [
      { kind: 'coal',   weight: 0.07, minDepth: 4 },
      { kind: 'iron',   weight: 0.07, minDepth: 4 },
      { kind: 'silver', weight: 0.03, minDepth: 5 },
      { kind: 'fossil', weight: 0.04, minDepth: 4 },
    ],
    specialFeatures: ['cave', 'fossil_bed'],
  },
  stone_layer: {
    id: 'stone_layer', label: 'Stone Belt',
    minDepth: 10, maxDepth: 25,
    baseTile: 'stone',
    ambientColor: '#141420', fogColor: '#0a0a14',
    lightLevel: 0.5,
    ores: [
      { kind: 'iron',     weight: 0.06, minDepth: 10 },
      { kind: 'silver',   weight: 0.05, minDepth: 10 },
      { kind: 'gold',     weight: 0.03, minDepth: 12 },
      { kind: 'ruby',     weight: 0.015, minDepth: 15 },
      { kind: 'fossil',   weight: 0.03, minDepth: 10 },
      { kind: 'obsidian', weight: 0.03, minDepth: 12 },
    ],
    specialFeatures: ['cave', 'vein', 'chamber'],
  },
  deep_stone: {
    id: 'deep_stone', label: 'Deep Rock',
    minDepth: 25, maxDepth: 50,
    baseTile: 'hardstone',
    ambientColor: '#0f0f18', fogColor: '#06060d',
    lightLevel: 0.35,
    ores: [
      { kind: 'silver',    weight: 0.04, minDepth: 25 },
      { kind: 'gold',      weight: 0.05, minDepth: 25 },
      { kind: 'ruby',      weight: 0.03, minDepth: 25 },
      { kind: 'sapphire',  weight: 0.025, minDepth: 28 },
      { kind: 'emerald',   weight: 0.025, minDepth: 28 },
      { kind: 'relic',     weight: 0.012, minDepth: 30 },
      { kind: 'permafrost', weight: 0.015, minDepth: 25 },
    ],
    specialFeatures: ['cave', 'vein', 'chamber', 'shaft'],
  },
  crystal_cavern: {
    id: 'crystal_cavern', label: 'Crystal Caverns',
    minDepth: 50, maxDepth: 90,
    baseTile: 'hardstone',
    ambientColor: '#1a0a2e', fogColor: '#0d051a',
    lightLevel: 0.25,
    ores: [
      { kind: 'crystal',      weight: 0.06, minDepth: 50, clusterSize: 3 },
      { kind: 'ruby',         weight: 0.03, minDepth: 50 },
      { kind: 'sapphire',     weight: 0.04, minDepth: 50 },
      { kind: 'emerald',      weight: 0.04, minDepth: 50 },
      { kind: 'relic',        weight: 0.02, minDepth: 55 },
      { kind: 'void_stone',   weight: 0.008, minDepth: 60 },
      { kind: 'ancient_brick', weight: 0.005, minDepth: 65 },
    ],
    specialFeatures: ['cave', 'chamber', 'lake'],
    ambientParticle: 'spark',
  },
  fossil_zone: {
    id: 'fossil_zone', label: 'Fossil Fields',
    minDepth: 15, maxDepth: 45,
    baseTile: 'stone',
    ambientColor: '#1a1408', fogColor: '#0d0a04',
    lightLevel: 0.4,
    ores: [
      { kind: 'fossil',   weight: 0.15, minDepth: 15, clusterSize: 4 },
      { kind: 'ancient_brick', weight: 0.02, minDepth: 20 },
      { kind: 'obsidian', weight: 0.04, minDepth: 15 },
      { kind: 'iron',     weight: 0.05, minDepth: 15 },
    ],
    specialFeatures: ['fossil_bed', 'chamber'],
  },
  lava_zone: {
    id: 'lava_zone', label: 'Lava Fields',
    minDepth: 70, maxDepth: 110,
    baseTile: 'magma_rock',
    ambientColor: '#200808', fogColor: '#150404',
    lightLevel: 0.3,
    ores: [
      { kind: 'magma_rock', weight: 0.04, minDepth: 70, clusterSize: 2 },
      { kind: 'obsidian',   weight: 0.07, minDepth: 70 },
      { kind: 'ruby',       weight: 0.04, minDepth: 70 },
      { kind: 'void_stone', weight: 0.01, minDepth: 80 },
    ],
    specialFeatures: ['cave', 'lake', 'vein'],
    ambientParticle: 'ember',
  },
  void_realm: {
    id: 'void_realm', label: 'The Void',
    minDepth: 110, maxDepth: 150,
    baseTile: 'void_stone',
    ambientColor: '#050508', fogColor: '#020203',
    lightLevel: 0.1,
    ores: [
      { kind: 'void_stone',   weight: 0.05, minDepth: 110, clusterSize: 2 },
      { kind: 'ancient_brick', weight: 0.015, minDepth: 110 },
      { kind: 'crystal',      weight: 0.04, minDepth: 110 },
    ],
    specialFeatures: ['chamber'],
    ambientParticle: 'bubble',
  },
  secret_chamber: {
    id: 'secret_chamber', label: 'The Lost Chamber',
    minDepth: 148, maxDepth: 160,
    baseTile: 'ancient_brick',
    ambientColor: '#0a0520', fogColor: '#050210',
    lightLevel: 0.15,
    ores: [
      { kind: 'ancient_brick', weight: 0.05, minDepth: 148 },
      { kind: 'void_stone',    weight: 0.03, minDepth: 148 },
    ],
    specialFeatures: ['chamber'],
    ambientParticle: 'spark',
  },
};

/** Map chunk depth to biome */
export function getBiomeForDepth(chunkDepth: number, rng: () => number): BiomeId {
  if (chunkDepth >= 1 && chunkDepth <= 3 && rng() < 0.15) return 'fossil_zone';
  if (chunkDepth >= 3 && chunkDepth <= 7 && rng() < 0.12) return 'fossil_zone';
  if (chunkDepth >= 3 && chunkDepth <= 9 && rng() < 0.08) return 'crystal_cavern';
  if (chunkDepth >= 4 && chunkDepth <= 7 && rng() < 0.08) return 'lava_zone';
  if (chunkDepth >= 7 && chunkDepth <= 10 && rng() < 0.10) return 'lava_zone';

  if (chunkDepth <= 0) return 'surface';
  if (chunkDepth <= 1) return 'soil_layer';
  if (chunkDepth <= 3) return 'clay_layer';
  if (chunkDepth <= 6) return 'stone_layer';
  if (chunkDepth <= 9) return 'deep_stone';
  if (chunkDepth <= 12) return 'crystal_cavern';
  return 'void_realm';
}
