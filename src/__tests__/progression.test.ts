import { describe, expect, it } from 'vitest';
import { createInitialState, interactAncientTerminal, interactResonanceStabilizer } from '../systems/GameManager.testable';
import { addJournalEntry, getCurrentHint, syncProgressionJournal, updateProgressionStage } from '../systems/ProgressionSystem';
import { WorldManager } from '../systems/WorldManager';

describe('progression system', () => {
  it('generates hint text from current progression state', () => {
    const state = createInitialState(7);
    state.objectiveStage = 'find_artifact';
    state.player.deepestDepth = 145;

    expect(getCurrentHint(state)).toContain('Search the deeper chambers');
  });

  it('creates milestone popup and journal entry when artifact is found', () => {
    const state = createInitialState(7);
    state.objectiveStage = 'find_artifact';
    state.player.inventory.push({ itemId: 'artifact', qty: 1 });

    updateProgressionStage(state);

    expect(state.objectiveStage).toBe('artifact_found');
    expect(state.activeMilestonePopup).toBe('artifact_found');
    expect(state.journalEntries?.some(entry => entry.title === 'Recovered the buried artifact.')).toBe(true);
  });

  it('records quest and discovery journal entries without duplicates', () => {
    const state = createInitialState(7);
    addJournalEntry(state, 'quest', 'Quest completed: First Steps');
    addJournalEntry(state, 'quest', 'Quest completed: First Steps');
    state.statistics.biomesDiscovered.add('world_core');

    syncProgressionJournal(state);

    expect(state.journalEntries?.filter(entry => entry.title === 'Quest completed: First Steps')).toHaveLength(1);
    expect(state.journalEntries?.some(entry => entry.title === 'Reached the World Core.')).toBe(true);
  });

  it('adds terminal and ending journal entries through gameplay interactions', () => {
    const state = createInitialState(7);
    const wm = new WorldManager(state.seed, state.chunks);
    state.player.inventory.push({ itemId: 'artifact', qty: 1 });

    interactAncientTerminal(state, wm);
    interactResonanceStabilizer(state);

    expect(state.journalEntries?.some(entry => entry.title === 'Activated the ancient terminal.')).toBe(true);
    expect(state.journalEntries?.some(entry => entry.title === 'Unlocked the final ending choice.')).toBe(true);
  });
});
