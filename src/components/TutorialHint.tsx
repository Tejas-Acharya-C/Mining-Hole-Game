import type { GameState } from '../types';
import { playerDepth } from '../systems/GameManager';
import { SURFACE_TILE_ROW } from '../data/tiles';
import { isTouchCapable } from '../utils/device';
import styles from './TutorialHint.module.css';

interface Props { state: GameState; }

export default function TutorialHint({ state }: Props) {
  if (!state.settings.showTutorial) return null;

  const { player } = state;
  const isMobile = isTouchCapable();
  const depth      = playerDepth(player);
  const atSurface  = player.y <= SURFACE_TILE_ROW + 1;
  const hasItems   = player.inventory.length > 0;
  const hasMoney   = player.money > 0;

  let hint = '';
  if (depth === 0 && !hasItems && state.statistics.blocksDug === 0) {
    hint = isMobile
      ? '⛏  Use the left joystick and tap the mine button to dig.'
      : '⛏  Arrow Keys + Z to dig down. Or click an adjacent tile.';
  } else if (hasItems && atSurface && !hasMoney) {
    hint = isMobile
      ? '💰  Tap the selling control when you are at the surface to trade your haul.'
      : '💰  Press E near the surface, or step on the green $ tile to sell.';
  } else if (hasMoney && player.upgrades.shovel === 0) {
    hint = isMobile
      ? '🛒  Open the surface shop to upgrade your drill and energy.'
      : '🛒  Press B at the surface to open the Upgrade Shop.';
  } else if (depth > 8 && depth < 20 && player.upgrades.battery === 0) {
    hint = '🔋  Running low on energy? Buy a Battery upgrade to increase max energy.';
  } else if (depth >= 20 && player.upgrades.shovel < 2) {
    hint = '⚠  Stone layers ahead need a better shovel — upgrade at the shop.';
  } else if (depth >= 40 && player.upgrades.lantern === 0) {
    hint = '🔦  Getting dark? Buy a Lantern upgrade to see further.';
  } else if (state.activeEvents.length > 0 && state.statistics.blocksDug < 100) {
    hint = '⚠  Something unusual is nearby — explore the flashing marker!';
  } else if (player.inventory.some(s => s.itemId === 'energy_cell') && state.statistics.blocksDug < 50) {
    hint = isMobile
      ? '🔋  Use your energy cell button to restore energy quickly.'
      : '🔋  You have Energy Cells — press F to consume one and restore energy.';
  } else if (state.digCombo >= 5 && state.statistics.blocksDug < 80) {
    hint = '🔥  Keep digging without stopping — combo boosts your sell prices!';
  } else {
    return null;
  }

  return <div className={styles.hint}>{hint}</div>;
}
