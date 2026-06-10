# ⛏ Deep Dig

> Dig down. Collect rare ores. Sell high. Upgrade your tools. Find the secret at the bottom.

A polished browser-based indie digging game built with React, TypeScript, Vite, and Canvas 2D — no external assets required.

![Deep Dig Title Screen](docs/screenshot-title.png)
<!-- Add screenshots to docs/ folder -->

---

## Features

- **Infinite procedural world** — chunk-based generation with 9 unique biomes
- **50 achievements** across exploration, economy, collection, speed, and secrets
- **15 quests** with chained unlocks and permanent stat bonuses
- **14 upgrades** — shovel, backpack, battery, lantern, boots, drill, critical strike, scanner, teleporter, jetpack, and more
- **20 collectible items** from common coal to mythic artifacts
- **Dynamic lighting** — offscreen canvas lighting pass with glowing ores
- **Object-pooled particles** — zero heap allocations during gameplay
- **Procedural audio** — full Web Audio API sound engine, no audio files
- **5 challenge modes** — Hard, No Battery, No Shop, Chaos Market, Double Treasure
- **Full save system** — versioned localStorage with migration support
- **Touch/mobile support** — virtual joystick + action buttons
- **Screen shake, biome transitions, depth fog, sparkle effects**

---

## Controls

| Action | Input |
|--------|-------|
| Move | Arrow Keys / WASD |
| Dig | Z / Space, or click adjacent tile |
| Sell items | E (at surface) or walk onto $ tile |
| Open Shop | B (at surface) |
| Inventory | I |
| Quests | Q |
| Teleport to surface | T (requires Teleporter upgrade) |
| Pause | Esc / P |

**Touch:** Left half = virtual joystick · Right side = dig button

---

## Installation

```bash
# Clone the repository
git clone https://github.com/Tejas-Acharya-C/Mining-Hole-Game.git
cd Mining-Hole-Game

# Install dependencies
npm install

# Start development server
npm run dev
```

Open **http://localhost:5173** in a modern desktop browser.

---

## Development

```bash
# Type check
npx tsc --noEmit

# Development server with HMR
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview
```

---

## Build Output

```
dist/index.html           ~0.6 KB  (gzip: ~0.4 KB)
dist/assets/*.css        ~23 KB   (gzip: ~5 KB)
dist/assets/*.js        ~238 KB   (gzip: ~76 KB)
```

No external runtime dependencies. Works fully offline after initial load.

---

## Folder Structure

```
src/
├── types/
│   └── index.ts          All TypeScript interfaces and type unions
├── data/
│   ├── tiles.ts          Tile definitions, colours, HP, energy, drop table
│   ├── items.ts          20 collectible item definitions
│   ├── upgrades.ts       14 upgrade definitions + stat formulas
│   ├── biomes.ts         9 biome definitions + depth mapping
│   ├── achievements.ts   50 achievement definitions
│   ├── quests.ts         15 quest definitions + unlock chains
│   └── defaults.ts       Default settings factory
├── systems/
│   ├── WorldManager.ts   Chunk-based infinite world, LRU cache
│   ├── GameManager.ts    Core game logic (dig, move, sell, upgrade…)
│   ├── ParticleManager.ts Object-pooled 400-slot particle system
│   ├── AudioManager.ts   Procedural Web Audio API sound engine
│   └── SaveManager.ts    Versioned save/load with migration
├── engine/
│   ├── renderer.ts       Canvas 2D renderer with offscreen lighting
│   └── input.ts          Keyboard + mouse + touch unified handler
├── components/           12 React UI panels with CSS Modules
├── App.tsx               RAF game loop, screen routing, managers
├── main.tsx              React entry point
└── index.css             Global reset + font
```

---

## Technology Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.3 | UI rendering and component tree |
| TypeScript | 5.6 | Strict type safety throughout |
| Vite | 6.0 | Build tool, HMR dev server |
| Canvas 2D | Browser API | Game rendering |
| OffscreenCanvas | Browser API | Lighting pass |
| Web Audio API | Browser API | Procedural sound |

---

## Biomes

| Biome | Depth | Highlights |
|-------|-------|-----------|
| Surface | 0 | Sell point, dig opening |
| Soil Layer | Chunk 1 | Coal, iron |
| Clay Beds | Chunk 2–3 | Fossil clusters |
| Stone Belt | Chunk 3–6 | Gold, obsidian |
| Deep Rock | Chunk 6–9 | Gems, relics |
| Crystal Caverns | Chunk 9+ | Crystal clusters, void stone |
| Fossil Zone | Rare (mid) | Dense fossil beds, ancient coins |
| Lava Fields | Rare (deep) | Magma gems, ember particles |
| The Void | Chunk 10+ | Minimal light, void crystals |
| Lost Chamber | Fixed depth | Artifact (win condition) |

---

## License

MIT — see [LICENSE](LICENSE)
