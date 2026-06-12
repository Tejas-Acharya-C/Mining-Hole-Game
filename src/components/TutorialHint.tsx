import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameState } from '../types';
import { playerDepth } from '../systems/GameManager';
import { SURFACE_TILE_ROW } from '../data/tiles';
import { isTouchCapable } from '../utils/device';
import styles from './TutorialHint.module.css';

interface Props { state: GameState; }

const DISPLAY_MS = 5500;
const FADE_MS = 1200;

function getTutorialHint(state: GameState, isMobile: boolean): string | null {
  const { player } = state;
  const depth = playerDepth(player);
  const atSurface = player.y <= SURFACE_TILE_ROW + 1;
  const hasItems = player.inventory.length > 0;
  const hasMoney = player.money > 0;

  if (depth === 0 && !hasItems && state.statistics.blocksDug === 0) {
    return isMobile
      ? '⛏ Dig with the joystick and mine button.'
      : '⛏ Arrow keys + Z to dig. Click adjacent tiles.';
  }
  if (hasItems && atSurface && !hasMoney) {
    return isMobile
      ? '💰 Sell cargo at the surface to earn money.'
      : '💰 Press E at the surface, or use the green $ tile.';
  }
  if (hasMoney && player.upgrades.shovel === 0) {
    return isMobile
      ? '🛒 Open the surface shop to upgrade your gear.'
      : '🛒 Press B at the surface to open the shop.';
  }
  if (depth > 8 && depth < 20 && player.upgrades.battery === 0) {
    return '🔋 Low energy? Buy a Battery upgrade at the shop.';
  }
  if (depth >= 20 && player.upgrades.shovel < 2) {
    return '⚠ Stone ahead needs a better shovel.';
  }
  if (depth >= 40 && player.upgrades.lantern === 0) {
    return '🔦 Buy a Lantern to see further underground.';
  }
  if (state.activeEvents.length > 0 && state.statistics.blocksDug < 100) {
    return '⚠ Explore the flashing marker nearby.';
  }
  if (player.inventory.some(s => s.itemId === 'energy_cell') && state.statistics.blocksDug < 50) {
    return isMobile
      ? '🔋 Tap the energy cell button to restore energy.'
      : '🔋 Press F to use an Energy Cell.';
  }
  if (state.digCombo >= 5 && state.statistics.blocksDug < 80) {
    return '🔥 Keep digging — combos boost sell prices.';
  }

  return null;
}

export default function TutorialHint({ state }: Props) {
  const dismissedRef = useRef(new Set<string>());
  const [phase, setPhase] = useState<'show' | 'fade' | 'hidden'>('show');
  const isMobile = isTouchCapable();

  const hint = useMemo(
    () => (state.settings.showTutorial ? getTutorialHint(state, isMobile) : null),
    [state, isMobile],
  );

  useEffect(() => {
    if (!hint) {
      setPhase('hidden');
      return;
    }
    if (dismissedRef.current.has(hint)) {
      setPhase('hidden');
      return;
    }

    setPhase('show');
    const fadeTimer = window.setTimeout(() => setPhase('fade'), DISPLAY_MS);
    const hideTimer = window.setTimeout(() => {
      dismissedRef.current.add(hint);
      setPhase('hidden');
    }, DISPLAY_MS + FADE_MS);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, [hint]);

  if (!hint || phase === 'hidden') return null;

  return (
    <div
      className={`${styles.hint} ${phase === 'fade' ? styles.fading : ''}`}
      data-testid="tutorial-hint"
    >
      {hint}
    </div>
  );
}
