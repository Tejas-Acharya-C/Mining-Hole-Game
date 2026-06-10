import { useState } from 'react';
import type { GameMode } from '../types';
import styles from './TitleScreen.module.css';

interface Props {
  hasSave: boolean;
  onNewGame: () => void;
  onContinue: () => void;
  onChallenge: (mode: GameMode) => void;
}

export default function TitleScreen({ hasSave, onNewGame, onContinue, onChallenge }: Props) {
  const [showModes, setShowModes] = useState(false);
  const [showControls, setShowControls] = useState(false);

  const MODES: { id: GameMode; label: string; desc: string; color: string }[] = [
    { id: 'hard',                label: '💀 Hard Mode',         desc: 'Slower energy regen, no mercy.', color: '#ef4444' },
    { id: 'no_battery',          label: '🔋 Dead Battery',       desc: 'Energy barely regenerates.',     color: '#f59e0b' },
    { id: 'no_shop',             label: '🚫 No Shop',            desc: 'No upgrades allowed.',           color: '#8b5cf6' },
    { id: 'randomized_economy',  label: '🎲 Chaos Market',       desc: 'Item prices fluctuate wildly.',  color: '#06b6d4' },
    { id: 'double_treasure',     label: '💎 Double Treasure',    desc: 'Ores worth 2×, but rarer.',      color: '#22c55e' },
  ];

  return (
    <div className={styles.root}>
      <div className={styles.stars} aria-hidden />

      <div className={styles.panel}>
        <div className={styles.logo}>
          {'DEEP DIG'.split('').map((ch, i) => (
            <span key={i} className={styles.logoChar} style={{ '--i': i } as React.CSSProperties}>
              {ch === ' ' ? '\u00A0' : ch}
            </span>
          ))}
        </div>
        <p className={styles.tagline}>Dig down. Sell high. Find the secret.</p>

        <div className={styles.buttons}>
          {hasSave && (
            <button className={styles.btnPrimary} onClick={onContinue}>▶ Continue</button>
          )}
          <button className={hasSave ? styles.btnSecondary : styles.btnPrimary} onClick={onNewGame}>
            {hasSave ? '⟳ New Game' : '▶ Start Digging'}
          </button>
          <button className={styles.btnSecondary} onClick={() => setShowModes(v => !v)}>
            ⚡ {showModes ? 'Hide Modes' : 'Challenge Modes'}
          </button>
        </div>

        {showModes && (
          <div className={styles.modeGrid}>
            {MODES.map(m => (
              <button
                key={m.id}
                className={styles.modeCard}
                style={{ borderColor: m.color + '44' }}
                onClick={() => onChallenge(m.id)}
              >
                <span className={styles.modeLabel} style={{ color: m.color }}>{m.label}</span>
                <span className={styles.modeDesc}>{m.desc}</span>
              </button>
            ))}
          </div>
        )}

        <button className={styles.toggleBtn} onClick={() => setShowControls(v => !v)}>
          {showControls ? '▲ Hide Controls' : '▼ Controls'}
        </button>

        {showControls && (
          <div className={styles.controls}>
            <div className={styles.ctrlGrid}>
              <span>Move</span>        <span>Arrow Keys / WASD</span>
              <span>Dig</span>         <span>Z / Space or click tile</span>
              <span>Sell</span>        <span>E at surface</span>
              <span>Shop</span>        <span>B at surface</span>
              <span>Inventory</span>   <span>I</span>
              <span>Quests</span>      <span>Q</span>
              <span>Teleport</span>    <span>T (if charged)</span>
              <span>Pause</span>       <span>Esc / P</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
