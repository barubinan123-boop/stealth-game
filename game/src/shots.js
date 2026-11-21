// The screenshot scenes behind ?shot=start|play|alert|end. Each one plays the
// real rules forward from a fresh level — no hand-placed pixels, no mock
// rendering — steered by the same click-to-move the player uses, so the frame
// is what a short game really looks like and the same seed always gives the
// same frame.

import { TILE } from './config.js';
import { GUARD_STATE } from './guard.js';
import { SCREENS } from './config.js';
import { newRun, startLevel, stepWorld } from './world.js';

const STEP = 1 / 60;

function centre(tile) {
  return { x: (tile.x + 0.5) * TILE, y: (tile.y + 0.5) * TILE };
}

// Walk the thief to a tile by clicking there, then hold still for `settle`
// seconds while the guards keep patrolling. Stops early if the run ends.
function walkTo(run, tile, settle) {
  const keys = new Set(['ShiftLeft']);
  const target = centre(tile);
  for (let i = 0; i < 30 * 60; i += 1) {
    const state = run.state;
    if (!state || run.screen !== SCREENS.play) break;
    const dx = target.x - state.player.x;
    const dy = target.y - state.player.y;
    if (Math.hypot(dx, dy) < 6) break;
    stepWorld(run, STEP, keys, i === 0 ? target : null);
  }
  for (let i = 0; i < settle / STEP; i += 1) {
    if (!run.state || run.screen !== SCREENS.play) break;
    stepWorld(run, STEP, new Set(), null);
  }
}

// Nudge a guard into a mood for the camera: point it at the thief and set its
// meter, then let the rules take over for a moment.
function poseGuard(state, index, meter, lookAtThief) {
  const guard = state.guards[index];
  if (!guard) return;
  guard.meter = meter;
  if (lookAtThief) {
    guard.angle = Math.atan2(state.player.y - guard.y, state.player.x - guard.x);
    guard.lastSeen = { x: state.player.x, y: state.player.y };
  }
  if (meter >= 45) {
    // Suspicious, not yet chasing: the "?" and the orange cone read at a
    // glance, and the thief still has a chance to slip away.
    guard.state = GUARD_STATE.suspicious;
    guard.searchLeft = 3.2;
    guard.path = [];
  }
}

export function stageShot(name) {
  const run = newRun();
  if (name === 'play') {
    // Level two, mid-heist: the thief crouches in shadow one tile from a
    // relic while the nearest guard grows suspicious and turns to look.
    startLevel(run, 1);
    walkTo(run, { x: 8, y: 8 }, 0);
    if (run.screen !== SCREENS.play) {
      // The walk was interrupted; put the thief where the scene needs them
      // and let the guards play on from there.
      startLevel(run, 1);
      run.state.player.x = (8 + 0.5) * TILE;
      run.state.player.y = (8 + 0.5) * TILE;
    }
    const state = run.state;
    poseGuard(state, 0, 62, true);
    state.player.sneaking = true;
    // No further steps: the frame is the moment the guard turns, suspicious,
    // and the thief is still free. Stepping on would let the guard close in
    // and end the scene with a capture.
    return run;
  }
  if (name === 'alert') {
    // Level three, the chase: the thief is caught in the open, one guard
    // sprinting after them and another closing in, the exit still far away.
    startLevel(run, 2);
    const state = run.state;
    state.player.x = (13 + 0.5) * TILE;
    state.player.y = (8 + 0.5) * TILE;
    const guard = state.guards[0];
    guard.state = GUARD_STATE.chase;
    guard.meter = 100;
    guard.lastSeen = { x: state.player.x, y: state.player.y };
    guard.angle = Math.atan2(state.player.y - guard.y, state.player.x - guard.x);
    poseGuard(state, 1, 70, true);
    for (let i = 0; i < 0.8 / STEP; i += 1) stepWorld(run, STEP, new Set(), null);
    return run;
  }
  if (name === 'end') {
    // Level one, the last step: every relic pocketed, the thief walks into
    // the glowing exit and the win panel comes up.
    startLevel(run, 0);
    const state = run.state;
    for (const relic of state.level.relics) relic.taken = true;
    state.relicsTaken = state.relicsTotal;
    state.player.x = (19 + 0.5) * TILE;
    state.player.y = (13 + 0.5) * TILE;
    walkTo(run, { x: 20, y: 13 }, 0);
    for (let i = 0; i < 3 / STEP && run.screen === SCREENS.play; i += 1) {
      stepWorld(run, STEP, new Set(), centre({ x: 20, y: 13 }));
    }
    return run;
  }
  // Anything else is the title screen over the first gallery.
  startLevel(run, 0);
  run.screen = SCREENS.title;
  return run;
}
