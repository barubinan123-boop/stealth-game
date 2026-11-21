// Ember Vault's look: one canvas, flat shapes and light, no images. The floor
// is a dark gallery at night; lanterns and the exit glow, bushes and shadow are
// visibly dark, and a guard's vision cone is always readable — yellow while
// patrolling, orange while suspicious, red while chasing.

import { GUARD, TILE } from './config.js';
import { GUARD_STATE } from './guard.js';
import { SCREENS } from './config.js';

const FLOOR_A = '#232a38';
const FLOOR_B = '#202634';
const SHADOW_FLOOR = '#141a26';
const WALL = '#3a4356';
const WALL_TOP = '#4d5870';
const CRATE = '#7a5a34';
const CRATE_DARK = '#5d4426';
const BUSH = '#1e4d2e';
const BUSH_LIGHT = '#2a6b40';

function coneColor(state) {
  if (state === GUARD_STATE.chase) return 'rgba(235, 64, 52, 0.30)';
  if (state === GUARD_STATE.suspicious || state === GUARD_STATE.search) return 'rgba(240, 150, 40, 0.26)';
  return 'rgba(240, 210, 90, 0.20)';
}

function coneEdge(state) {
  if (state === GUARD_STATE.chase) return 'rgba(235, 64, 52, 0.55)';
  if (state === GUARD_STATE.suspicious || state === GUARD_STATE.search) return 'rgba(240, 150, 40, 0.5)';
  return 'rgba(240, 210, 90, 0.45)';
}

export function drawFloor(ctx, level) {
  for (let y = 0; y < level.height; y += 1) {
    for (let x = 0; x < level.width; x += 1) {
      const tile = level.tiles[y][x];
      const px = x * TILE;
      const py = y * TILE;
      if (tile === '#') continue;
      ctx.fillStyle = tile === ',' ? SHADOW_FLOOR : (x + y) % 2 === 0 ? FLOOR_A : FLOOR_B;
      ctx.fillRect(px, py, TILE, TILE);
      if (tile === 'L') {
        const glow = ctx.createRadialGradient(px + TILE / 2, py + TILE / 2, 4, px + TILE / 2, py + TILE / 2, TILE * 1.1);
        glow.addColorStop(0, 'rgba(255, 190, 90, 0.34)');
        glow.addColorStop(1, 'rgba(255, 190, 90, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(px - TILE, py - TILE, TILE * 3, TILE * 3);
        ctx.fillStyle = '#ffbe5a';
        ctx.beginPath();
        ctx.arc(px + TILE / 2, py + TILE / 2, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

export function drawWallsAndCover(ctx, level, time) {
  for (let y = 0; y < level.height; y += 1) {
    for (let x = 0; x < level.width; x += 1) {
      const tile = level.tiles[y][x];
      const px = x * TILE;
      const py = y * TILE;
      if (tile === '#') {
        ctx.fillStyle = WALL;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = WALL_TOP;
        ctx.fillRect(px, py, TILE, 6);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fillRect(px, py + TILE - 4, TILE, 4);
      } else if (tile === 'C') {
        ctx.fillStyle = CRATE;
        ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
        ctx.strokeStyle = CRATE_DARK;
        ctx.lineWidth = 3;
        ctx.strokeRect(px + 3, py + 3, TILE - 6, TILE - 6);
        ctx.beginPath();
        ctx.moveTo(px + 3, py + 3);
        ctx.lineTo(px + TILE - 3, py + TILE - 3);
        ctx.moveTo(px + TILE - 3, py + 3);
        ctx.lineTo(px + 3, py + TILE - 3);
        ctx.stroke();
      } else if (tile === 'B') {
        ctx.fillStyle = BUSH;
        for (const [ox, oy, r] of [[10, 12, 11], [26, 10, 12], [18, 26, 12], [30, 28, 9]]) {
          ctx.beginPath();
          ctx.arc(px + ox, py + oy, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = BUSH_LIGHT;
        for (const [ox, oy, r] of [[13, 14, 5], [25, 24, 5], [28, 12, 4]]) {
          ctx.beginPath();
          ctx.arc(px + ox, py + oy, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  void time;
}

export function drawExit(ctx, level, open, time) {
  if (!level.exit) return;
  const cx = (level.exit.x + 0.5) * TILE;
  const cy = (level.exit.y + 0.5) * TILE;
  const pulse = 0.55 + Math.sin(time * 3) * 0.2;
  const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, TILE * 1.4);
  glow.addColorStop(0, open ? `rgba(80, 220, 130, ${pulse})` : 'rgba(90, 110, 130, 0.4)');
  glow.addColorStop(1, 'rgba(80, 220, 130, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - TILE * 1.5, cy - TILE * 1.5, TILE * 3, TILE * 3);
  ctx.fillStyle = open ? '#39d67a' : '#5a6e82';
  ctx.fillRect(cx - 12, cy - 16, 24, 32);
  ctx.fillStyle = '#0d1f14';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(open ? '➜' : '✕', cx, cy + 1);
  ctx.fillStyle = open ? '#b8ffd4' : '#9fb2c4';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('EXIT', cx, cy + 28);
}

export function drawRelics(ctx, level, time) {
  for (const relic of level.relics) {
    if (relic.taken) continue;
    const cx = (relic.x + 0.5) * TILE;
    const cy = (relic.y + 0.5) * TILE + Math.sin(time * 2 + relic.x) * 2;
    const pulse = 0.5 + Math.sin(time * 4 + relic.y) * 0.25;
    const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, TILE);
    glow.addColorStop(0, `rgba(255, 180, 60, ${pulse})`);
    glow.addColorStop(1, 'rgba(255, 180, 60, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - TILE, cy - TILE, TILE * 2, TILE * 2);
    ctx.fillStyle = '#ffb43c';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 11);
    ctx.lineTo(cx + 8, cy);
    ctx.lineTo(cx, cy + 11);
    ctx.lineTo(cx - 8, cy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffe1a1';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx + 4, cy);
    ctx.lineTo(cx, cy + 6);
    ctx.lineTo(cx - 4, cy);
    ctx.closePath();
    ctx.fill();
  }
}

export function drawVisionCone(ctx, guard) {
  const range = GUARD.sightRange;
  const half = GUARD.halfFov;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.arc(guard.x, guard.y, range, guard.angle - half, guard.angle + half);
  ctx.closePath();
  ctx.fillStyle = coneColor(guard.state);
  ctx.fill();
  ctx.strokeStyle = coneEdge(guard.state);
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

export function drawGuard(ctx, guard, time) {
  drawVisionCone(ctx, guard);
  const bob = Math.sin(time * 6 + guard.id * 2) * 1.5;
  ctx.fillStyle = '#20242e';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y + 3, GUARD.radius, 0, Math.PI * 2);
  ctx.fill();
  // Body: dark uniform with a brass helmet and a facing nose.
  ctx.fillStyle = '#8c2f2f';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y + bob * 0.3, GUARD.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d8b25a';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y + bob * 0.3, GUARD.radius - 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8c2f2f';
  ctx.beginPath();
  ctx.arc(guard.x + Math.cos(guard.angle) * 7, guard.y + Math.sin(guard.angle) * 7, 5, 0, Math.PI * 2);
  ctx.fill();
  // Detection meter arc above the guard's head.
  if (guard.meter > 2) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y - GUARD.radius - 8, 11, -Math.PI / 2, Math.PI * 1.5);
    ctx.stroke();
    ctx.strokeStyle = guard.meter >= 100 ? '#eb4034' : guard.meter >= 45 ? '#f09628' : '#f0d25a';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y - GUARD.radius - 8, 11, -Math.PI / 2, -Math.PI / 2 + (guard.meter / 100) * Math.PI * 2);
    ctx.stroke();
  }
  if (guard.state === GUARD_STATE.chase) {
    ctx.fillStyle = '#ff5a4a';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', guard.x, guard.y - GUARD.radius - 22);
  } else if (guard.state === GUARD_STATE.suspicious || guard.state === GUARD_STATE.search) {
    ctx.fillStyle = '#f0a832';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', guard.x, guard.y - GUARD.radius - 22);
  }
}

export function drawPlayer(ctx, player, time) {
  // Noise rings while the thief runs, so the player can see being loud.
  if (player.moving && !player.sneaking) {
    const phase = (time % 0.55) / 0.55;
    ctx.strokeStyle = `rgba(200, 210, 230, ${0.35 * (1 - phase)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 14 + phase * 46, 0, Math.PI * 2);
    ctx.stroke();
  }
  const r = player.sneaking ? 11 : 13;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + r, r, r * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  // Hooded cloak: a dark teal triangle with a pale face in the facing direction.
  ctx.fillStyle = '#1f7a6d';
  ctx.beginPath();
  ctx.moveTo(player.x + Math.cos(player.angle) * (r + 4), player.y + Math.sin(player.angle) * (r + 4));
  ctx.lineTo(player.x + Math.cos(player.angle + 2.4) * r, player.y + Math.sin(player.angle + 2.4) * r);
  ctx.lineTo(player.x + Math.cos(player.angle - 2.4) * r, player.y + Math.sin(player.angle - 2.4) * r);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#0f3d36';
  ctx.beginPath();
  ctx.arc(player.x, player.y, r - 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe9c4';
  ctx.beginPath();
  ctx.arc(player.x + Math.cos(player.angle) * 4, player.y + Math.sin(player.angle) * 4, 4.5, 0, Math.PI * 2);
  ctx.fill();
  if (player.sneaking) {
    ctx.fillStyle = '#bfe8ff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('sneaking', player.x, player.y - r - 10);
  }
}

export function drawHud(ctx, run, view) {
  const state = run.state;
  const w = view.width;
  ctx.fillStyle = 'rgba(8, 10, 16, 0.85)';
  ctx.fillRect(0, 0, w, 44);
  ctx.fillStyle = '#e8ecf4';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const levelName = state ? state.level.def.name : '';
  ctx.fillText(`Ember Vault — ${levelName}`, 14, 22);
  ctx.textAlign = 'center';
  if (state) {
    ctx.fillStyle = '#ffb43c';
    ctx.fillText(`◆ ${state.relicsTaken}/${state.relicsTotal}`, w * 0.42, 22);
    ctx.fillStyle = '#e8ecf4';
    ctx.fillText(`Score ${run.score}`, w * 0.58, 22);
    const seconds = Math.floor(state.time);
    ctx.fillText(`${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`, w * 0.72, 22);
    ctx.fillText(`Attempts ${run.attemptsLeft}`, w * 0.86, 22);
    // The eye: how close the nearest guard is to spotting the thief.
    const hot = state.hottest;
    ctx.fillStyle = hot >= 100 ? '#eb4034' : hot >= 45 ? '#f09628' : '#8fa3bd';
    ctx.beginPath();
    ctx.arc(w - 18, 22, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0d13';
    ctx.beginPath();
    ctx.arc(w - 18, 22, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  if (state && state.messageLeft > 0) {
    ctx.fillStyle = 'rgba(8, 10, 16, 0.8)';
    const text = state.message;
    ctx.font = 'bold 15px sans-serif';
    const tw = ctx.measureText(text).width + 28;
    ctx.fillRect((w - tw) / 2, 56, tw, 30);
    ctx.fillStyle = '#ffd98a';
    ctx.textAlign = 'center';
    ctx.fillText(text, w / 2, 71);
  }
}

function drawPanel(ctx, view, title, lines, accent) {
  const w = view.width;
  const h = view.height;
  ctx.fillStyle = 'rgba(6, 8, 14, 0.72)';
  ctx.fillRect(0, 0, w, h);
  const pw = Math.min(560, w - 60);
  const ph = 90 + lines.length * 26;
  const px = (w - pw) / 2;
  const py = (h - ph) / 2;
  ctx.fillStyle = '#141a28';
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(px, py, pw, ph);
  ctx.fillStyle = accent;
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, w / 2, py + 42);
  ctx.fillStyle = '#dfe6f2';
  ctx.font = '15px sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, w / 2, py + 82 + i * 26);
  });
}

// The world itself, drawn in level coordinates: the caller sets the canvas
// transform so the level fits the window, then resets it for the overlay.
export function drawWorld(ctx, run, time) {
  const state = run.state;
  if (!state) return;
  drawFloor(ctx, state.level);
  drawExit(ctx, state.level, state.relicsTaken === state.relicsTotal, time);
  drawRelics(ctx, state.level, time);
  for (const guard of state.guards) drawGuard(ctx, guard, time);
  drawPlayer(ctx, state.player, time);
  drawWallsAndCover(ctx, state.level, time);
}

// The HUD and full-screen panels, drawn in window coordinates after the caller
// resets the canvas transform.
export function drawOverlay(ctx, run, view) {
  drawHud(ctx, run, view);
  if (run.screen === SCREENS.title) {
    drawPanel(ctx, view, 'EMBER VAULT', [
      'A shadow heist in three galleries. Steal every relic,',
      'reach the glowing exit, and never let a guard see you.',
      '',
      'WASD / arrows — move      Shift — sneak (slow, quiet, hidden)',
      'Click — walk there      R — restart level      M — mute      P — pause',
      '',
      'Shadow hides you. Lantern light exposes you. Running is loud.',
      'Press Enter or click to begin.',
    ], '#ffb43c');
  } else if (run.screen === SCREENS.caught) {
    drawPanel(ctx, view, 'CAUGHT!', [
      `A guard laid hands on the thief. ${run.attemptsLeft} attempt${run.attemptsLeft === 1 ? '' : 's'} left.`,
      'The gallery resets — the patrols forget you were ever there.',
      '',
      'Press Enter to slip back in.',
    ], '#eb4034');
  } else if (run.screen === SCREENS.clear) {
    const next = run.levelIndex + 1 < 3 ? 'The next gallery waits.' : '';
    drawPanel(ctx, view, 'GALLERY CLEARED', [
      `Score ${run.score} — the relics are yours.`,
      next,
      '',
      'Press Enter for the next gallery.',
    ], '#39d67a');
  } else if (run.screen === SCREENS.win) {
    drawPanel(ctx, view, 'THE VAULT IS YOURS', [
      `Final score ${run.score}. Every relic, every gallery, unseen.`,
      run.seenEver ? 'Spotted along the way — a loud legend.' : 'Never once seen. A true ghost.',
      '',
      'Press Enter to run it again.',
    ], '#ffb43c');
  } else if (run.screen === SCREENS.paused) {
    drawPanel(ctx, view, 'PAUSED', ['Press P to keep sneaking.'], '#8fa3bd');
  }
}
