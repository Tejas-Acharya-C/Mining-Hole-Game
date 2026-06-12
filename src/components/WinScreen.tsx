import { useEffect, useRef } from 'react';
import type { GameState } from '../types';
import { ACHIEVEMENT_DEFS } from '../data/achievements';
import styles from './WinScreen.module.css';

interface Props {
  state: GameState;
  onPlayAgain: () => void;
  onChallenge: () => void;
  onPrestige: () => void;
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

export default function WinScreen({ state, onPlayAgain, onChallenge, onPrestige }: Props) {
  const { player, achievements, statistics } = state;
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

  if (state.unlockedEnding === 'standard') {
    title = "Ending: Geothermal Containment";
    narrativeLines = [
      'You successfully routed core energies through the containment grid.',
      'The reality rift stabilizes, and the deep shaking halts.',
      'The surface remains safe, but the secrets of the void remain dormant.',
      'A job well done, but the deep questions remain unanswered...',
    ];
  } else if (state.unlockedEnding === 'completionist') {
    title = "Perfect Ending: Cosmic Equilibrium";
    narrativeLines = [
      'With all containment logs decoded and tools fully optimized, you achieve perfect resonance.',
      'The rift and core merge in clean, perpetual equilibrium.',
      'You have mastered the deep, solved the mystery, and saved the world.',
      'You are a legendary miner of cosmic renown.',
    ];
  } else if (state.unlockedEnding === 'secret') {
    title = "Secret Ending: Core Ascendant";
    narrativeLines = [
      'You chose to ignore protocols and absorb the rift\'s power directly.',
      'Your physical body dissolves into glowing energy and nanites.',
      'You transcend your humanity, becoming one with the world core.',
      'You are no longer a miner. You are the deep core itself.',
    ];
  }

  return (
    <div className={styles.root}>
      <div className={styles.panel}>
        <div className={styles.glow} aria-hidden />

        <ArtifactCanvas />

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

        <div className={styles.statsGrid}>
          {[
            { label: 'Depth Reached',   val: `${player.deepestDepth}m` },
            { label: 'Blocks Dug',      val: statistics.blocksDug.toLocaleString() },
            { label: 'Money Earned',    val: `$${statistics.moneyEarned.toLocaleString()}` },
            { label: 'Events Found',    val: statistics.eventsTriggered.toLocaleString() },
            { label: 'Lore Collected',  val: `${statistics.loreFragmentsFound}/12` },
            { label: 'Score',           val: `${points} pts` },
          ].map(s => (
            <div key={s.label} className={styles.statCard}>
              <span className={styles.statVal}>{s.val}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>

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

        <div className={styles.buttons} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', width: '100%' }}>
            <button className={styles.btnAgain} onClick={onPlayAgain}>↺ New Game</button>
            <button className={styles.btnChallenge} onClick={onChallenge}>💀 Hard Mode</button>
          </div>
          <button
            onClick={onPrestige}
            style={{
              backgroundColor: '#fbbf24',
              color: '#0f172a',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(251, 191, 36, 0.35)',
              transition: 'all 0.2s ease',
              width: '100%',
              maxWidth: '340px',
              alignSelf: 'center',
            }}
          >
            👑 Prestige & Restart (+50% Income Multiplier)
          </button>
        </div>
      </div>
    </div>
  );
}
