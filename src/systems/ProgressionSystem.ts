import type { BiomeId, GameState } from '../types';
import { OBJECTIVES, MILESTONES } from '../data/objectives';
import { QUEST_DEFS } from '../data/quests';

type JournalType = 'milestone' | 'discovery' | 'quest';

const STORY_STAGE_LABELS: Array<{ stage: string; label: string }> = [
  { stage: 'new_game', label: 'Expedition Begun' },
  { stage: 'artifact_found', label: 'Artifact Found' },
  { stage: 'terminal_activated', label: 'Terminal Activated' },
  { stage: 'facility_unlocked', label: 'Facility Key Recovered' },
  { stage: 'core_reached', label: 'World Core Reached' },
  { stage: 'fracture_reached', label: 'Reality Fracture Reached' },
  { stage: 'ending_choice', label: 'Ending Unlocked' },
];

const BIOME_DISCOVERY_LABELS: Partial<Record<BiomeId, string>> = {
  crystal_cavern: 'Entered the Crystal Cavern.',
  fossil_zone: 'Reached the Fossil Zone.',
  ancient_facility: 'Found the Ancient Facility.',
  world_core: 'Reached the World Core.',
  reality_fracture: 'Found the Reality Fracture.',
};

const STAGE_JOURNAL_ENTRIES: Partial<Record<string, string>> = {
  new_game: 'Began the dig beneath the old site.',
  early_dig: 'Committed to digging deeper for answers.',
  find_artifact: 'The search narrowed toward the deeper layers.',
  artifact_found: 'Recovered the buried artifact.',
  terminal_activated: 'Activated the ancient terminal on the surface.',
  facility_unlocked: 'Recovered the Facility Key.',
  find_world_core: 'Opened the route toward the World Core.',
  core_reached: 'Reached the World Core.',
  find_fracture: 'Continued below the core toward the fracture.',
  fracture_reached: 'Stood before the Reality Fracture.',
  ending_choice: 'Unlocked the final decision.',
};

export function updateProgressionStage(state: GameState): void {
  const prevStage = state.objectiveStage;
  if (state.screen !== 'playing') return;

  let newStage = state.objectiveStage || 'new_game';

  if (newStage === 'new_game' && state.statistics.blocksDug >= 30) {
    newStage = 'early_dig';
  } else if (newStage === 'early_dig' && state.player.deepestDepth >= 140) {
    newStage = 'find_artifact';
  } else if (newStage === 'find_artifact' && hasItem(state, 'artifact')) {
    newStage = 'artifact_found';
  } else if (newStage === 'artifact_found' && state.artifactActivated) {
    newStage = 'terminal_activated';
  } else if (newStage === 'terminal_activated' && hasItem(state, 'facility_key')) {
    newStage = 'facility_unlocked';
  } else if (newStage === 'facility_unlocked' && state.player.deepestDepth >= 190) {
    newStage = 'find_world_core';
  } else if (newStage === 'find_world_core' && hasDiscoveredBiome(state, 'world_core')) {
    newStage = 'core_reached';
  } else if (newStage === 'core_reached' && state.player.deepestDepth >= 220) {
    newStage = 'find_fracture';
  } else if (newStage === 'find_fracture' && hasDiscoveredBiome(state, 'reality_fracture')) {
    newStage = 'fracture_reached';
  } else if (newStage === 'fracture_reached' && state.atEndgameStabilizer) {
    newStage = 'ending_choice';
  }

  if (newStage !== prevStage) {
    state.objectiveStage = newStage;
    addJournalEntry(state, 'milestone', STAGE_JOURNAL_ENTRIES[newStage] ?? `Reached ${getStoryStageLabel(newStage)}.`);
    checkAndShowMilestonePopup(state, newStage);
  }
}

export function addJournalEntry(state: GameState, type: JournalType, title: string): void {
  if (!state.journalEntries) state.journalEntries = [];
  if (state.journalEntries.some(entry => entry.type === type && entry.title === title)) return;

  state.journalEntries.push({ type, title, date: Date.now() });
  if (state.journalEntries.length > 60) {
    state.journalEntries = state.journalEntries.slice(-60);
  }
}

export function syncProgressionJournal(state: GameState): void {
  for (const biome of state.statistics.biomesDiscovered) {
    const label = BIOME_DISCOVERY_LABELS[biome];
    if (label) addJournalEntry(state, 'discovery', label);
  }

  if (state.secretFound || state.statistics.artifactsCollected > 0) {
    addJournalEntry(state, 'milestone', 'Recovered the buried artifact.');
  }
  if (state.artifactActivated) {
    addJournalEntry(state, 'milestone', 'Activated the ancient terminal.');
  }
  if (state.facilityUnlocked) {
    addJournalEntry(state, 'milestone', 'Unlocked the path to the World Core.');
  }
  if (hasDiscoveredBiome(state, 'world_core')) {
    addJournalEntry(state, 'milestone', 'Reached the World Core.');
  }
  if (hasDiscoveredBiome(state, 'reality_fracture')) {
    addJournalEntry(state, 'milestone', 'Found the Reality Fracture.');
  }
  if (state.unlockedEnding) {
    addJournalEntry(state, 'milestone', 'Unlocked the final ending choice.');
  }
  if (state.statistics.loreFragmentsFound > 0) {
    addJournalEntry(state, 'discovery', `Recovered ${state.statistics.loreFragmentsFound} lore fragment${state.statistics.loreFragmentsFound === 1 ? '' : 's'}.`);
  }

  for (const quest of state.quests) {
    if (quest.status === 'completed' || quest.status === 'claimed') {
      addJournalEntry(state, 'quest', `Completed quest: ${QUEST_DEFS[quest.id].title}.`);
    }
  }
}

export function getCurrentObjective(state: GameState) {
  const stage = state.objectiveStage || 'new_game';
  const baseObjective = OBJECTIVES[stage] || OBJECTIVES.new_game;
  const progress = getObjectiveProgress(state, stage);
  return progress ? { ...baseObjective, progress } : baseObjective;
}

export function getCurrentHint(state: GameState): string {
  const stage = state.objectiveStage || 'new_game';
  const depth = state.player.deepestDepth;
  const discovered = state.statistics.biomesDiscovered;
  const hasFacilityKey = hasItem(state, 'facility_key');
  const hasCoreStabilizer = hasItem(state, 'core_stabilizer');
  const hasFractureShard = hasItem(state, 'fracture_shard');
  const completedQuests = state.quests.filter(q => q.status === 'completed' || q.status === 'claimed').length;

  if (stage === 'new_game') return 'Start digging downward. Valuable resources become more common at greater depths.';
  if (stage === 'early_dig') {
    return completedQuests === 0
      ? 'Sell what you collect at the surface, then buy upgrades so you can keep digging deeper.'
      : 'Keep descending. Better resources and the main story both begin deeper underground.';
  }
  if (stage === 'find_artifact') {
    return depth < 140
      ? 'The artifact is believed to lie deep underground. Continue exploring deeper layers.'
      : 'You are close now. Search the deeper chambers around this depth and keep moving downward.';
  }
  if (stage === 'artifact_found') {
    return 'You recovered the artifact. Take it back to the surface and use the ancient terminal.';
  }
  if (stage === 'terminal_activated') {
    return hasFacilityKey
      ? 'You found the Facility Key. Bring it back to the surface terminal.'
      : 'The terminal has activated. Descend again and search the Ancient Facility for a key.';
  }
  if (stage === 'facility_unlocked' || (state.artifactActivated && !state.facilityUnlocked)) {
    return discovered.has('ancient_facility')
      ? 'The Facility Key is hidden somewhere within the Ancient Facility.'
      : 'The ancient facility lies below the newly opened depths. Continue descending to investigate.';
  }
  if (stage === 'find_world_core' || (state.facilityUnlocked && !discovered.has('world_core'))) {
    return 'The World Core lies below the Facility. Continue descending.';
  }
  if (stage === 'core_reached') {
    return hasCoreStabilizer
      ? 'You found a stabilizer tied to the anomaly below. Keep descending toward the fracture.'
      : 'You reached the World Core. Search for the route that continues below it.';
  }
  if (stage === 'find_fracture' || (discovered.has('world_core') && !discovered.has('reality_fracture'))) {
    return 'The path below the World Core is unstable. Press deeper to reach the source of the disturbance.';
  }
  if (stage === 'fracture_reached') {
    return hasFractureShard
      ? 'The Reality Fracture is unstable. Use the nearby stabilizer to begin the final choice.'
      : 'The Reality Fracture is unstable. Search nearby for the stabilizer and interact with it.';
  }
  if (stage === 'ending_choice' || state.atEndgameStabilizer) {
    return 'You are at the end of the journey. Read the choices carefully and decide how to resolve the fracture.';
  }

  return 'Keep exploring. Deeper layers usually hold the next clue.';
}

export function getStoryChecklist(state: GameState) {
  const stage = state.objectiveStage || 'new_game';
  const stageIndex = STORY_STAGE_LABELS.findIndex(item => item.stage === stage);

  return STORY_STAGE_LABELS.map((item, index) => ({
    label: item.label,
    completed: stageIndex >= index || (item.stage === 'ending_choice' && !!state.unlockedEnding),
  }));
}

function checkAndShowMilestonePopup(state: GameState, stage: string): void {
  if (!state.milestonesSeen) state.milestonesSeen = [];
  if (!MILESTONES[stage as keyof typeof MILESTONES]) return;
  if (state.milestonesSeen.includes(stage)) return;

  state.milestonesSeen.push(stage);
  state.lastMilestonePopup = { id: stage, timestamp: Date.now() };
  state.activeMilestonePopup = stage;
}

function getObjectiveProgress(state: GameState, stage: string) {
  if (stage === 'new_game') {
    return { current: state.statistics.blocksDug, target: 30 };
  }
  if (stage === 'early_dig') {
    return { current: state.player.deepestDepth, target: 100 };
  }
  if (stage === 'find_artifact') {
    return { current: state.player.deepestDepth, target: 150 };
  }
  if (stage === 'find_world_core') {
    return { current: state.player.deepestDepth, target: 200 };
  }
  return undefined;
}

function getStoryStageLabel(stage: string): string {
  return STORY_STAGE_LABELS.find(item => item.stage === stage)?.label ?? stage;
}

function hasDiscoveredBiome(state: GameState, biome: BiomeId): boolean {
  return state.statistics.biomesDiscovered.has(biome);
}

function hasItem(state: GameState, itemId: string): boolean {
  return state.player.inventory.some(slot => slot.itemId === itemId && slot.qty > 0);
}
