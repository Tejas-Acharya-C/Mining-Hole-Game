import type { Settings } from '../types';

export function defaultSettings(): Settings {
  return {
    // Audio
    soundEnabled:    true,
    musicEnabled:    true,
    volume:          0.5,
    musicVolume:     0.3,
    // Graphics
    showFPS:         false,
    screenShake:     true,
    particleQuality: 'medium',
    lightingQuality: 'medium',
    // Gameplay
    showTutorial:    true,
    touchControls:   false,
    autoSell:        true,
    autosaveInterval: 30,
    // Accessibility
    colorblindMode:  'none',
    reducedMotion:   false,
    reducedFlashing: false,
    highContrast:    false,
    uiScale:         'normal',
    largerText:      false,
  };
}
