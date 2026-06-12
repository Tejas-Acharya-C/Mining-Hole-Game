# Changelog

All notable changes to **VOIDCORE: DEEP ALCHEMY** are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.0] — 2026-06-12

### Added
- Rebranded visual identity to **VOIDCORE: DEEP ALCHEMY** with glassmorphic dashboards.
- Cybernetic visor HUD with glowing energy levels, inventory warnings, and compass target objective tracking.
- Three progress-gated endgame layers below Bedrock thresholds:
  - **Ancient Facility**: Central containment structure with security grids draining energy.
  - **World Core**: Geothermal layer with magma hazards.
  - **Reality Fracture**: Final zone containing resonance stabilizers and fracture shards.
- Three narrative endings: Standard Containment, Void Singularity Absorption, and Perfect Resonance.
- Title screen environmental modifiers: Low Gravity, Deep Darkness, Rich Veins, and Hardcore Collapse.
- Custom projection seed input for world generation.
- Permanent Prestige ranking system providing compound cash multipliers and energy cost discounts.
- Accessibility options panel supporting UI scaling multiplier, large text mode, and a reduced motion toggle.
- Upgraded procedural Web Audio arpeggio sweeps, discovery stingers, achievement chimes, and multi-oscillator biome ambient drones.
- 50 achievements and 15 quests with chained unlock systems.
- 5 gameplay challenges: Hard, Dead Battery, No Shop, Chaos Market, and Double Treasure.
- Dynamic offscreen canvas lighting pass and animated diagonal shimmers on rare ores.
- 111 automated unit tests across 6 files using Vitest.
- Versioned save system with localStorage persistence and automatic schema migrations.

### Technical
- Pure static site bundle: TypeScript 5.6 strict mode compiling into a lightweight 283KB JS bundle.
- Zero external runtime library dependencies outside of React.
- Object-pooled particle systems ensuring zero heap allocation during gameplay loop.
- No circular dependencies or dead exports.
- Safe keyboard, mouse, and unified touch virtual controls.
