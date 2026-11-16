// World objects. Each prop: flat fill + ink outline, and a springy "wobble" for a moment after it is hit.
import { goosePos } from '../core/sim.js';
import { INK, WOOD, WOOD_DARK, CREAM, GOLD, ink, glow } from './palette.js';

const CAPS = ['#e2513a', '#d9783a', '#9a5fc2'];
const CLOTH = ['#d8432f', '#3567c9', '#3d9a55'];

/** Damped oscillation in -1..1 after a hit. */
function wobble(o, t, speed = 26, decay = 4.5) {
  const d = t - o.hitT;
  return d < 0 || d > 2 ? 0 : Math.exp(-d * decay) * Math.sin(d * speed);
}

function halo(ctx, x, y, time) {
  glow(ctx, x, y, 78 + Math.sin(time * 4) * 8, '#fff2a8', 0.75);
  ctx.fillStyle = '#fff8cf';
  for (let i = 0; i < 4; i++) {
    const a = time * 1.6 + i * 1.5708;
    star(ctx, x + Math.cos(a) * 58, y + Math.sin(a) * 34, 5 + Math.sin(time * 5 + i) * 1.5);
  }
}

export function star(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

function poles(ctx, x1, x2, top, bottom) {
  ctx.fillStyle = WOOD;
  for (const x of [x1, x2]) {
    ctx.fillRect(x - 4, top, 8, bottom - top + 20);
    ctx.strokeRect(x - 4, top, 8, bottom - top + 20);
  }
}

const draw = {
  mushroom(ctx, o, t) {
    const s = o.s, wb = wobble(o, t);
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.scale(1 + wb * 0.18, 1 - wb * 0.28);
    ctx.fillStyle = CREAM;
    ctx.beginPath();
    ctx.moveTo(-13 * s, 16);
    ctx.quadraticCurveTo(-8 * s, -30 * s, -11 * s, -52 * s);
    ctx.lineTo(11 * s, -52 * s);
    ctx.quadraticCurveTo(8 * s, -30 * s, 13 * s, 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = CAPS[o.tint];
    ctx.beginPath();
    ctx.moveTo(-46 * s, -50 * s);
    ctx.bezierCurveTo(-46 * s, -96 * s, 46 * s, -96 * s, 46 * s, -50 * s);
    ctx.quadraticCurveTo(0, -40 * s, -46 * s, -50 * s);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = CREAM;
    for (const [dx, dy, r] of [[-22, -66, 7], [4, -76, 9], [26, -62, 6]]) {
      ctx.beginPath();
      ctx.ellipse(dx * s, dy * s, r * s, r * s * 0.8, 0, 0, 6.2832);
      ctx.fill();
    }
    ctx.restore();
  },

  bell(ctx, o, t) {
    const cy = o.y - o.h, wb = wobble(o, t, 9, 1.6);
    poles(ctx, o.x - 52, o.x + 52, cy - 62, o.y);
    ctx.fillStyle = WOOD_DARK;
    ctx.fillRect(-64 + o.x, cy - 70, 128, 12);
    ctx.strokeRect(-64 + o.x, cy - 70, 128, 12);
    ctx.save();
    ctx.translate(o.x, cy - 58);
    ctx.rotate(wb * 0.55);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 26);
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(-wb * 14, 96, 7, 0, 6.2832);
    ctx.fill();
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.moveTo(-12, 24);
    ctx.bezierCurveTo(-26, 30, -22, 74, -38, 88);
    ctx.lineTo(38, 88);
    ctx.bezierCurveTo(22, 74, 26, 30, 12, 24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-14, 40);
    ctx.quadraticCurveTo(-18, 62, -24, 78);
    ctx.stroke();
    ctx.restore();
  },

  banner(ctx, o, t, time) {
    const cy = o.y - o.h, royal = o.type === 'royal';
    const wb = wobble(o, t, 18, 3);
    if (royal) halo(ctx, o.x, cy, time);
    ink(ctx, 3);
    poles(ctx, o.x - 88, o.x + 88, cy - 40, o.y);
    const sag = 12 + wb * 26 + Math.sin(time * 3 + o.x) * 3;
    ctx.fillStyle = royal ? GOLD : CLOTH[o.tint];
    ctx.beginPath();
    ctx.moveTo(-88 + o.x, cy - 30);
    ctx.quadraticCurveTo(o.x, cy - 30 + sag, o.x + 88, cy - 30);
    ctx.lineTo(o.x + 88, cy + 22);
    ctx.lineTo(o.x + 58, cy + 12 + sag * 0.6);
    ctx.lineTo(o.x + 29, cy + 30 + sag);
    ctx.lineTo(o.x, cy + 16 + sag);
    ctx.lineTo(o.x - 29, cy + 30 + sag);
    ctx.lineTo(o.x - 58, cy + 12 + sag * 0.6);
    ctx.lineTo(o.x - 88, cy + 22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = royal ? '#fff8cf' : CREAM;
    if (royal) {
      // little crown
      ctx.beginPath();
      ctx.moveTo(o.x - 16, cy + 6 + sag * 0.6);
      ctx.lineTo(o.x - 18, cy - 12 + sag * 0.6);
      ctx.lineTo(o.x - 8, cy - 3 + sag * 0.6);
      ctx.lineTo(o.x, cy - 15 + sag * 0.6);
      ctx.lineTo(o.x + 8, cy - 3 + sag * 0.6);
      ctx.lineTo(o.x + 18, cy - 12 + sag * 0.6);
      ctx.lineTo(o.x + 16, cy + 6 + sag * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      for (const dx of [-44, 0, 44]) {
        ctx.beginPath();
        ctx.arc(o.x + dx, cy - 4 + sag * (dx ? 0.45 : 0.75), 6, 0, 6.2832);
        ctx.fill();
      }
    }
  },

  awning(ctx, o, t) {
    const top = o.y - o.h, wb = wobble(o, t, 20, 4);
    // crates + posts
    ctx.fillStyle = WOOD;
    ctx.fillRect(o.x - 60, o.y - 34, 44, 50);
    ctx.strokeRect(o.x - 60, o.y - 34, 44, 50);
    ctx.fillStyle = WOOD_DARK;
    ctx.fillRect(o.x - 10, o.y - 24, 34, 40);
    ctx.strokeRect(o.x - 10, o.y - 24, 34, 40);
    ctx.fillStyle = '#e8873a';
    for (const dx of [-50, -38, -27]) {
      ctx.beginPath();
      ctx.arc(o.x + dx, o.y - 38, 7, 0, 6.2832);
      ctx.fill();
      ctx.stroke();
    }
    poles(ctx, o.x - 80, o.x + 80, top - 26, o.y);
    // striped slanted cloth
    const bend = wb * 16;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(o.x - 92, top - 34);
    ctx.quadraticCurveTo(o.x, top - 6 + bend * 2, o.x + 92, top + 24);
    ctx.lineTo(o.x + 92, top + 44);
    ctx.quadraticCurveTo(o.x, top + 14 + bend * 2, o.x - 92, top - 14);
    ctx.closePath();
    ctx.fillStyle = CREAM;
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = CLOTH[o.tint];
    for (let i = -92; i < 92; i += 46) ctx.fillRect(o.x + i, top - 60, 23, 140);
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(o.x - 92, top - 34);
    ctx.quadraticCurveTo(o.x, top - 6 + bend * 2, o.x + 92, top + 24);
    ctx.lineTo(o.x + 92, top + 44);
    ctx.quadraticCurveTo(o.x, top + 14 + bend * 2, o.x - 92, top - 14);
    ctx.closePath();
    ctx.stroke();
  },

  windmill(ctx, o, t, time) {
    const hy = o.y - 250, since = t - o.hitT;
    const boost = since >= 0 && since < 2 ? (2 - since) * 5 : 0;
    ctx.fillStyle = CREAM;
    ctx.beginPath();
    ctx.moveTo(o.x - 58, o.y + 18);
    ctx.lineTo(o.x - 34, hy - 6);
    ctx.lineTo(o.x + 34, hy - 6);
    ctx.lineTo(o.x + 58, o.y + 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#c9523f';
    ctx.beginPath();
    ctx.moveTo(o.x - 44, hy - 4);
    ctx.lineTo(o.x, hy - 58);
    ctx.lineTo(o.x + 44, hy - 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = WOOD_DARK;
    ctx.beginPath();
    ctx.arc(o.x, o.y - 30, 18, Math.PI, 0);
    ctx.rect(o.x - 18, o.y - 30, 36, 48);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#7fb6d6';
    ctx.fillRect(o.x - 11, o.y - 150, 22, 26);
    ctx.strokeRect(o.x - 11, o.y - 150, 22, 26);
    // gust streaks so the shove is readable before you arrive
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) {
      const ph = (time * 0.9 + i * 0.33) % 1;
      ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.8;
      ctx.beginPath();
      ctx.moveTo(o.x + 60 + ph * 150, hy - 60 + i * 55 - ph * 50);
      ctx.quadraticCurveTo(o.x + 110 + ph * 150, hy - 84 + i * 55 - ph * 50, o.x + 150 + ph * 150, hy - 72 + i * 55 - ph * 70);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ink(ctx, 3);
    ctx.save();
    ctx.translate(o.x, hy);
    ctx.rotate(time * 1.5 + boost * boost * 0.2 + o.x);
    for (let i = 0; i < 4; i++) {
      ctx.rotate(1.5708);
      ctx.fillStyle = WOOD;
      ctx.fillRect(-4, 0, 8, 150);
      ctx.strokeRect(-4, 0, 8, 150);
      ctx.fillStyle = CREAM;
      ctx.beginPath();
      ctx.rect(4, 34, 34, 112);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(4, 71);
      ctx.lineTo(38, 71);
      ctx.moveTo(4, 108);
      ctx.lineTo(38, 108);
      ctx.moveTo(21, 34);
      ctx.lineTo(21, 146);
      ctx.stroke();
    }
    ctx.fillStyle = WOOD_DARK;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, 6.2832);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  },

  haystack(ctx, o, t) {
    const wb = wobble(o, t, 16, 4);
    ctx.save();
    ctx.translate(o.x, o.y + 14);
    ctx.scale(1 + wb * 0.12, 1 - wb * 0.2);
    ctx.fillStyle = '#eec65a';
    ctx.beginPath();
    ctx.moveTo(-74, 6);
    ctx.bezierCurveTo(-70, -70, -30, -100, 0, -96);
    ctx.bezierCurveTo(34, -100, 70, -66, 74, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#b98a2f';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (const [x, y, l] of [[-40, -30, 20], [-12, -60, 24], [20, -40, 22], [38, -14, 16], [-26, -6, 14], [8, -14, 18]]) {
      ctx.moveTo(x, y);
      ctx.lineTo(x + 5, y - l);
    }
    ctx.stroke();
    ctx.restore();
  },

  ramp(ctx, o) {
    ctx.fillStyle = WOOD;
    ctx.beginPath();
    ctx.moveTo(o.x - 88, o.y + 16);
    ctx.lineTo(o.x + 86, o.y - 88);
    ctx.lineTo(o.x + 86, o.y + 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = WOOD_DARK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(o.x + 30, o.y - 48);
    ctx.lineTo(o.x + 30, o.y + 16);
    ctx.moveTo(o.x - 26, o.y - 16);
    ctx.lineTo(o.x - 26, o.y + 16);
    ctx.stroke();
    // painted chevrons pointing up the slope
    ctx.strokeStyle = CREAM;
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (const k of [0.3, 0.55, 0.8]) {
      const cx = o.x - 88 + 174 * k, cy = o.y + 14 - 104 * k;
      ctx.moveTo(cx - 12, cy + 2);
      ctx.lineTo(cx + 4, cy - 6);
      ctx.lineTo(cx - 4, cy + 12);
    }
    ctx.stroke();
    ink(ctx, 3);
  },

  spring(ctx, o, t, time) {
    const wb = wobble(o, t, 30, 5);
    const top = o.y - 40 - wb * 16;
    halo(ctx, o.x, o.y - 46, time);
    ink(ctx, 3);
    ctx.fillStyle = WOOD_DARK;
    ctx.fillRect(o.x - 46, o.y - 6, 92, 22);
    ctx.strokeRect(o.x - 46, o.y - 6, 92, 22);
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) ctx.lineTo(o.x + (i % 2 ? 22 : -22), o.y - 6 + ((top + 8 - o.y + 6) * i) / 6);
    ctx.lineWidth = 5;
    ctx.stroke();
    ink(ctx, 3);
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.roundRect(o.x - 52, top - 6, 104, 16, 7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff8cf';
    star(ctx, o.x, top + 2, 6);
  },

  goat(ctx, o, t) {
    const d = t - o.hitT, hop = d >= 0 && d < 0.6 ? Math.sin((d / 0.6) * Math.PI) : 0;
    ctx.save();
    ctx.translate(o.x, o.y - hop * 30);
    ctx.rotate(-hop * 0.5);
    ctx.fillStyle = INK;
    for (const lx of [-18, -8, 10, 20]) ctx.fillRect(lx, -14, 5, 26);
    ctx.fillStyle = '#f6efe2';
    ctx.beginPath();
    ctx.ellipse(0, -30, 30, 21, 0, 0, 6.2832);
    ctx.fill();
    ctx.stroke();
    // head faces the oncoming knight (left)
    ctx.beginPath();
    ctx.ellipse(-30, -46, 15, 13, -0.3, 0, 6.2832);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = WOOD_DARK;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-28, -58);
    ctx.quadraticCurveTo(-18, -76, -4, -66);
    ctx.moveTo(-36, -58);
    ctx.quadraticCurveTo(-38, -76, -24, -78);
    ctx.stroke();
    ink(ctx, 3);
    ctx.beginPath(); // grumpy brow + eye + beard
    ctx.moveTo(-40, -52);
    ctx.lineTo(-30, -48);
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(-34, -45, 2.4, 0, 6.2832);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-38, -35);
    ctx.lineTo(-36, -24);
    ctx.lineTo(-31, -34);
    ctx.fill();
    ctx.restore();
  },

  bramble(ctx, o, t) {
    const wb = wobble(o, t, 30, 6);
    ctx.save();
    ctx.translate(o.x + wb * 5, o.y + 10);
    ctx.fillStyle = '#3f6b3c';
    ctx.beginPath();
    const n = 13;
    for (let i = 0; i <= n; i++) {
      const a = Math.PI + (i / n) * Math.PI;
      const r = i % 2 ? 1 : 0.8;
      ctx.lineTo(Math.cos(a) * 66 * r, Math.sin(a) * 66 * r * 0.95);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#7b3f8f';
    for (const [x, y] of [[-30, -22], [-4, -40], [24, -26], [40, -8], [-46, -6], [6, -14]]) {
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 6.2832);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  },

  goose(ctx, o, t, time) {
    const g = goosePos(o, t);
    const d = t - o.hitT, spin = d >= 0 && d < 0.8 ? d * 14 : 0;
    const flap = Math.sin(time * 11 + o.ph);
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(spin);
    ctx.fillStyle = '#fbfaf4';
    ctx.beginPath();
    ctx.ellipse(4, 0, 27, 15, 0, 0, 6.2832);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath(); // neck + head, flying left toward the knight
    ctx.moveTo(-16, -6);
    ctx.quadraticCurveTo(-34, -10, -40, -20);
    ctx.lineTo(-30, -24);
    ctx.quadraticCurveTo(-26, -12, -12, 4);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-38, -24, 8, 0, 6.2832);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f0932b';
    ctx.beginPath();
    ctx.moveTo(-45, -27);
    ctx.lineTo(-58, -22);
    ctx.lineTo(-45, -19);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(-40, -26, 1.8, 0, 6.2832);
    ctx.fill();
    ctx.fillStyle = '#e9e6da';
    ctx.beginPath();
    ctx.moveTo(-6, -4);
    ctx.quadraticCurveTo(8, -30 * flap - 8, 30, -26 * flap);
    ctx.quadraticCurveTo(18, -4, 12, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  },
};
draw.royal = draw.banner;

export function drawProp(ctx, o, t, time) {
  const fn = draw[o.type];
  if (!fn) return;
  ink(ctx, 3);
  fn(ctx, o, t, time);
}

/** Puddles sit on top of the terrain and follow its curve. */
export function drawPuddle(ctx, o, world, t, time) {
  const n = 8, half = o.w / 2;
  const ripple = t - o.hitT;
  ctx.fillStyle = '#6fb7dd';
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const x = o.x - half + (o.w * i) / n;
    ctx.lineTo(x, world.ground(x) - 1 - Math.sin((i / n) * Math.PI) * 2);
  }
  for (let i = n; i >= 0; i--) {
    const x = o.x - half + (o.w * i) / n;
    ctx.lineTo(x, world.ground(x) + 2 + Math.sin((i / n) * Math.PI) * 13);
  }
  ctx.closePath();
  ctx.fill();
  ink(ctx, 3);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  const sx = o.x - half * 0.5 + Math.sin(time * 1.2 + o.x) * 6;
  ctx.moveTo(sx, world.ground(sx) + 5);
  ctx.lineTo(sx + half * 0.5, world.ground(sx + half * 0.5) + 5);
  if (ripple >= 0 && ripple < 0.7) {
    ctx.moveTo(o.x - half * ripple, world.ground(o.x - half * ripple) + 9);
    ctx.lineTo(o.x + half * ripple, world.ground(o.x + half * ripple) + 9);
  }
  ctx.stroke();
}
