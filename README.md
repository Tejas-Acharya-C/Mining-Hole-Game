# VOIDCORE: DEEP ALCHEMY

> Drill deep. Harness the void. Survive the hazards. Stabilize the world core.

A polished browser-based sci-fi mining game built with React, TypeScript, Vite, and Canvas 2D — no external game assets required.

---

## Key Features

- **Procedural underground world** with biomes, ore veins, hazards, and secrets
- **Story progression** with objective tracker, contextual hints, field journal, and milestone popups
- **Upgrade shop** with 13 upgrade paths (shovel, battery, lantern, teleporter, and more)
- **Quests & achievements** — 15 quests and 50 achievements
- **Three endgame layers** — Ancient Facility, World Core, Reality Fracture
- **Three narrative endings** unlocked through the stabilizer choice
- **Mobile support** — touch controls, compact HUD, responsive guidance UI
- **Accessibility** — UI scaling, large text, reduced motion, particle quality settings
- **Save system** — automatic localStorage persistence with schema migration
- **Challenge modes** — Hard, Dead Battery, No Shop, Chaos Market, Double Treasure
- **Prestige** — compounding sell bonuses after completing the game

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

## Installation

```bash
git clone https://github.com/Tejas-Acharya-C/Mining-Hole-Game.git
cd Mining-Hole-Game
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Project Structure

```
src/
├── components/       React UI (HUD, shop, inventory, guidance panels, modals)
├── data/             Tiles, items, upgrades, biomes, quests, objectives
├── engine/           Canvas renderer, input handling
├── systems/          GameManager, WorldManager, SaveManager, ProgressionSystem
├── types/            Shared TypeScript types
├── utils/            Device detection, guidance layout helpers
└── __tests__/        Vitest unit and component tests
```

---

## Development

```bash
# Type check
npx tsc --noEmit

# Run tests (150 tests)
npm test

# Production build
npm run build

# Preview production build locally
npm run preview
```

---

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for Cloudflare Pages, Netlify, Vercel, and GitHub Pages instructions.

---

## License

MIT — see [LICENSE](LICENSE)
