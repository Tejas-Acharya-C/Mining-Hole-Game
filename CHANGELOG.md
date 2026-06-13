# Changelog

All notable changes to **VOIDCORE: DEEP ALCHEMY** are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.1] — 2026-06-12

### Added
- Professional README with gameplay loop, tech stack, badges, and contributing section
- `docs/screenshots/` guide for README and social preview assets
- GitHub release notes template (`docs/GITHUB_RELEASE_v1.0.1.md`)

### Changed
- Page title and favicon link in `index.html`
- Repository documentation aligned with v1.0.0 gameplay (150 tests, guidance UI, mobile support)

### Fixed
- Quest panel no longer implies manual “claim” step for completed quests
- Removed playtest/debug overlay files and temporary dev scripts from the repository

---

## [1.0.0] — 2026-06-12

### Added
- Full story progression system with objective tracker, hint panel, field journal, and milestone popups
- Compact guidance UI — collapsed by default on desktop and mobile
- Mobile touch controls with responsive HUD and viewport-safe layout
- Three endgame layers: Ancient Facility, World Core, Reality Fracture
- Three narrative endings via the resonance stabilizer
- 13 upgrades, 15 quests, 50 achievements, and 5 challenge modes
- Prestige system with compounding sell multiplier
- Environmental modifiers (Low Gravity, Deep Darkness, Rich Veins, Hardcore Collapse) after first win
- Custom world seed input
- Accessibility settings: UI scale, large text, reduced motion, particle quality
- Versioned save system with localStorage persistence
- 150 automated tests across 11 test files (Vitest)
- GitHub Actions CI (Node 18 & 20)

### Changed
- Polished first-session UX: auto-fading tutorial hints, minimal objective chip
- Improved player sprite visibility (outline, shadow, brighter colors)
- Tuned camera framing for less empty sky and more terrain
- Artifact Sense cost reduced to $1,800; clearer shop descriptions for exploration upgrades
- Quest panel labels corrected (rewards are granted automatically on completion)
- FPS overlay simplified to show counter only (no internal debug metrics)

### Removed
- Playtest/debug overlay from production builds
- Temporary development scripts and internal audit documents from the repository

### Technical
- Pure static site: TypeScript 5.6 strict mode, Vite 6 production bundle (~311 KB JS gzipped ~97 KB)
- Zero runtime dependencies beyond React 18
- Object-pooled particle system, offscreen canvas lighting pass
