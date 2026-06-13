import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  tryDig,
  updateBiome,
  triggerDiscoveryAlert,
  startNewExpedition,
  updateQuestProgress,
  buyUpgrade,
} from '../systems/GameManager.testable';
import { WorldManager } from '../systems/WorldManager';
import { ParticleManager } from '../systems/ParticleManager';
import { getUpgradeStatComparison, getUpgradePurchaseLabel } from '../utils/upgradeDisplay';
import { SURFACE_TILE_ROW, WORLD_WIDTH_CHUNKS } from '../data/tiles';

function setup(seed = 42) {
  const state = createInitialState(seed);
  const wm    = new WorldManager(seed, state.chunks);
  const pm    = new ParticleManager();
  for (let cx = 0; cx < WORLD_WIDTH_CHUNKS; cx++) {
    wm.getChunk(cx, 0);
    wm.getChunk(cx, 1);
    wm.getChunk(cx, 2);
    wm.getChunk(cx, 3);
    wm.getChunk(cx, 4);
    wm.getChunk(cx, 5);
    wm.getChunk(cx, 6);
    wm.getChunk(cx, 7);
  }
  return { state, wm, pm };
}

describe('VOIDCORE Polish & Juice Regression Tests', () => {

  describe('Damage Numbers', () => {
    it('creates standard float text on successful normal hit', () => {
      const { state, wm, pm } = setup();
      // Soil requires shovel level 0, which player has by default
      state.player.upgrades.shovel = 0;
      state.player.x = 8;
      state.player.y = SURFACE_TILE_ROW + 1;
      
      // Set a soil tile below player
      wm.setTile(state.player.y + 1, state.player.x, { kind: 'soil', hp: 10, maxHp: 10, revealed: true });
      state.player.energy = 100;
      state.floatTexts = [];
      
      // Force critical chance to 0 to guarantee normal hit
      state.player.upgrades.critical_chance = 0;

      const result = tryDig(state, wm, pm, state.player.y + 1, state.player.x);
      expect(result.success).toBe(true);
      expect(state.floatTexts.length).toBeGreaterThan(0);
      const textObj = state.floatTexts[0];
      // Expect normal dmg format like "-12" or similar
      expect(textObj.text).toMatch(/^-\d+$/);
      expect(textObj.scale).toBe(1.0);
    });

    it('creates critical float text on critical hits', () => {
      const { state, wm, pm } = setup();
      state.player.upgrades.shovel = 0;
      state.player.x = 8;
      state.player.y = SURFACE_TILE_ROW + 1;
      wm.setTile(state.player.y + 1, state.player.x, { kind: 'soil', hp: 100, maxHp: 100, revealed: true });
      state.player.energy = 100;
      state.floatTexts = [];

      // Force critical hit by setting crit chance upgrade high
      state.player.upgrades.critical_chance = 10; // high level

      const result = tryDig(state, wm, pm, state.player.y + 1, state.player.x);
      expect(result.success).toBe(true);
      expect(state.floatTexts.length).toBeGreaterThan(0);
      const critText = state.floatTexts.find(t => t.text.includes('CRIT'));
      expect(critText).toBeDefined();
      expect(critText!.text).toMatch(/^⚡ CRIT! -\d+$/);
      expect(critText!.scale).toBe(1.4);
    });

    it('creates Need Better Tool float text on resisted hits', () => {
      const { state, wm, pm } = setup();
      // Shovel level 0, void stone requires level 5
      state.player.upgrades.shovel = 0;
      state.player.x = 8;
      state.player.y = SURFACE_TILE_ROW + 1;
      wm.setTile(state.player.y + 1, state.player.x, { kind: 'void_stone', hp: 100, maxHp: 100, revealed: true });
      state.player.energy = 100;
      state.floatTexts = [];

      const result = tryDig(state, wm, pm, state.player.y + 1, state.player.x);
      expect(result.success).toBe(false);
      expect(state.floatTexts.length).toBeGreaterThan(0);
      const resistText = state.floatTexts[0];
      expect(resistText.text).toBe('Need Better Tool');
      expect(resistText.scale).toBe(0.9);
      expect(resistText.color).toBe('#f43f5e');
    });

    it('applies hard-block juice on resisted hits', () => {
      const { state, wm, pm } = setup();
      state.player.upgrades.shovel = 0;
      state.player.x = 8;
      state.player.y = SURFACE_TILE_ROW + 1;
      wm.setTile(state.player.y + 1, state.player.x, { kind: 'void_stone', hp: 100, maxHp: 100, revealed: true });
      state.settings.reducedMotion = false;
      state.settings.screenShake = true;
      state.hitStopTimer = 0;
      state.player.shakeAmount = 0;

      tryDig(state, wm, pm, state.player.y + 1, state.player.x);
      expect(state.hitStopTimer).toBe(0.01);
      expect(state.player.shakeAmount).toBe(3);
    });
  });

  describe('Hit Stop & Screen Shake', () => {
    it('applies standard hit stop and screen shake values based on hit type', () => {
      const { state, wm, pm } = setup();
      state.player.upgrades.shovel = 1;
      state.player.x = 8;
      state.player.y = SURFACE_TILE_ROW + 1;

      // Normal block (soil)
      wm.setTile(state.player.y + 1, state.player.x, { kind: 'soil', hp: 5, maxHp: 5, revealed: true });
      state.settings.reducedMotion = false;
      state.settings.screenShake = true;
      state.player.shakeAmount = 0;
      state.hitStopTimer = 0;

      tryDig(state, wm, pm, state.player.y + 1, state.player.x);
      expect(state.hitStopTimer).toBe(0.005); // Normal Dig
      expect(state.player.shakeAmount).toBe(1);

      // Hard block (stone)
      wm.setTile(state.player.y + 1, state.player.x, { kind: 'stone', hp: 50, maxHp: 50, revealed: true });
      state.hitStopTimer = 0;
      state.player.shakeAmount = 0;
      tryDig(state, wm, pm, state.player.y + 1, state.player.x);
      expect(state.hitStopTimer).toBe(0.01); // Hard block
      expect(state.player.shakeAmount).toBe(3);
    });

    it('respects reducedMotion accessibility settings', () => {
      const { state, wm, pm } = setup();
      state.player.upgrades.shovel = 1;
      state.player.x = 8;
      state.player.y = SURFACE_TILE_ROW + 1;
      wm.setTile(state.player.y + 1, state.player.x, { kind: 'stone', hp: 50, maxHp: 50, revealed: true });

      state.settings.reducedMotion = true;
      state.settings.screenShake = true;
      state.hitStopTimer = undefined;
      state.player.shakeAmount = 10;

      tryDig(state, wm, pm, state.player.y + 1, state.player.x);
      expect(state.hitStopTimer).toBeUndefined(); // hitStopTimer should not be set
      expect(state.player.shakeAmount).toBe(0); // Screen shake forced to 0
    });
  });

  describe('Discovery Banners', () => {
    it('sets state.discoveryAlert correctly on rare ore discovery', () => {
      const { state } = setup();
      state.discoveryAlert = undefined;
      state.journalEntries = [];

      triggerDiscoveryAlert(state, 'ruby');
      expect(state.discoveryAlert).toBeDefined();
      const discoveryAlert = state.discoveryAlert!;
      expect(discoveryAlert.title).toBe('RARE ORE FOUND');
      expect(discoveryAlert.subtitle).toBe('RUBY');
      expect(discoveryAlert.color).toBe('#ef4444');
      expect(discoveryAlert.life).toBe(2.5);

      // Journal entry highlighted
      const journalEntry = state.journalEntries?.find(e => e.type === 'discovery');
      expect(journalEntry).toBeDefined();
      expect(journalEntry?.title).toContain('Discovered rare item: Ruby');
    });

    it('sets correct banners for key items and artifacts', () => {
      const { state } = setup();
      
      triggerDiscoveryAlert(state, 'artifact');
      expect(state.discoveryAlert?.title).toBe('ARTIFACT DISCOVERED');
      expect(state.discoveryAlert?.color).toBe('#f59e0b');

      triggerDiscoveryAlert(state, 'facility_key');
      expect(state.discoveryAlert?.title).toBe('FACILITY KEY RECOVERED');
      expect(state.discoveryAlert?.color).toBe('#a855f7');
    });

    it('applies subtle screen shake on discovery when enabled', () => {
      const { state } = setup();
      state.settings.reducedMotion = false;
      state.settings.screenShake = true;
      state.player.shakeAmount = 0;

      triggerDiscoveryAlert(state, 'ruby');
      expect(state.player.shakeAmount).toBe(6);

      state.player.shakeAmount = 0;
      triggerDiscoveryAlert(state, 'artifact');
      expect(state.player.shakeAmount).toBe(10);
    });

    it('skips discovery shake when reduced motion is enabled', () => {
      const { state } = setup();
      state.settings.reducedMotion = true;
      state.settings.screenShake = true;
      state.player.shakeAmount = 5;

      triggerDiscoveryAlert(state, 'artifact');
      expect(state.player.shakeAmount).toBe(5);
    });
  });

  describe('Quest Completion Banners', () => {
    it('creates non-blocking questAlert on quest completion', () => {
      const { state } = setup();
      state.questAlert = undefined;
      state.statistics.questsCompleted = 0;

      // Make a quest active
      const quest = state.quests.find(q => q.id === 'q_dig_100')!;
      quest.status = 'active';
      quest.progress = 0;

      // Complete it by providing a dig event
      updateQuestProgress(state, { type: 'dig', count: 100 });

      expect(state.questAlert).toBeDefined();
      const questAlert = state.questAlert!;
      expect(questAlert.title).toBe('First Steps');
      expect(questAlert.reward).toContain('$150');
      expect(questAlert.life).toBe(3.5);
      expect(state.statistics.questsCompleted).toBe(1);
    });
  });

  describe('Biome Discovery Banners', () => {
    it('triggers transition banner only on the first discovery of biomes other than surface', () => {
      const { state, wm } = setup();
      state.statistics.biomesDiscovered = new Set();
      state.currentBiome = 'surface';
      state.biomeTransition = undefined;

      // Move player into a stone chunk/biome
      state.player.x = 8;
      state.player.y = SURFACE_TILE_ROW + 15; // deeper
      const chunkRow = WorldManager.tileToChunkRow(state.player.y);
      const chunkCol = Math.floor(state.player.x / 16);
      
      // Ensure biome is stone_layer
      const chunk = wm.getChunk(chunkCol, chunkRow);
      chunk.biome = 'stone_layer';

      updateBiome(state, wm);

      expect(state.currentBiome).toBe('stone_layer');
      expect(state.statistics.biomesDiscovered.has('stone_layer')).toBe(true);
      expect(state.biomeTransition).toBeDefined();
      const biomeTransition = state.biomeTransition!;
      expect(biomeTransition.name).toBe('Stone Belt');

      // Clear transition and update again at the same depth/biome — banner should NOT re-trigger
      state.biomeTransition = undefined;
      updateBiome(state, wm);
      expect(state.biomeTransition).toBeUndefined();
    });
  });

  describe('Prestige Summary & Retrofit Displays', () => {
    it('initializes and aggregates prestige retrofit data', () => {
      let state = createInitialState(42, 'normal');
      state.prestigeCount = 2;
      state.prestigeData = {
        expeditionCount: 2,
        completedEndings: ['standard', 'secret'],
        bonuses: {
          oreValueBonus: 0.10,
          maxEnergyBonus: 10,
          inventoryBonus: 0
        }
      };

      // Starting new expedition updates prestige totals
      state.unlockedEnding = 'completionist';
      state = startNewExpedition(state);

      expect(state.prestigeData?.expeditionCount).toBe(3);
      expect(state.prestigeData?.completedEndings).toContain('completionist');
      expect(state.prestigeData?.bonuses.inventoryBonus).toBe(1);
    });
  });

  describe('Upgrade Shop Value Comparisons', () => {
    it('correctly compares current vs upgraded values', () => {
      // Shovel: Damage: 12 ➔ 19 (lvl 0 to 1)
      const shovelComp = getUpgradeStatComparison('shovel', 0);
      expect(shovelComp).toBe('Damage: 12 ➔ 19');

      // Backpack: Cargo: 20 ➔ 30 slots (lvl 0 to 1)
      const bpComp = getUpgradeStatComparison('backpack', 0);
      expect(bpComp).toBe('Cargo: 20 ➔ 30 slots');

      // Battery: Energy: 80 max / +6 regen ➔ 130 max / +9 regen (lvl 0 to 1)
      const batComp = getUpgradeStatComparison('battery', 0);
      expect(batComp).toBe('Energy: 80 max / +6 regen ➔ 130 max / +9 regen');

      // Scanner: Scan Range: 0 tiles ➔ 4 tiles (lvl 0 to 1)
      const scanComp = getUpgradeStatComparison('scanner', 0);
      expect(scanComp).toBe('Scan Range: 0 tiles ➔ 4 tiles');
    });

    it('shows stat comparison float text after purchase', () => {
      const { state } = setup();
      state.player.money = 500;
      state.player.x = 8;
      state.player.y = SURFACE_TILE_ROW;
      state.floatTexts = [];

      const ok = buyUpgrade(state, 'shovel');
      expect(ok).toBe(true);
      expect(state.floatTexts.length).toBeGreaterThan(0);
      expect(state.floatTexts[0].text).toBe(getUpgradePurchaseLabel('shovel', 0));
      expect(state.floatTexts[0].color).toBe('#22c55e');
      expect(state.hitStopTimer).toBe(0.005);
      expect(state.player.shakeAmount).toBe(3);
    });
  });

});