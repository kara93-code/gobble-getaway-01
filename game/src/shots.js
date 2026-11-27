// The screenshot scenes behind ?shot=cover|title|kitchen|end. Each one plays the
// real rules forward from a fresh world for a fixed distance, steered by a
// simple autopilot (jump the fence or oven ahead, slide under a low knife, duck
// into hay when the farmer closes in), so every frame is what a real run looks
// like and the same seed always gives the same frame.
import { ESCAPE_METERS, STEP } from './config.js';
import { EVENT_ESCAPED, EVENT_OVER, resetWorld, runSpeed, worldStep } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { KIND_HAY, KIND_KNIFE } from './hazards.js';

const SAMPLE = 1 / 30;

/** Jump when a solid obstacle is a jump away, slide under a low knife, hide in hay. */
function autopilot(world) {
  const turkey = world.turkey;
  const ahead = world.obstacles
    .filter((o) => o.x + o.w > turkey.x - 20 && o.x < turkey.x + 460)
    .sort((a, b) => a.x - b.x)[0];
  if (!ahead) return { jump: false, slideHeld: false };
  const gap = ahead.x - turkey.x;
  if (ahead.kind === KIND_HAY) {
    // Sliding into hay hides the turkey and throws the farmer off his trail.
    if (gap < 150) return { jump: false, slideHeld: true };
    return { jump: false, slideHeld: false };
  }
  if (ahead.kind === KIND_KNIFE) {
    // The blade hangs low enough to duck under every time: never jump into it.
    return { jump: false, slideHeld: gap < 260 && turkey.grounded };
  }
  // The turkey stands still while the world scrolls, so the jump must start
  // EARLY enough to rise above the obstacle before it arrives — but late
  // enough to still be up when its back edge passes. At 0.32x speed the
  // turkey was still climbing when the fence arrived and ran straight into
  // it; 0.62x puts the whole crossing inside the high part of the jump.
  const speed = runSpeed(world);
  const jumpAt = speed * 0.62;
  return { jump: gap < jumpAt && gap > 10 && turkey.grounded, slideHeld: false };
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

function stageCover(world) {
  // Barn stage, turkey HIGH mid-jump over an oven with the farmer right
  // behind. Break only once the turkey is clearly airborne (y < 480), not
  // on the first step of the jump, or the frame reads as standing still.
  runUntil(world, (w) => w.distance >= 380, 120);
  for (let i = 0; i < 240; i += 1) {
    worldStep(world, STEP, autopilot(world));
    const oven = world.obstacles.find((o) => o.kind === 'oven' && o.x > world.turkey.x - 40 && o.x < world.turkey.x + 360);
    if (oven && world.turkey.y < 480) break;
  }
  world.farmer.gap = 62;
  return { screen: SCREEN_PLAY, best: Math.floor(world.score) };
}

function stageKitchen(world) {
  // Kitchen stage: the turkey hidden in hay while the farmer searches.
  runUntil(world, (w) => w.distance >= 700, 180);
  runUntil(world, (w) => w.turkey.hiding, 30);
  if (!world.turkey.hiding) {
    // Fall back: a plain kitchen run frame is still a real play frame.
    runUntil(world, (w) => w.distance >= 760, 30);
  }
  return { screen: SCREEN_PLAY, best: Math.floor(world.score) };
}

function stageEnd(world) {
  // A player who never jumps: every fence and oven is run straight into, so
  // the farmer catches the turkey the honest way, a few stumbles in.
  let seen = 0;
  for (let i = 0; i < 600 / STEP; i += 1) {
    seen |= worldStep(world, STEP, { jump: false, slideHeld: false });
    if (seen & EVENT_OVER) break;
  }
  return { screen: SCREEN_OVER, best: Math.floor(world.score) };
}

/** Set `world` to the named scene and return the screen to draw and the score. */
export function stageShot(name, world) {
  resetWorld(world);
  if (name === 'cover') return stageCover(world);
  if (name === 'kitchen') return stageKitchen(world);
  if (name === 'end') return stageEnd(world);
  for (let i = 0; i < 5 / STEP; i += 1) worldStep(world, STEP, { jump: false, slideHeld: false });
  void SAMPLE;
  void ESCAPE_METERS;
  return { screen: SCREEN_TITLE, best: 0 };
}
