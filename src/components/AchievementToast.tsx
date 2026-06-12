import type { AchievementDef } from '../types';
import styles from './AchievementToast.module.css';

interface Props {
  achievementId: string;
  def: AchievementDef | undefined;
}

const CATEGORY_ICONS: Record<string, string> = {
  exploration: '🗺', economy: '💰', collection: '💎',
  speed: '⚡', completion: '🏆', secrets: '🔮',
};

const CATEGORY_COLORS: Record<string, string> = {
  exploration: 'var(--color-blue)',
  economy: 'var(--color-green)',
  collection: 'var(--color-cyan)',
  speed: 'var(--color-orange)',
  completion: 'var(--color-gold)',
  secrets: 'var(--color-purple)',
};

export default function AchievementToast({ def }: Omit<Props, 'achievementId'> & { achievementId: string }) {
  if (!def) return null;

  const color = CATEGORY_COLORS[def.category] ?? 'var(--color-gold)';

  return (
    <div 
      className={styles.toast} 
      style={{ borderColor: color, boxShadow: `0 4px 20px ${color}33` }}
    >
      <span className={styles.icon}>{CATEGORY_ICONS[def.category] ?? '★'}</span>
      <div className={styles.body}>
        <div className={styles.label} style={{ color }}>MEDAL DEPLOYED</div>
        <div className={styles.name}>{def.label.toUpperCase()}</div>
        <div className={styles.desc}>{def.description}</div>
      </div>
      <div className={styles.points} style={{ color }}>+{def.points} PTS</div>
    </div>
  );
}

