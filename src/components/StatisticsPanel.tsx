import type { GameState } from '../types';
import { ITEM_DEFS } from '../data/items';
import { BIOME_DEFS } from '../data/biomes';
import { ACHIEVEMENT_DEFS } from '../data/achievements';
import styles from './StatisticsPanel.module.css';

interface Props { state: GameState; onClose: () => void; }

export default function StatisticsPanel({ state, onClose }: Props) {
  const { statistics, achievements } = state;
  const totalPts = achievements
    .filter(a => a.unlocked)
    .reduce((s, a) => {
      const def = ACHIEVEMENT_DEFS[a.id];
      return s + (def?.points ?? 0);
    }, 0);
  const playH = Math.floor(statistics.playTimeSeconds / 3600);
  const playM = Math.floor((statistics.playTimeSeconds % 3600) / 60);
  const playS = Math.floor(statistics.playTimeSeconds % 60);

  const topItems = Object.entries(statistics.itemsCollected)
    .sort(([,a],[,b]) => b - a)
    .slice(0, 8);

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <h2 className={styles.title}>📊 Statistics</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.content}>
          {/* Mining */}
          <Section title="Mining">
            <Stat label="Blocks Dug"        val={statistics.blocksDug.toLocaleString()} />
            <Stat label="Max Depth"         val={`${statistics.distanceReached}m`} />
            <Stat label="Critical Hits"     val={statistics.criticalHits.toLocaleString()} />
            <Stat label="Total Damage"      val={statistics.totalDamageDealt.toLocaleString()} />
            <Stat label="Treasures Found"   val={statistics.treasuresFound.toLocaleString()} />
            <Stat label="Artifacts"         val={statistics.artifactsCollected.toLocaleString()} />
            <Stat label="Events Triggered"  val={statistics.eventsTriggered.toLocaleString()} />
            <Stat label="Lore Collected"    val={`${statistics.loreFragmentsFound}/8`} />
          </Section>

          {/* Economy */}
          <Section title="Economy">
            <Stat label="Money Earned"  val={`$${statistics.moneyEarned.toLocaleString()}`} />
            <Stat label="Money Spent"   val={`$${statistics.moneySpent.toLocaleString()}`} />
            <Stat label="Sell Count"    val={statistics.sellCount.toLocaleString()} />
            <Stat label="Sell Total"    val={`$${statistics.sellTotalValue.toLocaleString()}`} />
            <Stat label="Upgrades"      val={statistics.upgradesPurchased.toLocaleString()} />
            <Stat label="Quests Done"   val={statistics.questsCompleted.toLocaleString()} />
          </Section>

          {/* Time */}
          <Section title="Time">
            <Stat label="Play Time" val={`${playH}h ${playM}m ${playS}s`} />
            <Stat label="Rare Items Found" val={statistics.rareItemsFound.toLocaleString()} />
          </Section>

          {/* Biomes */}
          <Section title="Biomes Discovered">
            <div className={styles.biomeList}>
              {[...statistics.biomesDiscovered].map(id => (
                <span key={id} className={styles.biomeBadge}
                  style={{ borderColor: BIOME_DEFS[id]?.ambientColor + '88' }}>
                  {BIOME_DEFS[id]?.label ?? id}
                </span>
              ))}
            </div>
          </Section>

          {/* Top Items */}
          {topItems.length > 0 && (
            <Section title="Top Collected Items">
              <div className={styles.itemGrid}>
                {topItems.map(([id, qty]) => {
                  const def = ITEM_DEFS[id as keyof typeof ITEM_DEFS];
                  if (!def) return null;
                  return (
                    <div key={id} className={styles.itemRow}>
                      <div className={styles.itemDot} style={{ background: def.color }} />
                      <span className={styles.itemName}>{def.label}</span>
                      <span className={styles.itemQty}>×{qty}</span>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Achievements score */}
          <Section title="Achievements">
            <Stat label="Unlocked" val={`${achievements.filter(a => a.unlocked).length} / ${achievements.length}`} />
            <Stat label="Total Points" val={`${totalPts}`} />
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h3 style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', color: '#475569', marginBottom: 8 }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Stat({ label, val }: { label: string; val: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0',
      borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13 }}>
      <span style={{ color: '#64748b' }}>{label}</span>
      <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{val}</span>
    </div>
  );
}
