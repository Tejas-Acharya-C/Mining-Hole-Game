import type { GameState } from '../types';
import { UPGRADE_DEFS } from '../data/upgrades';
import styles from './EndgameModal.module.css';

interface Props {
  state: GameState;
  onSelectEnding: (ending: 'standard' | 'completionist' | 'secret') => void;
  onClose: () => void;
}

export default function EndgameModal({ state, onSelectEnding, onClose }: Props) {
  // Completionist requirements validation
  const allQuestsCompleted = state.quests.every(q => q.status === 'completed' || q.status === 'claimed');
  const allUpgradesMaxed = (Object.keys(UPGRADE_DEFS) as Array<keyof typeof UPGRADE_DEFS>).every(
    uid => state.player.upgrades[uid] >= UPGRADE_DEFS[uid].maxLevel
  );
  // Corrected lore fragment count limit to 12
  const allLoreCollected = state.statistics.loreFragmentsFound >= 12;

  const isCompletionistReady = allQuestsCompleted && allUpgradesMaxed && allLoreCollected;

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <h2 className={styles.title}>🛰 DIRECT DIRECTIVE AT RIFT NEXUS</h2>
        
        <p className={styles.desc}>
          You stand at the threshold of the Reality Fracture. The stabilizer hums with cosmic energy. Your final action will determine the fate of the underground and reality itself.
        </p>

        <div className={styles.optionsGroup}>
          {/* Option 1: Standard Ending */}
          <button
            onClick={() => onSelectEnding('standard')}
            className={`${styles.optionBtn} ${styles.btnStandard}`}
          >
            <div className={styles.optionTitle}>OPTION A: Initiate Geothermal Containment</div>
            <div className={styles.optionDesc}>Channel the core energy to seal the rift, securing the surface but leaving the deep void untouched.</div>
          </button>

          {/* Option 2: Secret Ending */}
          <button
            onClick={() => onSelectEnding('secret')}
            className={`${styles.optionBtn} ${styles.btnSecret}`}
          >
            <div className={styles.optionTitle}>OPTION B: Absorb Void Singularity</div>
            <div className={styles.optionDesc}>Shatter the stabilizer and merge your consciousness with the void core, transcending physical limits.</div>
          </button>

          {/* Option 3: Perfect Ending */}
          <button
            onClick={() => {
              if (isCompletionistReady) onSelectEnding('completionist');
            }}
            disabled={!isCompletionistReady}
            className={`${styles.optionBtn} ${isCompletionistReady ? styles.btnCompletionist : styles.btnDisabled}`}
          >
            <div className={styles.optionTitle}>
              OPTION C: Perfect Resonance Stabilization {!isCompletionistReady && '🔒'}
            </div>
            <div className={styles.optionDesc}>
              Requires: All upgrades maxed, all quests completed, all 12 lore logs translated. Save both core and reality in perfect equilibrium.
            </div>
          </button>
        </div>

        <button onClick={onClose} className={styles.cancelBtn}>
          Cancel and return to digging
        </button>
      </div>
    </div>
  );
}
