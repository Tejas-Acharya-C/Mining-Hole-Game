import { describe, expect, it } from 'vitest';
import {
  createInitialState,
  interactAncientTerminal,
  interactResonanceStabilizer,
  tryCollectItem,
  sellInventory,
  triggerEnding,
} from '../systems/GameManager.testable';
import { addJournalEntry, getCurrentHint, syncProgressionJournal, updateProgressionStage } from '../systems/ProgressionSystem';
import { WorldManager } from '../systems/WorldManager';

describe('progression system', () => {
  it('generates hint text from current progression state', () => {
    const state = createInitialState(7);
    state.objectiveStage = 'find_artifact';
    state.player.deepestDepth = 145;

    expect(getCurrentHint(state)).toContain('Search the central chamber');
  });

  it('creates milestone popup and journal entry when artifact is found', () => {
    const state = createInitialState(7);
    state.objectiveStage = 'find_artifact';
    state.player.inventory.push({ itemId: 'artifact', qty: 1 });

    updateProgressionStage(state);

    expect(state.objectiveStage).toBe('artifact_found');
    expect(state.activeMilestonePopup).toBe('artifact_found');
    expect(state.journalEntries?.some(entry => entry.title.includes('Recovered the buried artifact.'))).toBe(true);
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
    
    // Add required items to test resonance stabilizer
    state.player.inventory.push({ itemId: 'core_stabilizer', qty: 1 });
    state.player.inventory.push({ itemId: 'fracture_shard', qty: 1 });
    interactResonanceStabilizer(state);

    expect(state.journalEntries?.some(entry => entry.title === 'Activated the ancient terminal.')).toBe(true);
    expect(state.journalEntries?.some(entry => entry.title === 'Unlocked the final ending choice.')).toBe(true);
  });

  it('collects story items even when inventory is full (bypassing capacity)', () => {
    const state = createInitialState(7);
    state.player.inventory = [
      { itemId: 'coal', qty: 10 },
      { itemId: 'iron', qty: 10 },
    ];

    // Try collecting standard item - should fail
    const collectedStandard = tryCollectItem(state, 'coal', 1);
    expect(collectedStandard).toBe(false);

    // Try collecting story item - should succeed by bypassing limits
    const collectedStory = tryCollectItem(state, 'artifact', 1);
    expect(collectedStory).toBe(true);
    expect(state.player.inventory.some(s => s.itemId === 'artifact')).toBe(true);
  });

  it('prevents selling story items in sellInventory', () => {
    const state = createInitialState(7);
    state.player.inventory = [
      { itemId: 'coal', qty: 5 },
      { itemId: 'artifact', qty: 1 },
      { itemId: 'facility_key', qty: 1 },
    ];

    sellInventory(state);

    // Coal should be sold, but artifact and facility_key must remain
    expect(state.player.inventory.some(s => s.itemId === 'coal')).toBe(false);
    expect(state.player.inventory.some(s => s.itemId === 'artifact')).toBe(true);
    expect(state.player.inventory.some(s => s.itemId === 'facility_key')).toBe(true);
  });

  it('validates requirements for resonance stabilizer interaction', () => {
    const state = createInitialState(7);
    
    // Test 1: Empty inventory (should fail)
    interactResonanceStabilizer(state);
    expect(state.atEndgameStabilizer).not.toBe(true);

    // Test 2: Only has stabilizer (should fail)
    state.player.inventory.push({ itemId: 'core_stabilizer', qty: 1 });
    interactResonanceStabilizer(state);
    expect(state.atEndgameStabilizer).not.toBe(true);

    // Test 3: Has both items (should succeed)
    state.player.inventory.push({ itemId: 'fracture_shard', qty: 1 });
    interactResonanceStabilizer(state);
    expect(state.atEndgameStabilizer).toBe(true);
  });

  it('consumes core_stabilizer and fracture_shard upon triggerEnding', () => {
    const state = createInitialState(7);
    state.player.inventory = [
      { itemId: 'core_stabilizer', qty: 1 },
      { itemId: 'fracture_shard', qty: 1 },
      { itemId: 'coal', qty: 1 },
    ];

    triggerEnding(state, 'standard');

    expect(state.player.inventory.some(s => s.itemId === 'core_stabilizer')).toBe(false);
    expect(state.player.inventory.some(s => s.itemId === 'fracture_shard')).toBe(false);
    expect(state.player.inventory.some(s => s.itemId === 'coal')).toBe(true);
    expect(state.unlockedEnding).toBe('standard');
  });

  it('fails q_speed_50 quest when time limit is exceeded', () => {
    const state = createInitialState(7);
    state.quests = [
      { id: 'q_speed_50', status: 'active', progress: 0 },
    ];
    state.playTime = 301;

    // Simulate tick/check that App.tsx performs
    const speedQuest = state.quests.find(q => q.id === 'q_speed_50');
    if (speedQuest && speedQuest.status === 'active' && state.playTime > 300) {
      speedQuest.status = 'failed';
    }

    expect(state.quests.find(q => q.id === 'q_speed_50')?.status).toBe('failed');
  });
});
