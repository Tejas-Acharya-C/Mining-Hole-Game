import type { GameState } from '../types';
import { ACHIEVEMENT_DEFS } from '../data/achievements';
import styles from './WinScreen.module.css';

interface Props {
  state: GameState;
  onPlayAgain: () => void;
  onChallenge: () => void;
}

export default function WinScreen({ state, onPlayAgain, onChallenge }: Props) {
  const { player, achievements, playTime, statistics } = state;
  const mins = Math.floor(playTime / 60);
  const secs = Math.floor(playTime % 60);
  const unlocked = achievements.filter(a => a.unlocked).length;
  const total    = achievements.length;
  const points   = achievements
    .filter(a => a.unlocked)
    .reduce((sum, a) => sum + (ACHIEVEMENT_DEFS[a.id]?.points ?? 0), 0);

  return (
    <div className={styles.root}>
      <div className={styles.panel}>
        <div className={styles.glow} aria-hidden />
        <div className={styles.trophy}>🏆</div>
        <h1 className={styles.title}>You Found It.</h1>
        <p className={styles.subtitle}>
          Deep beneath everything, something ancient was waiting.<br/>
          You dug all the way down to discover it.
        </p>

        <div className={styles.stats}>
          {[
            { label: 'Max Depth', val: `${player.deepestDepth}m` },
            { label: 'Blocks Dug', val: statistics.blocksDug.toLocaleString() },
            { label: 'Money Earned', val: `$${statistics.moneyEarned.toLocaleString()}` },
            { label: 'Play Time', val: `${mins}:${String(secs).padStart(2,'0')}` },
            { label: 'Achievements', val: `${unlocked}/${total}` },
            { label: 'Score', val: `${points} pts` },
          ].map(s => (
            <div key={s.label} className={styles.statCard}>
              <span className={styles.statVal}>{s.val}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>

        <div className={styles.achSection}>
          <h3 className={styles.achTitle}>Achievements Unlocked</h3>
          <div className={styles.achGrid}>
            {achievements.map(ach => {
              const def = ACHIEVEMENT_DEFS[ach.id];
              if (!def || (def.hidden && !ach.unlocked)) return null;
              return (
                <div
                  key={ach.id}
                  className={`${styles.achItem} ${ach.unlocked ? styles.achOn : styles.achOff}`}
                  title={def.description}
                >
                  {ach.unlocked ? '★' : '☆'} {def.label}
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.buttons}>
          <button className={styles.btnAgain} onClick={onPlayAgain}>↺ New Game</button>
          <button className={styles.btnChallenge} onClick={onChallenge}>💀 Hard Mode</button>
        </div>
      </div>
    </div>
  );
}
