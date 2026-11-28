// The farmer: the chase pressure. He starts a gap behind the turkey, gains
// ground on every stumble, and loses it when the turkey runs clean or hides.
// SEARCH is his tell — when the turkey ducks behind hay he stops, looks around,
// and the gap opens again.
//
// R3 "Midnight Sneak": he patrols with a lantern. His gap drifts back and forth
// (a patrol) around a base that grows when the turkey runs clean, shrinks while
// the turkey freezes, and collapses fast once he spots the turkey. The lantern
// hangs from his left hand; its beam sweeps the ground ahead of him, and the
// turkey is lit when its body overlaps the lit ground strip.
import {
  FARMER_MAX_GAP, FREEZE_GAP_CLOSE, LANTERN_DX, LANTERN_HALF, LANTERN_SWEEP,
  LANTERN_SWING, PATROL_AMPLITUDE, PATROL_PERIOD, SPOT_GAP_CLOSE, TURKEY_X,
} from './config.js';

export const FARMER_CHASE = 'chase';
export const FARMER_SEARCH = 'search';

export function createFarmer() {
  return {
    gap: 210, base: 210, state: FARMER_CHASE, searchLeft: 0,
    walkPhase: 0, patrolPhase: 0, caughtFlash: 0, spotted: false,
  };
}

export function farmerX(farmer) {
  return TURKEY_X - farmer.gap - 70;
}

/** Shift the patrol base (the gap the patrol oscillates around) and re-derive the gap. */
export function farmerShiftGap(farmer, delta) {
  farmer.base = Math.max(0, Math.min(FARMER_MAX_GAP, farmer.base + delta));
  farmer.gap = Math.max(0, Math.min(FARMER_MAX_GAP, farmer.base + Math.sin(farmer.patrolPhase) * PATROL_AMPLITUDE));
}

export function farmerSetGap(farmer, value) {
  farmer.base = Math.max(0, Math.min(FARMER_MAX_GAP, value));
  farmer.gap = farmer.base;
}

export function farmerStartSearch(farmer, seconds) {
  farmer.state = FARMER_SEARCH;
  farmer.searchLeft = seconds;
  farmer.spotted = false;
}

/** Where the lantern beam hits the ground right now, and the lantern itself. */
export function lanternBeam(farmer, time) {
  // The lantern is held high in his raised right hand.
  const lx = farmerX(farmer) + 72;
  const ly = 668 - 122;
  const beamX = farmerX(farmer) + LANTERN_DX + Math.sin(time * LANTERN_SWEEP) * LANTERN_SWING;
  return { lx, ly, beamX, half: LANTERN_HALF, spotted: farmer.spotted };
}

export function updateFarmer(farmer, dt, turkeyRunning, turkeyHidden, turkeyFrozen) {
  farmer.walkPhase += dt * 9;
  farmer.patrolPhase += dt * ((Math.PI * 2) / PATROL_PERIOD);
  if (farmer.caughtFlash > 0) farmer.caughtFlash -= dt;
  if (farmer.state === FARMER_SEARCH) {
    farmer.searchLeft -= dt;
    farmer.base = Math.min(FARMER_MAX_GAP, farmer.base + 26 * dt);
    if (farmer.searchLeft <= 0) farmer.state = FARMER_CHASE;
  } else if (turkeyHidden) {
    // Hidden in hay: the farmer holds his patrol, he does not close in.
  } else if (farmer.spotted) {
    // He has seen the turkey: he runs at it until it hides or is caught.
    farmer.base = Math.max(0, farmer.base - SPOT_GAP_CLOSE * dt);
  } else if (turkeyFrozen) {
    // A frozen turkey is a still target: the patrol closes in on it.
    farmer.base = Math.max(0, farmer.base - FREEZE_GAP_CLOSE * dt);
  } else if (turkeyRunning) {
    // Clean running opens the gap slowly; the farmer never gives up for free.
    farmer.base = Math.min(FARMER_MAX_GAP, farmer.base + 9 * dt);
  }
  farmer.gap = Math.max(0, Math.min(FARMER_MAX_GAP, farmer.base + Math.sin(farmer.patrolPhase) * PATROL_AMPLITUDE));
}

export function drawFarmer(ctx, farmer) {
  const x = farmerX(farmer);
  const y = 668 - 118;
  const step = Math.sin(farmer.walkPhase) * 5;
  ctx.save();
  ctx.translate(x, y);
  // Pitchfork, held in his left hand.
  ctx.strokeStyle = '#6b4a2a';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(20, 108);
  ctx.lineTo(10, 6);
  ctx.stroke();
  ctx.strokeStyle = '#cfcfcf';
  ctx.lineWidth = 4;
  for (const prong of [-6, 0, 6]) {
    ctx.beginPath();
    ctx.moveTo(10 + prong, 8);
    ctx.lineTo(10 + prong, -8);
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
  // Arms: one on the fork, one raised high holding the lantern.
  ctx.strokeStyle = '#c0392b';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(28, 30);
  ctx.lineTo(18, 44);
  ctx.moveTo(60, 30);
  ctx.lineTo(72, -8);
  ctx.stroke();
  // The lantern: a warm glow in a dark frame, held high in his right hand.
  const flicker = 0.75 + Math.sin(farmer.walkPhase * 2) * 0.15;
  ctx.fillStyle = `rgba(255, 200, 90, ${0.35 * flicker})`;
  ctx.beginPath();
  ctx.arc(72, -4, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3a2a12';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(72, -8);
  ctx.lineTo(72, -16);
  ctx.stroke();
  ctx.fillStyle = '#2b2b2b';
  ctx.fillRect(63, -16, 18, 24);
  ctx.fillStyle = `rgba(255, 190, 70, ${flicker})`;
  ctx.fillRect(66, -12, 12, 16);
  ctx.fillStyle = '#2b2b2b';
  ctx.fillRect(65, -18, 14, 4);
  ctx.fillRect(65, 8, 14, 4);
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
    ctx.arc(-8, -26, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1d1d1d';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', -8, -26);
  }
  ctx.restore();
}
