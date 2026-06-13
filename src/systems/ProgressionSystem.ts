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
  artifact_found: 'Recovered the buried artifact. I should return to the surface site and use the ancient terminal.',
  terminal_activated: 'Activated the ancient terminal on the surface. It opened the way to the Ancient Facility below.',
  facility_unlocked: 'Recovered the Facility Keycard from the Facility containment vault. Returning to the surface to open the core.',
  find_world_core: 'Opened the route toward the World Core. I must descend past 190m to reach the planet\'s core.',
  core_reached: 'Reached the World Core. I need to locate the Geothermal Core structure and find the Core Stabilizer.',
  find_fracture: 'Continued below the core. Pressing deeper below 220m to reach the source of the reality disturbance.',
  fracture_reached: 'Stood before the Reality Fracture. The Resonance Stabilizer nearby is key to resolving this once I secure the Fracture Shard.',
  ending_choice: 'Unlocked the final decision to stabilize the fracture.',
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
    
    // Phase 6: Lock character input (0.3s max) and trigger story milestone screen shake
    state.inputLockTimer = 0.3;
    if (state.settings.screenShake && !state.settings.reducedMotion) {
      state.player.shakeAmount = Math.max(state.player.shakeAmount, 15);
    }
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

export function isTerminalGuidanceActive(state: GameState): boolean {
  const hasArtifact = state.player.inventory.some(s => s.itemId === 'artifact' && s.qty > 0);
  const hasKey = state.player.inventory.some(s => s.itemId === 'facility_key' && s.qty > 0);
  
  if (hasArtifact && !state.artifactActivated) {
    return true;
  }
  if (hasKey && !state.facilityUnlocked) {
    return true;
  }
  return false;
}

export function getArtifactGuidanceText(state: GameState): string | null {
  const depth = state.player.deepestDepth;
  const hasArtifact = state.player.inventory.some(s => s.itemId === 'artifact' && s.qty > 0);
  
  if (depth > 100 && !state.artifactActivated && !hasArtifact) {
    if (state.player.x < 16) {
      return "Artifact signal detected east.";
    } else if (state.player.x > 31) {
      return "Artifact signal detected west.";
    } else {
      return "Artifact signal growing stronger.";
    }
  }
  return null;
}

export function getCurrentObjective(state: GameState) {
  const stage = state.objectiveStage || 'new_game';
  const baseObjective = OBJECTIVES[stage] || OBJECTIVES.new_game;
  const progress = getObjectiveProgress(state, stage);
  const obj = progress ? { ...baseObjective, progress } : { ...baseObjective };
  
  if (isTerminalGuidanceActive(state)) {
    return {
      ...obj,
      description: "Return to the Ancient Terminal on the surface.",
    };
  }
  return obj;
}

export function getCurrentHint(state: GameState): string {
  if (isTerminalGuidanceActive(state)) {
    return "Return to the Ancient Terminal on the surface.";
  }

  const stage = state.objectiveStage || 'new_game';
  const depth = state.player.deepestDepth;
  const discovered = state.statistics.biomesDiscovered;
  const hasFacilityKey = hasItem(state, 'facility_key');
  const hasCoreStabilizer = hasItem(state, 'core_stabilizer');
  const hasFractureShard = hasItem(state, 'fracture_shard');
  const completedQuests = state.quests.filter(q => q.status === 'completed' || q.status === 'claimed').length;
  
  const scannerLevel = state.player.upgrades.artifact_sense ?? 0;
  let requiredScannerTier = 1;
  if (stage === 'new_game' || stage === 'early_dig' || stage === 'find_artifact') {
    requiredScannerTier = 1;
  } else if (stage === 'artifact_found' || stage === 'terminal_activated' || stage === 'find_facility_key') {
    requiredScannerTier = 2;
  } else if (stage === 'facility_unlocked' || stage === 'find_world_core') {
    requiredScannerTier = 3;
  } else if (stage === 'core_reached') {
    requiredScannerTier = 4;
  } else if (stage === 'find_fracture' || stage === 'fracture_reached') {
    requiredScannerTier = hasFractureShard ? 6 : 5;
  }

  const scannerTip = scannerLevel < requiredScannerTier
    ? ` (Tip: Upgrade Discovery Scanner to Tier ${requiredScannerTier} to trace the target.)`
    : ` (Discovery Scanner Tier ${scannerLevel} active. Search within ${scannerLevel * 50} tiles.)`;

  if (stage === 'new_game') return 'Start digging downward. Valuable resources become more common at greater depths.';
  if (stage === 'early_dig') {
    return completedQuests === 0
      ? 'Sell what you collect at the surface, then buy upgrades so you can keep digging deeper.'
      : 'Keep descending. Better resources and the main story both begin deeper underground.';
  }
  if (stage === 'find_artifact') {
    return (depth < 140
      ? 'The artifact lies deep underground in the Crystal Cavern. Continue exploring deeper.'
      : 'You are close to the Artifact (depth 140-160m). Search the central chamber of this zone.') + scannerTip;
  }
  if (stage === 'artifact_found') {
    return 'You recovered the Core Artifact. Bring it back to the surface and interface with the Ancient Terminal.';
  }
  if (stage === 'terminal_activated') {
    return (hasFacilityKey
      ? 'You recovered the Facility Keycard! Return to the surface and use the Ancient Terminal.'
      : 'The Ancient Facility lies below 150m. Search containment vaults (around 160-176m) for the Facility Keycard.') + scannerTip;
  }
  if (stage === 'facility_unlocked' || (state.artifactActivated && !state.facilityUnlocked)) {
    return 'Return to the surface Ancient Terminal and insert the Facility Keycard to unlock the path below.';
  }
  if (stage === 'find_world_core' || (state.facilityUnlocked && !discovered.has('world_core'))) {
    return ('The path is open. Descend past the Ancient Facility (below 190m) to reach the World Core.') + scannerTip;
  }
  if (stage === 'core_reached') {
    return (hasCoreStabilizer
      ? 'You secured the Core Stabilizer. Continue descending below 220m to reach the Reality Fracture.'
      : 'Search the Geothermal Core structure (around 202m) for a chest containing the Core Stabilizer.') + scannerTip;
  }
  if (stage === 'find_fracture' || (discovered.has('world_core') && !discovered.has('reality_fracture'))) {
    return ('The Reality Fracture lies below the World Core (depth > 220m). Press deeper.') + scannerTip;
  }
  if (stage === 'fracture_reached') {
    return (!hasCoreStabilizer
      ? 'You must retrieve the Core Stabilizer from the World Core chest (around 202m).'
      : !hasFractureShard
      ? 'Search the Reality Fracture rift (around 232m) for a chest holding the Fracture Shard.'
      : 'You have all components. Interact with the Resonance Stabilizer near the Fracture.') + scannerTip;
  }
  if (stage === 'ending_choice' || state.atEndgameStabilizer) {
    return 'Decide the fate of Voidcore. Interface with the Resonance Stabilizer and select your ending choice.';
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
