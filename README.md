# VOIDCORE: Deep Alchemy

> Drill deep. Harness the void. Survive the hazards. Stabilize the world core.

**VOIDCORE: Deep Alchemy** is a browser-based sci-fi mining game. Dig through procedurally generated underground biomes, collect ore, sell at the surface, upgrade your gear, complete quests, and follow a story from the surface down to the World Core and Reality Fracture.

Play in any modern browser — desktop or mobile. No install required when deployed; no external game assets needed to build from source.

[![Build & Test](https://github.com/Tejas-Acharya-C/Mining-Hole-Game/actions/workflows/build.yml/badge.svg)](https://github.com/Tejas-Acharya-C/Mining-Hole-Game/actions/workflows/build.yml)
![Tests](https://img.shields.io/badge/tests-150%20passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## Screenshots

<!-- Add screenshots to docs/screenshots/ and uncomment the lines below -->

<!--
| Title screen | Gameplay |
|:---:|:---:|
| ![Title screen](docs/screenshots/title.png) | ![Gameplay](docs/screenshots/gameplay.png) |

| Shop | Endgame |
|:---:|:---:|
| ![Shop](docs/screenshots/shop.png) | ![Endgame](docs/screenshots/endgame.png) |
-->

> **Tip:** Capture screenshots at 1280×720 for README and social previews. See [docs/screenshots/README.md](docs/screenshots/README.md).

---

## Features

### Core gameplay
- **Procedural world** — chunk-based underground generation with biomes, ore veins, hazards, and secrets
- **Dig → collect → sell → upgrade** loop with energy management and inventory limits
- **13 upgrades** — shovel, battery, backpack, lantern, boots, drill, teleporter, jetpack, and more
- **Dynamic lighting** — lantern radius and biome-tinted underground atmosphere

### Progression & story
- **Main story arc** — artifact discovery, ancient terminal, facility key, World Core, Reality Fracture, ending choice
- **Objective tracker** — compact on-screen chip with expandable details
- **Hint panel & field journal** — on-demand guidance without blocking gameplay
- **Milestone popups** — major story beats communicated in-game

### Content & replay
- **15 quests** with chained unlocks and permanent bonuses
- **50 achievements** across exploration, economy, collection, and secrets
- **3 narrative endings** via the resonance stabilizer
- **5 challenge modes** — Hard, Dead Battery, No Shop, Chaos Market, Double Treasure
- **Prestige** — compounding sell multiplier after completing the game
- **Custom seeds & modifiers** — unlock after your first win (Low Gravity, Deep Darkness, Rich Veins, Hardcore Collapse)

### Platform & accessibility
- **Mobile support** — touch joystick, dig button, compact HUD, responsive guidance UI
- **Save system** — automatic `localStorage` persistence with schema migration
- **Accessibility** — UI scale, large text, reduced motion, particle quality, optional FPS counter

---

## Gameplay Loop

1. **Dig** downward from the surface using keyboard, mouse, or touch controls.
2. **Collect** ore and items into your limited inventory.
3. **Return** to the surface depot to **sell** cargo for money.
4. **Upgrade** your shovel, energy, light, and utility gear at the shop.
5. **Explore** deeper biomes, complete **quests**, and follow **story objectives**.
6. **Progress** through endgame layers to unlock the final **ending choice**.

Typical first playthrough: **75–120 minutes** depending on exploration and upgrades.

---

## Controls

| Action | Keyboard | Touch |
|--------|----------|-------|
| Move | Arrow keys / WASD | Left joystick |
| Dig | Z / Space / click adjacent tile | Mine button |
| Sell | E at surface | Sell control |
| Shop | B at surface | Shop button |
| Inventory | I | Backpack button |
| Quests | Q | Quests panel |
| Teleport | T (with charges) | Teleport button |
| Pause | Esc / P | Pause button |
| Hints / Journal | Buttons on objective chip | Same |

---

## Quick Start

### Play online

Deploy the built `dist/` folder to any static host (see [DEPLOYMENT.md](DEPLOYMENT.md)).  
If you publish to GitHub Pages, your game URL will look like:

`https://tejas-acharya-c.github.io/Mining-Hole-Game/`

### Run locally

```bash
git clone https://github.com/Tejas-Acharya-C/Mining-Hole-Game.git
cd Mining-Hole-Game
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

### Production build

```bash
npm run build    # outputs to dist/
npm run preview  # serve dist/ locally
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| UI | React 18, CSS Modules |
| Language | TypeScript 5.6 (strict) |
| Build | Vite 6 |
| Rendering | Canvas 2D (lighting pass, particles) |
| Audio | Web Audio API (procedural) |
| Storage | `localStorage` saves |
| Tests | Vitest + jsdom (150 tests) |
| CI | GitHub Actions (Node 18 & 20) |

No runtime dependencies beyond React. Production JS bundle ~311 KB (~97 KB gzipped).

---

## Project Structure

```
src/
├── components/       React UI (HUD, shop, inventory, guidance panels, modals)
├── data/             Tiles, items, upgrades, biomes, quests, objectives
├── engine/           Canvas renderer, input handling
├── systems/          GameManager, WorldManager, SaveManager, ProgressionSystem
├── types/            Shared TypeScript types
├── utils/            Device detection, layout helpers
└── __tests__/        Vitest unit and component tests
```

---

## Development

```bash
npx tsc --noEmit   # type check
npm test           # run 150 tests
npm run build      # production build
```

Test coverage includes progression, quests, economy, saves, world generation, responsive layout, and release quality gates.

---

## Deployment

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for Cloudflare Pages, Netlify, Vercel, and GitHub Pages.

No environment variables or backend required.

---

## Contributing

Contributions are welcome. Please open an issue before large changes. Run `npm test` and `npm run build` before submitting a pull request.

---

## License

MIT — see [LICENSE](LICENSE).

---

## Credits

Built by [Tejas Acharya](https://github.com/Tejas-Acharya-C).  
Game title: **VOIDCORE: Deep Alchemy**.
