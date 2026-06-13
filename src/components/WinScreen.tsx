import { useEffect, useRef, useState } from 'react';
import type { GameState, ItemId } from '../types';
import { ACHIEVEMENT_DEFS } from '../data/achievements';
import styles from './WinScreen.module.css';

interface Props {
  state: GameState;
  onPrestige: () => void;
  onReturnToMenu: () => void;
}


// Animated canvas background for win screen
function ArtifactCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let frame = 0;
    let raf = 0;
    const draw = () => {
      frame++;
      const w = canvas.width; const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      // Pulsing rings
      const cx = w / 2; const cy = h * 0.28;
      for (let i = 0; i < 5; i++) {
        const phase = (frame * 0.012 + i * 0.4) % 1;
        const r = 30 + phase * 80;
        const alpha = (1 - phase) * 0.25;
        ctx.strokeStyle = `rgba(200,150,255,${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Floating particles
      for (let i = 0; i < 20; i++) {
        const t = (frame * 0.008 + i * 0.31) % 1;
        const angle = i * 2.399 + frame * 0.01;
        const dist = 20 + Math.sin(frame * 0.03 + i) * 15;
        const x = cx + Math.cos(angle) * dist * (1 + t * 2);
        const y = cy - t * 60 + Math.sin(frame * 0.05 + i * 0.7) * 5;
        const alpha = (1 - t) * 0.6;
        ctx.fillStyle = `rgba(220,180,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} width={400} height={120} className={styles.artifactCanvas} />;
}

export default function WinScreen({ state, onPrestige, onReturnToMenu }: Props) {
  const { player, achievements, statistics } = state;
  const [showEndings, setShowEndings] = useState(false);
  const [showPrestigeConfirm, setShowPrestigeConfirm] = useState(false);

  const mins = Math.floor(state.playTime / 60);
  const secs = Math.floor(state.playTime % 60);
  const unlocked = achievements.filter(a => a.unlocked).length;
  const total    = achievements.length;
  const points   = achievements
    .filter(a => a.unlocked)
    .reduce((sum, a) => sum + (ACHIEVEMENT_DEFS[a.id]?.points ?? 0), 0);

  const grade =
    state.playTime < 600  ? 'S' :
    state.playTime < 1200 ? 'A' :
    state.playTime < 2400 ? 'B' : 'C';

  const gradeColor =
    grade === 'S' ? '#ffd700' :
    grade === 'A' ? '#22c55e' :
    grade === 'B' ? '#60a5fa' : '#94a3b8';

  let title = "The Answer";
  let narrativeLines = [
    'At the bottom of everything, you found it.',
    'Not treasure. Not wealth.',
    'A question, cast in metal that does not rust:',
    '"Why did you dig so deep?"',
  ];

  let earnedRewardName = "None";

  if (state.unlockedEnding === 'standard') {
    title = "Ending: Geothermal Containment";
    narrativeLines = [
      'You successfully routed core energies through the containment grid.',
      'The reality rift stabilizes, and the deep shaking halts.',
      'The surface remains safe, but the secrets of the void remain dormant.',
      'A job well done, but the deep questions remain unanswered...',
    ];
    earnedRewardName = "+5% Ore Sale Value (Restoration)";
  } else if (state.unlockedEnding === 'completionist') {
    title = "Perfect Ending: Cosmic Equilibrium";
    narrativeLines = [
      'With all containment logs decoded and tools fully optimized, you achieve perfect resonance.',
      'The rift and core merge in clean, perpetual equilibrium.',
      'You have mastered the deep, solved the mystery, and saved the world.',
      'You are a legendary miner of cosmic renown.',
    ];
    earnedRewardName = "+1 Cargo Slot (Voidbound)";
  } else if (state.unlockedEnding === 'secret') {
    title = "Secret Ending: Core Ascendant";
    narrativeLines = [
      'You chose to ignore protocols and absorb the rift\'s power directly.',
      'Your physical body dissolves into glowing energy and nanites.',
      'You transcend your humanity, becoming one with the world core.',
      'You are no longer a miner. You are the deep core itself.',
    ];
    earnedRewardName = "+10 Max Energy (Ascension)";
  }

  const oreIds: ItemId[] = [
    'coal', 'iron', 'silver', 'gold', 'ruby', 'sapphire', 'emerald',
    'crystal', 'fossil', 'relic', 'obsidian_shard', 'ice_core', 'magma_gem',
    'void_crystal', 'ancient_coin'
  ];
  const totalOresSold = oreIds.reduce((sum, id) => sum + (statistics.itemsCollected[id] ?? 0), 0);

  const statsCards = [
    { label: 'Depth Reached',   val: `${player.deepestDepth}m` },
    { label: 'Blocks Dug',      val: statistics.blocksDug.toLocaleString() },
    { label: 'Ore Sold',         val: totalOresSold.toLocaleString() },
    { label: 'Money Earned',    val: `$${statistics.moneyEarned.toLocaleString()}` },
    { label: 'Quests Completed', val: statistics.questsCompleted.toString() },
    { label: 'Score',           val: `${points} pts` },
  ];

  const completed = state.prestigeData?.completedEndings ?? [];
  const isEndingCompleted = (id: 'standard' | 'completionist' | 'secret') => {
    return completed.includes(id) || state.unlockedEnding === id;
  };

  return (
    <div className={styles.root}>
      <div className={styles.panel}>
        <div className={styles.glow} aria-hidden />

        <ArtifactCanvas />

        <div className={styles.expeditionBadge}>Expedition Complete</div>

        <div className={styles.gradeRow}>
          <span className={styles.grade} style={{ color: gradeColor }}>{grade}</span>
          <div className={styles.gradeInfo}>
            <span className={styles.gradeLabel}>Completion Grade</span>
            <span className={styles.gradeTime}>{mins}:{String(secs).padStart(2,'0')} play time</span>
          </div>
        </div>

        <h1 className={styles.title}>{title}</h1>

        <div className={styles.narrative}>
          {narrativeLines.map((line, i) => (
            <p key={i} className={styles.narrativeLine}
              style={{ animationDelay: `${i * 0.45}s` }}>
              {line}
            </p>
          ))}
        </div>

        <div style={{
          backgroundColor: 'rgba(251, 191, 36, 0.12)',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          borderRadius: '8px',
          padding: '10px',
          margin: '15px 0',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#fbbf24', fontWeight: 'bold' }}>
            Permanent Reward Earned
          </div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff', marginTop: '2px' }}>
            {earnedRewardName}
          </div>
        </div>

        <div className={styles.statsGrid}>
          {statsCards.map(s => (
            <div key={s.label} className={styles.statCard}>
              <span className={styles.statVal}>{s.val}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>

        {showEndings && (
          <div style={{
            marginTop: '15px',
            padding: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            textAlign: 'left',
          }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#fbbf24', textAlign: 'center' }}>Endings Discovery Checklist</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { id: 'standard', title: 'Restoration: Geothermal Containment', desc: 'Route core energies (+5% Ore Value, max +25%)' },
                { id: 'secret', title: 'Ascension: Core Ascendant', desc: 'Absorb the rift\'s power directly (+10 Max Energy, max +50)' },
                { id: 'completionist', title: 'Voidbound: Cosmic Equilibrium', desc: 'Clean, perpetual rift resonance (+1 Cargo Slot, max +5)' },
              ].map(endingDef => {
                const done = isEndingCompleted(endingDef.id as any);
                return (
                  <div key={endingDef.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: done ? 1 : 0.5 }}>
                    <span style={{ fontSize: '16px', color: done ? '#22c55e' : '#6b7280' }}>
                      {done ? '✅' : '🔒'}
                    </span>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
                        {endingDef.title}
                      </div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>{endingDef.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className={styles.achSection}>
          <h3 className={styles.achTitle}>Achievements — {unlocked}/{total}</h3>
          <div className={styles.achGrid}>
            {achievements.map(ach => {
              const def = ACHIEVEMENT_DEFS[ach.id];
              if (!def || (def.hidden && !ach.unlocked)) return null;
              return (
                <div key={ach.id}
                  className={`${styles.achItem} ${ach.unlocked ? styles.achOn : styles.achOff}`}
                  title={def.description}>
                  {ach.unlocked ? '★' : '☆'} {def.label}
                </div>
              );
            })}
          </div>
        </div>

        {state.challengeModeUnlocked && (
          <div className={styles.unlockedBanner}>
            🔓 Challenge Modes Unlocked — New Game to try them
          </div>
        )}

        <div className={styles.buttons} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px', width: '100%', alignItems: 'center' }}>
          <button
            onClick={() => setShowPrestigeConfirm(true)}
            style={{
              backgroundColor: '#fbbf24',
              color: '#0f172a',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 20px',
              fontSize: '15px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(251, 191, 36, 0.35)',
              transition: 'all 0.2s ease',
              width: '100%',
              maxWidth: '340px',
            }}
          >
            👑 Start New Expedition
          </button>

          <div style={{
            fontSize: '11px',
            color: '#94a3b8',
            textAlign: 'center',
            maxWidth: '340px',
            lineHeight: '1.45',
            marginTop: '-4px',
            marginBottom: '4px'
          }}>
            <strong>Start New Expedition:</strong> Begin a fresh run while keeping permanent bonuses earned from completed endings.
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', width: '100%', maxWidth: '340px' }}>
            <button
              onClick={() => setShowEndings(prev => !prev)}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '10px 15px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                flex: 1,
              }}
            >
              🎬 View Other Endings
            </button>
            <button
              onClick={onReturnToMenu}
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '8px',
                padding: '10px 15px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                flex: 1,
              }}
            >
              🚪 Return To Menu
            </button>
          </div>
        </div>
      </div>

      {/* Retro-futuristic Prestige Retrofit Confirmation Modal */}
      {showPrestigeConfirm && (
        <div className={styles.confirmOverlay} onClick={() => setShowPrestigeConfirm(false)}>
          <div className={styles.confirmPanel} onClick={e => e.stopPropagation()}>
            <div className={styles.confirmIcon}>🌌</div>
            <h3 className={styles.confirmTitle}>EXPEDITION RETROFIT PROTOCOL</h3>
            <p className={styles.confirmSubtitle}>Preparing Sector Descent #{ (state.prestigeCount ?? 0) + 1 }</p>
            
            <div className={styles.confirmStats}>
              <div className={styles.confirmStatSection}>
                <div className={styles.confirmSectionTitle}>Completed Endings</div>
                <div className={styles.endingsList}>
                  {['standard', 'completionist', 'secret'].map(e => {
                    const done = state.prestigeData?.completedEndings.includes(e) || state.unlockedEnding === e;
                    const names: Record<string, string> = { standard: 'Containment', completionist: 'Equilibrium', secret: 'Ascendant' };
                    return (
                      <span key={e} className={`${styles.endingBadge} ${done ? styles.endingBadgeDone : ''}`}>
                        {done ? '✦' : '✧'} {names[e] || e}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className={styles.confirmStatSection}>
                <div className={styles.confirmSectionTitle}>Active Retrofit Upgrades</div>
                <div className={styles.bonusStatsList}>
                  <div className={styles.bonusStatItem}>
                    <span>💰 Ore Sale Multiplier</span>
                    <span className={styles.bonusStatVal}>
                      +{Math.round((state.prestigeData?.bonuses?.oreValueBonus ?? 0) * 100)}%
                    </span>
                  </div>
                  <div className={styles.bonusStatItem}>
                    <span>🔋 Max Energy Reserves</span>
                    <span className={styles.bonusStatVal}>
                      +{state.prestigeData?.bonuses?.maxEnergyBonus ?? 0} EN
                    </span>
                  </div>
                  <div className={styles.bonusStatItem}>
                    <span>🎒 Backpack Cargo Space</span>
                    <span className={styles.bonusStatVal}>
                      +{state.prestigeData?.bonuses?.inventoryBonus ?? 0} slots
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.confirmButtons}>
              <button className={styles.confirmCancelBtn} onClick={() => setShowPrestigeConfirm(false)}>
                CANCEL
              </button>
              <button className={styles.confirmOkBtn} onClick={onPrestige}>
                LAUNCH EXPEDITION
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
