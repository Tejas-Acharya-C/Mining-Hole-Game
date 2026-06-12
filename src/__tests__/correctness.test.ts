import { describe, it, expect } from 'vitest';
import { createInitialState, tryMove, buyUpgrade, sellInventory, useTeleport, updateQuestProgress, interactAncientTerminal } from '../systems/GameManager.testable';
import { WorldManager } from '../systems/WorldManager';
import { ParticleManager } from '../systems/ParticleManager';
import { SURFACE_TILE_ROW, WORLD_WIDTH_CHUNKS } from '../data/tiles';
import { CHUNK_SIZE } from '../types';
import { BIOME_DEFS } from '../data/biomes';

function setup(seed = 42) {
  const state = createInitialState(seed);
  const wm    = new WorldManager(seed, state.chunks);
  const pm    = new ParticleManager();
  // Pre-generate chunks the player can move in
  for (let cx = 0; cx < WORLD_WIDTH_CHUNKS; cx++) {
    wm.getChunk(cx, 0);
    wm.getChunk(cx, 1);
    wm.getChunk(cx, 2);
    wm.getChunk(cx, 3);
    wm.getChunk(cx, 4);
  }
  return { state, wm, pm };
}

describe('Gameplay Correctness Audit', () => {

  describe('Jetpack Upward Movement Restrictions', () => {
    it('restricts upward movement in open space if jetpack is level 0', () => {
      const { state, wm } = setup();
      state.player.upgrades.jetpack = 0;
      
      // Place player underground
      state.player.x = 8;
      state.player.y = SURFACE_TILE_ROW + 10;
      
      // Make space completely open (no walls adjacent)
      for (let r = state.player.y - 2; r <= state.player.y + 2; r++) {
        for (let c = state.player.x - 2; c <= state.player.x + 2; c++) {
          wm.setTile(r, c, { kind: 'air', hp: 0, maxHp: 0, revealed: true });
        }
      }

      // Try to move up in open space — should fail
      const result = tryMove(state, wm, 0, -1);
      expect(result).toBe(false);
    });

    it('allows upward movement if adjacent to a wall (climbing) when jetpack is level 0', () => {
      const { state, wm } = setup();
      state.player.upgrades.jetpack = 0;
      
      // Place player underground
      state.player.x = 8;
      state.player.y = SURFACE_TILE_ROW + 10;
      
      // Clear vertical column and bottom
      for (let r = state.player.y - 2; r <= state.player.y + 2; r++) {
        wm.setTile(r, state.player.x, { kind: 'air', hp: 0, maxHp: 0, revealed: true });
      }
      
      // Place a wall to the left
      wm.setTile(state.player.y, state.player.x - 1, { kind: 'stone', hp: 45, maxHp: 45, revealed: true });
      
      // Try to move up next to the wall — should succeed
      const result = tryMove(state, wm, 0, -1);
      expect(result).toBe(true);
    });

    it('allows upward movement in open space if jetpack is level 1', () => {
      const { state, wm } = setup();
      state.player.upgrades.jetpack = 1;
      
      // Place player underground
      state.player.x = 8;
      state.player.y = SURFACE_TILE_ROW + 10;
      
      // Make space completely open (no walls adjacent)
      for (let r = state.player.y - 2; r <= state.player.y + 2; r++) {
        for (let c = state.player.x - 2; c <= state.player.x + 2; c++) {
          wm.setTile(r, c, { kind: 'air', hp: 0, maxHp: 0, revealed: true });
        }
      }

      // Try to move up with jetpack — should succeed
      const result = tryMove(state, wm, 0, -1);
      expect(result).toBe(true);
    });
  });

  describe('Quest Logic Correctness', () => {
    it('q_sell_relic completes by selling relic, not collecting', () => {
      const { state } = setup();
      
      // Find and activate q_sell_relic
      const quest = state.quests.find(q => q.id === 'q_sell_relic');
      expect(quest).toBeDefined();
      quest!.status = 'active';
      quest!.progress = 0;

      // Add relic to inventory
      state.player.inventory.push({ itemId: 'relic', qty: 1 });
      
      // Sell inventory
      sellInventory(state);
      
      // Verify quest is completed
      expect(quest!.status).toBe('completed');
    });

    it('q_max_battery completes only when battery upgrade reaches level 6', () => {
      const { state } = setup();
      
      const quest = state.quests.find(q => q.id === 'q_max_battery');
      expect(quest).toBeDefined();
      quest!.status = 'active';
      quest!.progress = 0;

      state.player.money = 100000;
      state.player.upgrades.battery = 4;
      
      // Buy battery upgrade (moves to level 5)
      buyUpgrade(state, 'battery');
      expect(quest!.status).toBe('active'); // Still not max level 6
      
      // Buy battery upgrade (moves to level 6)
      buyUpgrade(state, 'battery');
      expect(quest!.status).toBe('completed'); // Now max level 6
    });

    it('q_collect_all_gems tracks gems individually', () => {
      const { state } = setup();
      
      const quest = state.quests.find(q => q.id === 'q_collect_all_gems');
      expect(quest).toBeDefined();
      quest!.status = 'active';
      quest!.progress = 0;

      // Collect Ruby
      state.statistics.itemsCollected['ruby'] = 1;
      updateQuestProgress(state, { type: 'collect_all_gems' });
      expect(quest!.progress).toBe(1);

      // Collect Sapphire
      state.statistics.itemsCollected['sapphire'] = 1;
      updateQuestProgress(state, { type: 'collect_all_gems' });
      expect(quest!.progress).toBe(2);

      // Collect Emerald
      state.statistics.itemsCollected['emerald'] = 1;
      updateQuestProgress(state, { type: 'collect_all_gems' });
      expect(quest!.progress).toBe(3);
      expect(quest!.status).toBe('completed');
    });

    it('q_speed_50 respects the 5 minutes (300 seconds) time constraint', () => {
      const { state } = setup();
      
      const quest = state.quests.find(q => q.id === 'q_speed_50');
      expect(quest).toBeDefined();
      
      // Case 1: over time (e.g. 350 seconds)
      quest!.status = 'active';
      quest!.progress = 0;
      state.playTime = 350;
      updateQuestProgress(state, { type: 'depth', depth: 50 });
      expect(quest!.status).toBe('active'); // fails to complete

      // Case 2: under time (e.g. 200 seconds)
      state.playTime = 200;
      updateQuestProgress(state, { type: 'depth', depth: 50 });
      expect(quest!.status).toBe('completed'); // succeeds
    });

    it('q_no_surface_run resets progress when player surfaces', () => {
      const { state, wm } = setup();
      
      const quest = state.quests.find(q => q.id === 'q_no_surface_run');
      expect(quest).toBeDefined();
      quest!.status = 'active';
      quest!.progress = 150; // partially completed

      // Move player to surface
      state.player.y = SURFACE_TILE_ROW + 1;
      state.player.x = 8;
      
      // Clear movement path
      wm.setTile(SURFACE_TILE_ROW, 8, { kind: 'air', hp: 0, maxHp: 0, revealed: true });
      wm.setTile(SURFACE_TILE_ROW + 1, 8, { kind: 'air', hp: 0, maxHp: 0, revealed: true });

      // Move up to the surface
      tryMove(state, wm, 0, -1);
      
      // Verify quest progress is reset
      expect(quest!.progress).toBe(0);
    });
  });

  describe('Achievement Triggers & Correctness', () => {
    it('deep_diver unlocks only on continuous subterranean trip to depth 50', () => {
      const { state, wm } = setup();
      
      const achievement = state.achievements.find(a => a.id === 'deep_diver');
      expect(achievement).toBeDefined();
      expect(achievement!.unlocked).toBe(false);

      // Start at surface
      state.player.y = SURFACE_TILE_ROW;
      state.player.x = 8;
      wm.setTile(SURFACE_TILE_ROW, 8, { kind: 'air', hp: 0, maxHp: 0, revealed: true });
      wm.setTile(SURFACE_TILE_ROW + 1, 8, { kind: 'air', hp: 0, maxHp: 0, revealed: true });

      // Take a step down
      tryMove(state, wm, 0, 1);
      expect(state.player.surfacedThisTrip).toBe(false);

      // Move down to depth 50 directly (mocking movement loop)
      state.player.y = SURFACE_TILE_ROW + 49;
      wm.setTile(SURFACE_TILE_ROW + 49, 8, { kind: 'air', hp: 0, maxHp: 0, revealed: true });
      wm.setTile(SURFACE_TILE_ROW + 50, 8, { kind: 'air', hp: 0, maxHp: 0, revealed: true });
      tryMove(state, wm, 0, 1); // trigger tryMove logic
      
      expect(achievement!.unlocked).toBe(true);
    });

    it('jetpack_user is not unlocked when using a teleporter', () => {
      const { state, wm } = setup();
      
      const achievement = state.achievements.find(a => a.id === 'jetpack_user');
      expect(achievement).toBeDefined();
      expect(achievement!.unlocked).toBe(false);

      state.player.teleportCharges = 1;
      
      // Trigger teleport
      useTeleport(state, wm);
      
      // Verify jetpack_user is still locked
      expect(achievement!.unlocked).toBe(false);
    });
  });

  describe('World Generation & Ore Vein Limits', () => {
    it('enforces maximum vein size limits for all ores and single-block relics', () => {
      const { wm } = setup();
      
      // Generate several chunks at different depths to inspect veins
      const depths = [2, 5, 8, 11, 14];
      for (const d of depths) {
        for (let cx = 0; cx < WORLD_WIDTH_CHUNKS; cx++) {
          const chunk = wm.getChunk(cx, d);
          
          const visited = new Set<string>();
          for (let r = 0; r < CHUNK_SIZE; r++) {
            for (let c = 1; c < CHUNK_SIZE - 1; c++) {
              const tile = chunk.tiles[r][c];
              const kind = tile.kind;
              
              const isBaseTile = BIOME_DEFS[chunk.biome].baseTile === kind;
              const isOre = !isBaseTile && ['coal', 'iron', 'silver', 'gold', 'ruby', 'sapphire', 'emerald',
                'crystal', 'fossil', 'relic', 'obsidian', 'permafrost', 'magma_rock', 'void_stone'].includes(kind);
              
              if (isOre && !visited.has(`${r},${c}`)) {
                let size = 0;
                const queue: [number, number][] = [[r, c]];
                visited.add(`${r},${c}`);
                
                while (queue.length > 0) {
                  const [currR, currC] = queue.shift()!;
                  size++;
                  
                  const neighbors = [
                    [currR - 1, currC],
                    [currR + 1, currC],
                    [currR, currC - 1],
                    [currR, currC + 1],
                  ];
                  for (const [nr, nc] of neighbors) {
                    if (nr >= 0 && nr < CHUNK_SIZE && nc >= 1 && nc < CHUNK_SIZE - 1) {
                      if (chunk.tiles[nr][nc].kind === kind && !visited.has(`${nr},${nc}`)) {
                        visited.add(`${nr},${nc}`);
                        queue.push([nr, nc]);
                      }
                    }
                  }
                }
                
                if (kind === 'coal') {
                  expect(size).toBeLessThanOrEqual(8);
                } else if (kind === 'iron') {
                  expect(size).toBeLessThanOrEqual(6);
                } else if (kind === 'gold') {
                  expect(size).toBeLessThanOrEqual(4);
                } else if (kind === 'ruby' || kind === 'sapphire' || kind === 'emerald') {
                  expect(size).toBeLessThanOrEqual(3);
                } else if (kind === 'void_stone') {
                  expect(size).toBeLessThanOrEqual(2);
                } else if (kind === 'relic') {
                  expect(size).toBeLessThanOrEqual(1); // Relics must be single-block discoveries!
                }
              }
            }
          }
        }
      }
    });

    it('procedurally generates structures in some underground chunks', () => {
      const { wm } = setup();
      
      let chestCount = 0;
      for (let d = 1; d <= 20; d++) {
        for (let cx = 0; cx < WORLD_WIDTH_CHUNKS; cx++) {
          const chunk = wm.getChunk(cx, d);
          for (let r = 0; r < CHUNK_SIZE; r++) {
            for (let c = 0; c < CHUNK_SIZE; c++) {
              if (chunk.tiles[r][c].kind === 'chest') {
                chestCount++;
              }
            }
          }
        }
      }
      expect(chestCount).toBeGreaterThan(0);
    });
  });

  describe('Endgame & Final Act Expansion', () => {
    it('enforces bedrock gating cy >= 10 before artifact is activated', () => {
      const { state, wm } = setup();
      
      // Before activation, chunk 0, 10 should be solid bedrock
      state.artifactActivated = false;
      wm.artifactActivated = false;
      
      const chunk = wm.getChunk(0, 10);
      for (let r = 0; r < CHUNK_SIZE; r++) {
        for (let c = 0; c < CHUNK_SIZE; c++) {
          expect(chunk.tiles[r][c].kind).toBe('bedrock');
        }
      }
    });

    it('removes bedrock gating once artifact is activated', () => {
      const { state, wm } = setup();
      
      state.artifactActivated = true;
      wm.artifactActivated = true;
      state.facilityUnlocked = true; // allow facility depth cy=10-11
      wm.facilityUnlocked = true;
      
      const chunk = wm.getChunk(0, 10);
      // It should generate as ancient_facility biome now, not solid bedrock
      expect(chunk.biome).toBe('ancient_facility');
      expect(chunk.tiles[0][0].kind).toBe('bedrock'); // only border is bedrock
      expect(chunk.tiles[4][4].kind).not.toBe('bedrock'); // interior should be ancient_brick base tile
    });

    it('interactAncientTerminal consumes artifact and unlocks facility', () => {
      const { state, wm } = setup();
      
      // Stand next to or on terminal with artifact in inventory
      state.player.inventory.push({ itemId: 'artifact', qty: 1 });
      state.artifactActivated = false;
      wm.artifactActivated = false;
      
      interactAncientTerminal(state, wm);
      
      expect(state.artifactActivated).toBe(true);
      expect(wm.artifactActivated).toBe(true);
      expect(state.player.inventory.some(s => s.itemId === 'artifact')).toBe(false);
    });

    it('factors prestige into sell values correctly', () => {
      const { state } = setup();
      
      state.prestigeCount = 2; // +100% money (1 + 2 * 0.5 = 2.0x value)
      state.player.money = 0;
      state.quests.forEach(q => q.status = 'locked'); // lock quests to avoid reward payouts
      state.player.inventory.push({ itemId: 'ruby', qty: 1 }); // Ruby base value is 300
      
      sellInventory(state);
      
      // Ruby value 300 * 2 = 600
      expect(state.player.money).toBe(600);
    });
  });

});
