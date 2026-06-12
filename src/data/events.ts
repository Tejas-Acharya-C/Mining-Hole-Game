import type { EventKind, LoreFragment } from '../types';

export interface EventTemplate {
  kind: EventKind;
  label: string;
  description: string;
  color: string;
  minDepth: number;
  maxDepth: number;
  weight: number;        // relative spawn chance
  radius: number;        // tile radius of effect
  /** Cooldown added after triggering (seconds) */
  cooldown: number;
}

export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    kind: 'treasure_vault',
    label: '💰 Buried Vault!',
    description: 'Chests of ancient wealth buried nearby.',
    color: '#ffd700',
    minDepth: 5, maxDepth: 999,
    weight: 8, radius: 5, cooldown: 90,
  },
  {
    kind: 'crystal_bloom',
    label: '💎 Crystal Bloom!',
    description: 'A cluster of crystals has formed in the walls.',
    color: '#cc44ff',
    minDepth: 20, maxDepth: 999,
    weight: 10, radius: 4, cooldown: 60,
  },
  {
    kind: 'lost_cache',
    label: '📦 Lost Cache!',
    description: 'Scattered coins and resources — someone was here before.',
    color: '#22c55e',
    minDepth: 10, maxDepth: 999,
    weight: 14, radius: 3, cooldown: 45,
  },
  {
    kind: 'fossil_discovery',
    label: '🦕 Fossil Discovery!',
    description: 'A preserved fossil cluster, with something unusual inside.',
    color: '#c8a96e',
    minDepth: 15, maxDepth: 80,
    weight: 8, radius: 4, cooldown: 80,
  },
  {
    kind: 'energy_surge',
    label: '⚡ Energy Surge!',
    description: 'Pulsing energy nodes nearby. Approach to recharge.',
    color: '#44ffaa',
    minDepth: 3, maxDepth: 999,
    weight: 12, radius: 6, cooldown: 50,
  },
  {
    kind: 'ore_vein_rich',
    label: '⛏ Rich Vein!',
    description: 'An unusually dense ore streak runs through the rock.',
    color: '#fbbf24',
    minDepth: 8, maxDepth: 999,
    weight: 12, radius: 5, cooldown: 60,
  },
  {
    kind: 'cave_echo',
    label: '🗺 Cave Echo!',
    description: 'A large hollow resonates nearby. Break through to explore.',
    color: '#60a5fa',
    minDepth: 5, maxDepth: 999,
    weight: 8, radius: 8, cooldown: 70,
  },
  {
    kind: 'ancient_inscription',
    label: '📜 Ancient Inscription!',
    description: 'Carvings in the rock. Someone left a message in stone.',
    color: '#e8c880',
    minDepth: 20, maxDepth: 999,
    weight: 5, radius: 2, cooldown: 120,
  },
];

export const LORE_FRAGMENTS: LoreFragment[] = [
  {
    id: 'lore_01',
    title: 'Survey Log — Day 1',
    text: 'Seismic readings confirm it. Something is down here. Something old. The readings have no natural explanation.',
    depth: 10,
  },
  {
    id: 'lore_02',
    title: 'Miner\'s Journal',
    text: 'The deeper we go, the stranger the rock. Not formed by pressure — carved. Someone built these passages long ago.',
    depth: 25,
  },
  {
    id: 'lore_03',
    title: 'Research Notes — Fragment A',
    text: 'Crystal formation at this depth should be impossible. The energy signature matches nothing in our database. Recommend immediate investigation.',
    depth: 40,
  },
  {
    id: 'lore_04',
    title: 'Warning Sign (translated)',
    text: 'BELOW THIS POINT — THE OLD MACHINES WAKE. DO NOT DISTURB THE DEEP SILENCE.',
    depth: 60,
  },
  {
    id: 'lore_05',
    title: 'Encoded Transmission',
    text: 'Signal origin: unknown. Content: "The artifact responds to proximity. It has been waiting. For how long — we cannot say."',
    depth: 80,
  },
  {
    id: 'lore_06',
    title: 'Final Entry',
    text: 'The chamber doors opened on their own. Inside: silence. Then a sound like breathing. We ran. I am the only one who made it back.',
    depth: 100,
  },
  {
    id: 'lore_07',
    title: 'The Void Speaks',
    text: 'At sufficient depth, the void stone begins to transmit. The message is always the same: "You are close. Come deeper."',
    depth: 130,
  },
  {
    id: 'lore_08',
    title: 'Lost Civilization Record',
    text: 'They built their greatest achievement at the centre. Not a weapon. Not a power source. A question. Cast in metal that does not rust.',
    depth: 140,
  },
  {
    id: 'lore_09',
    title: 'Facility Log — Incident 44B',
    text: 'Core temperature rising. Automatic containment grids deployed at Depth 10. The security grids drain energy to repel organic lifesign entries.',
    depth: 160,
  },
  {
    id: 'lore_10',
    title: 'Geothermal Core Diagnostics',
    text: 'Reactor status: unstable. Geothermal core stabilizer required. Thermal shields are venting directly into the surrounding magma fields.',
    depth: 190,
  },
  {
    id: 'lore_11',
    title: 'Reality Rift Log',
    text: 'Dimensional stability at 14%. Micro-fractures appearing at depth 220. Recommended: lock stabilization terminal to prevent complete reality collapse.',
    depth: 220,
  },
  {
    id: 'lore_12',
    title: 'Endgame Synthesis',
    text: 'We were wrong. The core isn\'t a machine. It is a mirror. It doesn\'t create energy; it reflects the intent of whoever touches it.',
    depth: 235,
  },
];

/** Pick a weighted random event for a given depth */
export function pickEvent(depth: number, rng: () => number): EventTemplate | null {
  const valid = EVENT_TEMPLATES.filter(e => depth >= e.minDepth && depth <= e.maxDepth);
  if (valid.length === 0) return null;
  const totalWeight = valid.reduce((s, e) => s + e.weight, 0);
  let r = rng() * totalWeight;
  for (const e of valid) {
    r -= e.weight;
    if (r <= 0) return e;
  }
  return valid[valid.length - 1];
}

/** Get lore fragment appropriate for current depth (one per threshold) */
export function getLoreForDepth(depth: number, found: number): LoreFragment | null {
  const eligible = LORE_FRAGMENTS.filter(f => f.depth <= depth);
  if (eligible.length <= found) return null;
  return eligible[found] ?? null;
}
