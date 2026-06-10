import styles from './TouchControls.module.css';

interface Props {
  onDig: () => void;
  onTeleport?: () => void;
}

export default function TouchControls({ onDig, onTeleport }: Props) {
  return (
    <div className={styles.root}>
      {/* Right side action buttons */}
      <div className={styles.actionButtons}>
        <button
          className={styles.digBtn}
          onTouchStart={e => { e.preventDefault(); onDig(); }}
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
