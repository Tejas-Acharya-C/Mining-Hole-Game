import { useState } from 'react';
import type { GameState } from '../types';
import { playerDepth } from '../systems/GameManager';
import { inventoryCapacity } from '../data/upgrades';
import { SURFACE_TILE_ROW } from '../data/tiles';
import { BIOME_DEFS } from '../data/biomes';
import { QUEST_DEFS } from '../data/quests';
import styles from './HUD.module.css';

interface Props {
  state: GameState;
  useMobileUI?: boolean;
  onPause: () => void;
  onShop: () => void;
  onInventory: () => void;
  onTeleport?: () => void;
  onUseEnergyCell?: () => void;
}

const SHOVEL_NAMES = [
  'Rusty Shovel', 'Iron Pick', 'Steel Drill', 'Titanium Bore',
  'Diamond Cutter', 'Plasma Rig', 'Void Slicer', 'Quantum Edge', 'Singularity Fang',
];

export default function HUD({ state, useMobileUI, onPause, onShop, onInventory, onTeleport, onUseEnergyCell }: Props) {
  const { player, currentBiome } = state;
  const isMobile = useMobileUI || state.settings.touchControls;
  const [isExpanded, setIsExpanded] = useState(false);
  
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

  const energyColor = energyPct > 0.5 ? 'var(--color-green)' : energyPct > 0.2 ? 'var(--color-gold)' : 'var(--color-red)';
  const invColor    = invPct  > 0.9 ? 'var(--color-red)' : invPct  > 0.65 ? 'var(--color-orange)' : 'var(--color-blue)';

  const eventCount = state.activeEvents.filter(e => !e.triggered).length;
  const activeQuest = state.quests.find(q => q.status === 'active');
  const questDef = activeQuest ? QUEST_DEFS[activeQuest.id] : null;

  if (isMobile) {
    // ── MOBILE COMPACT HUD ──
    return (
      <div className={`${styles.hud} ${styles.mobileHud} ${energyPct <= 0.2 ? styles.lowEnergyAlert : ''}`}>
        <div className={styles.topBar}>
          <div className={styles.statsGroup}>
            <div className={styles.statChip}>
              <span className={styles.chipIcon}>💰</span>
              <span className={styles.chipVal} style={{ fontFamily: 'var(--font-tech)' }}>
                ${player.money.toLocaleString()}
              </span>
            </div>
            <div className={styles.statChip}>
              <span className={styles.chipIcon}>📏</span>
              <span className={styles.chipVal} style={{ fontFamily: 'var(--font-tech)' }}>
                {depth}m
              </span>
            </div>
          </div>

          <div className={styles.buttons}>
            <button 
              className={styles.expandToggleBtn}
              onClick={() => setIsExpanded(prev => !prev)}
            >
              {isExpanded ? '▲ DETAILS' : '▼ DETAILS'}
            </button>
            <button className={styles.pauseBtn} onClick={onPause}>⏸</button>
          </div>
        </div>

        {/* Collapsible Mobile HUD Panel */}
        {isExpanded && (
          <div className={styles.mobileDetailsPanel}>
            <div className={styles.detailsGrid}>
              <div className={styles.detailsRow}>
                <span>⚡ ENERGY</span>
                <span className={styles.detailsVal}>{Math.floor(player.energy)} / {player.maxEnergy}</span>
              </div>
              <div className={styles.detailsRow}>
                <span>🎒 CARGO</span>
                <span className={styles.detailsVal}>{invCount} / {cap}</span>
              </div>
              <div className={styles.detailsRow}>
                <span>⛏ TOOL</span>
                <span className={styles.detailsVal}>{shovelName}</span>
              </div>
              <div className={styles.detailsRow}>
                <span>🌍 ENVIRONMENT</span>
                <span className={styles.detailsVal} style={{ color: biome.ambientColor }}>{biome.label.toUpperCase()}</span>
              </div>
              {eventCount > 0 && (
                <div className={styles.detailsRow} style={{ color: 'var(--color-orange)' }}>
                  <span>🛰 ANOMALIES</span>
                  <span className={styles.detailsVal}>{eventCount}</span>
                </div>
              )}
            </div>

            {hasEnergyCell && (
              <div className={styles.detailsActionRow}>
                <button className={styles.mobileCellBtn} onClick={onUseEnergyCell}>
                  🔋 USE ENERGY CELL ×{energyCellQty}
                </button>
              </div>
            )}

            {/* Quests / Surface Objectives */}
            <div className={styles.detailsObjective}>
              {atSurface ? (
                <div className={styles.detailsObjectiveText} style={{ color: '#86efac' }}>
                  📢 DEPOT BEACON ACTIVE: use the shop/sell controls when at the surface.
                </div>
              ) : (questDef && activeQuest) ? (
                <div className={styles.detailsObjectiveText}>
                  🧭 COMPASS TARGET: <strong style={{ color: 'var(--color-blue)' }}>{questDef.title}</strong>
                  <span className={styles.objProgress}>
                    ({activeQuest.progress}/{('count' in questDef.objective) ? questDef.objective.count : ('totalValue' in questDef.objective) ? questDef.objective.totalValue : ('depth' in questDef.objective) ? questDef.objective.depth : 1})
                  </span>
                </div>
              ) : null}
            </div>

            {/* Permanent Stat Bonuses */}
            {player.permanentBonuses.length > 0 && (
              <div className={styles.detailsBonuses}>
                <span className={styles.bonusLabel}>ACTIVE PERMANENT MODS:</span>
                <div className={styles.bonusGrid}>
                  {player.permanentBonuses.map((b, i) => (
                    <span key={i} className={styles.bonusChip}>
                      {b.type === 'sell_multiplier' && `+${Math.round(b.value * 100)}% SELL`}
                      {b.type === 'energy_regen'    && `+${b.value.toFixed(1)}/s REGEN`}
                      {b.type === 'dig_efficiency'  && `+${Math.round(b.value * 100)}% SPEED`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Statistics details */}
            <div className={styles.detailsFooter}>
              {state.statistics.loreFragmentsFound > 0 && (
                <div>📜 DATA LOGS: {state.statistics.loreFragmentsFound}/12</div>
              )}
              {state.digCombo >= 5 && (
                <div style={{ color: 'var(--color-gold)' }}>COMBO ×{state.digCombo} ({Math.round(state.comboMultiplier * 100)}% sell)</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── DESKTOP HUD ──
  return (
    <div className={`${styles.hud} ${energyPct <= 0.2 ? styles.lowEnergyAlert : ''}`}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <div className={styles.statsGroup}>
          <div className={styles.statChip}>
            <span className={styles.chipIcon}>💰</span>
            <span className={styles.chipVal} style={{ fontFamily: 'var(--font-tech)' }}>
              ${player.money.toLocaleString()}
            </span>
          </div>
          <div className={styles.statChip}>
            <span className={styles.chipIcon}>📏</span>
            <span className={styles.chipVal} style={{ fontFamily: 'var(--font-tech)' }}>
              {depth}m
            </span>
          </div>
          <div className={styles.statChip}>
            <span className={styles.chipIcon}>⛏</span>
            <span className={styles.chipVal}>{shovelName}</span>
          </div>
          {currentBiome !== 'surface' && currentBiome !== 'soil_layer' && (
            <div className={`${styles.statChip} ${styles.biomeChip}`}
              style={{ borderColor: biome.ambientColor }}>
              <span className={styles.chipVal}>{biome.label.toUpperCase()}</span>
            </div>
          )}
          {eventCount > 0 && (
            <div className={`${styles.statChip} ${styles.eventChip}`}>
              <span className={styles.chipIcon}>⚠</span>
              <span className={styles.chipVal}>{eventCount} RADAR</span>
            </div>
          )}
        </div>

        <div className={styles.buttons}>
          {player.teleportCharges > 0 && onTeleport && (
            <button className={styles.teleportBtn} onClick={onTeleport} title="Surface Teleport Beacon (T)">
              ✨ ×{player.teleportCharges}
            </button>
          )}
          {atSurface && (
            <button className={styles.shopBtn} onClick={onShop} title="Suit Upgrade Shop (B)">🛒 SUIT SHOP</button>
          )}
          <button className={styles.invBtn} onClick={onInventory} title="Inventory Storage (I)">
            🎒 <span style={{ fontFamily: 'var(--font-tech)', fontSize: 12 }}>{invCount}/{cap}</span>
          </button>
          <button className={styles.pauseBtn} onClick={onPause} title="Pause Terminal (Esc)">⏸</button>
        </div>
      </div>

      {/* Visor Bar readouts */}
      <div className={styles.gaugesContainer}>
        {/* Energy bar */}
        <div className={styles.barRow}>
          <span className={styles.barLabel}>⚡</span>
          <div className={styles.barTrack}>
            <div className={styles.barFill} style={{ width: `${energyPct * 100}%`, background: energyColor }} />
            {energyPct < 1 && <div className={styles.barRegen} />}
          </div>
          <span className={styles.barText} style={{ fontFamily: 'var(--font-tech)' }}>
            {Math.floor(player.energy)}/{player.maxEnergy}
          </span>
          {hasEnergyCell && (
            <span className={styles.cellHint} title="F to use energy cell" onClick={onUseEnergyCell} style={{ cursor: 'pointer' }}>
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
          <span className={styles.barText} style={{ fontFamily: 'var(--font-tech)' }}>
            {invCount}/{cap}
          </span>
          {invPct >= 1 && <span className={styles.fullWarn}>CARGO FULL</span>}
        </div>
      </div>

      {/* Surface hints & Quest tracking */}
      <div className={styles.lowerHud}>
        {atSurface ? (
          <div className={styles.surfaceHint}>
            <span style={{ color: 'var(--color-gold)' }}>DEPOT STATUS:</span> ACTIVE · <kbd>E</kbd> Sell Cargo · <kbd>B</kbd> Shop · <kbd>Q</kbd> Quests · <kbd>I</kbd> Bag
          </div>
        ) : null}

        {/* Permanent bonuses row */}
        {player.permanentBonuses.length > 0 && (
          <div className={styles.bonusRow}>
            {player.permanentBonuses.map((b, i) => (
              <span key={i} className={styles.bonusChip}>
                {b.type === 'sell_multiplier' && `+${Math.round(b.value * 100)}% SELL`}
                {b.type === 'energy_regen'    && `+${b.value.toFixed(1)} REGEN`}
                {b.type === 'dig_efficiency'  && `+${Math.round(b.value * 100)}% DIG`}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Subtle details */}
      <div className={styles.subtleRow}>
        {state.statistics.loreFragmentsFound > 0 && (
          <div className={styles.loreCount}>
            📜 DATA LOGS COLLECTED: {state.statistics.loreFragmentsFound}/12
          </div>
        )}
        {state.digCombo >= 5 && state.digCombo < 10 && (
          <div className={styles.comboHint}>
            COMBO MULTIPLIER ×{state.digCombo} ({Math.round(state.comboMultiplier * 100)}% sell)
          </div>
        )}
      </div>
    </div>
  );
}


