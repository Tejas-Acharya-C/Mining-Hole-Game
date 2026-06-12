import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialState } from '../systems/GameManager.testable';
import { ObjectiveTracker } from '../components/ObjectiveTracker';

describe('release quality gates', () => {
  it('does not mount playtest overlay in the main app', () => {
    const appSource = readFileSync(join(process.cwd(), 'src', 'App.tsx'), 'utf8');
    expect(appSource).not.toContain('Playtest Mode');
    expect(appSource).not.toContain('shouldShowDebugUi');
  });

  it('renders a minimal objective chip label', () => {
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
  });

  it('excludes playtest overlay from production bundles when dist is present', () => {
    const distAssets = join(process.cwd(), 'dist', 'assets');
    if (!existsSync(distAssets)) return;

    const files = readdirSync(distAssets).filter(name => name.endsWith('.js'));
    if (files.length === 0) return;

    const bundleText = files
      .map(name => readFileSync(join(distAssets, name), 'utf8'))
      .join('\n');

    expect(bundleText).not.toContain('Playtest Mode');
    expect(bundleText).not.toContain('Guidance debug overlay');
  });
});
