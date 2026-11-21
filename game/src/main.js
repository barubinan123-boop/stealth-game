// Ember Vault's front door: the canvas, the fixed-step loop, the screen flow
// (title → play → caught / cleared → win) and the ?shot= scenes the maker
// photographs. The rules live in world.js; this file only runs them.

import { SCREENS, TILE } from './config.js';
import { LEVELS } from './levels.js';
import { makeAudio } from './audio.js';
import { makeInput, takeClick, takePressed } from './input.js';
import { drawOverlay, drawWorld } from './render.js';
import { stageShot } from './shots.js';
import { newRun, restartLevel, startLevel, stepWorld } from './world.js';

const STEP = 1 / 60;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const audio = makeAudio();
const input = makeInput(canvas);

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number(params.get('seed') ?? '1');
void seedParam;

let run;
if (shotName) {
  run = stageShot(shotName);
} else {
  run = newRun();
  startLevel(run, 0);
  run.screen = SCREENS.title;
}

let view = { scale: 1, offsetX: 0, offsetY: 0, width: 0, height: 0 };
let time = 0;

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const level = run.state ? run.state.level : null;
  const worldWidth = level ? level.width * TILE : 960;
  const worldHeight = level ? level.height * TILE : 640;
  const hud = 44;
  const scale = Math.min(width / worldWidth, (height - hud) / worldHeight);
  // The view is kept in CSS pixels so mouse clicks map to it directly; the
  // render step multiplies by the device pixel ratio when it sets the transform.
  view = {
    scale,
    offsetX: (width - worldWidth * scale) / 2,
    offsetY: hud + (height - hud - worldHeight * scale) / 2,
    width,
    height,
  };
}
window.addEventListener('resize', resize);
resize();

function announce(text) {
  if (status) status.textContent = text;
}

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#0a0d13';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const ratio = window.devicePixelRatio || 1;
  ctx.setTransform(view.scale * ratio, 0, 0, view.scale * ratio, view.offsetX * ratio, view.offsetY * ratio);
  drawWorld(ctx, run, time);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  drawOverlay(ctx, run, view);
}

function advanceScreen() {
  if (run.screen === SCREENS.title) {
    startLevel(run, 0);
    announce('Level one: The Quiet Gallery. Steal the relics, reach the exit unseen.');
  } else if (run.screen === SCREENS.caught) {
    restartLevel(run);
    announce('Back in the gallery. The patrols have forgotten you.');
  } else if (run.screen === SCREENS.clear) {
    startLevel(run, run.levelIndex + 1);
    announce(`Level ${run.levelIndex + 1}: ${LEVELS[run.levelIndex].name}.`);
  } else if (run.screen === SCREENS.win) {
    const fresh = newRun();
    run.levelIndex = fresh.levelIndex;
    run.score = fresh.score;
    run.attemptsLeft = fresh.attemptsLeft;
    run.seenEver = fresh.seenEver;
    startLevel(run, 0);
  }
}

function frame() {
  const pressed = takePressed(input);
  if (pressed.has('KeyM')) {
    const muted = audio.toggleMute();
    announce(muted ? 'Sound off.' : 'Sound on.');
  }
  if (pressed.has('KeyP') && run.screen === SCREENS.play) {
    run.screen = SCREENS.paused;
  } else if (pressed.has('KeyP') && run.screen === SCREENS.paused) {
    run.screen = SCREENS.play;
  }
  if (pressed.has('KeyR') && (run.screen === SCREENS.play || run.screen === SCREENS.caught)) {
    restartLevel(run);
  }
  if (pressed.has('Enter') || pressed.has('Space')) {
    audio.unlock();
    if (run.screen !== SCREENS.play && run.screen !== SCREENS.paused) advanceScreen();
  }

  let event = null;
  if (run.screen === SCREENS.play) {
    const click = takeClick(input, view);
    if (click) audio.play('click');
    event = stepWorld(run, STEP, input.keys, click);
    if (event) audio.play(event);
  } else {
    const click = takeClick(input, view);
    if (click) {
      audio.unlock();
      if (run.screen !== SCREENS.title && run.screen !== SCREENS.paused) {
        // A click on any end panel advances it, like Enter does.
        advanceScreen();
      }
    }
  }

  time += STEP;
  render();
}

if (shotName) {
  // A photograph: one frame of the staged scene, then stop. The page marks
  // itself ready so the screenshot tool knows the frame is painted.
  render();
  window.__shotReady = true;
  document.title = `Ember Vault — ${shotName}`;
} else {
  // The live game: fixed steps, decoupled from the display's refresh rate.
  let last = performance.now();
  let accumulator = 0;
  const loop = (now) => {
    const elapsed = Math.min(0.1, (now - last) / 1000);
    last = now;
    accumulator += elapsed;
    while (accumulator >= STEP) {
      frame();
      accumulator -= STEP;
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
