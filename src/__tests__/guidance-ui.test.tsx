import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialState } from '../systems/GameManager.testable';
import { ObjectiveTracker } from '../components/ObjectiveTracker';
import { HintPanel } from '../components/HintPanel';
import { JournalPanel } from '../components/JournalPanel';
import {
  VIEWPORT_AUDIT_SIZES,
  estimatePermanentUiFootprint,
  guidanceUiAvoidsSafeZone,
  isCompactViewport,
  meetsGameplayVisibilityTarget,
} from '../utils/guidanceLayout';

describe('guidance UI defaults', () => {
  it('keeps the objective tracker collapsed by default', () => {
    const state = createInitialState(3);
    const html = renderToStaticMarkup(
      <ObjectiveTracker
        state={state}
        isMobile={false}
        onOpenHints={() => {}}
        onOpenJournal={() => {}}
      />,
    );

    expect(html).toContain('data-collapsed="true"');
    expect(html).not.toContain('data-testid="objective-expanded"');
    expect(html).not.toContain('Dig straight down');
  });

  it('keeps mobile objective tracker collapsed by default with icon and title only', () => {
    const state = createInitialState(3);
    const html = renderToStaticMarkup(
      <ObjectiveTracker
        state={state}
        isMobile={true}
        onOpenHints={() => {}}
        onOpenJournal={() => {}}
      />,
    );

    expect(html).toContain('data-collapsed="true"');
    expect(html).toContain('Start Digging');
    expect(html).not.toContain('data-testid="objective-expanded"');
  });

  it('starts with hint and journal panels closed in game state', () => {
    const state = createInitialState(7);
    expect(state.showHintPanel).toBe(false);
    expect(state.showJournal).toBe(false);
  });

  it('exposes dedicated hint and journal buttons without permanent panels', () => {
    const state = createInitialState(3);
    const html = renderToStaticMarkup(
      <ObjectiveTracker
        state={state}
        isMobile={true}
        onOpenHints={() => {}}
        onOpenJournal={() => {}}
      />,
    );

    expect(html).toContain('data-testid="hint-button"');
    expect(html).toContain('data-testid="journal-button"');
    expect(html).not.toContain('data-testid="hint-panel"');
    expect(html).not.toContain('data-testid="journal-panel"');
  });
});

describe('guidance panel rendering', () => {
  it('renders hint panel only when explicitly opened', () => {
    const state = createInitialState(3);
    const html = renderToStaticMarkup(
      <HintPanel state={state} onClose={() => {}} />,
    );

    expect(html).toContain('data-testid="hint-panel"');
    expect(html).toContain('❓ Hint');
  });

  it('renders journal panel only when explicitly opened', () => {
    const state = createInitialState(3);
    const html = renderToStaticMarkup(
      <JournalPanel state={state} onClose={() => {}} />,
    );

    expect(html).toContain('data-testid="journal-panel"');
    expect(html).toContain('Field Journal');
  });
});

describe('guidance UI footprint audit', () => {
  it.each(VIEWPORT_AUDIT_SIZES)(
    'keeps gameplay dominant on $label ($width x $height)',
    ({ width, height, isMobile }) => {
      const footprint = estimatePermanentUiFootprint({ width, height }, isMobile);

      expect(footprint.gameplayPercent).toBeGreaterThanOrEqual(80);
      expect(footprint.permanentUiPercent).toBeLessThanOrEqual(20);
      expect(meetsGameplayVisibilityTarget({ width, height }, isMobile)).toBe(true);
    },
  );

  it.each(VIEWPORT_AUDIT_SIZES)(
    'keeps collapsed objective chip out of the center safe zone on $label',
    ({ width, height, isMobile }) => {
      expect(guidanceUiAvoidsSafeZone({ width, height }, isMobile)).toBe(true);
    },
  );

  it('uses compact mode sizing on narrow phone widths', () => {
    expect(isCompactViewport(320)).toBe(true);
    expect(isCompactViewport(360)).toBe(true);
    expect(isCompactViewport(390)).toBe(true);
    expect(isCompactViewport(412)).toBe(false);
  });
});
