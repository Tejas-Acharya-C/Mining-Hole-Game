import { useState } from 'react';
import type { GameState } from '../types';
import { ITEM_DEFS, RARITY_COLORS, RARITY_ORDER } from '../data/items';
import { inventoryCapacity } from '../data/upgrades';
import styles from './InventoryPanel.module.css';

interface Props {
  state: GameState;
  onClose: () => void;
  onSellAll: () => void;
  onUseEnergyCell?: () => void;
}

type SortMode = 'rarity' | 'value' | 'qty' | 'name';

export default function InventoryPanel({ state, onClose, onSellAll, onUseEnergyCell }: Props) {
  const { player } = state;
  const [sort, setSort] = useState<SortMode>('rarity');
  const [filter, setFilter] = useState('');
  const isMobile = state.settings.touchControls;

  const cap      = inventoryCapacity(player.upgrades.backpack);
  const invCount = player.inventory.reduce((s, sl) => s + sl.qty, 0);

  const totalSellValue = player.inventory.reduce((acc, slot) => {
    const def = ITEM_DEFS[slot.itemId];
    let val = def.sellValue * slot.qty;
    for (const b of player.permanentBonuses) {
      if (b.type === 'sell_multiplier') val = Math.round(val * (1 + b.value));
    }
    return acc + val;
  }, 0);

  const sorted = [...player.inventory]
    .filter(sl => {
      if (!filter) return true;
      return ITEM_DEFS[sl.itemId].label.toLowerCase().includes(filter.toLowerCase());
    })
    .sort((a, b) => {
      const da = ITEM_DEFS[a.itemId]; const db = ITEM_DEFS[b.itemId];
      if (sort === 'rarity')  return RARITY_ORDER[db.rarity] - RARITY_ORDER[da.rarity];
      if (sort === 'value')   return (db.sellValue * b.qty) - (da.sellValue * a.qty);
      if (sort === 'qty')     return b.qty - a.qty;
      if (sort === 'name')    return da.label.localeCompare(db.label);
      return 0;
    });

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>🎒 Inventory</h2>
            <span className={styles.cap}>{invCount}/{cap} slots</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Sort & Filter */}
        <div className={styles.toolbar}>
          <input
            className={styles.filterInput}
            placeholder="Filter items…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
          <div className={styles.sortBtns}>
            {(['rarity','value','qty','name'] as SortMode[]).map(s => (
              <button
                key={s}
                className={`${styles.sortBtn} ${sort === s ? styles.sortActive : ''}`}
                onClick={() => setSort(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {sorted.length === 0 ? (
          <p className={styles.empty}>
            {filter ? 'No items match your filter.' : 'Your pack is empty. Go dig!'}
          </p>
        ) : (
          <div className={styles.itemList}>
            {sorted.map(slot => {
              const def = ITEM_DEFS[slot.itemId];
              const slotValue = def.sellValue * slot.qty;
              return (
                <div key={slot.itemId} className={styles.item}>
                  <div
                    className={styles.itemGem}
                    style={{ background: def.color + '22', borderColor: def.color + '66' }}
                  >
                    <div className={styles.gemDiamond} style={{ background: def.color }} />
                  </div>
                  <div className={styles.itemMeta}>
                    <span
                      className={styles.itemName}
                      style={{ color: RARITY_COLORS[def.rarity] }}
                    >
                      {def.label}
                    </span>
                    <span className={styles.itemDesc}>{def.description}</span>
                    <span className={styles.rarityBadge} style={{ color: RARITY_COLORS[def.rarity] }}>
                      {def.rarity}
                    </span>
                  </div>
                  <div className={styles.itemQty}>×{slot.qty}</div>
                  <div className={styles.itemVal}>
                    {def.sellValue > 0 ? (
                      <span style={{ color: '#22c55e' }}>${slotValue.toLocaleString()}</span>
                    ) : def.isConsumable && slot.itemId === 'energy_cell' ? (
                      <button
                        className={styles.useBtn}
                        onClick={e => { e.stopPropagation(); onUseEnergyCell?.(); }}
                      >
                        ⚡ USE
                      </button>
                    ) : (
                      <span className={styles.consumable}>{isMobile ? 'Consumable' : 'Use: E'}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className={styles.footer}>
          <span className={styles.totalVal}>
            Sell value: <strong>${totalSellValue.toLocaleString()}</strong>
          </span>
          <button
            className={styles.sellBtn}
            onClick={() => { onSellAll(); onClose(); }}
            disabled={totalSellValue === 0}
          >
            Sell All
          </button>
        </div>
      </div>
    </div>
  );
}
