export type DeviceFormFactor = 'desktop' | 'tablet' | 'phone';

export function getDeviceFormFactor(width: number, height: number): DeviceFormFactor {
  const minDim = Math.min(width, height);
  if (minDim <= 420) return 'phone';
  if (minDim <= 900) return 'tablet';
  return 'desktop';
}

export function isTouchCapable(): boolean {
  if (typeof navigator === 'undefined') return false;
  const maxTouchPoints = typeof navigator.maxTouchPoints === 'number' ? navigator.maxTouchPoints : 0;
  const hasTouchEvent = typeof window !== 'undefined' && 'ontouchstart' in window;
  return maxTouchPoints > 0 || hasTouchEvent;
}

export function shouldUseMobileUI(width: number, height: number): boolean {
  return isTouchCapable() && getDeviceFormFactor(width, height) !== 'desktop';
}
