import type { GameState } from '../types';
import styles from './GameAlerts.module.css';

interface Props {
  state: GameState;
}

export default function GameAlerts({ state }: Props) {
  const { discoveryAlert, questAlert, depthAlert } = state;

  return (
    <div className={styles.container}>
      {/* Discovery Alert (Top-Center) */}
      {discoveryAlert && (
        <div 
          className={styles.discoveryAlert}
          style={{ 
            '--alert-color': discoveryAlert.color,
            borderColor: discoveryAlert.color,
            boxShadow: `0 8px 32px rgba(0,0,0,0.65), 0 0 20px ${discoveryAlert.color}33`
          } as React.CSSProperties}
        >
          <div className={styles.glowPulse} style={{ background: discoveryAlert.color }} />
          <div className={styles.alertHeader}>
            <span className={styles.alertIcon} style={{ textShadow: `0 0 10px ${discoveryAlert.color}` }}>✨</span>
            <span className={styles.alertTitle} style={{ color: discoveryAlert.color }}>{discoveryAlert.title}</span>
          </div>
          <div className={styles.alertSubtitle}>{discoveryAlert.subtitle}</div>
        </div>
      )}

      {/* Quest Complete Alert (Top-Right) */}
      {questAlert && (
        <div className={styles.questAlert}>
          <div className={styles.questHeader}>
            <span className={styles.questIcon}>🏆</span>
            <span className={styles.questTitle}>QUEST COMPLETE</span>
          </div>
          <div className={styles.questName}>{questAlert.title}</div>
          <div className={styles.questReward}>REWARD: {questAlert.reward}</div>
        </div>
      )}

      {/* Depth Record Alert (Center-Left / Mid-Low) */}
      {depthAlert && (
        <div className={styles.depthAlert}>
          <div className={styles.depthHeader}>📏 DEPTH RECORD REACHED!</div>
          <div className={styles.depthValue}>{depthAlert.depth}m</div>
          <div className={styles.depthSub}>Descent telemetry verified</div>
        </div>
      )}
    </div>
  );
}
