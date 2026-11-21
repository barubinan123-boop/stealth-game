// Ember Vault's three levels. Each map is a grid of tiles; the legend is:
//   # wall        . floor       , shadow floor (dark, hides the thief)
//   C crate       B bush         L lantern (bright floor, easier to be seen)
//   P thief start R relic        E exit         G guard start
// Guards patrol the waypoints listed per level (tile coordinates); the world
// finds its own path between them, so a patrol never needs a straight corridor.

export const LEVELS = [
  {
    name: 'The Quiet Gallery',
    brief: 'Two relics, two guards. Learn the patrols, stay in the dark.',
    relicsToWin: 2,
    map: [
      '########################',
      '#......#.......#.......#',
      '#..P...#...R...#...C...#',
      '#......#.......#.......#',
      '#..C.......,.......,...#',
      '#......#.......#.......#',
      '####.####...####.####..#',
      '#......,....C....,.....#',
      '#..B...#.......#...B...#',
      '#......#...R...#.......#',
      '#..C...#.......#...C...#',
      '#......#.......#.......#',
      '####.####...####.####..#',
      '#......#.......#....E..#',
      '#..,...#...,...#.......#',
      '########################',
    ],
    guards: [
      { waypoints: [[4, 7], [19, 7]], pause: 1.2 },
      { waypoints: [[21, 2], [21, 13]], pause: 0.8 },
    ],
  },
  {
    name: 'The Ember Vault',
    brief: 'Three relics, three guards, and lantern light over the vault floor.',
    relicsToWin: 3,
    map: [
      '##########################',
      '#....#......#.....#......#',
      '#.P..#..R...#..C..#......#',
      '#....#......#.....#......#',
      '#..C.....B......,....C..,#',
      '#....#......#.....#......#',
      '##.####..#####.#####..##.#',
      '#.....,.....C.....,......#',
      '#.B..#......#..B..#..R...#',
      '#....#..C...#L....#......#',
      '#....#......#.....#......#',
      '##.####..#####.#####..##.#',
      '#....,.....#.....,....C..#',
      '#..C.#L.R..#..B..#.......#',
      '#....#.....#.....#...E...#',
      '#....#.....#.....#.......#',
      '#.,..#..,..#..,..#..,...,#',
      '##########################',
    ],
    guards: [
      { waypoints: [[3, 7], [22, 7]], pause: 1.0 },
      { waypoints: [[4, 10], [22, 10]], pause: 0.8 },
      { waypoints: [[22, 2], [22, 5]], pause: 1.4 },
    ],
  },
  {
    name: "The Warden's Maze",
    brief: 'Four guards on crossing patrols. Ghost it, and the bonus is yours.',
    relicsToWin: 3,
    map: [
      '############################',
      '#......#.......#.......#...#',
      '#..P...#...R...#...C...#...#',
      '#......#.......#.......#...#',
      '#..C.......,.......,...#...#',
      '#......#.......#.......#...#',
      '####.####...####.####..#...#',
      '#......,....C....,.........#',
      '#..B...#.......#...B...#...#',
      '#......#...R.L.#.......#...#',
      '#..C...#.......#...C...#...#',
      '#......#.......#....L..#...#',
      '####.####...####.####..#...#',
      '#......#.......#....E......#',
      '#..,...#...,...#.......#...#',
      '#......#.......#.......#..R#',
      '#..,.....,.....,....,...#..#',
      '############################',
    ],
    guards: [
      { waypoints: [[4, 7], [22, 7]], pause: 1.0 },
      { waypoints: [[14, 1], [14, 16]], pause: 0.7 },
      { waypoints: [[25, 2], [25, 15]], pause: 1.2 },
      { waypoints: [[8, 13], [20, 13]], pause: 0.9 },
    ],
  },
];

// Read a level definition into the tile grid the world steps on. Walls and crates
// block movement and sight; bushes block sight only; shadow and lantern tiles
// are floor with a lighting tag the detection math reads.
export function parseLevel(def) {
  const height = def.map.length;
  const width = def.map[0].length;
  const tiles = [];
  const relics = [];
  let player = null;
  let exit = null;
  const guardSpawns = [];
  for (let y = 0; y < height; y += 1) {
    const row = [];
    for (let x = 0; x < width; x += 1) {
      const ch = def.map[y][x];
      if (ch === 'P') player = { x, y };
      if (ch === 'R') relics.push({ x, y, taken: false });
      if (ch === 'E') exit = { x, y };
      if (ch === 'G') guardSpawns.push({ x, y });
      row.push(ch);
    }
    tiles.push(row);
  }
  return { def, width, height, tiles, relics, player, exit, guardSpawns };
}

export function tileAt(level, x, y) {
  if (x < 0 || y < 0 || x >= level.width || y >= level.height) return '#';
  return level.tiles[y][x];
}

// A tile the thief or a guard can stand on. Bushes are walkable; crates are not.
export function walkable(level, x, y) {
  const tile = tileAt(level, x, y);
  return tile !== '#' && tile !== 'C';
}

// A tile that stops a guard's line of sight: walls, crates and bushes.
export function blocksSight(level, x, y) {
  const tile = tileAt(level, x, y);
  return tile === '#' || tile === 'C' || tile === 'B';
}

export function isShadow(level, x, y) {
  return tileAt(level, x, y) === ',';
}

export function isLit(level, x, y) {
  return tileAt(level, x, y) === 'L';
}
