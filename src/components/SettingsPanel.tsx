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
          <h2 className={styles.title}>⚙ Settings</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.rows}>
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
          <Row label="Screen Shake">
            <Toggle on={settings.screenShake} onClick={() => onChange('screenShake', !settings.screenShake)} />
          </Row>
          <Row label="Particles">
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
          <Row label="Tutorial hints">
            <Toggle on={settings.showTutorial} onClick={() => onChange('showTutorial', !settings.showTutorial)} />
          </Row>
          <Row label="Auto-sell on surface">
            <Toggle on={settings.autoSell} onClick={() => onChange('autoSell', !settings.autoSell)} />
          </Row>
          <Row label="Touch controls">
            <Toggle on={settings.touchControls} onClick={() => onChange('touchControls', !settings.touchControls)} />
          </Row>
          <Row label="Show FPS">
            <Toggle on={settings.showFPS} onClick={() => onChange('showFPS', !settings.showFPS)} />
          </Row>
        </div>

        <button className={styles.doneBtn} onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ flex: 1, fontSize: 13, color: '#94a3b8' }}>{label}</span>
      {children}
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      style={{
        background: on ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${on ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)'}`,
        color: on ? '#818cf8' : '#64748b',
        padding: '5px 13px', borderRadius: 8, fontSize: 12, fontWeight: 600,
        cursor: 'pointer', minWidth: 52,
      }}
      onClick={onClick}
    >
      {on ? 'On' : 'Off'}
    </button>
  );
}
