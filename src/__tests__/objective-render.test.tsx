import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialState } from '../systems/GameManager.testable';
import { ObjectiveTracker } from '../components/ObjectiveTracker';

describe('objective tracker rendering', () => {
  it('renders compact hint and journal controls for mobile layout', () => {
    const state = createInitialState(3);
    const html = renderToStaticMarkup(
      <ObjectiveTracker
        state={state}
        isMobile={true}
        onOpenHints={() => {}}
        onOpenJournal={() => {}}
      />,
    );

    expect(html).toContain('data-testid="journal-button"');
    expect(html).toContain('data-testid="hint-button"');
    expect(html).toContain('data-collapsed="true"');
  });

  it('renders a single-line desktop objective chip collapsed by default', () => {
    const state = createInitialState(3);
    const html = renderToStaticMarkup(
      <ObjectiveTracker
        state={state}
        isMobile={false}
        onOpenHints={() => {}}
        onOpenJournal={() => {}}
      />,
    );

    expect(html).toContain('Start Digging');
    expect(html).not.toContain('Current Objective');
    expect(html).toContain('data-collapsed="true"');
    expect(html).not.toContain('data-testid="objective-expanded"');
  });
});
