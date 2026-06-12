import type { GameState, UpgradeId } from '../types';
import { UPGRADE_DEFS, upgradeCost } from '../data/upgrades';
import { playerDepth } from '../systems/GameManager';
import { isTouchCapable } from '../utils/device';
import styles from './ShopPanel.module.css';

interface Props {
  state: GameState;
  onBuy: (id: UpgradeId) => void;
  onClose: () => void;
}

const UPGRADE_ORDER: UpgradeId[] = [
  'shovel', 'backpack', 'battery', 'lantern', 'boots',
  'reinforced_picks', 'critical_chance', 'drill',
  'ore_detector', 'scanner',
  'teleport', 'jetpack', 'artifact_sense',
];

const CATEGORY_COLORS = {
  combat:      '#ef4444',
  utility:     '#6366f1',
  exploration: '#22c55e',
  special:     '#f59e0b',
};

export default function ShopPanel({ state, onBuy, onClose }: Props) {
  const { player } = state;
  const isMobile = isTouchCapable();
  const depth = playerDepth(player);
  const isNoShop = state.mode === 'no_shop';

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>🛒 Upgrade Shop</h2>
            <p className={styles.subtitle}>Depth {depth}m — some upgrades unlock deeper</p>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.money}>💰 ${player.money.toLocaleString()}</div>
            <button className={styles.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        <div className={styles.grid}>
          {isNoShop && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#ef4444',
              background: 'rgba(239,68,68,0.1)', borderRadius: 8, marginBottom: 8 }}>
              🚫 No Shop Challenge — upgrades are disabled this run.
            </div>
          )}
          {!isNoShop && UPGRADE_ORDER.map(id => {
            const def    = UPGRADE_DEFS[id];
            const level  = player.upgrades[id];
            const maxed  = level >= def.maxLevel;
            const locked = (def.unlockDepth ?? 0) > player.deepestDepth;
            const cost   = maxed || locked ? 0 : upgradeCost(id, level);
            const canBuy = !maxed && !locked && player.money >= cost;

            return (
              <div
                key={id}
                className={`${styles.card} ${maxed ? styles.maxed : ''} ${canBuy ? styles.affordable : ''} ${locked ? styles.locked : ''}`}
              >
                <div className={styles.cardIcon}>{def.icon}</div>
                <div className={styles.cardInfo}>
                  <div className={styles.cardTop}>
                    <span className={styles.cardName}>{def.label}</span>
                    <span
                      className={styles.categoryBadge}
                      style={{ background: CATEGORY_COLORS[def.category] + '33', color: CATEGORY_COLORS[def.category] }}
                    >
                      {def.category}
                    </span>
                  </div>
                  <p className={styles.cardDesc}>{locked ? `🔒 Unlocks at depth ${def.unlockDepth}m` : def.description}</p>
                  <div className={styles.levelBar}>
                    {Array.from({ length: def.maxLevel }).map((_, i) => (
                      <div key={i} className={`${styles.pip} ${i < level ? styles.pipFilled : ''}`} />
                    ))}
                    <span className={styles.levelLabel}>Lv {level}/{def.maxLevel}</span>
                  </div>
                </div>
                <div className={styles.buyCol}>
                  {maxed ? (
                    <span className={styles.maxBadge}>MAX</span>
                  ) : locked ? (
                    <span className={styles.lockIcon}>🔒</span>
                  ) : (
                    <button
                      className={`${styles.buyBtn} ${!canBuy ? styles.disabled : ''}`}
                      onClick={() => canBuy && onBuy(id)}
                      disabled={!canBuy}
                    >
                      ${cost.toLocaleString()}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className={styles.hint}>
          💡 {isMobile ? 'Open the surface shop when you reach the top and spend your money on upgrades.' : 'Return to surface (B key) to shop. Upgrades are permanent.'}
        </p>
      </div>
    </div>
  );
}
