// The farmer: the chase pressure. He starts a gap behind the turkey, gains
// ground on every stumble, and loses it when the turkey runs clean or hides.
// SEARCH is his tell — when the turkey ducks behind hay he stops, looks around,
// and the gap opens again.
import { GROUND_Y, TURKEY_X } from './config.js';

export const FARMER_CHASE = 'chase';
export const FARMER_SEARCH = 'search';

export function createFarmer() {
  return { gap: 210, state: FARMER_CHASE, searchLeft: 0, walkPhase: 0, caughtFlash: 0 };
}

export function farmerX(farmer) {
  return TURKEY_X - farmer.gap - 70;
}

export function farmerStartSearch(farmer, seconds) {
  farmer.state = FARMER_SEARCH;
  farmer.searchLeft = seconds;
}

export function updateFarmer(farmer, dt, turkeyRunning, turkeyHidden) {
  farmer.walkPhase += dt * 9;
  if (farmer.caughtFlash > 0) farmer.caughtFlash -= dt;
  if (farmer.state === FARMER_SEARCH) {
    farmer.searchLeft -= dt;
    farmer.gap += 26 * dt;
    if (farmer.searchLeft <= 0) farmer.state = FARMER_CHASE;
    return;
  }
  if (turkeyHidden) return;
  // Clean running opens the gap slowly; the farmer never gives up for free.
  if (turkeyRunning) farmer.gap = Math.min(280, farmer.gap + 9 * dt);
}

export function drawFarmer(ctx, farmer) {
  const x = farmerX(farmer);
  const y = GROUND_Y - 118;
  const step = Math.sin(farmer.walkPhase) * 5;
  ctx.save();
  ctx.translate(x, y);
  // Pitchfork, held high.
  ctx.strokeStyle = '#6b4a2a';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(78, 108);
  ctx.lineTo(88, 6);
  ctx.stroke();
  ctx.strokeStyle = '#cfcfcf';
  ctx.lineWidth = 4;
  for (const prong of [-6, 0, 6]) {
    ctx.beginPath();
    ctx.moveTo(88 + prong, 8);
    ctx.lineTo(88 + prong, -8);
    ctx.stroke();
  }
  // Legs mid-stride, blue overalls, red shirt.
  ctx.strokeStyle = '#2b3a67';
  ctx.lineWidth = 11;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(34, 66);
  ctx.lineTo(28 + step, 108);
  ctx.moveTo(50, 66);
  ctx.lineTo(56 - step, 108);
  ctx.stroke();
  ctx.fillStyle = '#2b3a67';
  ctx.fillRect(24, 44, 40, 30);
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(22, 22, 44, 26);
  ctx.fillStyle = '#2b3a67';
  ctx.fillRect(28, 22, 8, 24);
  ctx.fillRect(50, 22, 8, 24);
  // Arms: one reaching forward, one on the fork.
  ctx.strokeStyle = '#c0392b';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(60, 30);
  ctx.lineTo(82, 44);
  ctx.moveTo(28, 30);
  ctx.lineTo(44, 52);
  ctx.stroke();
  // Head: angry eyes, moustache, straw hat.
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath();
  ctx.arc(44, 10, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5b3a1e';
  ctx.fillRect(32, 2, 24, 4);
  ctx.fillStyle = '#1d1d1d';
  ctx.beginPath();
  ctx.arc(39, 8, 2.5, 0, Math.PI * 2);
  ctx.arc(50, 8, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8c85a';
  ctx.beginPath();
  ctx.ellipse(44, -2, 26, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(30, -16, 28, 14);
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(30, -5, 28, 4);
  if (farmer.state === FARMER_SEARCH) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(78, -26, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1d1d1d';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', 78, -26);
  }
  ctx.restore();
}
