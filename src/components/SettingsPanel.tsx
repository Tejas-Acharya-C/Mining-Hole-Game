import type { Settings } from '../types';
import styles from './SettingsPanel.module.css';

interface Props {
  settings: Settings;
  onChange: (key: keyof Settings, value: Settings[keyof Settings]) => void;
  onClose: () => void;
}

export default function SettingsPanel({ settings, onChange, onClose }: Props) {
  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <h2 className={styles.title}>⚙ System Settings</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.rows}>
          <h3 className={styles.sectionHeader}>AUDIO & CONTROLS</h3>
          
          <Row label="Sound FX">
            <Toggle on={settings.soundEnabled} onClick={() => onChange('soundEnabled', !settings.soundEnabled)} />
          </Row>
          <Row label="Music">
            <Toggle on={settings.musicEnabled} onClick={() => onChange('musicEnabled', !settings.musicEnabled)} />
          </Row>
          <Row label="SFX Volume">
            <input type="range" min="0" max="1" step="0.05" value={settings.volume}
              className={styles.slider} onChange={e => onChange('volume', +e.target.value)} />
            <span className={styles.sliderVal}>{Math.round(settings.volume * 100)}%</span>
          </Row>
          <Row label="Music Volume">
            <input type="range" min="0" max="1" step="0.05" value={settings.musicVolume}
              className={styles.slider} onChange={e => onChange('musicVolume', +e.target.value)} />
            <span className={styles.sliderVal}>{Math.round(settings.musicVolume * 100)}%</span>
          </Row>
          <Row label="Touch Screen Controls">
            <Toggle on={settings.touchControls} onClick={() => onChange('touchControls', !settings.touchControls)} />
          </Row>

          <h3 className={styles.sectionHeader} style={{ marginTop: '16px' }}>GRAPHICS & SIMULATION</h3>

          <Row label="Screen Shake">
            <Toggle on={settings.screenShake} onClick={() => onChange('screenShake', !settings.screenShake)} />
          </Row>
          <Row label="Particle Density">
            <select
              className={styles.select}
              value={settings.particleQuality}
              onChange={e => onChange('particleQuality', e.target.value as 'low' | 'medium' | 'high')}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </Row>
          <Row label="Show FPS Counter">
            <Toggle on={settings.showFPS} onClick={() => onChange('showFPS', !settings.showFPS)} />
          </Row>
          <Row label="Auto-sell metals on surface">
            <Toggle on={settings.autoSell} onClick={() => onChange('autoSell', !settings.autoSell)} />
          </Row>
          <Row label="Show Navigation Tutorials">
            <Toggle on={settings.showTutorial} onClick={() => onChange('showTutorial', !settings.showTutorial)} />
          </Row>

          <h3 className={styles.sectionHeader} style={{ marginTop: '16px' }}>ACCESSIBILITY</h3>

          <Row label="Interface Sizing">
            <select
              className={styles.select}
              value={settings.uiScale}
              onChange={e => onChange('uiScale', e.target.value as any)}
            >
              <option value="small">Small</option>
              <option value="normal">Normal</option>
              <option value="large">Large</option>
              <option value="xlarge">Extra Large</option>
            </select>
          </Row>
          <Row label="Large Typography Mode">
            <Toggle on={settings.largerText || false} onClick={() => onChange('largerText', !settings.largerText)} />
          </Row>
          <Row label="Reduced Screen Motion">
            <Toggle on={settings.reducedMotion || false} onClick={() => onChange('reducedMotion', !settings.reducedMotion)} />
          </Row>
        </div>

        <button className={styles.doneBtn} onClick={onClose}>APPLY CONFIGURATION</button>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <div className={styles.rowRight}>{children}</div>
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      className={`${styles.toggle} ${on ? styles.toggleOn : ''}`}
      onClick={onClick}
    >
      {on ? 'ON' : 'OFF'}
    </button>
  );
}

