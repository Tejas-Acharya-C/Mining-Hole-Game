import { useEffect, useRef, useState, useCallback } from 'react';
import type { GameState, UpgradeId, AchievementId } from './types';
import { CHUNK_SIZE } from './types';
import {
  createInitialState, tryDig, tryMove, tickEnergy, tickScreenShake,
  tickFloatTexts, revealAround, sellInventory, buyUpgrade,
  unlockAchievement, useTeleport, playerDepth,
  tickEvents, consumeEnergyCell, tickBiomeTransition,
  tickHazards, updateBiome, spawnFloat,
} from './systems/GameManager';
import { syncProgressionJournal, updateProgressionStage } from './systems/ProgressionSystem';
import { SaveManager } from './systems/SaveManager';
import { WorldManager } from './systems/WorldManager';
import { ParticleManager } from './systems/ParticleManager';
import { audioManager } from './systems/AudioManager';
import { render, computeCamera } from './engine/renderer';
import { attachInputListeners, isAnyKeyDown, getInput, consumeClick } from './engine/input';
import { TILE_SIZE, SURFACE_TILE_ROW, WORLD_WIDTH_CHUNKS } from './data/tiles';
import { moveCooldown, digCooldown } from './data/upgrades';
import { shouldUseMobileUI } from './utils/device';
import { ACHIEVEMENT_DEFS } from './data/achievements';
import { BIOME_DEFS } from './data/biomes';

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
import EndgameModal from './components/EndgameModal';
import { ObjectiveTracker } from './components/ObjectiveTracker';
import { HintPanel } from './components/HintPanel';
import { JournalPanel } from './components/JournalPanel';
import { MilestoneModal } from './components/MilestoneModal';

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

  const [isMobileUI, setIsMobileUI] = useState(false);

  useEffect(() => {
    const updateDeviceState = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setIsMobileUI(shouldUseMobileUI(width, height));
    };

    updateDeviceState();
    window.addEventListener('resize', updateDeviceState);
    return () => window.removeEventListener('resize', updateDeviceState);
  }, []);

  // ── Game loop ──────────────────────────────────────────────────────────────
  const gameLoop = useCallback((timestamp: number) => {
    const state  = stateRef.current;
    const canvas = canvasRef.current;
    if (!state || !canvas) {
      rafRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    let dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
    lastTimeRef.current = timestamp;
    fpsRef.current = dt > 0 ? Math.round(1 / dt) : 60;

    if (state.screen === 'playing') {
      // Reduced motion bypasses hit stop freezes
      if (state.hitStopTimer && state.hitStopTimer > 0 && !state.settings.reducedMotion) {
        state.hitStopTimer -= dt;
        dt = 0;
      }
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
      const jx = inp.touchJoyX;
      const jy = inp.touchJoyY;
      if (Math.abs(jx) > 0.35 || Math.abs(jy) > 0.35) {
        if (Math.abs(jx) >= Math.abs(jy)) {
          digCol = state.player.x + (jx > 0 ? 1 : -1);
          digRow = state.player.y;
        } else {
          digRow = state.player.y + (jy > 0 ? 1 : -1);
          digCol = state.player.x;
        }
      } else if (isAnyKeyDown('ArrowLeft',  'KeyA')) { digCol = state.player.x - 1; digRow = state.player.y; }
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
        if (inp.touchDigPressed) {
          const res = tryDig(state, wm, pmInstance, digRow, digCol);
          if (res.success) digCoolRef.current = dcd;
        }

        // Mouse click — adjacent tile only
        if (inp.mouseClicked) {
          const cam    = computeCamera(state, canvas.width, canvas.height, isMobileUI);
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
      if (inp.keys.has('KeyF')) {
        inp.keys.delete('KeyF');
        consumeEnergyCell(state, pmInstance);
      }

      tickEnergy(state, dt);
      tickHazards(state, wmInstance!, dt);
      tickScreenShake(state, dt);
      tickFloatTexts(state, dt);
      tickBiomeTransition(state, dt);

      // Hardcore collapse check
      if (state.activeModifiers?.includes('hardcore') && state.player.energy <= 0) {
        state.player.energy = 20;
        state.player.money = Math.floor(state.player.money * 0.5);
        state.player.inventory = [];
        state.player.x = Math.floor((WORLD_WIDTH_CHUNKS * CHUNK_SIZE) / 2);
        state.player.y = SURFACE_TILE_ROW - 1;
        revealAround(state, wmInstance!);
        updateBiome(state, wmInstance!);
        spawnFloat(state, state.player.x * TILE_SIZE + TILE_SIZE / 2, state.player.y * TILE_SIZE - TILE_SIZE, '⚡ HARDCORE COLLAPSE - Money & Inventory Lost!', '#ef4444', 1.25);
        if (state.settings.soundEnabled) audioManager.lowEnergy();
      }

      // Spawn ambient particles with lower density on low-quality mobile devices
      const currentBiomeDef = BIOME_DEFS[state.currentBiome];
      const ambientChance = state.settings.particleQuality === 'low' ? 0.03 : 0.08;
      if (canvas && currentBiomeDef && currentBiomeDef.ambientParticle && Math.random() < ambientChance) {
        const cam = computeCamera(state, canvas.width, canvas.height, isMobileUI);
        const px = cam.x + Math.random() * cam.width;
        const py = cam.y + Math.random() * cam.height;
        
        let color = '#fff';
        let gravity = 0;
        
        if (currentBiomeDef.ambientParticle === 'spark') {
          color = '#cc88ff';
          gravity = -20;
        } else if (currentBiomeDef.ambientParticle === 'ember') {
          color = Math.random() < 0.5 ? '#ff5500' : '#ffa500';
          gravity = -35;
        } else if (currentBiomeDef.ambientParticle === 'bubble') {
          color = 'rgba(102,34,204,0.3)';
          gravity = -12;
        }
        
        pmInstance.emit({
          kind: currentBiomeDef.ambientParticle as any,
          x: px,
          y: py,
          color,
          count: 1,
          speedMin: 0.1,
          speedMax: 0.5,
          sizeMin: 2,
          sizeMax: currentBiomeDef.ambientParticle === 'bubble' ? 7 : 4,
          gravity,
          fade: 0.4 + Math.random() * 0.4,
          lifeMin: 1.5,
          lifeMax: 3.0
        });
      }

      pmInstance.tick(dt);
      tickEvents(state, wm, pmInstance, dt);
      updateProgressionStage(state);
      syncProgressionJournal(state);
      audioManager.updateDepthMusic(playerDepth(state.player));

      // Decay hit flash
      if (state.hitFlashTile) {
        state.hitFlashTile.life -= dt * 8;
        if (state.hitFlashTile.life <= 0) state.hitFlashTile = null;
      }

      // Reset combo when returning to surface
      if (state.player.y <= SURFACE_TILE_ROW && state.digCombo > 0) {
        state.digCombo = 0;
        state.comboMultiplier = 1.0;
      }

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
      if (pts >= 7200) unlockAchievement(state, 'marathon_miner');
      if (pts >= 14400) unlockAchievement(state, 'insomniac');
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
        const cam = computeCamera(state, canvas.width, canvas.height, isMobileUI);
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

  // ── Sync audio volume and accessibility settings when settings change ──────
  const syncAudio = useCallback((settings: GameState['settings']) => {
    audioManager.setEnabled(settings.soundEnabled);
    audioManager.setVolume(settings.volume);
    audioManager.setMusicEnabled(settings.musicEnabled);
    audioManager.setMusicVolume(settings.musicVolume);

    // Sync body classes for accessibility graphics and text
    const body = document.body;
    if (settings.uiScale === 'large' || settings.uiScale === 'xlarge') {
      body.classList.add('large-ui');
    } else {
      body.classList.remove('large-ui');
    }

    if (settings.largerText) {
      body.classList.add('large-text');
    } else {
      body.classList.remove('large-text');
    }

    if (settings.reducedMotion) {
      body.classList.add('reduced-motion');
    } else {
      body.classList.remove('reduced-motion');
    }
  }, []);

  // ── Game initialisation ────────────────────────────────────────────────────
  const initGame = useCallback((state: GameState) => {
    stateRef.current = state;
    wmInstance = new WorldManager(state.seed, state.chunks);
    wmInstance.artifactActivated = state.artifactActivated ?? false;
    wmInstance.facilityUnlocked = state.facilityUnlocked ?? false;
    syncProgressionJournal(state);
    prevAchRef.current = new Set(state.achievements.filter(a => a.unlocked).map(a => a.id));
    revealAround(state, wmInstance);
    syncAudio(state.settings);
  }, [syncAudio]);

  const startNewGame = useCallback((mode: GameState['mode'] = 'normal', seed?: number, modifiers?: string[]) => {
    audioManager.menuClick();
    const state = createInitialState(seed, mode);
    if (modifiers) state.activeModifiers = modifiers;
    if (seed !== undefined) state.chosenSeed = seed;
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

  const handleUseEnergyCell = useCallback(() => {
    const state = stateRef.current;
    if (!state) return;
    consumeEnergyCell(state, pmInstance);
    forceUpdate(n => n + 1);
  }, []);

  const handleSellFromTouch = useCallback(() => {
    const state = stateRef.current;
    if (!state) return;
    sellInventory(state);
    forceUpdate(n => n + 1);
  }, []);

  const handlePlayAgain = useCallback((mode: GameState['mode'] = 'normal') => {
    audioManager.menuClick();
    SaveManager.deleteSave();
    startNewGame(mode);
  }, [startNewGame]);

  const handlePrestige = useCallback(() => {
    audioManager.menuClick();
    const currentPrestige = stateRef.current?.prestigeCount ?? 0;
    const nextPrestige = currentPrestige + 1;
    const state = createInitialState(undefined, 'normal');
    state.prestigeCount = nextPrestige;
    state.challengeModeUnlocked = true;
    state.screen = 'playing';
    SaveManager.deleteSave();
    initGame(state);
    SaveManager.save(state);
    setScreen('playing');
    forceUpdate(n => n + 1);
  }, [initGame]);

  // ── Derived state for render ───────────────────────────────────────────────
  const state     = stateRef.current;
  const atSurface = state ? state.player.y <= SURFACE_TILE_ROW + 2 : false;
  const isMobile  = state?.settings.touchControls ?? false;
  const useMobileUI = isMobile || isMobileUI;

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
          onNewGame={(seed, modifiers) => startNewGame('normal', seed, modifiers)}
          onContinue={continueGame}
          onChallenge={(mode, seed, modifiers) => startNewGame(mode, seed, modifiers)}
          challengeModeUnlocked={stateRef.current ? stateRef.current.challengeModeUnlocked : SaveManager.hasSave() || (SaveManager.load()?.challengeModeUnlocked ?? false)}
          prestigeCount={stateRef.current?.prestigeCount ?? SaveManager.load()?.prestigeCount ?? 0}
        />
      )}

      {screen === 'playing' && state && (
        <>
          <ObjectiveTracker
            state={state}
            isMobile={useMobileUI}
            onOpenHints={() => {
              state.showHintPanel = true;
              forceUpdate(n => n + 1);
            }}
            onOpenJournal={() => {
              state.showJournal = true;
              forceUpdate(n => n + 1);
            }}
          />
          <HUD
            state={state}
            useMobileUI={useMobileUI}
            onPause={() => setGameScreen('paused')}
            onShop={() => { if (atSurface) setGameScreen('shop'); }}
            onInventory={() => setGameScreen('inventory')}
            onTeleport={state.player.teleportCharges > 0 ? handleUseTeleport : undefined}
            onUseEnergyCell={handleUseEnergyCell}
          />
          <TutorialHint state={state} />
          {state.showHintPanel && (
            <HintPanel
              state={state}
              onClose={() => {
                state.showHintPanel = false;
                forceUpdate(n => n + 1);
              }}
            />
          )}
          {state.showJournal && (
            <JournalPanel
              state={state}
              onClose={() => {
                state.showJournal = false;
                forceUpdate(n => n + 1);
              }}
            />
          )}
          {state.activeMilestonePopup && (
            <MilestoneModal
              milestoneId={state.activeMilestonePopup}
              onClose={() => {
                state.activeMilestonePopup = null;
                forceUpdate(n => n + 1);
              }}
            />
          )}
          {state.atEndgameStabilizer && (
            <EndgameModal
              state={state}
              onSelectEnding={(ending) => {
                state.unlockedEnding = ending;
                state.atEndgameStabilizer = false;
                state.screen = 'win';
                setScreen('win');
                SaveManager.save(state);
              }}
              onClose={() => {
                state.atEndgameStabilizer = false;
                forceUpdate(n => n + 1);
              }}
            />
          )}
          {useMobileUI && (
            <TouchControls
              state={state}
              onTeleport={state.player.teleportCharges > 0 ? handleUseTeleport : undefined}
              onInventory={() => setGameScreen('inventory')}
              onShop={() => { if (atSurface) setGameScreen('shop'); }}
              onSell={handleSellFromTouch}
              onUseEnergyCell={handleUseEnergyCell}
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
          onUseEnergyCell={handleUseEnergyCell}
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
          onPrestige={handlePrestige}
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
