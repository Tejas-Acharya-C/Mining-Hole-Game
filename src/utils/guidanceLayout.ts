/** Layout constants and footprint estimates for unobtrusive guidance UI. */

export interface ViewportSize {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UiFootprint {
  permanentUiArea: number;
  gameplayArea: number;
  permanentUiPercent: number;
  gameplayPercent: number;
}

/** Viewports used for the guidance UI footprint audit. */
export const VIEWPORT_AUDIT_SIZES: Array<ViewportSize & { label: string; isMobile: boolean }> = [
  { label: '320px', width: 320, height: 720, isMobile: true },
  { label: '360px', width: 360, height: 780, isMobile: true },
  { label: '390px', width: 390, height: 800, isMobile: true },
  { label: '412px', width: 412, height: 870, isMobile: true },
  { label: '768px', width: 768, height: 1024, isMobile: true },
  { label: '1024px', width: 1024, height: 768, isMobile: false },
  { label: 'Desktop', width: 1440, height: 900, isMobile: false },
];

const GAMEPLAY_UI_TARGET_PERCENT = 20;

export function isCompactViewport(width: number): boolean {
  return width <= 390;
}

/** Center gameplay zone where the player, terminal, and structures should stay visible. */
export function getGameplaySafeZone(viewport: ViewportSize, isMobile: boolean): Rect {
  const top = hudHeight(viewport, isMobile) + 44;
  const bottom = isMobile ? 200 : 56;
  const left = isMobile ? Math.round(viewport.width * 0.34) : 40;
  const right = isMobile ? 40 : Math.round(viewport.width * 0.34);

  return {
    x: left,
    y: top,
    width: Math.max(0, viewport.width - left - right),
    height: Math.max(0, viewport.height - top - bottom),
  };
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function hudHeight(viewport: ViewportSize, isMobile: boolean): number {
  if (isCompactViewport(viewport.width)) return 48;
  return isMobile ? 56 : 72;
}

function objectiveChipRect(viewport: ViewportSize, isMobile: boolean, expanded: boolean): Rect {
  const compact = isCompactViewport(viewport.width);
  const height = expanded
    ? (compact ? 130 : isMobile ? 150 : 160)
    : (compact ? 26 : isMobile ? 30 : 32);
  const width = isMobile
    ? Math.min(viewport.width * 0.52, compact ? 160 : 180)
    : Math.min(320, viewport.width * 0.28);

  const top = isMobile
    ? hudHeight(viewport, isMobile) + (compact ? 4 : 8)
    : 76;
  const x = isMobile ? 8 : viewport.width - width - 12;

  return { x, y: top, width, height };
}

/** Permanent on-screen guidance rects (collapsed chip + HUD strip). */
export function getPermanentGuidanceUiRects(
  viewport: ViewportSize,
  isMobile: boolean,
): Rect[] {
  return [
    { x: 0, y: 0, width: viewport.width, height: hudHeight(viewport, isMobile) },
    objectiveChipRect(viewport, isMobile, false),
  ];
}

/** Collapsed guidance chip must live in an edge corridor, not the center viewport. */
export function guidanceUiAvoidsSafeZone(viewport: ViewportSize, isMobile: boolean): boolean {
  const chip = objectiveChipRect(viewport, isMobile, false);
  const safe = getGameplaySafeZone(viewport, isMobile);

  if (isMobile) {
    const inTopCorridor = chip.y <= hudHeight(viewport, isMobile) + 12;
    const onLeftEdge = chip.x <= 12;
    return inTopCorridor && onLeftEdge && !rectsOverlap(chip, safe);
  }

  const inTopCorridor = chip.y <= hudHeight(viewport, isMobile) + 20;
  const onRightEdge = chip.x + chip.width >= viewport.width - 16;
  return inTopCorridor && onRightEdge && !rectsOverlap(chip, safe);
}

export function estimatePermanentUiFootprint(
  viewport: ViewportSize,
  isMobile: boolean,
): UiFootprint {
  const total = viewport.width * viewport.height;
  const rects = getPermanentGuidanceUiRects(viewport, isMobile);

  // Union area approximation — guidance rects are edge-aligned with minimal overlap.
  const permanentUiArea = rects.reduce((sum, rect) => sum + rect.width * rect.height, 0);
  const cappedUiArea = Math.min(permanentUiArea, total * 0.35);
  const gameplayArea = total - cappedUiArea;

  return {
    permanentUiArea: cappedUiArea,
    gameplayArea,
    permanentUiPercent: (cappedUiArea / total) * 100,
    gameplayPercent: (gameplayArea / total) * 100,
  };
}

export function meetsGameplayVisibilityTarget(
  viewport: ViewportSize,
  isMobile: boolean,
  targetGameplayPercent = 100 - GAMEPLAY_UI_TARGET_PERCENT,
): boolean {
  const footprint = estimatePermanentUiFootprint(viewport, isMobile);
  return footprint.gameplayPercent >= targetGameplayPercent;
}
