// Keyboard + mouse, nothing else: Space / Up / W / click jumps, Down / S slides
// (and hides in hay), P pauses, R restarts, Enter confirms. Keys repeat safely:
// holding jump never double-jumps, because the world only jumps when grounded.
export const ACTION_JUMP = 1;
export const ACTION_CONFIRM = 2;
export const ACTION_PAUSE = 4;
export const ACTION_RESTART = 8;

export function createInput(canvas) {
  let queued = 0;
  let slideHeld = false;
  let jumpHeld = false;

  function pressJump() {
    if (!jumpHeld) queued |= ACTION_JUMP | ACTION_CONFIRM;
    jumpHeld = true;
  }
  function releaseJump() {
    jumpHeld = false;
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'KeyW') {
      event.preventDefault();
      pressJump();
    } else if (event.code === 'ArrowDown' || event.code === 'KeyS') {
      event.preventDefault();
      slideHeld = true;
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      queued |= ACTION_PAUSE;
    } else if (event.code === 'KeyR') {
      queued |= ACTION_RESTART;
    } else if (event.code === 'Enter') {
      queued |= ACTION_CONFIRM;
    }
  });
  window.addEventListener('keyup', (event) => {
    if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'KeyW') releaseJump();
    if (event.code === 'ArrowDown' || event.code === 'KeyS') slideHeld = false;
  });
  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    pressJump();
  });
  window.addEventListener('pointerup', () => releaseJump());
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    takeActions() {
      const actions = queued;
      queued = 0;
      return actions;
    },
    control() {
      return { jump: (queued & ACTION_JUMP) !== 0, slideHeld };
    },
    consumeJump() {
      queued &= ~ACTION_JUMP;
    },
  };
}
