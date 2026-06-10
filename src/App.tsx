import { useEffect, useRef, useState, useCallback } from 'react';
import type { GameState, UpgradeId, AchievementId } from './types';
import {
  createInitialState, tryDig, tryMove, tickEnergy, tickScreenShake,
  tickFloatTexts, revealAround, sellInventory, buyUpgrade,
  unlockAchievement, useTeleport, playerDepth,
} from './systems/GameManager';
import { SaveManager } from './systems/SaveManager';
import { WorldManager } from './systems/WorldManager';
import { ParticleManager } from './systems/ParticleManager';
import { audioManager } from './systems/AudioManager';
import { render, computeCamera } from './engine/renderer';
import { attachInputListeners, isAnyKeyDown, getInput, consumeClick } from './engine/input';
import { TILE_SIZE, SURFACE_TILE_ROW } from './data/tiles';
import { moveCooldown, digCooldown } from './data/upgrades';
import { ACHIEVEMENT_DEFS } from './data/achievements';

import TitleScreen from './components/TitleScreen';
import HUD from './components/HUD';
import ShopPanel from './components/ShopPanel';
import InventoryPanel from './components/InventoryPanel';
import PauseMenu from './components/PauseMenu';
import SettingsPanel from './components/SettingsPanel';
import WinScreen from './components/WinScreen';
import AchievementToast from './components/AchievementToast';
import TutorialHint from './components/TutorialHint';
import StatisticsPanel from './components/StatisticsPanel';
import QuestsPanel from './components/QuestsPanel';
import TouchControls from './components/TouchControls';

// ── Singleton managers live outside React to avoid re-creation ────────────────
let wmInstance: WorldManager | null = null;
const pmInstance = new ParticleManager();

export default function App() {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const stateRef     = useRef<GameState | null>(null);
  const rafRef       = useRef<number>(0);
  const lastTimeRef  = useRef<number>(0);
  const moveCoolRef  = useRef<number>(0);
  const digCoolRef   = useRef<number>(0);
  const fpsRef       = useRef<number>(60);
  const saveTimerRef = useRef<number>(0);
  const inputCleanup = useRef<(() => void) | null>(null);

  const [screen, setScreen]         = useState<GameState['screen']>('title');
  const [achToast, setAchToast]     = useState<AchievementId | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevAchRef    = useRef<Set<string>>(new Set());
  const [, forceUpdate] = useState(0);
  const hudTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Game loop ──────────────────────────────────────────────────────────────
  const gameLoop = useCallback((timestamp: number) => {
    const state  = stateRef.current;
    const canvas = canvasRef.current;
    if (!state || !canvas) {
      rafRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
    lastTimeRef.current = timestamp;
    fpsRef.current = dt > 0 ? Math.round(1 / dt) : 60;

    if (state.screen === 'playing') {
      state.tick++;
      state.playTime += dt;
      state.statistics.playTimeSeconds += dt;

      const wm  = wmInstance!;
      const inp = getInput();
      moveCoolRef.current -= dt * 1000;
      digCoolRef.current  -= dt * 1000;

      const mcd = moveCooldown(state.player.upgrades.boots);
      const dcd = digCooldown(state.player.upgrades.shovel);

      // ── Movement (keyboard + touch joystick) ──
      if (moveCoolRef.current <= 0) {
        let moved = false;
        const jx = inp.touchJoyX;
        const jy = inp.touchJoyY;
        if (Math.abs(jx) > 0.35 || Math.abs(jy) > 0.35) {
          if (Math.abs(jx) >= Math.abs(jy)) {
            moved = tryMove(state, wm, jx > 0 ? 1 : -1, 0);
          } else {
            moved = tryMove(state, wm, 0, jy > 0 ? 1 : -1);
          }
        } else if (isAnyKeyDown('ArrowLeft',  'KeyA')) { moved = tryMove(state, wm, -1,  0); }
        else if  (isAnyKeyDown('ArrowRight', 'KeyD'))  { moved = tryMove(state, wm,  1,  0); }
        else if  (isAnyKeyDown('ArrowDown',  'KeyS'))  { moved = tryMove(state, wm,  0,  1); }
        else if  (isAnyKeyDown('ArrowUp',    'KeyW'))  { moved = tryMove(state, wm,  0, -1); }
        if (moved) moveCoolRef.current = mcd;
      }

      // ── Dig target direction ──
      let digRow = state.player.y + 1;
      let digCol = state.player.x;
      if      (isAnyKeyDown('ArrowLeft',  'KeyA')) { digCol = state.player.x - 1; digRow = state.player.y; }
      else if (isAnyKeyDown('ArrowRight', 'KeyD')) { digCol = state.player.x + 1; digRow = state.player.y; }
      else if (isAnyKeyDown('ArrowUp',    'KeyW')) { digRow = state.player.y - 1; digCol = state.player.x; }

      // ── Dig (all input sources respect cooldown) ──
      if (digCoolRef.current <= 0) {
        // Keyboard
        if (isAnyKeyDown('KeyZ', 'Space')) {
          const res = tryDig(state, wm, pmInstance, digRow, digCol);
          if (res.success) digCoolRef.current = dcd;
        }

        // Touch dig button — respects same cooldown as keyboard
        if (inp.touchDigPressed && !inp.touchDigConsumed) {
          const res = tryDig(state, wm, pmInstance, digRow, digCol);
          if (res.success) digCoolRef.current = dcd;
          inp.touchDigConsumed = true;
        }

        // Mouse click — adjacent tile only
        if (inp.mouseClicked) {
          const cam    = computeCamera(state, canvas.width, canvas.height);
          const worldX = inp.mouseX + cam.x;
          const worldY = inp.mouseY + cam.y;
          const col    = Math.floor(worldX / TILE_SIZE);
          const row    = Math.floor(worldY / TILE_SIZE);
          const dx     = Math.abs(col - state.player.x);
          const dy     = Math.abs(row - state.player.y);
          if (dx + dy === 1) {
            const res = tryDig(state, wm, pmInstance, row, col);
            if (res.success) digCoolRef.current = dcd;
          }
          consumeClick();
        }
      } else {
        if (inp.mouseClicked) consumeClick();
        if (inp.touchDigPressed && !inp.touchDigConsumed) inp.touchDigConsumed = true;
      }

      // ── Keyboard shortcuts ──
      if (inp.keys.has('Escape') || inp.keys.has('KeyP')) {
        inp.keys.delete('Escape'); inp.keys.delete('KeyP');
        state.screen = 'paused'; setScreen('paused');
      }
      if (inp.keys.has('KeyB')) {
        inp.keys.delete('KeyB');
        if (state.player.y <= SURFACE_TILE_ROW + 2) { state.screen = 'shop'; setScreen('shop'); }
      }
      if (inp.keys.has('KeyE')) {
        inp.keys.delete('KeyE');
        if (state.player.y <= SURFACE_TILE_ROW + 1) sellInventory(state);
      }
      if (inp.keys.has('KeyI')) {
        inp.keys.delete('KeyI');
        state.screen = 'inventory'; setScreen('inventory');
      }
      if (inp.keys.has('KeyQ')) {
        inp.keys.delete('KeyQ');
        state.screen = 'quests'; setScreen('quests');
      }
      if (inp.keys.has('KeyT') && state.player.teleportCharges > 0) {
        inp.keys.delete('KeyT');
        useTeleport(state, wm);
      }

      tickEnergy(state, dt);
      tickScreenShake(state, dt);
      tickFloatTexts(state, dt);
      pmInstance.tick(dt);
      audioManager.updateDepthMusic(playerDepth(state.player));

      // Auto-save every 30 s
      saveTimerRef.current += dt;
      if (saveTimerRef.current >= 30) {
        SaveManager.save(state);
        saveTimerRef.current = 0;
      }

      // Achievement toasts
      for (const ach of state.achievements) {
        if (ach.unlocked && !prevAchRef.current.has(ach.id)) {
          prevAchRef.current.add(ach.id);
          setAchToast(ach.id);
          if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
          toastTimerRef.current = setTimeout(() => setAchToast(null), 3800);
        }
      }

      // Play time achievement milestones
      const pts = state.statistics.playTimeSeconds;
      if (pts >= 3600) unlockAchievement(state, 'marathon_miner');
      if (pts >= 7200) unlockAchievement(state, 'insomniac');
    }

    // Win state — save once and switch screen
    if (state.screen === 'win') {
      SaveManager.save(state);
      setScreen('win');
    }

    // Canvas render (only while actively playing)
    if (state.screen === 'playing') {
      const ctx2d = canvas.getContext('2d');
      if (ctx2d) {
        const cam = computeCamera(state, canvas.width, canvas.height);
        render(ctx2d, state, cam, pmInstance, wmInstance!, fpsRef.current);
      }
    }

    rafRef.current = requestAnimationFrame(gameLoop);
  }, []); // stable — reads via refs, never re-created

  // ── Canvas resize ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // ── Start RAF loop and HUD ticker ──────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    inputCleanup.current = attachInputListeners(canvas);
    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(gameLoop);
    hudTimerRef.current = setInterval(() => {
      if (stateRef.current?.screen === 'playing') forceUpdate(n => n + 1);
    }, 100);
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (hudTimerRef.current) clearInterval(hudTimerRef.current);
      inputCleanup.current?.();
      audioManager.stopAmbient();
    };
  }, [gameLoop]);

  // ── Sync audio volume when settings change ─────────────────────────────────
  const syncAudio = useCallback((settings: GameState['settings']) => {
    audioManager.setEnabled(settings.soundEnabled);
    audioManager.setVolume(settings.volume);
    audioManager.setMusicEnabled(settings.musicEnabled);
    audioManager.setMusicVolume(settings.musicVolume);
  }, []);

  // ── Game initialisation ────────────────────────────────────────────────────
  const initGame = useCallback((state: GameState) => {
    stateRef.current = state;
    wmInstance = new WorldManager(state.seed, state.chunks);
    prevAchRef.current = new Set(state.achievements.filter(a => a.unlocked).map(a => a.id));
    revealAround(state, wmInstance);
    syncAudio(state.settings);
  }, [syncAudio]);

  const startNewGame = useCallback((mode: GameState['mode'] = 'normal') => {
    audioManager.menuClick();
    const state = createInitialState(undefined, mode);
    state.screen = 'playing';
    initGame(state);
    setScreen('playing');
  }, [initGame]);

  const continueGame = useCallback(() => {
    audioManager.menuClick();
    const saved = SaveManager.load();
    if (saved) {
      saved.screen = 'playing';
      initGame(saved);
      setScreen('playing');
    }
  }, [initGame]);

  // ── Panel action handlers ──────────────────────────────────────────────────
  const setGameScreen = useCallback((s: GameState['screen']) => {
    audioManager.menuClick();
    const state = stateRef.current;
    if (!state) return;
    state.screen = s;
    setScreen(s);
  }, []);

  const handlePauseAction = useCallback((
    action: 'resume' | 'save' | 'quit' | 'settings' | 'inventory' | 'statistics' | 'quests',
  ) => {
    audioManager.menuClick();
    const state = stateRef.current;
    if (!state) return;
    switch (action) {
      case 'resume':     state.screen = 'playing';    setScreen('playing');    break;
      case 'save':       SaveManager.save(state);                              break;
      case 'quit':       SaveManager.save(state); stateRef.current = null; wmInstance = null; setScreen('title'); break;
      case 'settings':   state.screen = 'settings';   setScreen('settings');   break;
      case 'inventory':  state.screen = 'inventory';  setScreen('inventory');  break;
      case 'statistics': state.screen = 'statistics'; setScreen('statistics'); break;
      case 'quests':     state.screen = 'quests';     setScreen('quests');     break;
    }
  }, []);

  const handleBuyUpgrade = useCallback((id: UpgradeId) => {
    const state = stateRef.current;
    if (!state) return;
    buyUpgrade(state, id);
    forceUpdate(n => n + 1);
  }, []);

  const handleSellAll = useCallback(() => {
    const state = stateRef.current;
    if (!state) return;
    sellInventory(state);
    forceUpdate(n => n + 1);
  }, []);

  const handleSettingsChange = useCallback((
    key: keyof GameState['settings'],
    value: GameState['settings'][keyof GameState['settings']],
  ) => {
    const state = stateRef.current;
    if (!state) return;
    // Type-safe assignment via unknown cast — key is always a valid keyof Settings
    (state.settings as unknown as Record<string, unknown>)[key] = value;
    syncAudio(state.settings);
    forceUpdate(n => n + 1);
  }, [syncAudio]);

  const handleUseTeleport = useCallback(() => {
    const state = stateRef.current;
    if (!state || !wmInstance) return;
    useTeleport(state, wmInstance);
  }, []);

  const handlePlayAgain = useCallback((mode: GameState['mode'] = 'normal') => {
    audioManager.menuClick();
    SaveManager.deleteSave();
    startNewGame(mode);
  }, [startNewGame]);

  // ── Derived state for render ───────────────────────────────────────────────
  const state     = stateRef.current;
  const atSurface = state ? state.player.y <= SURFACE_TILE_ROW + 2 : false;
  const isMobile  = state?.settings.touchControls ?? false;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{
          display: screen === 'playing' ? 'block' : 'none',
          position: 'absolute', inset: 0,
        }}
      />

      {screen === 'title' && (
        <TitleScreen
          hasSave={SaveManager.hasSave()}
          onNewGame={() => startNewGame('normal')}
          onContinue={continueGame}
          onChallenge={startNewGame}
        />
      )}

      {screen === 'playing' && state && (
        <>
          <HUD
            state={state}
            onPause={() => setGameScreen('paused')}
            onShop={() => { if (atSurface) setGameScreen('shop'); }}
            onInventory={() => setGameScreen('inventory')}
            onTeleport={state.player.teleportCharges > 0 ? handleUseTeleport : undefined}
          />
          <TutorialHint state={state} />
          {isMobile && (
            <TouchControls
              onDig={() => {
                if (!wmInstance || digCoolRef.current > 0) return;
                const res = tryDig(state, wmInstance, pmInstance, state.player.y + 1, state.player.x);
                if (res.success) digCoolRef.current = digCooldown(state.player.upgrades.shovel);
                forceUpdate(n => n + 1);
              }}
              onTeleport={state.player.teleportCharges > 0 ? handleUseTeleport : undefined}
            />
          )}
        </>
      )}

      {screen === 'paused' && state && (
        <PauseMenu
          onAction={handlePauseAction}
          hasInventory={state.player.inventory.length > 0}
          atSurface={atSurface}
          onSell={handleSellAll}
        />
      )}

      {screen === 'shop' && state && (
        <ShopPanel
          state={state}
          onBuy={handleBuyUpgrade}
          onClose={() => setGameScreen('playing')}
        />
      )}

      {screen === 'inventory' && state && (
        <InventoryPanel
          state={state}
          onClose={() => setGameScreen('playing')}
          onSellAll={handleSellAll}
        />
      )}

      {screen === 'quests' && state && (
        <QuestsPanel
          state={state}
          onClose={() => setGameScreen('playing')}
        />
      )}

      {screen === 'statistics' && state && (
        <StatisticsPanel
          state={state}
          onClose={() => setGameScreen('paused')}
        />
      )}

      {screen === 'settings' && state && (
        <SettingsPanel
          settings={state.settings}
          onChange={handleSettingsChange}
          onClose={() => setGameScreen('paused')}
        />
      )}

      {screen === 'win' && state && (
        <WinScreen
          state={state}
          onPlayAgain={() => handlePlayAgain('normal')}
          onChallenge={() => handlePlayAgain('hard')}
        />
      )}

      {achToast && state && (
        <AchievementToast
          achievementId={achToast}
          def={ACHIEVEMENT_DEFS[achToast]}
        />
      )}
    </div>
  );
}
