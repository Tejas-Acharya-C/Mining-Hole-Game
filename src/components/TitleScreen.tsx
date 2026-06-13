import { useState } from 'react';
import type { GameMode, PrestigeData } from '../types';
import { isTouchCapable } from '../utils/device';
import styles from './TitleScreen.module.css';

interface Props {
  hasSave: boolean;
  onNewGame: (seed?: number, modifiers?: string[]) => void;
  onContinue: () => void;
  onChallenge: (mode: GameMode, seed?: number, modifiers?: string[]) => void;
  challengeModeUnlocked: boolean;
  prestigeCount: number;
  prestigeData?: PrestigeData;
}

export default function TitleScreen({
  hasSave, onNewGame, onContinue, onChallenge, challengeModeUnlocked, prestigeCount, prestigeData,
}: Props) {
  const [showModes, setShowModes] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [seedText, setSeedText] = useState('');
  const [activeMods, setActiveMods] = useState<string[]>([]);

  const MODES: { id: GameMode; label: string; desc: string; color: string }[] = [
    { id: 'hard',                label: '💀 Hard Mode',         desc: 'Slower energy regen, no mercy.', color: 'var(--color-red)' },
    { id: 'no_battery',          label: '🔋 Dead Battery',       desc: 'Energy barely regenerates.',     color: 'var(--color-orange)' },
    { id: 'no_shop',             label: '🚫 No Shop',            desc: 'No upgrades allowed.',           color: 'var(--color-purple)' },
    { id: 'randomized_economy',  label: '🎲 Chaos Market',       desc: 'Item prices fluctuate wildly.',  color: 'var(--color-cyan)' },
    { id: 'double_treasure',     label: '💎 Double Treasure',    desc: 'Ores worth 2×, but rarer.',      color: 'var(--color-green)' },
  ];

  const parsedSeed = seedText ? parseInt(seedText) : undefined;

  const isMobile = isTouchCapable();

  return (
    <div className={styles.root}>
      <div className={styles.gridOverlay} aria-hidden />
      <div className={styles.ambientGlow} aria-hidden />

      <div className={styles.panel}>
        <div className={styles.logoContainer}>
          <div className={styles.logo}>
            {'VOIDCORE'.split('').map((ch, i) => (
              <span key={i} className={styles.logoChar} style={{ '--i': i } as React.CSSProperties}>
                {ch}
              </span>
            ))}
          </div>
          <div className={styles.subLogo}>DEEP ALCHEMY</div>
        </div>
        <p className={styles.tagline}>DRILL DEEP. HARNESS THE VOID. STABILIZE THE WORLD CORE.</p>

        {prestigeCount > 0 && (
          <div className={styles.prestigeBadge}>
            👑 Expedition Rank {prestigeCount}
            {prestigeData && (
              <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.9, fontWeight: 'normal' }}>
                Active Bonuses:
                {prestigeData.bonuses.oreValueBonus > 0 && ` · +${Math.round(prestigeData.bonuses.oreValueBonus * 100)}% Ore Value`}
                {prestigeData.bonuses.maxEnergyBonus > 0 && ` · +${prestigeData.bonuses.maxEnergyBonus} Max Energy`}
                {prestigeData.bonuses.inventoryBonus > 0 && ` · +${prestigeData.bonuses.inventoryBonus} Cargo Slot${prestigeData.bonuses.inventoryBonus > 1 ? 's' : ''}`}
              </div>
            )}
          </div>
        )}

        {/* Custom seed and modifiers panel (only if won at least once) */}
        {challengeModeUnlocked && (
          <div className={styles.modifiersSection}>
            <div className={styles.inputGroup}>
              <label className={styles.sectionLabel}>
                SURFACE BEACON SEED
              </label>
              <input
                type="text"
                placeholder="PROJECTION SEED (RANDOM)"
                value={seedText}
                onChange={(e) => setSeedText(e.target.value.replace(/\D/g, ''))}
                className={styles.seedInput}
              />
            </div>

            <div className={styles.inputGroup} style={{ marginTop: '14px' }}>
              <label className={styles.sectionLabel} style={{ color: 'var(--color-purple)' }}>
                ENVIRONMENTAL MODIFIERS
              </label>
              <div className={styles.modsGrid}>
                {[
                  { id: 'low_gravity', label: '🚀 Low Gravity', desc: '2x Dmg, moves drain energy' },
                  { id: 'darkness', label: '🌑 Deep Darkness', desc: 'Lantern radius halved' },
                  { id: 'double_ore', label: '💎 Rich Veins', desc: '2x Ore drops' },
                  { id: 'hardcore', label: '💥 Hardcore Collapse', desc: '0 energy loses bag & 50% cash' },
                ].map((mod) => {
                  const active = activeMods.includes(mod.id);
                  return (
                    <button
                      key={mod.id}
                      onClick={() => {
                        setActiveMods(prev =>
                          prev.includes(mod.id) ? prev.filter(x => x !== mod.id) : [...prev, mod.id]
                        );
                      }}
                      className={`${styles.modButton} ${active ? styles.modActive : ''}`}
                    >
                      <div className={styles.modLabel}>{mod.label}</div>
                      <div className={styles.modDesc}>{mod.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className={styles.buttons}>
          {hasSave && (
            <button className={styles.btnPrimary} onClick={onContinue}>
              <span className={styles.btnIcon}>▶</span> CONTINUE EXPEDITION
            </button>
          )}
          <button className={hasSave ? styles.btnSecondary : styles.btnPrimary} onClick={() => onNewGame(parsedSeed, activeMods)}>
            <span className={styles.btnIcon}>{hasSave ? '⟳' : '▶'}</span> {hasSave ? 'RE-DEPLOY PROJECT' : 'INITIATE EXPEDITION'}
          </button>
          <button className={styles.btnSecondary} onClick={() => setShowModes(v => !v)}>
            <span className={styles.btnIcon}>⚡</span> {showModes ? 'CLOSE CHALLENGES' : 'CHALLENGE MODES'}
          </button>
        </div>

        {showModes && (
          <div className={styles.modeGrid}>
            {MODES.map(m => (
              <button
                key={m.id}
                className={styles.modeCard}
                style={{ borderColor: m.color + '33' }}
                onClick={() => onChallenge(m.id, parsedSeed, activeMods)}
              >
                <span className={styles.modeCardLabel} style={{ color: m.color }}>{m.label}</span>
                <span className={styles.modeDesc}>{m.desc}</span>
              </button>
            ))}
          </div>
        )}

        <button className={styles.toggleBtn} onClick={() => setShowControls(v => !v)}>
          {showControls ? '▲ HIDE SYSTEM READOUT' : '▼ SHOW CONTROLS'}
        </button>

        {showControls && (
          <div className={styles.controls}>
            <div className={styles.ctrlGrid}>
              {isMobile ? (
                <>
                  <span>MOVE / DIG</span>        <span>Use the left joystick and tap ⛏ to mine</span>
                  <span>OPEN INVENTORY</span>     <span>Tap 🎒</span>
                  <span>USE ENERGY CELL</span>    <span>Tap 🔋 when available</span>
                  <span>SURFACE SHOP</span>       <span>Tap 🛒 on surface</span>
                  <span>TELEPORT</span>          <span>Tap ✨ when charged</span>
                  <span>PAUSE</span>             <span>Tap ⏸ in the top bar</span>
                </>
              ) : (
                <>
                  <span>THRUST / DIG DIRECTION</span>  <span>W,A,S,D / Arrow Keys</span>
                  <span>ACTIVATE DRILL</span>          <span>Z / Space / Left Click tile</span>
                  <span>RESTORE CELL</span>            <span>F (Consumes energy cell)</span>
                  <span>SELL METALS</span>             <span>E (Stand on Surface Depot)</span>
                  <span>UPGRADE SUIT</span>            <span>B (Stand on Surface Depot)</span>
                  <span>INVENTORY STORAGE</span>       <span>I</span>
                  <span>MISSION QUESTS</span>          <span>Q</span>
                  <span>SURFACE BEACON</span>          <span>T (Teleport charges required)</span>
                  <span>PAUSE TERMINAL</span>          <span>Esc / P</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

