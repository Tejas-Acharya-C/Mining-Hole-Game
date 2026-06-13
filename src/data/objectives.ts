import type { HintCategory, ObjectiveState } from './progression';

export const OBJECTIVES: Record<string, ObjectiveState> = {
  new_game: {
    stage: 'new_game',
    title: 'Start Digging',
    description: 'Dig straight down from the surface to gather ore and begin your descent.',
    progress: { current: 0, target: 30 },
  },
  early_dig: {
    stage: 'early_dig',
    title: 'Reach 100m',
    description: 'Upgrade your gear and push deeper. Reaching 100m opens the way to the main mystery below.',
    progress: { current: 0, target: 100 },
  },
  find_artifact: {
    stage: 'find_artifact',
    title: 'Find the Artifact',
    description: 'Keep descending toward 150m. The buried artifact should be somewhere in that deeper zone.',
    progress: { current: 0, target: 150 },
  },
  artifact_found: {
    stage: 'artifact_found',
    title: 'Return to Ancient Terminal',
    description: 'Bring the recovered Core Artifact back to the surface. Insert it into the Ancient Terminal at the surface to decipher its purpose.',
    subtasks: ['Ascend to the surface site', 'Use the Ancient Terminal'],
  },
  return_to_terminal: {
    stage: 'return_to_terminal',
    title: 'Return to Surface Terminal',
    description: 'The artifact is active. Insert it into the Ancient Terminal on the surface.',
    subtasks: ['Go to the surface', 'Use the terminal'],
  },
  terminal_activated: {
    stage: 'terminal_activated',
    title: 'Explore Ancient Facility',
    description: 'The terminal has established an overlink, opening the path below 150m. Descend into the Ancient Facility and search containment vaults for the Facility Keycard.',
    subtasks: ['Descend below 150m into the Facility', 'Recover the Facility Keycard from a vault chest'],
  },
  find_facility_key: {
    stage: 'find_facility_key',
    title: 'Find the Facility Key',
    description: 'Search the Ancient Facility carefully. The key there should unlock the next path.',
    progress: { current: 0, target: 200 },
  },
  facility_unlocked: {
    stage: 'facility_unlocked',
    title: 'Return to Ancient Terminal',
    description: 'You recovered the Facility Key. Return to the surface and interface with the Ancient Terminal to open the path to the World Core.',
    subtasks: ['Ascend to the surface site', 'Interact with the Ancient Terminal'],
  },
  find_world_core: {
    stage: 'find_world_core',
    title: 'Reach the World Core',
    description: "The terminal opened the final descent. Push deeper past 190m until you reach the planet's core.",
    progress: { current: 0, target: 200 },
  },
  core_reached: {
    stage: 'core_reached',
    title: 'Stabilize the Core',
    description: 'You reached the World Core. Locate the Geothermal Core structure (around 202m) and search for the Core Stabilizer.',
  },
  find_fracture: {
    stage: 'find_fracture',
    title: 'Reach the Fracture',
    description: 'Reality is breaking below the core. Continue downward past 220m until you find the source.',
  },
  fracture_reached: {
    stage: 'fracture_reached',
    title: 'Stabilize Reality',
    description: 'You found the Reality Fracture. Recover the Fracture Shard from a chest below 220m, then interact with the Resonance Stabilizer.',
    subtasks: ['Approach the stabilizer', 'Choose how to resolve the fracture'],
  },
  ending_choice: {
    stage: 'ending_choice',
    title: 'Choose the Ending',
    description: 'The final choice is ready. Decide how you want to resolve the fracture.',
  },
};

export const HINTS: Record<HintCategory, string[]> = {
  general: [
    'Explore the world by digging. Each biome holds unique ore and secrets.',
    'Sell ore and items at the surface to earn money for upgrades.',
    'Upgrades make you faster, stronger, and more capable. Invest wisely.',
    'Quests guide your early exploration. Complete them for rewards.',
  ],
  artifact: [
    'The artifact is said to lie deep in the earth.',
    'Keep digging deeper. The artifact will reveal itself when you reach it.',
    'The artifact glows with inner light. You will recognize it when you see it.',
    'Ancient energy surrounds the artifact. It may unlock secrets on the surface.',
  ],
  terminal: [
    'The ancient terminal stands on the surface near the dig site.',
    'The terminal responds to artifacts.',
    'The terminal symbols pulse with dormant power.',
    'Use the artifact at the terminal to unlock new depths.',
  ],
  facility: [
    'The Facility Key is hidden somewhere within the Ancient Facility.',
    'Search thoroughly in the deeper chambers.',
    'A chest may hide what you need.',
    'Return to the terminal with the facility key to unlock the world core.',
  ],
  core: [
    'The World Core lies beneath layers of magma and ancient stone.',
    'Reach the deeper core levels to find the heart of the planet.',
    'The core stabilizer is tied to the path ahead.',
    'Search the core chambers for what you need.',
  ],
  fracture: [
    'The Reality Fracture exists at the deepest point accessible.',
    'Approach it carefully. Reality warps around it.',
    'The stabilizer is tied to the final choice.',
    'Your last decision awaits at the fracture.',
  ],
  ending: [
    'Multiple outcomes may be available depending on your journey.',
    'Your actions throughout the game matter.',
    'The ending you unlock reflects the path you took.',
    'Prepare before you commit to the final choice.',
  ],
};

export const MILESTONES = {
  artifact_found: {
    id: 'artifact_found',
    title: 'ARTIFACT RECOVERED',
    message: 'Ancient energy has awakened. The artifact calls to the surface terminal.',
    icon: 'A',
  },
  terminal_activated: {
    id: 'terminal_activated',
    title: 'ANCIENT FACILITY UNLOCKED',
    message: 'New depths are now accessible. The facility awaits your exploration.',
    icon: 'T',
  },
  facility_unlocked: {
    id: 'facility_unlocked',
    title: 'WORLD CORE UNLOCKED',
    message: "The facility key opens a path to the planet's heart.",
    icon: 'F',
  },
  core_reached: {
    id: 'core_reached',
    title: 'WORLD CORE DISCOVERED',
    message: 'You stand at the edge of the world core. The fracture is near.',
    icon: 'C',
  },
  fracture_reached: {
    id: 'fracture_reached',
    title: 'REALITY FRACTURE DISCOVERED',
    message: 'Before you lies the fracture. Your choice will echo through reality.',
    icon: 'R',
  },
  ending_choice: {
    id: 'ending_choice',
    title: 'ENDING UNLOCKED',
    message: 'The final choice is now within reach.',
    icon: '*',
  },
};
