import type { GameState } from '../types';
import { playerDepth } from '../systems/GameManager';
import { inventoryCapacity } from '../data/upgrades';
import { SURFACE_TILE_ROW } from '../data/tiles';
import { BIOME_DEFS } from '../data/biomes';
import styles from './HUD.module.css';

interface Props {
  state: GameState;
  onPause: () => void;
  onShop: () => void;
  onInventory: () => void;
  onTeleport?: () => void;
}

const SHOVEL_NAMES = [
  'Rusty Shovel', 'Iron Pick', 'Steel Drill', 'Titanium Bore',
  'Diamond Cutter', 'Plasma Rig', 'Void Slicer', 'Quantum Edge', 'Singularity Fang',
];

export default function HUD({ state, onPause, onShop, onInventory, onTeleport }: Props) {
  const { player, currentBiome } = state;
  const depth      = playerDepth(player);
  const energyPct  = player.energy / player.maxEnergy;
  const cap        = inventoryCapacity(player.upgrades.backpack);
  const invCount   = player.inventory.reduce((s, sl) => s + sl.qty, 0);
  const invPct     = invCount / cap;
  const shovelName = SHOVEL_NAMES[Math.min(player.upgrades.shovel, SHOVEL_NAMES.length - 1)];
  const atSurface  = player.y <= SURFACE_TILE_ROW + 2;
  const biome      = BIOME_DEFS[currentBiome];
  const hasEnergyCell = player.inventory.some(s => s.itemId === 'energy_cell' && s.qty > 0);
  const energyCellQty = player.inventory.find(s => s.itemId === 'energy_cell')?.qty ?? 0;

  const energyColor = energyPct > 0.5 ? '#22c55e' : energyPct > 0.2 ? '#f59e0b' : '#ef4444';
  const invColor    = invPct  > 0.9 ? '#ef4444' : invPct  > 0.65 ? '#f59e0b' : '#6366f1';

  // Active events count
  const eventCount = state.activeEvents.filter(e => !e.triggered).length;

  return (
    <div className={styles.hud}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <div className={styles.statsGroup}>
          <div className={styles.statChip}>
            <span className={styles.chipIcon}>💰</span>
            <span className={styles.chipVal}>${player.money.toLocaleString()}</span>
          </div>
          <div className={styles.statChip}>
            <span className={styles.chipIcon}>📏</span>
            <span className={styles.chipVal}>{depth}m</span>
          </div>
          <div className={styles.statChip}>
            <span className={styles.chipIcon}>⛏</span>
            <span className={styles.chipVal}>{shovelName}</span>
          </div>
          {currentBiome !== 'surface' && currentBiome !== 'soil_layer' && (
            <div className={`${styles.statChip} ${styles.biomeChip}`}
              style={{ borderColor: biome.ambientColor }}>
              <span className={styles.chipVal}>{biome.label}</span>
            </div>
          )}
          {eventCount > 0 && (
            <div className={`${styles.statChip} ${styles.eventChip}`}>
              <span className={styles.chipIcon}>⚠</span>
              <span className={styles.chipVal}>{eventCount} nearby</span>
            </div>
          )}
        </div>

        <div className={styles.buttons}>
          {player.teleportCharges > 0 && onTeleport && (
            <button className={styles.teleportBtn} onClick={onTeleport} title="Teleport (T)">
              ✨ ×{player.teleportCharges}
            </button>
          )}
          {atSurface && (
            <button className={styles.shopBtn} onClick={onShop} title="Shop (B)">🛒</button>
          )}
          <button className={styles.invBtn} onClick={onInventory} title="Inventory (I)">
            🎒 <span style={{ fontSize: 11 }}>{invCount}/{cap}</span>
          </button>
          <button className={styles.pauseBtn} onClick={onPause} title="Pause (Esc)">⏸</button>
        </div>
      </div>

      {/* Energy bar */}
      <div className={styles.barRow}>
        <span className={styles.barLabel}>⚡</span>
        <div className={styles.barTrack}>
          <div className={styles.barFill} style={{ width: `${energyPct * 100}%`, background: energyColor }} />
          {/* Regen indicator */}
          {energyPct < 1 && (
            <div className={styles.barRegen} />
          )}
        </div>
        <span className={styles.barText}>{Math.floor(player.energy)}/{player.maxEnergy}</span>
        {hasEnergyCell && (
          <span className={styles.cellHint} title="F to use energy cell">
            🔋×{energyCellQty} <kbd>F</kbd>
          </span>
        )}
      </div>

      {/* Inventory bar */}
      <div className={styles.barRow}>
        <span className={styles.barLabel}>🎒</span>
        <div className={styles.barTrack}>
          <div className={styles.barFill} style={{ width: `${invPct * 100}%`, background: invColor }} />
        </div>
        <span className={styles.barText}>{invCount}/{cap}</span>
        {invPct >= 1 && <span className={styles.fullWarn}>FULL</span>}
      </div>

      {/* Surface hints */}
      {atSurface && (
        <div className={styles.surfaceHint}>
          E: Sell all · B: Shop · Q: Quests · I: Inventory · T: Teleport
        </div>
      )}

      {/* Combo indicator in HUD (low combo only — high combo shown on canvas) */}
      {state.digCombo >= 5 && state.digCombo < 10 && (
        <div className={styles.comboHint}>
          Combo ×{state.digCombo}
          {state.comboMultiplier > 1 && ` (+${Math.round((state.comboMultiplier - 1) * 100)}% sell)`}
        </div>
      )}

      {/* Permanent bonuses row */}
      {player.permanentBonuses.length > 0 && (
        <div className={styles.bonusRow}>
          {player.permanentBonuses.map((b, i) => (
            <span key={i} className={styles.bonusChip}>
              {b.type === 'sell_multiplier' && `+${Math.round(b.value * 100)}% sell`}
              {b.type === 'energy_regen'    && `+${b.value.toFixed(1)} regen`}
              {b.type === 'dig_efficiency'  && `+${Math.round(b.value * 100)}% dig`}
            </span>
          ))}
        </div>
      )}

      {/* Lore fragments counter (subtle) */}
      {state.statistics.loreFragmentsFound > 0 && (
        <div className={styles.loreCount}>
          📜 {state.statistics.loreFragmentsFound} lore found
        </div>
      )}
    </div>
  );
}
