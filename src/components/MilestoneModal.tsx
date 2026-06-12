import { MILESTONES } from '../data/objectives';
import styles from './MilestoneModal.module.css';

interface Props {
  milestoneId: string;
  onClose: () => void;
}

export function MilestoneModal({ milestoneId, onClose }: Props) {
  const milestone = MILESTONES[milestoneId as keyof typeof MILESTONES];
  if (!milestone) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.icon}>{milestone.icon}</div>
        <h2 className={styles.title}>{milestone.title}</h2>
        <p className={styles.message}>{milestone.message}</p>
        <button className={styles.button} onClick={onClose}>Continue</button>
      </div>
    </div>
  );
}
