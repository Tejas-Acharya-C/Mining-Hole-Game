# 🌌 VOIDCORE: DEEP ALCHEMY

> Drill deep. Harness the void. Survive the hazards. Stabilize the world core.

A premium, highly polished browser-based sci-fi extraction and mining game built with React, TypeScript, Vite, and Canvas 2D — no external assets required. 

![VOIDCORE Title Screen](docs/screenshot-title.png)
<!-- Add screenshots to docs/ folder -->

---

## 🚀 Key Features

*   **Cybernetic Miner HUD & Visor**: Futuristic visor panel displaying status readouts, gold/energy gauges, low energy warning flashes, and compass targets.
*   **Procedural Synth SFX & Ambient Drones**: Full procedural Web Audio API engine. Low-frequency ambient drones shift dynamically with depth layer, coupled with glistening arpeggio loops for rare discoveries.
*   **Advanced Game Feel**: Screen rumble shakes, hit-stop physics freezes, hit-flash tile highlights, and particle debris bursts on digs.
*   **Endgame & Bedrock Gating**: 3 endgame layers gated by high-security Bedrock:
    *   *Ancient Facility*: Central containment grids draining player suit energy.
    *   *World Core*: Unstable geothermal molten magma rocks.
    *   *Reality Fracture*: Reality-bending dimensional fracture rifts.
*   **Prestige Rank System**: Compounding cash value multiplier (+50% per rank) and energy cost discount on tool actions.
*   **Release Modifiers & Seeds**: Set custom projection seeds and toggle environmental modifiers: *Low Gravity*, *Deep Darkness*, *Rich Veins*, and *Hardcore Collapse*.
*   **Three Narrative Endings**: Unlock standard containment, void singularity absorption, or perfect resonance stabilization depending on items gathered.
*   **Accessibility Dashboards**: Full accessibility controls supporting UI scaling multipliers, large high-contrast text, and a reduced motion selector.

---

## 🎮 Controls

| Action | Keyboard Input | Touch Control |
|--------|----------------|---------------|
| Move / Thrust | Arrow Keys / WASD | Left side Virtual Joystick |
| Activate Drill | Z / Space / Left Click | Right side Dig Button |
| Sell metals | E (at Surface Terminal) | Walk onto depot area |
| Suit upgrade shop | B (at Surface Terminal) | Tap top panel SUIT SHOP |
| Inventory Bag | I | Tap Backpack Icon |
| Mission Quests | Q | Tap Quests Panel |
| Surface Beacon | T (Requires Teleport charge) | Tap Teleport charge button |
| Pause Terminal | Esc / P | Tap Pause Button |

---

## 🛠️ Installation

```bash
# Clone the repository
git clone https://github.com/Tejas-Acharya-C/Mining-Hole-Game.git
cd Mining-Hole-Game

# Install dependencies
npm install

# Start development server
npm run dev
```

Open **http://localhost:5173** in your web browser.

---

## 📦 Folder Structure

```
src/
├── types/
│   └── index.ts          TypeScript interfaces, modifiers and game state types
├── data/
│   ├── tiles.ts          Tile definitions, colors, HP, energy cost, drops
│   ├── items.ts          Collectible item definitions and sell values
│   ├── upgrades.ts       Upgrades scale, battery capacity, light formulas
│   ├── biomes.ts         Biomes definitions, labels and color codes
│   ├── achievements.ts   50 achievements conditions
│   ├── quests.ts         15 quests objectives
│   └── defaults.ts       Default settings setup
├── systems/
│   ├── WorldManager.ts   Procedural chunk loader and LRU cache
│   ├── GameManager.ts    Core game ticks, movement, digging, terminal logic
│   ├── ParticleManager.ts Object-pooled 400-slot particle system
│   ├── AudioManager.ts   Procedural Web Audio API sound and drones engine
│   └── SaveManager.ts    Local storage load/save logic
├── engine/
│   ├── renderer.ts       Canvas 2D renderer, lighting pass, rare ore shimmer
│   └── input.ts          Keyboard, mouse and touch unified handler
├── components/           12 Glassmorphic React UI panels with CSS Modules
├── App.tsx               Main loop, time tick manager, and settings mapper
├── main.tsx              React entry point
└── index.css             Global tokens, Outfit/Share Tech Mono font imports
```

---

## 🏔️ Progression Biomes

| Biome | Depth Layer | Environmental Highlights |
|-------|-------------|-------------------------|
| Surface | cy 0 | Depot Terminal, Sell & Shop base |
| Soil Layer | cy 1 | Coal, iron pockets |
| Clay Beds | cy 2–3 | Fossil clusters, clay walls |
| Stone Belt | cy 3–6 | Gold veins, hardstone bricks |
| Deep Rock | cy 6–9 | Emeralds, ruby gems, relics |
| Crystal Caverns | cy 9+ | Crystal clusters, glowing void stone |
| Ancient Facility | cy 10-11 | Security grids, keycard chests, hazard energy drain |
| World Core | cy 12-13 | Volcanic magma rocks, stabilizer core |
| Reality Fracture | cy 14+ | Void stone blocks, fracture shards, Resonance Stabilizer |

---

## 🧪 Development & Testing

```bash
# Run strict TypeScript compiler
npx tsc --noEmit

# Run Vitest automated test suite (111 tests)
npm test

# Build production bundle
npm run build
```

---

## 📄 License

MIT — see [LICENSE](LICENSE)
