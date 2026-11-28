// Everything the turkey runs into: fences, ovens, swinging carving knives,
// rolling pumpkins, hay bales to hide behind — plus corn and golden feathers.
// Spawning is seeded and distance-based, so difficulty ramps farmyard to kitchen.
import { GROUND_Y } from './config.js';
import { between, pick } from './random.js';

export const KIND_FENCE = 'fence';
export const KIND_OVEN = 'oven';
export const KIND_KNIFE = 'knife';
export const KIND_PUMPKIN = 'pumpkin';
export const KIND_HAY = 'hay';
export const KIND_CORN = 'corn';
export const KIND_FEATHER = 'feather';

function obstacleSize(kind) {
  if (kind === KIND_FENCE) return { w: 46, h: 74 };
  if (kind === KIND_OVEN) return { w: 100, h: 88 };
  if (kind === KIND_KNIFE) return { w: 30, h: 150 };
  if (kind === KIND_PUMPKIN) return { w: 62, h: 62 };
  return { w: 120, h: 84 };
}

function kindsForStage(stageIndex) {
  if (stageIndex === 0) return [KIND_FENCE, KIND_PUMPKIN, KIND_HAY, KIND_FENCE, KIND_PUMPKIN];
  // R3: hay is the safe reset against the lantern (it blocks the light and
  // zeroes the noise), so the patrol stage hides more of it.
  if (stageIndex === 1) return [KIND_FENCE, KIND_HAY, KIND_OVEN, KIND_PUMPKIN, KIND_HAY, KIND_KNIFE];
  return [KIND_OVEN, KIND_KNIFE, KIND_OVEN, KIND_PUMPKIN, KIND_HAY, KIND_KNIFE];
}

export function spawnObstacle(random, x, stageIndex, meters) {
  const kind = pick(random, kindsForStage(stageIndex));
  const size = obstacleSize(kind);
  const obstacle = { kind, x, y: GROUND_Y - size.h, w: size.w, h: size.h, passed: false, swing: between(random, 0, Math.PI * 2) };
  if (kind === KIND_KNIFE) {
    obstacle.y = GROUND_Y - 260;
    obstacle.h = 150;
    obstacle.pivotY = GROUND_Y - 260;
  }
  if (kind === KIND_PUMPKIN) obstacle.roll = 0;
  return obstacle;
}

export function spawnPickup(random, x, meters) {
  const golden = random() < 0.12;
  return {
    kind: golden ? KIND_FEATHER : KIND_CORN,
    x,
    y: GROUND_Y - (golden ? 190 : between(random, 90, 170)),
    w: 34,
    h: 34,
    taken: false,
    bob: between(random, 0, Math.PI * 2),
  };
}

export function obstacleBox(obstacle) {
  if (obstacle.kind === KIND_KNIFE) {
    // The blade hangs and swings; only its lower half can hit.
    const swing = Math.sin(obstacle.swing) * 46;
    return { x: obstacle.x + swing - 8, y: obstacle.y + 78, w: 26, h: 72 };
  }
  return { x: obstacle.x + 4, y: obstacle.y + 4, w: obstacle.w - 8, h: obstacle.h - 4 };
}

export function drawObstacle(ctx, obstacle, time) {
  const { x, y, w, h } = obstacle;
  if (obstacle.kind === KIND_FENCE) {
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(x, y + 8, w, 10);
    ctx.fillRect(x, y + 40, w, 10);
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(x + 4, y, 10, h);
    ctx.fillRect(x + w - 14, y, 10, h);
    return;
  }
  if (obstacle.kind === KIND_OVEN) {
    // R3: at night the oven is a light source, so its fire burns brighter.
    const glow = 0.7 + Math.sin(time * 5 + x) * 0.25;
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = `rgba(255, 120, 20, ${glow})`;
    ctx.fillRect(x + 12, y + 18, w - 24, h - 34);
    ctx.fillStyle = '#1d1d1d';
    ctx.fillRect(x + 22, y + 30, w - 44, h - 52);
    ctx.fillStyle = `rgba(255, 170, 40, ${glow})`;
    ctx.beginPath();
    ctx.moveTo(x + 30, y + h - 24);
    ctx.lineTo(x + 42, y + 44);
    ctx.lineTo(x + 54, y + h - 24);
    ctx.lineTo(x + 66, y + 44);
    ctx.lineTo(x + 78, y + h - 24);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#cfcfcf';
    ctx.fillRect(x + w - 16, y + 8, 10, 8);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HOT!', x + w / 2, y - 10);
    return;
  }
  if (obstacle.kind === KIND_KNIFE) {
    const swing = Math.sin(obstacle.swing) * 0.5;
    ctx.save();
    ctx.translate(x + 15, obstacle.pivotY);
    ctx.rotate(swing);
    ctx.fillStyle = '#5b3a1e';
    ctx.fillRect(-3, 0, 6, 26);
    ctx.fillStyle = '#e8e8e8';
    ctx.beginPath();
    ctx.moveTo(-13, 24);
    ctx.lineTo(13, 24);
    ctx.lineTo(0, 150);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#9aa0a6';
    ctx.beginPath();
    ctx.moveTo(-13, 24);
    ctx.lineTo(0, 150);
    ctx.lineTo(0, 24);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }
  if (obstacle.kind === KIND_PUMPKIN) {
    ctx.fillStyle = '#e8862e';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, 30, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b85c14';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 20, y + 6);
    ctx.quadraticCurveTo(x + 14, y + 34, x + 20, y + 56);
    ctx.moveTo(x + 42, y + 6);
    ctx.quadraticCurveTo(x + 48, y + 34, x + 42, y + 56);
    ctx.stroke();
    ctx.fillStyle = '#3f7a2a';
    ctx.fillRect(x + 26, y - 8, 8, 12);
    return;
  }
  // Hay bale: the one safe thing — slide into it to hide.
  ctx.fillStyle = '#d9a441';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#a87c22';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w / 2 - 10, h / 2 - 8, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w / 2, y + h / 2, w / 2 - 22, h / 2 - 16, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HIDE!', x + w / 2, y - 10);
}

export function drawPickup(ctx, pickup, time) {
  const bobY = pickup.y + Math.sin(time * 3 + pickup.bob) * 6;
  if (pickup.kind === KIND_CORN) {
    ctx.fillStyle = '#f2c230';
    ctx.beginPath();
    ctx.ellipse(pickup.x + 17, bobY + 17, 12, 16, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3f7a2a';
    ctx.beginPath();
    ctx.ellipse(pickup.x + 17, bobY + 30, 12, 6, 0.3, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.moveTo(pickup.x + 17, bobY);
  ctx.quadraticCurveTo(pickup.x + 34, bobY + 16, pickup.x + 17, bobY + 34);
  ctx.quadraticCurveTo(pickup.x, bobY + 16, pickup.x + 17, bobY);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('+50', pickup.x + 17, bobY - 8);
}
