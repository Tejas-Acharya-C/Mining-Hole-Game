import type { GameState } from '../types';
import { getCurrentHint } from '../systems/ProgressionSystem';
import styles from './HintPanel.module.css';

interface Props {
  state: GameState;
  onClose: () => void;
}

export function HintPanel({ state, onClose }: Props) {
  return (
    <div
      className={styles.overlay}
      data-testid="hint-panel"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={styles.panel}
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Hint"
      >
        <div className={styles.header}>
          <h2 className={styles.title}>❓ Hint</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close hint panel">Close</button>
        </div>
        <p className={styles.hint}>{getCurrentHint(state)}</p>
        <p className={styles.note}>Hints are based on your current objective, progress, discoveries, and key items.</p>
      </div>
    </div>
  );
}
