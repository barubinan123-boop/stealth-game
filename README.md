# stealth-game

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/barubinan123-boop/stealth-game/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/barubinan123-boop/stealth-game/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

**Ember Vault** — a top-down stealth game in the browser. You are Wren, a thief slipping through three lamplit galleries at night. Pocket every ember relic, reach the glowing exit, and never let a guard see you.

Guards patrol with visible vision cones: yellow while calm, orange while suspicious, red while chasing. Shadow hides you, lantern light exposes you, bushes block a guard's sight, and running is loud enough to be heard through walls. Sneak (Shift) to move slowly, quietly, and half as visible. Get caught and the gallery resets — three attempts per level.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. No build step, no network: the game is plain static files under `game/`.

## How to play

- **WASD / arrow keys** — move
- **Shift (hold)** — sneak: slower, silent, harder to spot
- **Click** — walk there (the thief paths around walls)
- **R** — restart the level · **P** — pause · **M** — mute

Three galleries, three relics at most per level, a time bonus, and a Ghost bonus of 400 points per level for never being seen at all. The exit only opens once every relic on the level is pocketed.

## Layout

- `game/index.html` — the page; `game/src/main.js` — bootstrap and loop
- `game/src/world.js` — the rules (relics, exit, noise, attempts, score)
- `game/src/guard.js` — guard AI (patrol, suspicion, chase, search) and vision cones
- `game/src/levels.js` — the three gallery maps and patrol routes
- `game/src/render.js` — all canvas drawing; `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — synthesised WebAudio sounds (no audio files)
- `game/src/shots.js` — the deterministic screenshot scenes (`?shot=start|play|alert|end`)
- `game/src/config.js` — every tuning number; `game/src/random.js` — seeded RNG
- `main.ts` — the hand-in program (copies `game/` + `screenshots/` to `/output`, writes `dossier.json`)
- `screenshots/` — 4 screenshots of the game itself, the first by name is the cover

## Verify it

```sh
node /tmp/ember-test.mjs   # maps, reachability, patrols, and a bot that clears every level
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=s0awek38&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
