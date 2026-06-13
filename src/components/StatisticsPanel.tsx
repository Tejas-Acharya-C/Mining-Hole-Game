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
          <h2 className={styles.title}>📊 Mission Diagnostics</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.content}>
          {/* Prestige & Rebirth */}
          <Section title="Expedition & Rebirth Diagnostics">
            <Stat label="Active Expedition Number" val={String(state.prestigeData?.expeditionCount ?? state.prestigeCount ?? 0)} />
            <Stat label="Discovered Endings"       val={state.prestigeData?.completedEndings?.length ? state.prestigeData.completedEndings.map((e: string) => {
              if (e === 'standard') return 'Restoration';
              if (e === 'secret') return 'Ascension';
              if (e === 'completionist') return 'Voidbound';
              return e;
            }).join(', ') : 'None'} />
            <Stat label="Ore Sale Value Bonus"     val={`+${Math.round((state.prestigeData?.bonuses.oreValueBonus ?? 0) * 100)}%`} />
            <Stat label="Max Energy Bonus"         val={`+${state.prestigeData?.bonuses.maxEnergyBonus ?? 0} energy`} />
            <Stat label="Cargo Slot Bonus"         val={`+${state.prestigeData?.bonuses.inventoryBonus ?? 0} slot(s)`} />
          </Section>

          {/* Mining */}
          <Section title="Subterranean Operations">
            <Stat label="Total Chunks Dug"        val={statistics.blocksDug.toLocaleString()} />
            <Stat label="Maximum Depth Achieved"  val={`${statistics.distanceReached}m`} />
            <Stat label="Critical Impact Strikes" val={statistics.criticalHits.toLocaleString()} />
            <Stat label="Total Kinetic Damage"    val={statistics.totalDamageDealt.toLocaleString()} />
            <Stat label="Supply Chests Recovered" val={statistics.treasuresFound.toLocaleString()} />
            <Stat label="Core Artifacts Secured"  val={statistics.artifactsCollected.toLocaleString()} />
            <Stat label="Hazard Events Tripped"   val={statistics.eventsTriggered.toLocaleString()} />
            <Stat label="Data Logs Decrypted"     val={`${statistics.loreFragmentsFound}/12`} />
          </Section>

          {/* Economy */}
          <Section title="Expedition Economics">
            <Stat label="Gross Revenue Generated" val={`$${statistics.moneyEarned.toLocaleString()}`} />
            <Stat label="Upgrade Capital Spent"   val={`$${statistics.moneySpent.toLocaleString()}`} />
            <Stat label="Depot Transactions"      val={statistics.sellCount.toLocaleString()} />
            <Stat label="Total Material Sales"     val={`$${statistics.sellTotalValue.toLocaleString()}`} />
            <Stat label="Suit Upgrades Applied"   val={statistics.upgradesPurchased.toLocaleString()} />
            <Stat label="Guild Quests Discharged" val={statistics.questsCompleted.toLocaleString()} />
          </Section>

          {/* Time */}
          <Section title="Temporal Log">
            <Stat label="Active Mission Duration" val={`${playH}h ${playM}m ${playS}s`} />
            <Stat label="Ultra-Rare Finds"        val={statistics.rareItemsFound.toLocaleString()} />
          </Section>

          {/* Biomes */}
          <Section title="Discovered Biomes">
            <div className={styles.biomeList}>
              {[...statistics.biomesDiscovered].map(id => (
                <span key={id} className={styles.biomeBadge}
                  style={{ borderColor: BIOME_DEFS[id]?.ambientColor + '88' }}>
                  {(BIOME_DEFS[id]?.label ?? id).toUpperCase()}
                </span>
              ))}
            </div>
          </Section>

          {/* Top Items */}
          {topItems.length > 0 && (
            <Section title="Primary Extracted Materials">
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
          <Section title="Service Medals">
            <Stat label="Expedition Medals Unlocked" val={`${achievements.filter(a => a.unlocked).length} / ${achievements.length}`} />
            <Stat label="Service Record Points"       val={`${totalPts} pts`} />
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Stat({ label, val }: { label: string; val: string }) {
  return (
    <div className={styles.statRow}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statVal}>{val}</span>
    </div>
  );
}

