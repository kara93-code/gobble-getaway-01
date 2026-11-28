// Tuning for Gobble Getaway: one place holds every number the rest of the game
// reads, so balancing the chase never means hunting through draw code.
//
// R3 "Midnight Sneak": the escape now happens at night. The farmer patrols
// with a lantern; its beam sweeps the ground and the turkey must freeze in the
// dark when the light is on it. The noise meter is the new pressure: moving in
// the light is loud, freezing is quiet but lets the farmer close in, hiding in
// hay resets the noise and throws the farmer off.
export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 800;
export const GROUND_Y = 668;
export const STEP = 1 / 60;
export const GRAVITY = 2200;
export const JUMP_SPEED = 1300;
export const BASE_RUN_SPEED = 330;
export const MAX_RUN_SPEED = 440;
export const LIVES = 3;
export const ESCAPE_METERS = 1000;
export const PX_PER_METER = 14;
export const TURKEY_X = 320;
export const FARMER_MAX_GAP = 280;
export const FARMER_CATCH_GAP = 26;
export const FARMER_SEARCH_SECONDS = 2.2;
// R2: the hide was 2.0s — at ~350px/s the world advances ~700px during a
// hide, about one spawn gap, so the next obstacle was already overlapping
// the turkey's 192-wide box when the hide ended and the turkey could not
// jump (gapFront < 10). 1.0s leaves the next obstacle 270-390px away at
// emergence, room to jump or slide. The farmer still searches 2.2s.
export const HIDE_SECONDS = 1.0;
export const STUMBLE_GAIN = 58;
export const INVULNERABLE_SECONDS = 1.6;
export const BEST_KEY = 'gobble-getaway-best';

// The lantern: its beam hits the ground at beamX and sweeps back and forth.
// beamX = farmerX + LANTERN_DX + sin(time * LANTERN_SWEEP) * LANTERN_SWING,
// and the turkey is lit when its body overlaps [beamX - LANTERN_HALF, beamX +
// LANTERN_HALF]. With the farmer at his usual gap the beam crosses the turkey
// about a quarter of each ~7s sweep; the closer the farmer, the longer the
// light stays on the turkey, so the light threat scales with his proximity.
export const LANTERN_DX = 80;
export const LANTERN_SWING = 320;
export const LANTERN_HALF = 80;
export const LANTERN_SWEEP = 0.9;
// Noise: 0-100. Moving in the light is loud — one full sweep across the turkey
// is nearly enough to be spotted, so running through the beam is a real risk;
// freezing in the light is quiet but not silent; the dark drains it; hay
// blocks the light entirely. At 100 the farmer spots the turkey and closes in
// fast until it hides or is caught.
export const NOISE_RISE_LIT_MOVING = 70;
export const NOISE_RISE_LIT_FROZEN = 10;
export const NOISE_DRAIN = 14;
export const NOISE_SPOT = 100;
// Freezing stops the world, so the farmer uses the pause to close in; the
// turkey runs clean at +9 px/s, so a freeze costs about 23 px/s against running.
export const FREEZE_GAP_CLOSE = 14;
export const SPOT_GAP_CLOSE = 50;
export const SPOT_LOSE_GAP = 260;
export const PATROL_AMPLITUDE = 40;
export const PATROL_PERIOD = 6;

// The escape runs moonlit barnyard -> lantern patrol -> kitchen at dawn. Each
// stage recolours the world, speeds the scroll and changes what spawns.
export const STAGES = [
  // R2: wider spawn gaps (460/440/420 -> 620/600/580). The turkey's box is
  // 192 wide now, so the jump's high window must cover box + obstacle; the
  // old gaps left the next obstacle inside the no-jump zone after landing.
  { from: 0, name: 'MOONLIT BARNYARD', sky: ['#1b2547', '#3c4d80'], hill: '#2f4a2c', ground: '#4a3a26', spawnGap: 620 },
  { from: 300, name: 'THE LANTERN PATROL', sky: ['#121a33', '#2c3a66'], hill: '#263d26', ground: '#41321f', spawnGap: 600 },
  { from: 650, name: 'THE KITCHEN', sky: ['#241a2e', '#4a2f45'], hill: '#2c3d2c', ground: '#b5763f', spawnGap: 580 },
];

export function stageFor(meters) {
  let stage = STAGES[0];
  for (const candidate of STAGES) {
    if (meters >= candidate.from) stage = candidate;
  }
  return stage;
}
