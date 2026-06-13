import { useCallback, useRef, useEffect } from 'react';
import { getInput, getTouchState } from '../engine/input';
import type { GameState } from '../types';
import { SURFACE_TILE_ROW } from '../data/tiles';
import styles from './TouchControls.module.css';

interface Props {
  state: GameState;
  onTeleport?: () => void;
  onInventory?: () => void;
  onShop?: () => void;
  onSell?: () => void;
  onUseEnergyCell?: () => void;
}

export default function TouchControls({
  state,
  onTeleport,
  onInventory,
  onShop,
  onSell,
  onUseEnergyCell,
}: Props) {
  const { player } = state;
  const atSurface = player.y <= SURFACE_TILE_ROW + 2;
  const hasUplink = (player.upgrades.market_uplink ?? 0) > 0;
  const canSell = atSurface || hasUplink;
  const hasItems = player.inventory.reduce((s, sl) => s + sl.qty, 0) > 0;
  const hasEnergyCell = player.inventory.some(s => s.itemId === 'energy_cell' && s.qty > 0);
  const hasTP = player.teleportCharges > 0;

  // ── Virtual Joystick ──
  const joyRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const joyTouchIdRef = useRef(-1);
  const joyOriginRef = useRef({ x: 0, y: 0 });

  const JOY_RADIUS = 56;

  const handleJoyStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    const t = e.changedTouches[0];
    if (!t || !joyRef.current) return;
    const rect = joyRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    joyTouchIdRef.current = t.identifier;
    joyOriginRef.current = { x: cx, y: cy };

    // Update touch state for the canvas-based joystick visualization
    const touchState = getTouchState();
    touchState.joyActive = true;
    touchState.joyTouchId = t.identifier;
    touchState.joyOriginX = cx;
    touchState.joyOriginY = cy;
    touchState.joyCurrentX = cx;
    touchState.joyCurrentY = cy;
  }, []);

  const handleJoyMove = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier !== joyTouchIdRef.current) continue;

      const dx = t.clientX - joyOriginRef.current.x;
      const dy = t.clientY - joyOriginRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const clamped = Math.min(dist, JOY_RADIUS);
      const angle = Math.atan2(dy, dx);

      const normX = Math.cos(angle) * (clamped / JOY_RADIUS);
      const normY = Math.sin(angle) * (clamped / JOY_RADIUS);

      const input = getInput();
      input.touchJoyX = normX;
      input.touchJoyY = normY;

      // Update knob visual position
      if (knobRef.current) {
        const kx = Math.cos(angle) * clamped;
        const ky = Math.sin(angle) * clamped;
        knobRef.current.style.transform = `translate(${kx}px, ${ky}px)`;
      }

      // Update touch state
      const touchState = getTouchState();
      touchState.joyCurrentX = joyOriginRef.current.x + Math.cos(angle) * clamped;
      touchState.joyCurrentY = joyOriginRef.current.y + Math.sin(angle) * clamped;
    }
  }, []);

  const handleJoyEnd = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joyTouchIdRef.current) {
        joyTouchIdRef.current = -1;
        const input = getInput();
        input.touchJoyX = 0;
        input.touchJoyY = 0;

        if (knobRef.current) {
          knobRef.current.style.transform = 'translate(0, 0)';
        }

        const touchState = getTouchState();
        touchState.joyActive = false;
        touchState.joyTouchId = -1;
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const input = getInput();
      input.touchJoyX = 0;
      input.touchJoyY = 0;
      input.touchDigPressed = false;
      const touchState = getTouchState();
      touchState.joyActive = false;
      touchState.joyTouchId = -1;
    };
  }, []);

  return (
    <div className={styles.root}>
      {/* ── Left Side: Virtual Joystick ── */}
      <div
        ref={joyRef}
        className={styles.joystickZone}
        onTouchStart={handleJoyStart}
        onTouchMove={handleJoyMove}
        onTouchEnd={handleJoyEnd}
        onTouchCancel={handleJoyEnd}
      >
        <div className={styles.joystickBase}>
          <div ref={knobRef} className={styles.joystickKnob} />
        </div>
      </div>

      {/* ── Right Side: Action Cluster ── */}
      <div className={styles.actionCluster}>
        {/* Primary Dig Button */}
        <button
          className={styles.digBtn}
          onTouchStart={e => {
            e.preventDefault();
            e.stopPropagation();
            getInput().touchDigPressed = true;
          }}
          onTouchEnd={e => {
            e.preventDefault();
            e.stopPropagation();
            getInput().touchDigPressed = false;
          }}
          onTouchCancel={e => {
            e.preventDefault();
            e.stopPropagation();
            getInput().touchDigPressed = false;
          }}
        >
          ⛏
        </button>

        {/* Context-Sensitive Interact Button */}
        {canSell && hasItems && onSell && (
          <button
            className={`${styles.contextBtn} ${styles.sellBtn}`}
            onTouchStart={e => { e.preventDefault(); e.stopPropagation(); onSell(); }}
          >
            💰 Sell
          </button>
        )}
        {atSurface && !hasItems && onShop && (
          <button
            className={`${styles.contextBtn} ${styles.shopBtnTouch}`}
            onTouchStart={e => { e.preventDefault(); e.stopPropagation(); onShop(); }}
          >
            🛒 Shop
          </button>
        )}

        {/* Secondary Action Row */}
        <div className={styles.secondaryRow}>
          {/* Inventory */}
          {onInventory && (
            <button
              className={styles.smallBtn}
              onTouchStart={e => { e.preventDefault(); e.stopPropagation(); onInventory(); }}
            >
              🎒
            </button>
          )}

          {/* Quick Energy Cell */}
          {hasEnergyCell && onUseEnergyCell && (
            <button
              className={`${styles.smallBtn} ${styles.cellSmallBtn}`}
              onTouchStart={e => { e.preventDefault(); e.stopPropagation(); onUseEnergyCell(); }}
            >
              🔋
            </button>
          )}

          {/* Teleport */}
          {hasTP && onTeleport && (
            <button
              className={`${styles.smallBtn} ${styles.tpSmallBtn}`}
              onTouchStart={e => { e.preventDefault(); e.stopPropagation(); onTeleport(); }}
            >
              ✨
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
