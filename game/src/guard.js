// Guard brains: patrol, suspicion, chase and search, plus the vision cone that
// decides whether a guard can see the thief at all. A guard only ever knows
// what its cone and its ears tell it, so a careful thief can always slip past.

import { GUARD, PLAYER, TILE, WORLD } from './config.js';
import { blocksSight, isLit, isShadow, walkable } from './levels.js';

export const GUARD_STATE = {
  patrol: 'patrol',
  suspicious: 'suspicious',
  chase: 'chase',
  search: 'search',
  returning: 'returning',
};

// Breadth-first path on the tile grid, returned as pixel waypoints. Guards use
// it between patrol points and when they walk to a noise or a last-seen spot.
export function findPath(level, fromTile, toTile) {
  const key = (x, y) => `${x},${y}`;
  const start = key(fromTile.x, fromTile.y);
  const goal = key(toTile.x, toTile.y);
  if (start === goal) return [];
  const cameFrom = new Map([[start, null]]);
  const queue = [fromTile];
  while (queue.length > 0) {
    const current = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = { x: current.x + dx, y: current.y + dy };
      if (!walkable(level, next.x, next.y)) continue;
      const nextKey = key(next.x, next.y);
      if (cameFrom.has(nextKey)) continue;
      cameFrom.set(nextKey, current);
      if (nextKey === goal) {
        const path = [next];
        let step = current;
        while (step !== null && key(step.x, step.y) !== start) {
          path.unshift(step);
          step = cameFrom.get(key(step.x, step.y));
        }
        return path.map((tile) => ({
          x: (tile.x + 0.5) * TILE,
          y: (tile.y + 0.5) * TILE,
        }));
      }
      queue.push(next);
    }
  }
  return [];
}

// A guard's line of sight to a point: inside the cone, in range, and no wall,
// crate or bush on the ray between the two. Sampled in small steps so a thin
// wall can never be skipped over.
export function canSee(level, guard, point) {
  const dx = point.x - guard.x;
  const dy = point.y - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance > GUARD.sightRange) return false;
  if (distance > 4) {
    const angleTo = Math.atan2(dy, dx);
    let diff = angleTo - guard.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) > GUARD.halfFov) return false;
  }
  const steps = Math.ceil(distance / 6);
  for (let i = 1; i < steps; i += 1) {
    const x = guard.x + (dx * i) / steps;
    const y = guard.y + (dy * i) / steps;
    if (blocksSight(level, Math.floor(x / TILE), Math.floor(y / TILE))) return false;
  }
  return true;
}

// How fast this guard's meter fills while it can see the thief: closer is
// worse, shadow and sneaking hide the thief, lantern light exposes them.
export function detectionRate(level, guard, player, sneaking) {
  const distance = Math.hypot(player.x - guard.x, player.y - guard.y);
  const closeness = 1 - (distance / GUARD.sightRange) * 0.55;
  let rate = PLAYER.seenRate * closeness;
  const tileX = Math.floor(player.x / TILE);
  const tileY = Math.floor(player.y / TILE);
  if (isShadow(level, tileX, tileY)) rate *= WORLD.shadowFactor;
  if (isLit(level, tileX, tileY)) rate *= WORLD.lightFactor;
  if (sneaking) rate *= WORLD.sneakFactor;
  return rate;
}

export function makeGuard(def, index, spawn) {
  const first = def.waypoints[0];
  return {
    id: index,
    radius: GUARD.radius,
    x: (spawn ? spawn.x + 0.5 : first[0] + 0.5) * TILE,
    y: (spawn ? spawn.y + 0.5 : first[1] + 0.5) * TILE,
    angle: 0,
    state: GUARD_STATE.patrol,
    waypoints: def.waypoints,
    waypointIndex: 0,
    pause: def.pause ?? 1,
    pauseLeft: 0,
    path: [],
    meter: 0,
    lastSeen: null,
    loseSightLeft: 0,
    searchLeft: 0,
    // A guard that just walked back to patrol forgets the thief entirely.
    alertedOnce: false,
  };
}

// A circle (a body) against the tile grid: move one axis at a time and stop at
// walls and crates, so a body slides along a wall instead of sticking to it.
// The thief and the guards share this; a guard never walks through a wall.
export function moveCircle(level, body, dx, dy) {
  const nextX = body.x + dx;
  const nextY = body.y + dy;
  const radius = body.radius;
  const blockedAt = (x, y) => !walkable(level, Math.floor(x / TILE), Math.floor(y / TILE));
  if (!blockedAt(nextX + Math.sign(dx) * radius, body.y - radius + 1) && !blockedAt(nextX + Math.sign(dx) * radius, body.y + radius - 1) && !blockedAt(nextX + Math.sign(dx) * radius, body.y)) {
    body.x = nextX;
  }
  if (!blockedAt(body.x - radius + 1, nextY + Math.sign(dy) * radius) && !blockedAt(body.x + radius - 1, nextY + Math.sign(dy) * radius) && !blockedAt(body.x, nextY + Math.sign(dy) * radius)) {
    body.y = nextY;
  }
}

// Walk toward a pixel target at a speed, stopping within a few pixels. Returns
// true when the guard arrived. The guard collides with walls, so a chase
// around a corner follows the corridor instead of cutting through it.
export function moveToward(level, guard, target, speed, dt) {
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 4) return true;
  const step = Math.min(distance, speed * dt);
  moveCircle(level, guard, (dx / distance) * step, (dy / distance) * step);
  guard.angle = Math.atan2(dy, dx);
  return step >= distance;
}

// One guard's step. The world hands it what the guard's senses report (whether
// it sees the thief, where the thief is, and the nearest noise), and the guard
// answers with its new state and whether it caught the thief.
export function stepGuard(level, guard, dt, senses) {
  const { seesThief, thief, noise } = senses;
  if (seesThief) {
    guard.meter = Math.min(GUARD.alertAt, guard.meter + detectionRate(level, guard, thief, senses.sneaking) * dt);
    guard.lastSeen = { x: thief.x, y: thief.y };
    guard.loseSightLeft = GUARD.loseSightAfter;
  } else {
    guard.meter = Math.max(0, guard.meter - 26 * dt);
  }

  if (guard.meter >= GUARD.alertAt && guard.state !== GUARD_STATE.chase) {
    guard.state = GUARD_STATE.chase;
    guard.alertedOnce = true;
    guard.path = [];
  }

  if (guard.state === GUARD_STATE.chase) {
    if (seesThief) {
      guard.loseSightLeft = GUARD.loseSightAfter;
      guard.path = [];
      moveToward(level, guard, thief, GUARD.chaseSpeed, dt);
    } else {
      guard.loseSightLeft -= dt;
      if (guard.loseSightLeft <= 0) {
        guard.state = GUARD_STATE.search;
        guard.searchLeft = GUARD.searchTime;
        guard.path = guard.lastSeen
          ? findPath(level, { x: Math.floor(guard.x / TILE), y: Math.floor(guard.y / TILE) }, { x: Math.floor(guard.lastSeen.x / TILE), y: Math.floor(guard.lastSeen.y / TILE) })
          : [];
      } else if (guard.lastSeen) {
        // The thief broke the line of sight: take the corridors to the last
        // seen spot, never a straight line through the walls.
        if (guard.path.length === 0) {
          guard.path = findPath(level, { x: Math.floor(guard.x / TILE), y: Math.floor(guard.y / TILE) }, { x: Math.floor(guard.lastSeen.x / TILE), y: Math.floor(guard.lastSeen.y / TILE) });
          if (guard.path.length === 0) guard.path = [guard.lastSeen];
        }
        if (moveToward(level, guard, guard.path[0], GUARD.chaseSpeed, dt)) guard.path.shift();
      }
    }
    return Math.hypot(thief.x - guard.x, thief.y - guard.y) <= WORLD.catchDistance;
  }

  if (guard.state === GUARD_STATE.suspicious) {
    if (guard.meter >= GUARD.alertAt) return false;
    if (seesThief && guard.meter >= GUARD.suspiciousAt) {
      guard.state = GUARD_STATE.chase;
      guard.alertedOnce = true;
      return false;
    }
    if (guard.path.length > 0) {
      if (moveToward(level, guard, guard.path[0], GUARD.investigateSpeed, dt)) guard.path.shift();
      return false;
    }
    // Arrived at the spot that worried them: look around, then give up.
    guard.searchLeft -= dt;
    guard.angle += dt * 1.6;
    if (guard.searchLeft <= 0) {
      guard.meter = 0;
      guard.state = GUARD_STATE.returning;
      guard.path = [];
    }
    return false;
  }

  if (guard.state === GUARD_STATE.search) {
    if (seesThief) {
      guard.state = GUARD_STATE.chase;
      guard.alertedOnce = true;
      return false;
    }
    if (guard.path.length > 0) {
      if (moveToward(level, guard, guard.path[0], GUARD.investigateSpeed, dt)) guard.path.shift();
      return false;
    }
    guard.searchLeft -= dt;
    guard.angle += dt * 1.8;
    if (guard.searchLeft <= 0) {
      guard.meter = 0;
      guard.state = GUARD_STATE.returning;
      guard.path = [];
    }
    return false;
  }

  if (guard.state === GUARD_STATE.returning) {
    const target = guard.waypoints[guard.waypointIndex];
    const targetPx = { x: (target[0] + 0.5) * TILE, y: (target[1] + 0.5) * TILE };
    if (guard.path.length === 0) {
      guard.path = findPath(level, { x: Math.floor(guard.x / TILE), y: Math.floor(guard.y / TILE) }, { x: target[0], y: target[1] });
      if (guard.path.length === 0) guard.path = [targetPx];
    }
    if (moveToward(level, guard, guard.path[0], GUARD.patrolSpeed, dt)) guard.path.shift();
    if (guard.path.length === 0) {
      guard.state = GUARD_STATE.patrol;
      guard.pauseLeft = guard.pause;
    }
    return false;
  }

  // Patrol: walk the waypoints, pausing at each end to look around.
  if (guard.pauseLeft > 0) {
    guard.pauseLeft -= dt;
    guard.angle += dt * 0.9;
    return false;
  }
  const target = guard.waypoints[guard.waypointIndex];
  const targetPx = { x: (target[0] + 0.5) * TILE, y: (target[1] + 0.5) * TILE };
  if (guard.path.length === 0) {
    guard.path = findPath(level, { x: Math.floor(guard.x / TILE), y: Math.floor(guard.y / TILE) }, { x: target[0], y: target[1] });
    if (guard.path.length === 0) guard.path = [targetPx];
  }
  if (moveToward(level, guard, guard.path[0], GUARD.patrolSpeed, dt)) {
    guard.path.shift();
    if (guard.path.length === 0) {
      guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
      guard.pauseLeft = guard.pause;
    }
  }

  // A patrolling guard that grows suspicious walks over to have a look.
  if (guard.meter >= GUARD.suspiciousAt) {
    guard.state = GUARD_STATE.suspicious;
    guard.searchLeft = GUARD.searchTime;
    const from = { x: Math.floor(guard.x / TILE), y: Math.floor(guard.y / TILE) };
    const to = guard.lastSeen
      ? { x: Math.floor(guard.lastSeen.x / TILE), y: Math.floor(guard.lastSeen.y / TILE) }
      : from;
    guard.path = findPath(level, from, to);
  } else if (noise && guard.state === GUARD_STATE.patrol) {
    // A running thief's footsteps pull a patrolling guard over to listen.
    const distance = Math.hypot(noise.x - guard.x, noise.y - guard.y);
    if (distance <= GUARD.hearRange) {
      guard.state = GUARD_STATE.suspicious;
      guard.searchLeft = GUARD.searchTime;
      guard.path = findPath(level, { x: Math.floor(guard.x / TILE), y: Math.floor(guard.y / TILE) }, { x: Math.floor(noise.x / TILE), y: Math.floor(noise.y / TILE) });
    }
  }
  return false;
}
