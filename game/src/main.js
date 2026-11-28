// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between four screens: title, play,
// paused and over (caught or escaped).
//
// ?seed=N fixes the farm layout. ?shot=cover|title|kitchen|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_COIN, EVENT_ESCAPED, EVENT_HIDDEN, EVENT_HIT, EVENT_OVER, EVENT_STAGE, resetWorld, worldStep } from './world.js';
import { ACTION_CONFIRM, ACTION_JUMP, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';
import { createAudio } from './audio.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();
world.best = 0;

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  world.best = scene.best;
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  world.best = best;
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    resetWorld(world);
    world.best = best;
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce(`Running. ${LIVES} lives. Escape before the farmer catches you.`);
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.score > best) {
      best = Math.floor(world.score);
      world.best = best;
      saveBest(best);
    }
    if (world.escaped) audio.escaped();
    else audio.caught();
    announce(world.escaped
      ? `Escaped! Score ${Math.floor(world.score)}. Best ${best}.`
      : `Caught. Score ${Math.floor(world.score)}. Best ${best}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_RESTART && (screen === SCREEN_OVER || screen === SCREEN_PLAY)) {
      startGame();
      return;
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Running.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      worldStep(world, STEP, { jump: false, slideHeld: false, freezeHeld: false });
      if (world.over || world.escaped) resetWorld(world);
      return;
    }
    const control = input.control();
    const jumped = control.jump && world.turkey.grounded && !world.turkey.hiding;
    const events = worldStep(world, STEP, control);
    input.consumeJump();
    if (jumped) audio.jump();
    if (events & EVENT_COIN) audio.coin();
    if (events & EVENT_HIDDEN) audio.hidden();
    if (events & EVENT_STAGE) audio.stage();
    if (events & EVENT_HIT) {
      audio.hit();
      announce(world.lives === 1 ? 'Hit. 1 life left.' : `Hit. ${world.lives} lives left.`);
    }
    if (events & (EVENT_OVER | EVENT_ESCAPED)) endGame();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world, screen);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Gobble Getaway. Press Space or click to run from the farmer.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
