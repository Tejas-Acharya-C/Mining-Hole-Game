import { describe, it, expect } from 'vitest';
import { createInitialState, sellInventory, buyUpgrade, useTeleport, tryMove, consumeEnergyCell } from '../systems/GameManager.testable';
import { upgradeCost, shovelDamage, maxEnergy, inventoryCapacity, lightRadius } from '../data/upgrades';
import { ITEM_DEFS } from '../data/items';
import { WorldManager } from '../systems/WorldManager';
import { SURFACE_TILE_ROW, WORLD_WIDTH_CHUNKS } from '../data/tiles';

// ── Upgrade formulas ──────────────────────────────────────────────────────────

describe('upgradeCost', () => {
  it('level 0 cost equals baseCost', () => {
    expect(upgradeCost('shovel', 0)).toBe(60);
    expect(upgradeCost('backpack', 0)).toBe(80);
    expect(upgradeCost('battery', 0)).toBe(70);
  });

  it('cost scales exponentially', () => {
    const c0 = upgradeCost('shovel', 0);
    const c1 = upgradeCost('shovel', 1);
    const c2 = upgradeCost('shovel', 2);
    expect(c1).toBeGreaterThan(c0);
    expect(c2).toBeGreaterThan(c1);
    // multiplier is 3.0, so c1 ≈ c0 * 3
    expect(c1).toBeCloseTo(c0 * 3, 0);
  });

  it('returns integer values', () => {
    for (let i = 0; i < 6; i++) {
      expect(Number.isInteger(upgradeCost('shovel', i))).toBe(true);
    }
  });
});

describe('shovelDamage', () => {
  it('increases with level', () => {
    for (let i = 1; i < 8; i++) {
      expect(shovelDamage(i)).toBeGreaterThan(shovelDamage(i - 1));
    }
  });

  it('level 0 returns base 12', () => {
    expect(shovelDamage(0)).toBe(12);
  });
});

describe('stat formulas', () => {
  it('maxEnergy scales linearly', () => {
    expect(maxEnergy(0)).toBe(80);
    expect(maxEnergy(1)).toBe(130);
    expect(maxEnergy(6)).toBe(380);
  });

  it('inventoryCapacity scales correctly', () => {
    expect(inventoryCapacity(0)).toBe(20);
    expect(inventoryCapacity(1)).toBe(30);
  });

  it('lightRadius increases per level', () => {
    for (let i = 1; i <= 5; i++) {
      expect(lightRadius(i)).toBeGreaterThan(lightRadius(i - 1));
    }
  });
});

// ── sellInventory ─────────────────────────────────────────────────────────────

describe('sellInventory', () => {
  it('returns 0 with empty inventory', () => {
    const state = createInitialState(42);
    expect(sellInventory(state)).toBe(0);
  });

  it('correctly totals item sell values', () => {
    const state = createInitialState(42);
    state.player.inventory = [
      { itemId: 'coal', qty: 10 },
      { itemId: 'iron', qty: 5 },
    ];
    const expected = ITEM_DEFS.coal.sellValue * 10 + ITEM_DEFS.iron.sellValue * 5;
    const result = sellInventory(state);
    expect(result).toBe(expected);
  });

  it('clears sold items from inventory', () => {
    const state = createInitialState(42);
    state.player.inventory = [{ itemId: 'gold', qty: 3 }];
    sellInventory(state);
    expect(state.player.inventory.length).toBe(0);
  });

  it('adds money to player', () => {
    const state = createInitialState(42);
    state.player.inventory = [{ itemId: 'ruby', qty: 2 }];
    state.comboMultiplier = 1.0;
    // Disable all quests to prevent quest rewards affecting money
    for (const q of state.quests) q.status = 'locked';
    const before = state.player.money;
    const sold = sellInventory(state);
    expect(state.player.money).toBe(before + sold);
    expect(sold).toBeGreaterThan(0);
  });

  it('keeps non-sellable items (energy_cell)', () => {
    const state = createInitialState(42);
    state.player.inventory = [
      { itemId: 'coal', qty: 5 },
      { itemId: 'energy_cell', qty: 2 },
    ];
    sellInventory(state);
    expect(state.player.inventory).toHaveLength(1);
    expect(state.player.inventory[0].itemId).toBe('energy_cell');
  });

  it('applies sell multiplier from permanent bonus', () => {
    const state = createInitialState(42);
    state.player.permanentBonuses = [{ type: 'sell_multiplier', value: 0.1 }];
    state.player.inventory = [{ itemId: 'coal', qty: 10 }];
    const base = ITEM_DEFS.coal.sellValue * 10;
    const result = sellInventory(state);
    expect(result).toBe(Math.round(base * 1.1));
  });

  it('applies double_treasure mode multiplier', () => {
    const state = createInitialState(42, 'double_treasure');
    state.player.inventory = [{ itemId: 'iron', qty: 5 }];
    const base = ITEM_DEFS.iron.sellValue * 5;
    const result = sellInventory(state);
    expect(result).toBe(base * 2);
  });

  it('increments statistics', () => {
    const state = createInitialState(42);
    state.player.inventory = [{ itemId: 'silver', qty: 3 }];
    sellInventory(state);
    expect(state.statistics.sellCount).toBe(1);
    expect(state.statistics.moneyEarned).toBeGreaterThan(0);
  });
});

// ── buyUpgrade ────────────────────────────────────────────────────────────────

describe('buyUpgrade', () => {
  it('fails if not enough money', () => {
    const state = createInitialState(42);
    state.player.money = 0;
    const result = buyUpgrade(state, 'shovel');
    expect(result).toBe(false);
    expect(state.player.upgrades.shovel).toBe(0);
  });

  it('succeeds with enough money', () => {
    const state = createInitialState(42);
    state.player.money = 1000;
    const result = buyUpgrade(state, 'shovel');
    expect(result).toBe(true);
    expect(state.player.upgrades.shovel).toBe(1);
  });

  it('deducts cost from money', () => {
    const state = createInitialState(42);
    state.player.money = 10000;
    const cost = upgradeCost('backpack', 0);
    buyUpgrade(state, 'backpack');
    expect(state.player.money).toBe(10000 - cost);
  });

  it('updates maxEnergy on battery upgrade', () => {
    const state = createInitialState(42);
    state.player.money = 10000;
    buyUpgrade(state, 'battery');
    expect(state.player.maxEnergy).toBe(maxEnergy(1));
  });

  it('updates inventoryCapacity on backpack upgrade', () => {
    const state = createInitialState(42);
    state.player.money = 10000;
    buyUpgrade(state, 'backpack');
    expect(state.player.inventoryCapacity).toBe(inventoryCapacity(1));
  });

  it('fails in no_shop mode', () => {
    const state = createInitialState(42, 'no_shop');
    state.player.money = 99999;
    const result = buyUpgrade(state, 'shovel');
    expect(result).toBe(false);
  });

  it('cannot exceed maxLevel', () => {
    const state = createInitialState(42);
    state.player.money = 9999999;
    state.player.upgrades.jetpack = 1; // max level
    const result = buyUpgrade(state, 'jetpack');
    expect(result).toBe(false);
    expect(state.player.upgrades.jetpack).toBe(1);
  });

  it('increments upgradesPurchased statistic', () => {
    const state = createInitialState(42);
    state.player.money = 1000;
    buyUpgrade(state, 'shovel');
    expect(state.statistics.upgradesPurchased).toBe(1);
  });
});

describe('Rebalanced economy and systems', () => {
  it('remote selling fails underground without uplink', () => {
    const state = createInitialState(42);
    state.player.y = 50; // Deep underground
    state.player.upgrades.market_uplink = 0;
    state.player.inventory = [{ itemId: 'coal', qty: 5 }];
    const earned = sellInventory(state);
    expect(earned).toBe(0);
    expect(state.player.inventory.length).toBe(1);
  });

  it('remote selling succeeds underground with uplink', () => {
    const state = createInitialState(42);
    state.player.y = 50; // Deep underground
    state.player.upgrades.market_uplink = 1;
    state.player.inventory = [{ itemId: 'coal', qty: 5 }];
    const expected = ITEM_DEFS.coal.sellValue * 5;
    const earned = sellInventory(state);
    expect(earned).toBe(expected);
    expect(state.player.inventory.length).toBe(0);
  });

  it('selling succeeds at surface without uplink', () => {
    const state = createInitialState(42);
    state.player.y = 4; // Surface
    state.player.upgrades.market_uplink = 0;
    state.player.inventory = [{ itemId: 'coal', qty: 5 }];
    const expected = ITEM_DEFS.coal.sellValue * 5;
    const earned = sellInventory(state);
    expect(earned).toBe(expected);
    expect(state.player.inventory.length).toBe(0);
  });

  it('energy cell restores 80 energy', () => {
    const state = createInitialState(42);
    const mockPm: any = { emit: () => {} };
    state.player.inventory = [{ itemId: 'energy_cell', qty: 1 }];
    state.player.maxEnergy = 100;
    state.player.energy = 10;
    consumeEnergyCell(state, mockPm);
    expect(state.player.energy).toBe(90);
  });

  it('surfacing recharges energy to max', () => {
    const state = createInitialState(42);
    const wm = new WorldManager(42, state.chunks);
    for (let cx = 0; cx < WORLD_WIDTH_CHUNKS; cx++) {
      wm.getChunk(cx, 0);
      wm.getChunk(cx, 1);
      wm.getChunk(cx, 2);
    }
    // Clear path upward to the surface
    for (let r = SURFACE_TILE_ROW; r <= 20; r++) {
      wm.setTile(r, state.player.x, { kind: 'air', hp: 0, maxHp: 0, revealed: true });
    }
    state.player.y = 20;
    state.player.energy = 5;
    state.player.upgrades.jetpack = 1; // Bypass wall climb requirements
    tryMove(state, wm, 0, -(20 - SURFACE_TILE_ROW));
    expect(state.player.y).toBe(SURFACE_TILE_ROW);
    expect(state.player.energy).toBe(state.player.maxEnergy);
  });

  it('teleporting consumes a charge and recharges energy', () => {
    const state = createInitialState(42);
    const wm = new WorldManager(42, state.chunks);
    for (let cx = 0; cx < WORLD_WIDTH_CHUNKS; cx++) {
      wm.getChunk(cx, 0);
      wm.getChunk(cx, 1);
    }
    state.player.teleportCharges = 2;
    state.player.upgrades.teleport = 2;
    state.player.energy = 10;
    const result = useTeleport(state, wm);
    expect(result).toBe(true);
    expect(state.player.teleportCharges).toBe(1);
    expect(state.player.upgrades.teleport).toBe(1);
    expect(state.player.energy).toBe(state.player.maxEnergy);
  });
});
