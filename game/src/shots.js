// The screenshot scenes behind ?shot=cover|title|kitchen|end. Each one plays the
// real rules forward from a fresh world for a fixed distance, steered by a
// simple autopilot (jump the fence or oven ahead, slide under a low knife, duck
// into hay when the farmer closes in, freeze in the dark when the lantern's
// light is on the turkey), so every frame is what a real run looks like and
// the same seed always gives the same frame.
import { ESCAPE_METERS, LANTERN_DX, LANTERN_SWEEP, LANTERN_SWING, STEP } from './config.js';
import { EVENT_ESCAPED, EVENT_OVER, resetWorld, runSpeed, turkeyLit, worldStep } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { KIND_HAY, KIND_KNIFE } from './hazards.js';
import { TURKEY_WIDTH } from './turkey.js';
import { farmerSetGap, farmerX } from './farmer.js';

const SAMPLE = 1 / 30;

/**
 * Jump when a solid obstacle is a jump away, slide under a low knife, hide in
 * hay — and freeze when the lantern's light is on the turkey. A freeze is only
 * safe while the farmer still has room to close in; when he is close, or the
 * turkey is already spotted, running (and hiding) is the only answer.
 */
function autopilot(world) {
  const turkey = world.turkey;
  const farmer = world.farmer;
  const lit = turkeyLit(world);
  if (turkey.hiding) return { jump: false, slideHeld: false, freezeHeld: false };
  const ahead = world.obstacles
    .filter((o) => o.x + o.w > turkey.x - 20 && o.x < turkey.x + 460)
    .sort((a, b) => a.x - b.x)[0];
  const gapFront = ahead ? ahead.x - (turkey.x + TURKEY_WIDTH) : Infinity;
  const speed = runSpeed(world);
  const jumpAt = speed * 0.2;
  if (ahead) {
    if (ahead.kind === KIND_HAY) {
      // Sliding into hay hides the turkey, zeroes the noise and throws the
      // farmer off his trail — worth starting early when the noise is high.
      const slideAt = world.noise > 70 ? 350 : 250;
      const gap = ahead.x - turkey.x;
      if (gap < slideAt) return { jump: false, slideHeld: true, freezeHeld: false };
    } else if (ahead.kind === KIND_KNIFE) {
      // The blade hangs low enough to duck under every time: never jump into it.
      // R2: 420 (was 260 in R1) so the turkey is already sliding when it lands
      // from a jump just ahead of the blade.
      const gap = ahead.x - turkey.x;
      if (gap < 420 && turkey.grounded) return { jump: false, slideHeld: true, freezeHeld: false };
    } else if (gapFront < jumpAt && gapFront > 10 && turkey.grounded) {
      // The turkey stands still while the world scrolls, so the jump must start
      // EARLY enough to rise above the obstacle before it arrives — but late
      // enough to still be up when its back edge passes. R2: the box is 192
      // wide, so the whole box + obstacle must fit inside the jump's high
      // window; 0.62x (R1) jumps far too early and the turkey lands on the
      // obstacle. 0.2x puts the crossing inside the high part of the jump.
      return { jump: true, slideHeld: false, freezeHeld: false };
    }
  }
  // Freeze in the dark when the light is on the turkey and the farmer still
  // has room: the noise drains while the beam sweeps past. Never freeze when
  // spotted (run for the hay) or when the farmer is already close.
  if (lit && turkey.grounded && !farmer.spotted && farmer.gap > 70) {
    return { jump: false, slideHeld: false, freezeHeld: true };
  }
  return { jump: false, slideHeld: false, freezeHeld: false };
}

/** Run the world forward until `until(world)` is true; returns the events seen. */
function runUntil(world, until, maxSeconds) {
  let seen = 0;
  for (let i = 0; i < maxSeconds / STEP; i += 1) {
    seen |= worldStep(world, STEP, autopilot(world));
    if (until(world)) break;
    if (seen & (EVENT_OVER | EVENT_ESCAPED)) break;
  }
  return seen;
}

/**
 * Aim the lantern's beam at the turkey: pick the nearest future time where the
 * sweep puts the beam's centre on the turkey, so the staged frame always shows
 * the cone on the hero. The frame is still a real play frame — only the sweep
 * phase is chosen, the way the farmer's gap is chosen in the cover staging.
 */
function aimLanternAtTurkey(world) {
  const fx = farmerX(world.farmer);
  const target = (world.turkey.x + TURKEY_WIDTH / 2 - fx - LANTERN_DX) / LANTERN_SWING;
  const s = Math.max(-0.95, Math.min(0.95, target));
  const base = Math.asin(s) / LANTERN_SWEEP;
  const period = (Math.PI * 2) / LANTERN_SWEEP;
  const k = Math.max(0, Math.ceil((world.time - base) / period));
  world.time = base + k * period;
}

function stageCover(world) {
  // Barn stage, turkey HIGH mid-jump over an obstacle with the farmer right
  // behind. Break only once the turkey is clearly airborne (y < 480), not
  // on the first step of the jump, or the frame reads as standing still.
  runUntil(world, (w) => w.distance >= 380, 120);
  for (let i = 0; i < 360; i += 1) {
    worldStep(world, STEP, autopilot(world));
    const obstacle = world.obstacles.find((o) => o.kind !== 'knife' && o.kind !== 'hay' && o.x > world.turkey.x - 40 && o.x < world.turkey.x + 360);
    // R2: grounded y is 484 now, so "clearly airborne" is y < 380 (feet
    // above the obstacle top), not the R1 threshold of 480.
    if (obstacle && world.turkey.y < 380) break;
  }
  farmerSetGap(world.farmer, 62);
  aimLanternAtTurkey(world);
  return { screen: SCREEN_PLAY, best: Math.floor(world.score) };
}

function stageKitchen(world) {
  // Kitchen stage: the turkey hidden in hay while the farmer searches, the
  // lantern's cone sweeping over the bale.
  runUntil(world, (w) => w.distance >= 700, 180);
  runUntil(world, (w) => w.turkey.hiding, 30);
  if (!world.turkey.hiding) {
    // Fall back: a plain kitchen run frame is still a real play frame.
    runUntil(world, (w) => w.distance >= 760, 30);
  }
  aimLanternAtTurkey(world);
  return { screen: SCREEN_PLAY, best: Math.floor(world.score) };
}

function stageEnd(world) {
  // R3: the win frame — the autopilot sneaks all the way out the kitchen
  // window at dawn. If this seed never escapes, fall back to the honest
  // caught frame (a player who never jumps).
  let seen = runUntil(world, (w) => w.escaped, 300);
  if (world.escaped) return { screen: SCREEN_OVER, best: Math.floor(world.score) };
  resetWorld(world);
  seen = 0;
  for (let i = 0; i < 600 / STEP; i += 1) {
    seen |= worldStep(world, STEP, { jump: false, slideHeld: false, freezeHeld: false });
    if (seen & EVENT_OVER) break;
  }
  void seen;
  return { screen: SCREEN_OVER, best: Math.floor(world.score) };
}

/** Set `world` to the named scene and return the screen to draw and the score. */
export function stageShot(name, world) {
  resetWorld(world);
  if (name === 'cover') return stageCover(world);
  if (name === 'kitchen') return stageKitchen(world);
  if (name === 'end') return stageEnd(world);
  for (let i = 0; i < 5 / STEP; i += 1) worldStep(world, STEP, { jump: false, slideHeld: false, freezeHeld: false });
  void SAMPLE;
  void ESCAPE_METERS;
  return { screen: SCREEN_TITLE, best: 0 };
}

// Exported for the Node play-test sim (tools/sim.mjs); the game itself only
// uses stageShot.
export { autopilot };
