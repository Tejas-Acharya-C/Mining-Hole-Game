import { getInput } from '../engine/input';
import styles from './TouchControls.module.css';

interface Props {
  onTeleport?: () => void;
}

export default function TouchControls({ onTeleport }: Props) {
  return (
    <div className={styles.root}>
      {/* Right side action buttons */}
      <div className={styles.actionButtons}>
        <button
          className={styles.digBtn}
          onTouchStart={e => {
            e.preventDefault();
            getInput().touchDigPressed = true;
          }}
          onTouchEnd={e => {
            e.preventDefault();
            getInput().touchDigPressed = false;
          }}
          onTouchCancel={e => {
            e.preventDefault();
            getInput().touchDigPressed = false;
          }}
        >
          ⛏
        </button>
        {onTeleport && (
          <button
            className={styles.tpBtn}
            onTouchStart={e => { e.preventDefault(); onTeleport(); }}
          >
            ✨
          </button>
        )}
      </div>
    </div>
  );
}
