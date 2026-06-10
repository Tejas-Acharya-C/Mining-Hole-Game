# Changelog

All notable changes to Deep Dig are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.0] — 2026-06-10

### Added
- Complete game with dig → collect → sell → upgrade → deeper loop
- Infinite chunk-based procedural world (16×16 tiles per chunk, LRU-cached)
- 9 biomes: Surface, Soil Layer, Clay Beds, Stone Belt, Deep Rock, Crystal Caverns, Fossil Zone, Lava Fields, The Void, Lost Chamber
- 20 collectible items across common → mythic rarity tiers
- 14 purchasable upgrades: Shovel, Backpack, Battery, Lantern, Boots, Reinforced Picks, Critical Strike, Drill Attachment, Ore Detector, Ground Scanner, Auto-Collector, Teleporter, Jetpack, Artifact Sense
- 50 achievements across 6 categories
- 15 quests with chained unlock system and permanent stat bonuses
- 5 challenge modes: Hard, No Battery, No Shop, Chaos Market, Double Treasure
- Full statistics tracking: blocks dug, money earned/spent, biomes discovered, items collected, critical hits, surface returns, play time
- Dynamic lighting system using OffscreenCanvas compositing
- Object-pooled particle system (400-slot pool, zero per-frame allocations)
- Procedural audio engine via Web Audio API — no external audio files
- Versioned save system (v2) with backwards migration
- Touch/mobile support with virtual joystick and dig button
- Screen shake on critical hits and tile breaks
- Biome transition sound and achievement triggers
- Scanner upgrade shows unrevealed ore through terrain
- Depth-layered ambient music
- HUD with energy bar, inventory bar, biome indicator, permanent bonus badges
- Inventory panel with sort (rarity, value, quantity, name) and text filter
- Quest panel with progress bars and reward preview
- Statistics panel with full session breakdown
- Settings panel with typed key-value updates

### Technical
- React 18 + TypeScript 5.6 strict mode — zero type errors
- Vite 6 build — 238KB JS bundle (76KB gzipped)
- `noUnusedLocals: true`, `noUnusedParameters: true` enforced
- No circular dependencies
- All dead exports removed
- `Date.now()` hoisted out of per-tile render loops
- Touch dig respects same cooldown as keyboard/mouse
- Single source of truth for `CHUNK_SIZE`, `WORLD_WIDTH_CHUNKS`, `SECRET_CHUNK_DEPTH`
- Secret chamber fixed at chunk depth 9 — one per world
