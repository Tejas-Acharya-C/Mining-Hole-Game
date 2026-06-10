import type { AchievementDef } from '../types';
import styles from './AchievementToast.module.css';

interface Props {
  achievementId: string; // kept in props for future analytics, not rendered
  def: AchievementDef | undefined;
}

const CATEGORY_ICONS: Record<string, string> = {
  exploration: '🗺', economy: '💰', collection: '💎',
  speed: '⚡', completion: '✅', secrets: '🔮',
};

export default function AchievementToast({ def }: Omit<Props, 'achievementId'> & { achievementId: string }) {
  if (!def) return null;
  return (
    <div className={styles.toast}>
      <span className={styles.icon}>{CATEGORY_ICONS[def.category] ?? '★'}</span>
      <div className={styles.body}>
        <div className={styles.label}>Achievement Unlocked</div>
        <div className={styles.name}>{def.label}</div>
        <div className={styles.desc}>{def.description}</div>
      </div>
      <div className={styles.points}>+{def.points} pts</div>
    </div>
  );
}
