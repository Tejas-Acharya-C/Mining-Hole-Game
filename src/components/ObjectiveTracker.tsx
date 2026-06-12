import React, { useState } from 'react';
import type { GameState } from '../types';
import { getCurrentObjective } from '../systems/ProgressionSystem';
import styles from './ObjectiveTracker.module.css';

interface Props {
  state: GameState;
  isMobile: boolean;
  onOpenHints: () => void;
  onOpenJournal: () => void;
}

export const ObjectiveTracker: React.FC<Props> = ({ state, isMobile, onOpenHints, onOpenJournal }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const objective = getCurrentObjective(state);

  if (!objective) return null;

  let progressPercent = 0;
  if (objective.progress) {
    progressPercent = Math.min(
      100,
      Math.round((objective.progress.current / objective.progress.target) * 100),
    );
  }

  return (
    <div
      className={`${styles.wrapper} ${isMobile ? styles.mobile : styles.desktop}`}
      data-collapsed={!isExpanded}
      data-testid="objective-tracker"
    >
      <div className={styles.chipRow}>
        <button
          type="button"
          className={styles.chip}
          onClick={() => setIsExpanded(prev => !prev)}
          aria-expanded={isExpanded}
          aria-label={`Objective: ${objective.title}`}
        >
          <span className={styles.chipIcon} aria-hidden="true">🎯</span>
          <span className={styles.chipTitle}>{objective.title}</span>
          <span className={styles.chevron} aria-hidden="true">{isExpanded ? '▲' : '▼'}</span>
        </button>

        <button
          type="button"
          className={styles.hintBtn}
          onClick={onOpenHints}
          aria-label="Open hint"
          data-testid="hint-button"
        >
          ❓
        </button>
        <button
          type="button"
          className={styles.journalBtn}
          onClick={onOpenJournal}
          aria-label="Open journal"
          data-testid="journal-button"
        >
          📓
        </button>
      </div>

      {isExpanded && (
        <div className={styles.expandedPanel} data-testid="objective-expanded">
          <p className={styles.description}>{objective.description}</p>

          {objective.progress && (
            <div className={styles.progress}>
              <div className={styles.bar}>
                <div className={styles.fill} style={{ width: `${progressPercent}%` }} />
              </div>
              <span className={styles.percent}>{progressPercent}%</span>
            </div>
          )}

          {objective.subtasks && (
            <ul className={styles.subtasks}>
              {objective.subtasks.map((task, i) => (
                <li key={i}>→ {task}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
