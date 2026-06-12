import type { GameState } from '../types';
import { QUEST_DEFS } from '../data/quests';
import styles from './QuestsPanel.module.css';

interface Props { state: GameState; onClose: () => void; }

const STATUS_COLOR = { active: '#60a5fa', completed: '#22c55e', claimed: '#fbbf24', locked: '#334155' };
const STATUS_LABEL = { active: 'Active', completed: 'Complete! Claim', claimed: 'Claimed', locked: '🔒 Locked' };

export default function QuestsPanel({ state, onClose }: Props) {
  const active    = state.quests.filter(q => q.status === 'active');
  const completed = state.quests.filter(q => q.status === 'completed' || q.status === 'claimed');
  const locked    = state.quests.filter(q => q.status === 'locked');

  const renderQuest = (q: typeof state.quests[0]) => {
    const def = QUEST_DEFS[q.id];
    if (!def) return null;
    const color = STATUS_COLOR[q.status];

    // Progress calculation
    let progressMax = 1;
    let progressCur = q.progress;
    const obj = def.objective;
    if (obj.type === 'dig')   progressMax = obj.count;
    if (obj.type === 'sell')  progressMax = obj.totalValue;
    if (obj.type === 'collect') progressMax = obj.count;
    if (obj.type === 'depth') progressMax = obj.depth;
    if (obj.type === 'buy_upgrades') progressMax = obj.count;
    if (obj.type === 'find_biome') { progressMax = 1; progressCur = q.progress; }
    if (obj.type === 'sell_item') progressMax = obj.count;
    if (obj.type === 'max_battery') progressMax = obj.count;
    if (obj.type === 'collect_all_gems') progressMax = 3;
    const pct = Math.min(1, progressCur / progressMax);

    return (
      <div key={q.id} className={`${styles.card} ${q.status === 'locked' ? styles.locked : ''}`}>
        <div className={styles.cardTop}>
          <span className={styles.questTitle}>{def.title}</span>
          <span className={styles.statusBadge} style={{ color, borderColor: color + '44' }}>
            {STATUS_LABEL[q.status]}
          </span>
        </div>
        <p className={styles.questDesc}>{def.description}</p>
        {q.status === 'active' && (
          <div className={styles.progress}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${pct * 100}%` }} />
            </div>
            <span className={styles.progressText}>
              {Math.min(progressCur, progressMax).toLocaleString()} / {progressMax.toLocaleString()}
            </span>
          </div>
        )}
        <div className={styles.reward}>
          {def.reward.money && <span className={styles.rewardMoney}>💰 ${def.reward.money}</span>}
          {def.reward.permanentBonus && (
            <span className={styles.rewardBonus}>
              {def.reward.permanentBonus.type === 'sell_multiplier' && `+${Math.round(def.reward.permanentBonus.value * 100)}% sell price`}
              {def.reward.permanentBonus.type === 'energy_regen'    && `+${def.reward.permanentBonus.value} energy/s`}
              {def.reward.permanentBonus.type === 'dig_efficiency'  && `+${Math.round(def.reward.permanentBonus.value * 100)}% dig eff`}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <h2 className={styles.title}>📋 Quests</h2>
          <div className={styles.headerStats}>
            <span>{state.statistics.questsCompleted} completed</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.list}>
          {active.length > 0 && (
            <section>
              <h3 className={styles.sectionTitle}>Active ({active.length})</h3>
              {active.map(renderQuest)}
            </section>
          )}
          {completed.length > 0 && (
            <section>
              <h3 className={styles.sectionTitle}>Completed ({completed.length})</h3>
              {completed.map(renderQuest)}
            </section>
          )}
          {locked.length > 0 && (
            <section>
              <h3 className={styles.sectionTitle}>Locked ({locked.length})</h3>
              {locked.slice(0, 4).map(renderQuest)}
              {locked.length > 4 && (
                <p className={styles.moreHint}>+{locked.length - 4} more quests unlock as you progress…</p>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
