// The world: one level's live state and the step that moves it. The thief moves
// with the keys or a clicked destination, guards think in guard.js, and this
// module owns the rules that join them: relics, the exit, noise, attempts and
// the score. Nothing here draws or listens; render.js and input.js do that.

import { PLAYER, SCREENS, TILE, WORLD } from './config.js';
import { GUARD_STATE, canSee, findPath, makeGuard, moveCircle, stepGuard } from './guard.js';
import { LEVELS, isShadow, parseLevel } from './levels.js';

export function newRun() {
  return {
    levelIndex: 0,
    score: 0,
    // Attempts are per level: three chances to clear a level before the run
    // restarts from level one. Caught once too often, back to the gallery.
    attemptsLeft: 3,
    seenEver: false,
    screen: SCREENS.title,
    state: null,
    time: 0,
  };
}

export function startLevel(run, levelIndex) {
  const def = LEVELS[levelIndex];
  const level = parseLevel(def);
  const guards = def.guards.map((guardDef, index) => {
    const spawn = level.guardSpawns[index] ?? null;
    return makeGuard(guardDef, index, spawn);
  });
  run.levelIndex = levelIndex;
  run.state = {
    level,
    player: {
      x: (level.player.x + 0.5) * TILE,
      y: (level.player.y + 0.5) * TILE,
      radius: PLAYER.radius,
      angle: 0,
      moving: false,
      sneaking: false,
      clickTarget: null,
      clickPath: [],
      noisePulse: 0,
    },
    guards,
    relicsTaken: 0,
    relicsTotal: level.relics.length,
    alarm: 0,
    message: '',
    messageLeft: 0,
    time: 0,
    // The highest detection meter among the guards, for the HUD eye.
    hottest: 0,
  };
  run.screen = SCREENS.play;
  return run.state;
}

export function restartLevel(run) {
  run.attemptsLeft -= 1;
  if (run.attemptsLeft <= 0) {
    run.attemptsLeft = 3;
    run.levelIndex = 0;
    run.score = 0;
    run.seenEver = false;
    startLevel(run, 0);
    run.screen = SCREENS.caught;
    return;
  }
  startLevel(run, run.levelIndex);
}

function tileCentre(tile) {
  return { x: (tile.x + 0.5) * TILE, y: (tile.y + 0.5) * TILE };
}

// One fixed step of the live game. `keys` is the set of held keys, `click` a
// pixel destination or null. Returns an event name for the sound layer:
// 'pickup', 'caught', 'clear', 'win', 'spotted', 'noise' or null.
export function stepWorld(run, dt, keys, click) {
  const state = run.state;
  if (!state || run.screen !== SCREENS.play) return null;
  state.time += dt;
  run.time += dt;
  const player = state.player;
  const level = state.level;

  player.sneaking = keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('KeyC');
  const speed = player.sneaking ? PLAYER.sneakSpeed : PLAYER.walkSpeed;

  let mx = 0;
  let my = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) my -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) my += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;

  if (click) {
    player.clickTarget = click;
    player.clickPath = findPath(
      level,
      { x: Math.floor(player.x / TILE), y: Math.floor(player.y / TILE) },
      { x: Math.floor(click.x / TILE), y: Math.floor(click.y / TILE) },
    );
    if (player.clickPath.length === 0) player.clickPath = [click];
  }

  player.moving = false;
  if (mx !== 0 || my !== 0) {
    player.clickTarget = null;
    player.clickPath = [];
    const length = Math.hypot(mx, my);
    moveCircle(level, player, (mx / length) * speed * dt, (my / length) * speed * dt);
    player.angle = Math.atan2(my, mx);
    player.moving = true;
  } else if (player.clickPath.length > 0) {
    const target = player.clickPath[0];
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 5) {
      player.clickPath.shift();
    } else {
      moveCircle(level, player, (dx / distance) * speed * dt, (dy / distance) * speed * dt);
      player.angle = Math.atan2(dy, dx);
      player.moving = true;
    }
  }

  // Running is loud: every step pings the guards, sneaking stays silent.
  let noise = null;
  if (player.moving && !player.sneaking) {
    player.noisePulse -= dt;
    if (player.noisePulse <= 0) {
      player.noisePulse = 0.55;
      noise = { x: player.x, y: player.y, range: WORLD.noiseRange };
    }
  }

  // Guards sense, think and move. A guard that touches the thief ends the run.
  let hottest = 0;
  let caught = false;
  for (const guard of state.guards) {
    const sees = canSee(level, guard, player);
    const wasCalm = guard.meter < 45;
    const hit = stepGuard(level, guard, dt, {
      seesThief: sees,
      thief: player,
      sneaking: player.sneaking,
      noise,
    });
    if (sees) run.seenEver = true;
    if (wasCalm && guard.meter >= 45) {
      state.message = 'A guard is suspicious…';
      state.messageLeft = 2;
    }
    if (guard.meter > hottest) hottest = guard.meter;
    if (hit) caught = true;
  }
  state.hottest = hottest;
  state.alarm = Math.max(0, ...state.guards.map((g) => (g.state === GUARD_STATE.chase ? 1 : g.state === GUARD_STATE.suspicious || g.state === GUARD_STATE.search ? 0.5 : 0)));

  if (state.messageLeft > 0) state.messageLeft -= dt;

  if (caught) {
    run.screen = SCREENS.caught;
    return 'caught';
  }

  // Relics: step close and one is pocketed. The exit only opens once every
  // relic on the level is taken, so the thief cannot sprint past the guards.
  for (const relic of level.relics) {
    if (relic.taken) continue;
    const centre = tileCentre(relic);
    if (Math.hypot(centre.x - player.x, centre.y - player.y) < TILE * 0.7) {
      relic.taken = true;
      state.relicsTaken += 1;
      run.score += WORLD.relicScore;
      state.message = `Relic ${state.relicsTaken} of ${state.relicsTotal} pocketed`;
      state.messageLeft = 2.2;
      if (state.relicsTaken === state.relicsTotal) {
        state.message = 'All relics taken — reach the glowing exit!';
        state.messageLeft = 3;
      }
      return 'pickup';
    }
  }

  if (state.relicsTaken === state.relicsTotal && level.exit) {
    const centre = tileCentre(level.exit);
    if (Math.hypot(centre.x - player.x, centre.y - player.y) < TILE * 0.75) {
      const timeBonus = Math.max(0, Math.round(600 - state.time * 4));
      const ghost = run.seenEver ? 0 : WORLD.ghostBonus;
      run.score += timeBonus + ghost;
      if (run.levelIndex + 1 < LEVELS.length) {
        run.screen = SCREENS.clear;
        return 'clear';
      }
      run.screen = SCREENS.win;
      return 'win';
    }
  }

  if (hottest >= 45 && state.messageLeft <= 0 && hottest < 100) {
    state.message = 'Seen! Break line of sight!';
    state.messageLeft = 1.2;
    return 'spotted';
  }
  if (noise) return 'noise';
  return null;
}

export function playerInShadow(state) {
  return isShadow(state.level, Math.floor(state.player.x / TILE), Math.floor(state.player.y / TILE));
}
