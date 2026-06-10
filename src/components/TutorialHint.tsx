import type { GameState } from '../types';
import { playerDepth } from '../systems/GameManager';
import { SURFACE_TILE_ROW } from '../data/tiles';
import styles from './TutorialHint.module.css';

interface Props { state: GameState; }

export default function TutorialHint({ state }: Props) {
  if (!state.settings.showTutorial) return null;

  const { player } = state;
  const depth      = playerDepth(player);
  const atSurface  = player.y <= SURFACE_TILE_ROW + 1;
  const hasItems   = player.inventory.length > 0;
  const hasMoney   = player.money > 0;

  let hint = '';
  if (depth === 0 && !hasItems && state.statistics.blocksDug === 0) {
    hint = '⛏  Arrow Keys + Z to dig down. Or click an adjacent tile.';
  } else if (hasItems && atSurface && !hasMoney) {
    hint = '💰  Press E near the surface, or step on the green $ tile to sell.';
  } else if (hasMoney && player.upgrades.shovel === 0) {
    hint = '🛒  Press B at the surface to open the Upgrade Shop.';
  } else if (depth > 8 && depth < 20 && player.upgrades.battery === 0) {
    hint = '🔋  Running low on energy? Buy a Battery upgrade to increase max energy.';
  } else if (depth >= 20 && player.upgrades.shovel < 2) {
    hint = '⚠  Stone layers ahead need a better shovel — upgrade at the shop.';
  } else if (depth >= 40 && player.upgrades.lantern === 0) {
    hint = '🔦  Getting dark? Buy a Lantern upgrade to see further.';
  } else if (state.quests.filter(q => q.status === 'active').length > 0 && state.statistics.blocksDug < 50) {
    hint = '📋  Press Q to view active quests and earn bonus rewards.';
  } else {
    return null;
  }

  return <div className={styles.hint}>{hint}</div>;
}
