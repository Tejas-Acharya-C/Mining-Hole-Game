import type { GameState } from '../types';
import { BIOME_DEFS } from '../data/biomes';
import { getStoryChecklist } from '../systems/ProgressionSystem';
import styles from './JournalPanel.module.css';

interface Props {
  state: GameState;
  onClose: () => void;
}

export function JournalPanel({ state, onClose }: Props) {
  const recentEntries = [...(state.journalEntries ?? [])].slice(-20).reverse();
  const discoveredBiomes = [...state.statistics.biomesDiscovered]
    .filter(id => BIOME_DEFS[id])
    .map(id => BIOME_DEFS[id].label);
  const structures = [
    state.artifactActivated ? 'Ancient Terminal Activated' : null,
    state.statistics.biomesDiscovered.has('ancient_facility') ? 'Ancient Facility' : null,
    state.statistics.biomesDiscovered.has('world_core') ? 'World Core' : null,
    state.statistics.biomesDiscovered.has('reality_fracture') ? 'Reality Fracture' : null,
  ].filter(Boolean) as string[];
  const lore = Array.from({ length: state.statistics.loreFragmentsFound }, (_, i) => `Lore Fragment ${i + 1}`);

  return (
    <div
      className={styles.overlay}
      data-testid="journal-panel"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={styles.panel}
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Field journal"
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Field Journal</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close journal">Close</button>
        </div>

        <section className={styles.section}>
          <h3>Main Story</h3>
          <ul className={styles.storyList}>
            {getStoryChecklist(state).map(item => (
              <li key={item.label}>{item.completed ? '✓' : '□'} {item.label}</li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <h3>Discoveries</h3>
          <div className={styles.discoveryBlock}>
            <strong>Biomes</strong>
            <ul>{discoveredBiomes.map(name => <li key={name}>{name}</li>)}</ul>
          </div>
          <div className={styles.discoveryBlock}>
            <strong>Structures</strong>
            <ul>{structures.length ? structures.map(name => <li key={name}>{name}</li>) : <li>No major structures recorded yet</li>}</ul>
          </div>
          <div className={styles.discoveryBlock}>
            <strong>Lore Fragments</strong>
            <ul>{lore.length ? lore.map(name => <li key={name}>{name}</li>) : <li>No lore fragments recovered yet</li>}</ul>
          </div>
        </section>

        <section className={styles.section}>
          <h3>Recent Events</h3>
          <ul className={styles.eventsList}>
            {recentEntries.length ? recentEntries.map((entry, index) => (
              <li key={`${entry.date}-${index}`}>{entry.title}</li>
            )) : <li>No journal entries yet</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
