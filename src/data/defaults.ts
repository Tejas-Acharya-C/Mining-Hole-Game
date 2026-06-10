import type { Settings } from '../types';

export function defaultSettings(): Settings {
  return {
    soundEnabled: true,
    musicEnabled: true,
    volume: 0.5,
    musicVolume: 0.3,
    showFPS: false,
    showTutorial: true,
    screenShake: true,
    particleQuality: 'medium',
    touchControls: false,
    autoSell: true,
  };
}
