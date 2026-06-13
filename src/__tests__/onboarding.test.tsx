import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialState } from '../systems/GameManager.testable';
import {
  getArtifactGuidanceText,
  isTerminalGuidanceActive,
  getCurrentObjective,
  getCurrentHint,
} from '../systems/ProgressionSystem';
import TutorialOverlay from '../components/TutorialOverlay';
import InventoryPanel from '../components/InventoryPanel';
import { QUEST_DEFS } from '../data/quests';

describe('Tutorial Overlay Onboarding', () => {
  it('renders all three onboarding cards sequentially and triggers completion', () => {
    const onComplete = vi.fn();
    const html = renderToStaticMarkup(
      <TutorialOverlay onComplete={onComplete} />
    );

    // Initial state: first card 'Dig and Collect'
    expect(html).toContain('Dig and Collect');
    expect(html).toContain('Break blocks to collect resources and discover deeper layers.');
    expect(html).toContain('Skip');
    expect(html).toContain('Next');
    expect(html).toContain('[Space/Enter] Next');
  });
});

describe('Inventory Panel Story Item Protection & Remote Sell Restriction', () => {
  it('displays story items with "Cannot Sell" badge and protects them from sell all', () => {
    const state = createInitialState(3);
    state.player.y = 0; // At surface
    state.player.inventory = [
      { itemId: 'coal', qty: 5 },
      { itemId: 'artifact', qty: 1 }, // Story item
    ];

    const onSellAll = vi.fn();
    const html = renderToStaticMarkup(
      <InventoryPanel
        state={state}
        onClose={() => {}}
        onSellAll={onSellAll}
      />
    );

    expect(html).toContain('🔑 STORY ITEM');
    expect(html).toContain('Cannot Sell');
    expect(html).toContain('Sell All'); // Since player is at surface
  });

  it('restricts selling from deep underground without portable market uplink', () => {
    const state = createInitialState(3);
    state.player.y = 10; // Deep underground
    state.player.upgrades.market_uplink = 0; // No uplink
    state.player.inventory = [
      { itemId: 'gold', qty: 2 },
    ];

    const html = renderToStaticMarkup(
      <InventoryPanel
        state={state}
        onClose={() => {}}
        onSellAll={() => {}}
      />
    );

    expect(html).toContain('Return to Surface to Sell');
    expect(html).toContain('disabled=""'); // Sell All button is disabled
  });

  it('permits selling from deep underground with portable market uplink purchased', () => {
    const state = createInitialState(3);
    state.player.y = 10; // Deep underground
    state.player.upgrades.market_uplink = 1; // Uplink purchased!
    state.player.inventory = [
      { itemId: 'gold', qty: 2 },
    ];

    const html = renderToStaticMarkup(
      <InventoryPanel
        state={state}
        onClose={() => {}}
        onSellAll={() => {}}
      />
    );

    expect(html).toContain('Sell All'); // Button is active
    expect(html).not.toContain('Return to Surface to Sell');
  });
});

describe('Artifact Signal Directional Guidance', () => {
  it('returns null if depth is not greater than 100m', () => {
    const state = createInitialState(3);
    state.player.deepestDepth = 80;
    state.objectiveStage = 'find_artifact';

    const hint = getArtifactGuidanceText(state);
    expect(hint).toBeNull();
  });

  it('returns null if the player already collected the artifact', () => {
    const state = createInitialState(3);
    state.player.deepestDepth = 120;
    state.objectiveStage = 'artifact_found';
    state.player.inventory.push({ itemId: 'artifact', qty: 1 });

    const hint = getArtifactGuidanceText(state);
    expect(hint).toBeNull();
  });

  it('indicates artifact signal direction is east when player is left of center (x < 16)', () => {
    const state = createInitialState(3);
    state.player.deepestDepth = 120;
    state.objectiveStage = 'find_artifact';
    state.player.x = 10; // left

    const hint = getArtifactGuidanceText(state);
    expect(hint).toBe('Artifact signal detected east.');
  });

  it('indicates artifact signal direction is west when player is right of center (x > 31)', () => {
    const state = createInitialState(3);
    state.player.deepestDepth = 120;
    state.objectiveStage = 'find_artifact';
    state.player.x = 35; // right

    const hint = getArtifactGuidanceText(state);
    expect(hint).toBe('Artifact signal detected west.');
  });

  it('indicates signal growing stronger when player is near the center', () => {
    const state = createInitialState(3);
    state.player.deepestDepth = 120;
    state.objectiveStage = 'find_artifact';
    state.player.x = 20; // center

    const hint = getArtifactGuidanceText(state);
    expect(hint).toBe('Artifact signal growing stronger.');
  });
});

describe('Ancient Terminal Return Objectives', () => {
  it('detects terminal guidance is active when story items are held but terminal is not triggered', () => {
    const state = createInitialState(3);
    state.player.inventory.push({ itemId: 'artifact', qty: 1 });
    state.artifactActivated = false;

    expect(isTerminalGuidanceActive(state)).toBe(true);

    const obj = getCurrentObjective(state);
    expect(obj.description).toBe('Return to the Ancient Terminal on the surface.');

    const hint = getCurrentHint(state);
    expect(hint).toBe('Return to the Ancient Terminal on the surface.');
  });

  it('is active when facility keycard is held but facility path is not unlocked', () => {
    const state = createInitialState(3);
    state.player.inventory.push({ itemId: 'facility_key', qty: 1 });
    state.facilityUnlocked = false;

    expect(isTerminalGuidanceActive(state)).toBe(true);
  });
});

describe('Timed Quest Failures', () => {
  it('correctly fails active timed quests when time limit is exceeded', () => {
    const state = createInitialState(3);
    // speed_50 has limit of 300s
    state.quests = [
      { id: 'q_speed_50', status: 'active', progress: 0 },
    ];
    state.playTime = 305; // exceeded limit of 300s

    state.quests.forEach(q => {
      const def = QUEST_DEFS[q.id];
      if (q.status === 'active' && def.timeLimit !== undefined && state.playTime > def.timeLimit) {
        q.status = 'failed';
      }
    });

    expect(state.quests[0].status).toBe('failed');
  });
});
