import { isTouchCapable } from '../utils/device';
import styles from './PauseMenu.module.css';

type PauseAction = 'resume' | 'save' | 'quit' | 'settings' | 'inventory' | 'statistics' | 'quests';

interface Props {
  onAction: (a: PauseAction) => void;
  onSell: () => void;
  hasInventory: boolean;
  atSurface: boolean;
}

export default function PauseMenu({ onAction, onSell, hasInventory, atSurface }: Props) {
  const isMobile = isTouchCapable();

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <h2 className={styles.title}>⏸ Paused</h2>
        <div className={styles.buttons}>
          <button className={styles.btn} onClick={() => onAction('resume')}>▶ Resume</button>
          <button className={styles.btn} onClick={() => onAction('inventory')}>
            🎒 Inventory {hasInventory ? '·' : ''}
          </button>
          <button className={styles.btn} onClick={() => onAction('quests')}>📋 Quests</button>
          <button className={styles.btn} onClick={() => onAction('statistics')}>📊 Statistics</button>
          <button className={styles.btn} onClick={() => onAction('settings')}>⚙ Settings</button>
          {atSurface && hasInventory && (
            <button className={`${styles.btn} ${styles.sellBtn}`} onClick={() => { onSell(); onAction('resume'); }}>
              💰 Sell All
            </button>
          )}
          <button className={styles.btn} onClick={() => onAction('save')}>💾 Save</button>
          <button className={`${styles.btn} ${styles.danger}`} onClick={() => onAction('quit')}>✕ Save & Quit</button>
        </div>
        <p className={styles.hint}>
          {isMobile ? 'Tap Resume or the top pause button to continue.' : 'Esc / P to resume'}
        </p>
      </div>
    </div>
  );
}
