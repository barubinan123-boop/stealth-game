// Ember Vault: shared tuning for the whole game. One place holds every number the
// rules care about, so balancing the stealth (speeds, sight, noise) never means
// hunting through the world, guard or render code.

export const TILE = 40;

export const PLAYER = {
  radius: 13,
  walkSpeed: 150,
  sneakSpeed: 88,
  // How fast the eye fills while a guard can see the thief, at point blank.
  seenRate: 85,
  // Detection drains this fast per second while nobody sees the thief.
  calmRate: 26,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 62,
  investigateSpeed: 96,
  chaseSpeed: 135,
  // Vision cone: how far a guard sees, and how wide the cone opens.
  sightRange: 195,
  halfFov: 0.68,
  // Past this much of the meter a guard stops patrolling and walks over to look.
  suspiciousAt: 45,
  // A full meter means the guard knows where the thief is and gives chase.
  alertAt: 100,
  // A chasing guard that cannot see the thief for this long gives up and searches.
  loseSightAfter: 2.4,
  // How long a guard searches the last seen spot before going back to patrol.
  searchTime: 3.2,
  // Hearing: a running thief is heard this far away; a sneaking one is silent.
  hearRange: 130,
};

export const WORLD = {
  // One relic is worth this many points; the ghost bonus is paid per level.
  relicScore: 250,
  ghostBonus: 400,
  // A guard that reaches the thief ends the attempt.
  catchDistance: 30,
  // Standing in shadow multiplies how fast a guard's meter fills.
  shadowFactor: 0.38,
  // Sneaking multiplies it too; the two stack, so a sneaking thief in shadow
  // is almost invisible until a guard is right on top of them.
  sneakFactor: 0.5,
  // Bright lantern light makes the thief easier to spot.
  lightFactor: 1.45,
  // Noise a running thief makes reaches guards this far, through walls.
  noiseRange: 130,
};

export const SCREENS = {
  title: 'title',
  play: 'play',
  caught: 'caught',
  clear: 'clear',
  win: 'win',
  paused: 'paused',
};
