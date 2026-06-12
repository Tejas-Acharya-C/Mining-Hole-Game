import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createInitialState, buyUpgrade } from '../systems/GameManager.testable';
import { SaveManager } from '../systems/SaveManager';
import type { GameState } from '../types';

// Mock localStorage
const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem:    (k: string) => store[k] ?? null,
  setItem:    (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
});

function freshState(): GameState {
  return createInitialState(55555);
}

describe('SaveManager', () => {
  beforeEach(() => {
    // Clear store before each test
    Object.keys(store).forEach(k => delete store[k]);
  });

  it('hasSave returns false before any save', () => {
    expect(SaveManager.hasSave()).toBe(false);
  });

  it('hasSave returns true after save', () => {
    const state = freshState();
    SaveManager.save(state);
    expect(SaveManager.hasSave()).toBe(true);
  });

  it('load returns null when no save exists', () => {
    expect(SaveManager.load()).toBeNull();
  });

  it('round-trips player money', () => {
    const state = freshState();
    state.player.money = 12345;
    SaveManager.save(state);
    const loaded = SaveManager.load();
    expect(loaded).not.toBeNull();
    expect(loaded!.player.money).toBe(12345);
  });

  it('round-trips upgrade levels', () => {
    const state = freshState();
    state.player.money = 99999;
    buyUpgrade(state, 'shovel');
    buyUpgrade(state, 'battery');
    SaveManager.save(state);
    const loaded = SaveManager.load();
    expect(loaded!.player.upgrades.shovel).toBe(1);
    expect(loaded!.player.upgrades.battery).toBe(1);
  });

  it('round-trips inventory', () => {
    const state = freshState();
    state.player.inventory = [
      { itemId: 'ruby', qty: 3 },
      { itemId: 'coal', qty: 15 },
    ];
    SaveManager.save(state);
    const loaded = SaveManager.load();
    expect(loaded!.player.inventory).toHaveLength(2);
    expect(loaded!.player.inventory[0].itemId).toBe('ruby');
    expect(loaded!.player.inventory[0].qty).toBe(3);
  });

  it('round-trips statistics', () => {
    const state = freshState();
    state.statistics.blocksDug   = 500;
    state.statistics.moneyEarned = 99000;
    state.statistics.sellCount   = 12;
    SaveManager.save(state);
    const loaded = SaveManager.load();
    expect(loaded!.statistics.blocksDug).toBe(500);
    expect(loaded!.statistics.moneyEarned).toBe(99000);
    expect(loaded!.statistics.sellCount).toBe(12);
  });

  it('round-trips achievements', () => {
    const state = freshState();
    const ach = state.achievements.find(a => a.id === 'first_dig')!;
    ach.unlocked = true;
    ach.unlockedAt = 1700000000000;
    SaveManager.save(state);
    const loaded = SaveManager.load();
    const loadedAch = loaded!.achievements.find(a => a.id === 'first_dig')!;
    expect(loadedAch.unlocked).toBe(true);
    expect(loadedAch.unlockedAt).toBe(1700000000000);
  });

  it('round-trips quests progress', () => {
    const state = freshState();
    const q = state.quests.find(q => q.id === 'q_dig_100')!;
    q.progress = 77;
    SaveManager.save(state);
    const loaded = SaveManager.load();
    const loadedQ = loaded!.quests.find(q => q.id === 'q_dig_100')!;
    expect(loadedQ.progress).toBe(77);
  });

  it('round-trips biome set', () => {
    const state = freshState();
    state.statistics.biomesDiscovered.add('crystal_cavern');
    state.statistics.biomesDiscovered.add('fossil_zone');
    SaveManager.save(state);
    const loaded = SaveManager.load();
    expect(loaded!.statistics.biomesDiscovered.has('crystal_cavern')).toBe(true);
    expect(loaded!.statistics.biomesDiscovered.has('fossil_zone')).toBe(true);
  });

  it('deleteSave removes save from storage', () => {
    const state = freshState();
    SaveManager.save(state);
    SaveManager.deleteSave();
    expect(SaveManager.hasSave()).toBe(false);
    expect(SaveManager.load()).toBeNull();
  });

  it('loads correct game mode', () => {
    const state = createInitialState(1, 'hard');
    SaveManager.save(state);
    const loaded = SaveManager.load();
    expect(loaded!.mode).toBe('hard');
  });

  it('migrates old save missing surfaceReturns', () => {
    // Simulate old save without surfaceReturns
    const state = freshState();
    SaveManager.save(state);
    const raw = JSON.parse(store['deepdig_save_v2']!);
    delete raw.statistics.surfaceReturns;
    store['deepdig_save_v2'] = JSON.stringify(raw);
    const loaded = SaveManager.load();
    expect(loaded!.statistics.surfaceReturns).toBe(0);
  });

  it('migrates old save missing loreFragmentsFound', () => {
    const state = freshState();
    SaveManager.save(state);
    const raw = JSON.parse(store['deepdig_save_v2']!);
    delete raw.statistics.loreFragmentsFound;
    store['deepdig_save_v2'] = JSON.stringify(raw);
    const loaded = SaveManager.load();
    expect(loaded!.statistics.loreFragmentsFound).toBe(0);
  });

  it('returns null for corrupt save data', () => {
    store['deepdig_save_v2'] = '{invalid json:::';
    expect(SaveManager.load()).toBeNull();
  });

  it('returns null for version < 1', () => {
    store['deepdig_save_v2'] = JSON.stringify({ version: 0, player: {} });
    expect(SaveManager.load()).toBeNull();
  });

  it('loaded state has correct new-game defaults for missing fields', () => {
    const state = freshState();
    SaveManager.save(state);
    const loaded = SaveManager.load()!;
    expect(loaded.activeEvents).toEqual([]);
    expect(loaded.digCombo).toBe(0);
    expect(loaded.comboMultiplier).toBe(1.0);
    expect(loaded.hitFlashTile).toBeNull();
  });

  it('round-trips progression communication fields', () => {
    const state = freshState();
    state.objectiveStage = 'terminal_activated';
    state.journalEntries = [{ type: 'milestone', title: 'Terminal activated', date: 123 }];
    state.hintsShown = ['The terminal has activated. New pathways may now exist below.'];
    state.milestonesSeen = ['terminal_activated'];
    SaveManager.save(state);

    const loaded = SaveManager.load()!;
    expect(loaded.objectiveStage).toBe('terminal_activated');
    expect(loaded.journalEntries).toEqual(state.journalEntries);
    expect(loaded.hintsShown).toEqual(state.hintsShown);
    expect(loaded.milestonesSeen).toEqual(state.milestonesSeen);
  });

  it('migrates missing progression fields safely', () => {
    const state = freshState();
    SaveManager.save(state);
    const raw = JSON.parse(store['deepdig_save_v2']!);
    delete raw.objectiveStage;
    delete raw.journalEntries;
    delete raw.hintsShown;
    delete raw.milestonesSeen;
    store['deepdig_save_v2'] = JSON.stringify(raw);

    const loaded = SaveManager.load()!;
    expect(loaded.objectiveStage).toBe('new_game');
    expect(loaded.journalEntries).toEqual([]);
    expect(loaded.hintsShown).toEqual([]);
    expect(loaded.milestonesSeen).toEqual([]);
  });
});
