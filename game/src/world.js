// The world: one step advances the run — scroll, spawn, collisions, the farmer's
// gap, stages, score, win and loss. It knows nothing about drawing or input;
// it only reads a small control object {jump, slideHeld, freezeHeld} each step.
//
// R3 "Midnight Sneak": the lantern and the noise meter. While the turkey runs
// in the lantern's light the noise climbs; freezing in the light is quiet but
// lets the farmer close in; the dark drains the noise; hay blocks the light
// and resets the noise. At full noise the farmer spots the turkey and runs at
// it until it hides, is caught, or outruns him.
import {
  BASE_RUN_SPEED, ESCAPE_METERS, FARMER_CATCH_GAP, FARMER_MAX_GAP, FARMER_SEARCH_SECONDS,
  GROUND_Y, HIDE_SECONDS, INVULNERABLE_SECONDS, LIVES, MAX_RUN_SPEED, NOISE_DRAIN,
  NOISE_RISE_LIT_FROZEN, NOISE_RISE_LIT_MOVING, NOISE_SPOT,
  PX_PER_METER, SPOT_LOSE_GAP, STAGES, STUMBLE_GAIN, VIEW_WIDTH, stageFor,
} from './config.js';
import { TURKEY_WIDTH, createTurkey, drawTurkey, turkeyBox, turkeyHide, turkeyJump, turkeySlide, turkeyStumble, updateTurkey } from './turkey.js';
import { createFarmer, drawFarmer, farmerSetGap, farmerShiftGap, farmerStartSearch, lanternBeam, updateFarmer } from './farmer.js';
import { KIND_CORN, KIND_FEATHER, KIND_HAY, drawObstacle, drawPickup, obstacleBox, spawnObstacle, spawnPickup } from './hazards.js';

export const EVENT_NONE = 0;
export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_ESCAPED = 4;
export const EVENT_COIN = 8;
export const EVENT_STAGE = 16;
export const EVENT_HIDDEN = 32;
export const EVENT_SPOTTED = 64;

export function createWorld(random) {
  return {
    random,
    turkey: createTurkey(),
    farmer: createFarmer(),
    obstacles: [],
    pickups: [],
    scroll: 0,
    distance: 0,
    score: 0,
    lives: LIVES,
    noise: 0,
    stageIndex: 0,
    over: false,
    escaped: false,
    cause: '',
    nextSpawnAt: 900,
    time: 0,
  };
}

export function resetWorld(world) {
  const fresh = createWorld(world.random);
  Object.keys(fresh).forEach((key) => { world[key] = fresh[key]; });
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Is the lantern's light on the turkey right now? When spotted the beam tracks it. */
export function turkeyLit(world) {
  const turkey = world.turkey;
  const beam = lanternBeam(world.farmer, world.time);
  const centerX = turkey.x + TURKEY_WIDTH / 2;
  if (world.farmer.spotted) return true;
  return centerX > beam.beamX - beam.half && centerX < beam.beamX + beam.half;
}

export function runSpeed(world) {
  const ramp = Math.min(1, world.distance / ESCAPE_METERS);
  return BASE_RUN_SPEED + (MAX_RUN_SPEED - BASE_RUN_SPEED) * ramp;
}

export function stageIndexFor(meters) {
  let index = 0;
  STAGES.forEach((stage, i) => { if (meters >= stage.from) index = i; });
  return index;
}

export function worldStep(world, dt, control) {
  if (world.over || world.escaped) return EVENT_NONE;
  let events = EVENT_NONE;
  const turkey = world.turkey;
  const farmer = world.farmer;
  world.time += dt;

  // Freeze: hold still in the dark. The world stops scrolling while the
  // turkey crouches — but the farmer uses the pause to close in, so a freeze
  // is a trade, not a free wait. Jumping cancels the freeze for that step.
  const frozen = !!control.freezeHeld && !control.jump && turkey.grounded && !turkey.hiding;
  turkey.frozen = frozen;
  if (control.jump) turkeyJump(turkey);
  turkeySlide(turkey, (control.slideHeld || frozen) && !turkey.hiding);
  updateTurkey(turkey, dt, !frozen);

  const speed = runSpeed(world);
  const advance = frozen ? 0 : speed * dt;
  world.scroll += advance;
  world.distance += advance / PX_PER_METER;
  world.score += advance * 0.02;

  // Spawn ahead of the right edge, spaced by the current stage. nextSpawnAt
  // is a SCROLL distance (not a screen x): the obstacle enters at the right
  // edge and scrolls left at the same rate the world advances.
  const stage = stageFor(world.distance);
  if (world.scroll >= world.nextSpawnAt) {
    const enterX = VIEW_WIDTH + 120;
    const obstacle = spawnObstacle(world.random, enterX, stageIndexFor(world.distance), world.distance);
    world.obstacles.push(obstacle);
    if (world.random() < 0.55) {
      world.pickups.push(spawnPickup(world.random, enterX + 130, world.distance));
    }
    world.nextSpawnAt = world.scroll + stage.spawnGap + world.random() * 120;
  }

  // Move the world left past the turkey.
  for (const obstacle of world.obstacles) {
    obstacle.x -= advance;
    if (obstacle.kind === 'knife') obstacle.swing += dt * 2.4;
    if (obstacle.kind === 'pumpkin') obstacle.roll += advance * 0.03;
  }
  for (const pickup of world.pickups) pickup.x -= advance;
  world.obstacles = world.obstacles.filter((o) => o.x > -220);
  world.pickups = world.pickups.filter((p) => p.x > -80 && !p.taken);

  // The lantern and the noise meter.
  const lit = turkeyLit(world);
  turkey.lit = lit;
  if (turkey.hiding) {
    world.noise = 0;
  } else if (lit) {
    world.noise += (frozen ? NOISE_RISE_LIT_FROZEN : NOISE_RISE_LIT_MOVING) * dt;
  } else {
    world.noise -= NOISE_DRAIN * dt;
  }
  world.noise = Math.max(0, Math.min(NOISE_SPOT, world.noise));
  if (world.noise >= NOISE_SPOT && !farmer.spotted && !turkey.hiding) {
    farmer.spotted = true;
    events |= EVENT_SPOTTED;
  }
  // Outrun him: a wide enough gap while spotted loses the trail.
  if (farmer.spotted && farmer.gap >= SPOT_LOSE_GAP) {
    farmer.spotted = false;
    world.noise = 40;
  }

  // Hay bales: sliding into one hides the turkey and throws the farmer off.
  const box = turkeyBox(turkey);
  for (const obstacle of world.obstacles) {
    if (obstacle.kind !== KIND_HAY) continue;
    if (!turkey.hiding && turkey.sliding && overlaps(box, obstacleBox(obstacle))) {
      if (turkeyHide(turkey, HIDE_SECONDS)) {
        farmerStartSearch(farmer, FARMER_SEARCH_SECONDS);
        farmerShiftGap(farmer, 90);
        world.noise = 0;
        events |= EVENT_HIDDEN;
      }
    }
  }

  // Pickups.
  for (const pickup of world.pickups) {
    if (!pickup.taken && overlaps(box, { x: pickup.x, y: pickup.y, w: pickup.w, h: pickup.h })) {
      pickup.taken = true;
      world.score += pickup.kind === KIND_FEATHER ? 50 : 10;
      events |= EVENT_COIN;
    }
  }

  // Hits: one stumble costs a life, knocks the turkey up and lets the farmer gain.
  if (turkey.invulnerableLeft <= 0 && !turkey.hiding) {
    for (const obstacle of world.obstacles) {
      if (obstacle.kind === KIND_HAY) continue;
      if (overlaps(box, obstacleBox(obstacle))) {
        world.lives -= 1;
        turkeyStumble(turkey);
        turkey.invulnerableLeft = INVULNERABLE_SECONDS;
        farmerShiftGap(farmer, -STUMBLE_GAIN);
        events |= EVENT_HIT;
        obstacle.passed = true;
        break;
      }
    }
  }

  // The farmer: caught means a lost life and a shove back to a safe gap.
  updateFarmer(farmer, dt, !frozen, turkey.hiding, frozen);
  if (farmer.gap <= FARMER_CATCH_GAP && turkey.invulnerableLeft <= 0 && !turkey.hiding) {
    world.lives -= 1;
    turkeyStumble(turkey);
    turkey.invulnerableLeft = INVULNERABLE_SECONDS;
    farmerSetGap(farmer, 150);
    farmer.caughtFlash = 0.6;
    farmer.spotted = false;
    world.noise = 0;
    events |= EVENT_HIT;
  }

  const newStage = stageIndexFor(world.distance);
  if (newStage !== world.stageIndex) {
    world.stageIndex = newStage;
    events |= EVENT_STAGE;
  }

  if (world.lives <= 0) {
    world.over = true;
    world.cause = 'caught';
    return events | EVENT_OVER;
  }
  if (world.distance >= ESCAPE_METERS) {
    world.escaped = true;
    world.cause = 'escaped';
    world.score += 500;
    return events | EVENT_ESCAPED;
  }
  return events;
}

export function drawWorld(ctx, world) {
  for (const obstacle of world.obstacles) drawObstacle(ctx, obstacle, world.time);
  for (const pickup of world.pickups) drawPickup(ctx, pickup, world.time);
  drawTurkey(ctx, world.turkey);
  drawFarmer(ctx, world.farmer);
}

export { GROUND_Y };
