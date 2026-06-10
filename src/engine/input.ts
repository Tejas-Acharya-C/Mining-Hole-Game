// Unified input handler — keyboard, mouse, and touch.

export interface InputState {
  keys: Set<string>;
  mouseX: number;
  mouseY: number;
  mouseDown: boolean;
  mouseClicked: boolean;
  rightClicked: boolean;
  // Touch virtual joystick
  touchJoyX: number;   // -1..1
  touchJoyY: number;   // -1..1
  touchDigPressed: boolean;
  touchDigConsumed: boolean;
}

export interface TouchVirtual {
  joyActive: boolean;
  joyOriginX: number;
  joyOriginY: number;
  joyCurrentX: number;
  joyCurrentY: number;
  joyTouchId: number;
  digTouchId: number;
}

const state: InputState = {
  keys: new Set(),
  mouseX: 0, mouseY: 0,
  mouseDown: false, mouseClicked: false, rightClicked: false,
  touchJoyX: 0, touchJoyY: 0,
  touchDigPressed: false, touchDigConsumed: false,
};

const touch: TouchVirtual = {
  joyActive: false, joyOriginX: 0, joyOriginY: 0,
  joyCurrentX: 0, joyCurrentY: 0, joyTouchId: -1, digTouchId: -1,
};

export function getInput(): InputState { return state; }
export function getTouchState(): TouchVirtual { return touch; }

export function consumeClick(): void {
  state.mouseClicked = false;
  state.rightClicked = false;
}

export function attachInputListeners(canvas: HTMLCanvasElement): () => void {
  const preventDefaultKeys = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space']);

  const onKeyDown = (e: KeyboardEvent) => {
    state.keys.add(e.code);
    if (preventDefaultKeys.has(e.code)) e.preventDefault();
  };
  const onKeyUp = (e: KeyboardEvent) => { state.keys.delete(e.code); };

  const getCanvasPos = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top)  * (canvas.height / rect.height),
    };
  };

  const onMouseMove = (e: MouseEvent) => {
    const pos = getCanvasPos(e.clientX, e.clientY);
    state.mouseX = pos.x; state.mouseY = pos.y;
  };
  const onMouseDown = (e: MouseEvent) => {
    state.mouseDown = true;
    if (e.button === 0) state.mouseClicked = true;
    if (e.button === 2) state.rightClicked = true;
    e.preventDefault();
  };
  const onMouseUp = () => { state.mouseDown = false; };
  const onContextMenu = (e: MouseEvent) => e.preventDefault();

  // ── Touch handling ──
  const JOY_RADIUS = 60;

  const onTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      const pos = getCanvasPos(t.clientX, t.clientY);
      // Left half = joystick, right half = dig button
      if (pos.x < canvas.width / 2) {
        if (!touch.joyActive) {
          touch.joyActive = true;
          touch.joyOriginX = pos.x;
          touch.joyOriginY = pos.y;
          touch.joyCurrentX = pos.x;
          touch.joyCurrentY = pos.y;
          touch.joyTouchId = t.identifier;
          state.touchJoyX = 0; state.touchJoyY = 0;
        }
      } else {
        if (touch.digTouchId === -1) {
          touch.digTouchId = t.identifier;
          state.touchDigPressed = true;
          state.touchDigConsumed = false;
        }
      }
    }
  };

  const onTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === touch.joyTouchId) {
        const pos = getCanvasPos(t.clientX, t.clientY);
        touch.joyCurrentX = pos.x;
        touch.joyCurrentY = pos.y;
        const dx = pos.x - touch.joyOriginX;
        const dy = pos.y - touch.joyOriginY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const clamped = Math.min(dist, JOY_RADIUS);
        const angle = Math.atan2(dy, dx);
        state.touchJoyX = Math.cos(angle) * (clamped / JOY_RADIUS);
        state.touchJoyY = Math.sin(angle) * (clamped / JOY_RADIUS);
      }
    }
  };

  const onTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === touch.joyTouchId) {
        touch.joyActive = false; touch.joyTouchId = -1;
        state.touchJoyX = 0; state.touchJoyY = 0;
      }
      if (t.identifier === touch.digTouchId) {
        touch.digTouchId = -1;
        state.touchDigPressed = false;
      }
    }
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('contextmenu', onContextMenu);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd, { passive: false });
  canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });

  // Return cleanup function
  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mousedown', onMouseDown);
    canvas.removeEventListener('mouseup', onMouseUp);
    canvas.removeEventListener('contextmenu', onContextMenu);
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove', onTouchMove);
    canvas.removeEventListener('touchend', onTouchEnd);
    canvas.removeEventListener('touchcancel', onTouchEnd);
  };
}

export function isAnyKeyDown(...codes: string[]): boolean { return codes.some(c => state.keys.has(c)); }
