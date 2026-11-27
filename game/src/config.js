// Tuning for Gobble Getaway: one place holds every number the rest of the game
// reads, so balancing the chase never means hunting through draw code.
export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 800;
export const GROUND_Y = 668;
export const STEP = 1 / 60;
export const GRAVITY = 2200;
export const JUMP_SPEED = 1150;
export const BASE_RUN_SPEED = 330;
export const MAX_RUN_SPEED = 440;
export const LIVES = 3;
export const ESCAPE_METERS = 1000;
export const PX_PER_METER = 14;
export const TURKEY_X = 320;
export const FARMER_MAX_GAP = 280;
export const FARMER_CATCH_GAP = 26;
export const FARMER_SEARCH_SECONDS = 2.2;
export const HIDE_SECONDS = 2.0;
export const STUMBLE_GAIN = 58;
export const INVULNERABLE_SECONDS = 1.6;
export const BEST_KEY = 'gobble-getaway-best';

// The escape runs farmyard -> barn -> kitchen. Each stage recolours the world,
// speeds the scroll and changes what spawns.
export const STAGES = [
  { from: 0, name: 'FARMYARD', sky: ['#ffd9a0', '#ff9d5c'], hill: '#7fae4c', ground: '#b5773a', spawnGap: 460 },
  { from: 300, name: 'BARN & FENCES', sky: ['#ffc98a', '#e8703f'], hill: '#6d9c44', ground: '#a86a33', spawnGap: 440 },
  { from: 650, name: 'THE KITCHEN', sky: ['#f7b267', '#c65d3a'], hill: '#5d8a3c', ground: '#96602e', spawnGap: 420 },
];

export function stageFor(meters) {
  let stage = STAGES[0];
  for (const candidate of STAGES) {
    if (meters >= candidate.from) stage = candidate;
  }
  return stage;
}
