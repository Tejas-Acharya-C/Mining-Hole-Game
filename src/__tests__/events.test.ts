import { describe, it, expect } from 'vitest';
import { pickEvent, getLoreForDepth, LORE_FRAGMENTS, EVENT_TEMPLATES } from '../data/events';
import { createInitialState } from '../systems/GameManager.testable';
import { makePrng } from '../systems/WorldManager';

describe('pickEvent', () => {
  it('returns null for depth 0 (no valid events)', () => {
    const rng = makePrng(1);
    const result = pickEvent(0, rng);
    // All events have minDepth >= 3, so depth 0 returns null
    expect(result).toBeNull();
  });

  it('returns an event template for depth 20', () => {
    const rng = makePrng(42);
    const result = pickEvent(20, rng);
    expect(result).not.toBeNull();
  });

  it('only returns events within depth range', () => {
    for (let i = 0; i < 50; i++) {
      const rng2 = makePrng(i * 1337);
      const ev = pickEvent(30, rng2);
      if (ev) {
        expect(ev.minDepth).toBeLessThanOrEqual(30);
        expect(ev.maxDepth).toBeGreaterThanOrEqual(30);
      }
    }
  });

  it('returns valid event kinds', () => {
    const validKinds = EVENT_TEMPLATES.map(e => e.kind);
    for (let seed = 0; seed < 30; seed++) {
      const rng = makePrng(seed * 7777);
      const ev = pickEvent(50, rng);
      if (ev) expect(validKinds).toContain(ev.kind);
    }
  });

  it('is deterministic with same rng', () => {
    const ev1 = pickEvent(50, makePrng(12345));
    const ev2 = pickEvent(50, makePrng(12345));
    expect(ev1?.kind).toBe(ev2?.kind);
  });

  it('treasure_vault has positive cooldown', () => {
    const tv = EVENT_TEMPLATES.find(e => e.kind === 'treasure_vault')!;
    expect(tv.cooldown).toBeGreaterThan(0);
  });
});

describe('getLoreForDepth', () => {
  it('returns null at depth 0', () => {
    expect(getLoreForDepth(0, 0)).toBeNull();
  });

  it('returns first lore at appropriate depth', () => {
    const fragment = getLoreForDepth(15, 0);
    expect(fragment).not.toBeNull();
    expect(fragment!.depth).toBeLessThanOrEqual(15);
  });

  it('returns null when all fragments already found', () => {
    const maxDepth = 200;
    const totalFragments = LORE_FRAGMENTS.length;
    const result = getLoreForDepth(maxDepth, totalFragments);
    expect(result).toBeNull();
  });

  it('returns sequential fragments by index', () => {
    const f0 = getLoreForDepth(200, 0);
    const f1 = getLoreForDepth(200, 1);
    expect(f0).not.toBeNull();
    expect(f1).not.toBeNull();
    expect(f0!.id).not.toBe(f1!.id);
  });

  it('has 12 total lore fragments', () => {
    expect(LORE_FRAGMENTS).toHaveLength(12);
  });

  it('fragments have unique IDs', () => {
    const ids = LORE_FRAGMENTS.map(f => f.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('fragments are ordered by depth', () => {
    for (let i = 1; i < LORE_FRAGMENTS.length; i++) {
      expect(LORE_FRAGMENTS[i].depth).toBeGreaterThanOrEqual(LORE_FRAGMENTS[i - 1].depth);
    }
  });
});

describe('event templates', () => {
  it('all templates have required fields', () => {
    for (const t of EVENT_TEMPLATES) {
      expect(t.kind).toBeTruthy();
      expect(t.label).toBeTruthy();
      expect(t.color).toMatch(/^#/);
      expect(t.radius).toBeGreaterThan(0);
      expect(t.cooldown).toBeGreaterThan(0);
      expect(t.weight).toBeGreaterThan(0);
      expect(t.maxDepth).toBeGreaterThanOrEqual(t.minDepth);
    }
  });
});

describe('event system integration', () => {
  it('initial state has zero active events', () => {
    const state = createInitialState(42);
    expect(state.activeEvents).toHaveLength(0);
  });

  it('initial eventCooldown is positive', () => {
    const state = createInitialState(42);
    expect(state.eventCooldown).toBeGreaterThan(0);
  });

  it('digCombo starts at 0', () => {
    const state = createInitialState(42);
    expect(state.digCombo).toBe(0);
    expect(state.comboMultiplier).toBe(1.0);
  });
});
