// Sky, parallax hills, terrain and the castle. Everything is drawn from a few shared shape rules:
// flat fills, one warm ink outline, soft radial glows.
import { CFG } from '../core/config.js';
import { hash01 } from '../core/rng.js';
import { regionAt } from '../core/world.js';
import { INK, WOOD, WOOD_DARK, CREAM, ink, glow, shade } from './palette.js';

export function drawSky(ctx, w, h, pal, cam, time) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, pal.skyTop);
  g.addColorStop(0.75, pal.skyBot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  if (pal.night > 0.05) {
    ctx.fillStyle = '#fff8e0';
    for (let i = 0; i < 46; i++) {
      const x = ((hash01(i, 11) * (w + 200) - cam.x * 0.01) % (w + 200) + w + 200) % (w + 200) - 100;
      const y = hash01(i, 12) * h * 0.55;
      ctx.globalAlpha = pal.night * (0.45 + 0.4 * Math.sin(time * 1.5 + i));
      ctx.beginPath();
      ctx.arc(x, y, 1 + hash01(i, 13) * 1.6, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  const sx = w * 0.76, sy = h * (0.2 + pal.night * 0.32);
  const sr = Math.min(w, h) * 0.085;
  glow(ctx, sx, sy, sr * 4.2, pal.sun, 0.55);
  ctx.fillStyle = pal.sun;
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, 6.2832);
  ctx.fill();

  // clouds: three overlapping puffs on a flat base
  const span = w + 520;
  for (let i = 0; i < 7; i++) {
    const s = (0.6 + hash01(i, 21) * 0.8) * Math.min(1.4, h / 520);
    const x = (((hash01(i, 22) * span - cam.x * (0.03 + 0.03 * hash01(i, 24)) + time * 4) % span) + span) % span - 260;
    const y = h * (0.07 + hash01(i, 23) * 0.36);
    ctx.fillStyle = `rgba(255,252,240,${0.82 - pal.night * 0.45})`;
    ctx.beginPath();
    ctx.arc(x - 42 * s, y, 26 * s, Math.PI, 0);
    ctx.arc(x, y - 6 * s, 38 * s, Math.PI, 0);
    ctx.arc(x + 46 * s, y, 24 * s, Math.PI, 0);
    ctx.rect(x - 68 * s, y - 1, 138 * s, 12 * s);
    ctx.fill();
  }
}

// little silhouettes that ride the hill line; all share the hill's fill colour
function decor(ctx, kind, x, y, s, time) {
  switch (kind) {
    case 'castle':
      ctx.rect(x - 9 * s, y - 46 * s, 18 * s, 60 * s);
      ctx.rect(x - 13 * s, y - 52 * s, 6 * s, 8 * s);
      ctx.rect(x - 3 * s, y - 52 * s, 6 * s, 8 * s);
      ctx.rect(x + 7 * s, y - 52 * s, 6 * s, 8 * s);
      ctx.rect(x + 9 * s, y - 24 * s, 26 * s, 40 * s);
      ctx.moveTo(x + 20 * s, y - 24 * s);
      ctx.lineTo(x + 30 * s, y - 50 * s);
      ctx.lineTo(x + 40 * s, y - 24 * s);
      break;
    case 'pine':
      for (let i = 0; i < 3; i++) {
        ctx.moveTo(x - (16 - i * 3) * s, y - i * 18 * s + 6);
        ctx.lineTo(x, y - (34 + i * 18) * s);
        ctx.lineTo(x + (16 - i * 3) * s, y - i * 18 * s + 6);
      }
      break;
    case 'house':
      ctx.rect(x - 16 * s, y - 20 * s, 32 * s, 34 * s);
      ctx.moveTo(x - 22 * s, y - 19 * s);
      ctx.lineTo(x, y - 44 * s);
      ctx.lineTo(x + 22 * s, y - 19 * s);
      ctx.rect(x + 8 * s, y - 42 * s, 6 * s, 14 * s);
      break;
    case 'mill': {
      ctx.moveTo(x - 12 * s, y + 10);
      ctx.lineTo(x - 7 * s, y - 40 * s);
      ctx.lineTo(x + 7 * s, y - 40 * s);
      ctx.lineTo(x + 12 * s, y + 10);
      const a = time * 0.5 + x;
      for (let i = 0; i < 4; i++) {
        const c = Math.cos(a + i * 1.5708), n = Math.sin(a + i * 1.5708);
        ctx.moveTo(x - n * 3 * s, y - 40 * s + c * 3 * s);
        ctx.lineTo(x + c * 30 * s - n * 5 * s, y - 40 * s + n * 30 * s + c * 5 * s);
        ctx.lineTo(x + c * 30 * s + n * 5 * s, y - 40 * s + n * 30 * s - c * 5 * s);
        ctx.lineTo(x + n * 3 * s, y - 40 * s - c * 3 * s);
      }
      break;
    }
    case 'spire':
      ctx.rect(x - 7 * s, y - 50 * s, 14 * s, 64 * s);
      ctx.moveTo(x - 9 * s, y - 50 * s);
      ctx.lineTo(x, y - 84 * s);
      ctx.lineTo(x + 9 * s, y - 50 * s);
      ctx.rect(x + 7 * s, y - 22 * s, 30 * s, 36 * s);
      ctx.moveTo(x + 7 * s, y - 22 * s);
      ctx.lineTo(x + 22 * s, y - 38 * s);
      ctx.lineTo(x + 37 * s, y - 22 * s);
      break;
    default: // round tree
      ctx.rect(x - 2 * s, y - 14 * s, 4 * s, 24 * s);
      ctx.moveTo(x + 15 * s, y - 22 * s);
      ctx.arc(x, y - 22 * s, 15 * s, 0, 6.2832);
  }
}

/**
 * One rolling parallax layer. `f` is its scroll factor (0 = infinitely far).
 * `rest` is where its ridge sits on screen (fraction of height) when the knight is on the ground.
 */
export function drawHills(ctx, w, h, cam, S, opt, time) {
  const { f, rest, amp, color, freq, salt, every, size } = opt;
  const ls = cam.base * (0.4 + 0.6 * (S / cam.base) * (0.5 + f * 0.5)); // far layers zoom less
  const lift = (cam.y - cam.restY) * S * f * 0.8;
  const base = h * rest - lift;
  const off = cam.x * f;
  const ridge = (xw) => base + (Math.sin(xw * freq + salt) * amp + Math.sin(xw * freq * 2.7 + salt * 2) * amp * 0.4) * ls;

  ctx.fillStyle = color;
  ctx.beginPath();
  // silhouettes first so they merge with the hill
  const i0 = Math.floor(off / every) - 1;
  const i1 = Math.floor((off + w / ls) / every) + 1;
  for (let i = i0; i <= i1; i++) {
    if (hash01(i, salt * 7 + 3) > opt.density) continue;
    const xw = (i + 0.2 + hash01(i, salt + 5) * 0.6) * every;
    const kind = hash01(i, salt + 9) < 0.35 ? 'tree' : regionAt(xw / f).region.decor;
    decor(ctx, kind, (xw - off) * ls, ridge(xw) + 4, size * ls * (0.8 + hash01(i, salt + 6) * 0.5), time);
  }
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let sx = 0; sx <= w + 24; sx += 24) ctx.lineTo(sx, ridge(sx / ls + off));
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
}

/** Terrain in world space. Drawn after ground props so their feet sink into the grass. */
export function drawGround(ctx, world, x0, x1, pal, depth) {
  const step = 14;
  const a = Math.floor(x0 / step) * step - step;
  const line = () => {
    ctx.beginPath();
    for (let x = a; x <= x1 + step; x += step) ctx.lineTo(x, world.ground(Math.max(x, -40)));
  };
  line();
  ctx.lineTo(x1 + step, depth);
  ctx.lineTo(a, depth);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -120, 0, 420);
  g.addColorStop(0, pal.soil);
  g.addColorStop(1, shade(pal.region.soil, -0.35));
  ctx.fillStyle = g;
  ctx.fill();

  // soil strata
  ctx.save();
  ctx.translate(0, 58);
  line();
  ctx.strokeStyle = 'rgba(255,240,210,0.16)';
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.translate(0, 62);
  line();
  ctx.strokeStyle = 'rgba(40,20,10,0.12)';
  ctx.lineWidth = 16;
  ctx.stroke();
  ctx.restore();

  // grass band + ink line
  ctx.save();
  ctx.translate(0, 9);
  line();
  ctx.strokeStyle = pal.grass;
  ctx.lineWidth = 24;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
  line();
  ink(ctx, 3);
  ctx.stroke();

  // tufts and flowers
  const i0 = Math.floor(Math.max(x0, 0) / 46), i1 = Math.floor(x1 / 46);
  for (let i = i0; i <= i1; i++) {
    const r = hash01(i, 77);
    if (r > 0.62) continue;
    const x = i * 46 + hash01(i, 78) * 30;
    const y = world.ground(x);
    if (r < 0.2) {
      ctx.strokeStyle = shade(pal.region.grass, -0.3);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y + 1);
      ctx.lineTo(x + 2, y - 11);
      ctx.stroke();
      ctx.fillStyle = r < 0.1 ? pal.accent : CREAM;
      ctx.beginPath();
      ctx.arc(x + 2, y - 12, 3.4, 0, 6.2832);
      ctx.fill();
    } else {
      ctx.strokeStyle = shade(pal.region.grass, -0.22);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 4, y + 2);
      ctx.lineTo(x - 7, y - 7);
      ctx.moveTo(x, y + 2);
      ctx.lineTo(x, y - 10);
      ctx.moveTo(x + 4, y + 2);
      ctx.lineTo(x + 8, y - 6);
      ctx.stroke();
    }
  }
}

export function drawCastle(ctx, time, pull, sinceLaunch, helmColor) {
  const H = CFG.wallH;
  const stone = '#d7cbb6', stoneD = '#b9ab95';
  ink(ctx, 3);
  // tall tower behind
  ctx.fillStyle = stoneD;
  ctx.fillRect(-360, -H - 150, 110, H + 190);
  ctx.strokeRect(-360, -H - 150, 110, H + 190);
  ctx.fillStyle = '#c9523f';
  ctx.beginPath();
  ctx.moveTo(-374, -H - 150);
  ctx.lineTo(-305, -H - 262);
  ctx.lineTo(-236, -H - 150);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // flag
  const fw = Math.sin(time * 5) * 5;
  ctx.beginPath();
  ctx.moveTo(-305, -H - 262);
  ctx.lineTo(-305, -H - 308);
  ctx.stroke();
  ctx.fillStyle = helmColor;
  ctx.beginPath();
  ctx.moveTo(-305, -H - 308);
  ctx.quadraticCurveTo(-285, -H - 312 + fw, -262, -H - 298 + fw);
  ctx.quadraticCurveTo(-285, -H - 292 + fw, -305, -H - 286);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(-305, -H - 70, 12, Math.PI, 0);
  ctx.rect(-317, -H - 70, 24, 26);
  ctx.fill();

  // wall
  ctx.fillStyle = stone;
  ctx.beginPath();
  ctx.moveTo(-340, 40);
  ctx.lineTo(-340, -H);
  for (let x = -340; x < -40; x += 50) {
    ctx.lineTo(x, -H - 22);
    ctx.lineTo(x + 26, -H - 22);
    ctx.lineTo(x + 26, -H);
    ctx.lineTo(Math.min(x + 50, -40), -H);
  }
  ctx.lineTo(-40, 40);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // bricks
  ctx.strokeStyle = 'rgba(59,42,34,0.28)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 4; c++) {
      if (hash01(r * 9 + c, 3) > 0.6) continue;
      const bx = -320 + c * 70 + (r % 2) * 30, by = -H + 30 + r * 34;
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + 34, by);
      ctx.moveTo(bx + 34, by);
      ctx.lineTo(bx + 34, by + 14);
    }
  }
  ctx.stroke();
  // gate
  ink(ctx, 3);
  ctx.fillStyle = WOOD_DARK;
  ctx.beginPath();
  ctx.moveTo(-150, 40);
  ctx.lineTo(-150, -70);
  ctx.arc(-110, -70, 40, Math.PI, 0);
  ctx.lineTo(-70, 40);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // catapult on the battlements
  const px = -150, py = -H - 26; // pivot
  ctx.fillStyle = WOOD;
  ctx.beginPath();
  ctx.moveTo(px - 46, -H);
  ctx.lineTo(px - 8, py - 6);
  ctx.lineTo(px + 8, py - 6);
  ctx.lineTo(px + 40, -H);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  for (const wx of [px - 34, px + 28]) {
    ctx.fillStyle = WOOD_DARK;
    ctx.beginPath();
    ctx.arc(wx, -H - 2, 11, 0, 6.2832);
    ctx.fill();
    ctx.stroke();
  }
  // arm: cocked back while aiming, whips forward on release
  let ang = -0.42 - pull * 0.5;
  if (sinceLaunch >= 0) ang = -0.42 + Math.min(1, sinceLaunch * 9) * 1.5 - Math.max(0, Math.min(1, (sinceLaunch - 0.14) * 3)) * 0.25;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(ang);
  ctx.fillStyle = WOOD;
  ctx.beginPath();
  ctx.rect(-10, -5, 64, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = WOOD_DARK;
  ctx.beginPath();
  ctx.arc(52, -2, 15, 0.1, Math.PI - 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#8c8c94';
  ctx.fillRect(-22, -9, 16, 18);
  ctx.strokeRect(-22, -9, 16, 18);
  ctx.restore();
}
