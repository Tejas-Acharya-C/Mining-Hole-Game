# VOIDCORE: Deep Alchemy v1.0.1

> Copy this content into GitHub → Releases → Draft a new release → Tag: `v1.0.1`

---

## Release Summary

VOIDCORE: Deep Alchemy v1.0.1 is a **public release polish update**. It improves documentation, repository presentation, and first-time player clarity — with no new gameplay systems, biomes, quests, or upgrades.

This release marks the project as ready for public discovery on GitHub and static hosting (GitHub Pages, Cloudflare Pages, Netlify, Vercel).

**Play:** build `dist/` or use your deployed URL.

---

## New Features

_No new gameplay features in v1.0.1. See v1.0.0 for the full feature set._

Documentation and release assets added in this version:

- Professional README with gameplay loop, tech stack, and contribution section
- Screenshot placeholder guide under `docs/screenshots/`
- Updated CHANGELOG and GitHub release notes
- Favicon and page title aligned with game branding

---

## Gameplay Improvements

- Objective chip shows a **minimal title** (e.g. `🎯 Start Digging`) instead of verbose labels
- **Auto-fading tutorial hints** — brief on-screen tips that disappear; hints remain available via the ❓ button
- **Player sprite visibility** — brighter colors, outline, and ground shadow
- **Camera tuning** — less empty sky, more terrain visible around the player
- **Artifact Sense** cost reduced to $1,800 with clearer shop description

---

## Mobile Improvements

- Compact **objective tracker** collapsed by default on phones
- **Hint** and **journal** open as modals only — no permanent screen clutter
- Responsive layout validated at 320px–1024px viewports
- Touch controls remain reachable without overlapping core gameplay

---

## Progression & Quest System

- Full story arc: Artifact → Surface Terminal → Facility → World Core → Reality Fracture → Ending
- Objective tracker, hint panel, field journal, and milestone popups
- Quest rewards grant **automatically** on completion (UI label corrected)
- 150 automated tests cover progression, saves, and guidance UI defaults

---

## Performance

- Production bundle: ~311 KB JS (~97 KB gzipped), ~57 KB CSS (~11 KB gzipped)
- Object-pooled particles; optional low particle quality on mobile
- No new performance regressions introduced in this release

---

## Testing

```
npm test        → 150 tests passing (11 files)
npm run build   → TypeScript strict + Vite production build
CI              → GitHub Actions on Node 18 & 20
```

Release quality gates verify:

- No playtest/debug UI in production bundle
- Guidance panels closed by default
- Gameplay viewport remains dominant on mobile

---

## Known Issues

- **Surface terminal** can be easy to walk past on first visit — use hints (❓) or journal (📓)
- **Facility navigation** is the slowest mid-game beat — procedural layout requires exploration
- **`q_speed_50` quest** — 5-minute time limit works in code but is not shown in quest progress UI
- **Scanner vs Ore Detector** — overlapping exploration upgrades; shop descriptions clarify roles
- Canvas-based gameplay has inherent screen-reader limitations

---

## Future Plans

- Published demo URL on GitHub Pages
- README screenshots and social preview image
- Optional quest UI improvement for timed quests
- Balance pass based on public playtest feedback

No commitment to new biomes, quest chains, or upgrade trees in patch releases.

---

## Install & Run

```bash
git clone https://github.com/Tejas-Acharya-C/Mining-Hole-Game.git
cd Mining-Hole-Game
git checkout v1.0.1
npm install
npm run build
npm run preview
```

---

## Full Changelog

See [CHANGELOG.md](../CHANGELOG.md).
