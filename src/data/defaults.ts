import type { Settings } from '../types';

export function defaultSettings(): Settings {
  const hasTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  return {
    // Audio
    soundEnabled:    true,
    musicEnabled:    true,
    volume:          0.5,
    musicVolume:     0.3,
    // Graphics
    showFPS:         false,
    screenShake:     true,
    particleQuality: hasTouch ? 'low' : 'medium',
    lightingQuality: hasTouch ? 'low' : 'medium',
    // Gameplay
    showTutorial:    true,
    touchControls:   hasTouch,
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

