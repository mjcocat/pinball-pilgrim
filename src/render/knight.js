// The knight: a round helmet-with-legs. The body tumbles with physics; the cape and plume trail behind.
import { CFG } from '../core/config.js';
import { INK, ink, glow } from './palette.js';
import { star } from './props.js';

const R = CFG.r;

function capePattern(ctx, pattern, len, color) {
  ctx.fillStyle = 'rgba(255,248,225,0.9)';
  if (pattern === 'stripes') {
    for (let x = 6; x < len + 14; x += 14) ctx.fillRect(x, -30, 6, 60);
  } else if (pattern === 'checks') {
    for (let x = 0, i = 0; x < len + 14; x += 11, i++) for (let y = -33 + (i % 2) * 11; y < 30; y += 22) ctx.fillRect(x, y, 11, 11);
  } else if (pattern === 'stars') {
    for (const [x, y, r] of [[12, -8, 5], [26, 7, 6], [38, -9, 4.5], [50, 4, 5], [18, 12, 3.5]]) star(ctx, x, y, r);
  }
}

/**
 * @param look  { helmet: colour, cape: pattern id }
 * @param st    { time, shieldT, mood: 'calm'|'wow'|'squint'|'dizzy', airborne }
 */
export function drawKnight(ctx, k, look, st) {
  const sp = Math.hypot(k.vx, k.vy);
  const t = st.time;
  ctx.save();
  ctx.translate(k.x, k.y);

  // --- cape (not rotated with the body; streams opposite to travel)
  let dx = -k.vx, dy = -k.vy;
  if (sp < 70) {
    dx = -1;
    dy = 0.75;
  }
  const dl = Math.hypot(dx, dy);
  const a = Math.atan2(dy / dl, dx / dl);
  const len = 30 + Math.min(sp, 900) / 55;
  const wave = Math.sin(t * 15) * (2 + Math.min(sp, 700) / 110);
  ctx.save();
  ctx.rotate(a);
  ctx.beginPath();
  ctx.moveTo(4, -11);
  ctx.quadraticCurveTo(len * 0.5, -17 + wave, len, -12 + wave * 1.4);
  ctx.lineTo(len - 8, wave);
  ctx.lineTo(len + 2, 12 + wave * 1.2);
  ctx.quadraticCurveTo(len * 0.5, 17 + wave * 0.6, 4, 11);
  ctx.closePath();
  ctx.fillStyle = look.helmet;
  ctx.fill();
  if (look.cape !== 'plain') {
    ctx.save();
    ctx.clip();
    capePattern(ctx, look.cape, len);
    ctx.restore();
  }
  ink(ctx, 2.6);
  ctx.stroke();
  ctx.restore();

  // --- body
  ctx.rotate(k.ang);
  const sq = k.squash;
  ctx.scale(1 + sq * 0.2, 1 - sq * 0.2);
  const flail = st.airborne ? Math.sin(t * 22) : Math.sin(t * 9) * 0.3;

  // legs + boots
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-7, 14);
  ctx.lineTo(-10 - flail * 5, 25);
  ctx.moveTo(7, 14);
  ctx.lineTo(10 + flail * 5, 25);
  ctx.stroke();
  ctx.fillStyle = '#5a3a26';
  for (const [bx, by] of [[-10 - flail * 5, 26], [10 + flail * 5, 26]]) {
    ctx.beginPath();
    ctx.ellipse(bx + 3, by, 7, 4.5, 0, 0, 6.2832);
    ctx.fill();
  }
  // arms
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(-15, 3);
  ctx.lineTo(-25, 2 - flail * 9);
  ctx.moveTo(15, 3);
  ctx.lineTo(26, 2 + flail * 9);
  ctx.stroke();
  ctx.fillStyle = '#dfe6ec';
  for (const [hx, hy] of [[-26, 2 - flail * 9], [27, 2 + flail * 9]]) {
    ctx.beginPath();
    ctx.arc(hx, hy, 4.5, 0, 6.2832);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // helmet shell
  const g = ctx.createRadialGradient(-6, -8, 2, 0, 0, R + 2);
  g.addColorStop(0, '#f4f7fa');
  g.addColorStop(0.6, '#c6d0d9');
  g.addColorStop(1, '#93a0ad');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, 6.2832);
  ctx.fill();
  // coloured trim band
  ctx.save();
  ctx.clip();
  ctx.fillStyle = look.helmet;
  ctx.fillRect(-R, 8, R * 2, R);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(-R, 8, R * 2, 2.5);
  ctx.restore();
  ink(ctx, 2.8);
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, 6.2832);
  ctx.stroke();

  // visor + eyes (faces right)
  ctx.fillStyle = '#2b2230';
  ctx.beginPath();
  ctx.roundRect(-9, -8, 25, 11, 5);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  if (st.mood === 'dizzy') {
    for (const ex of [1, 10]) {
      ctx.beginPath();
      ctx.moveTo(ex - 2.5, -5);
      ctx.lineTo(ex + 2.5, 0);
      ctx.moveTo(ex + 2.5, -5);
      ctx.lineTo(ex - 2.5, 0);
      ctx.stroke();
    }
  } else if (st.mood === 'squint') {
    ctx.beginPath();
    ctx.moveTo(-1.5, -2.5);
    ctx.lineTo(3.5, -2.5);
    ctx.moveTo(7.5, -2.5);
    ctx.lineTo(12.5, -2.5);
    ctx.stroke();
  } else {
    const er = st.mood === 'wow' ? 3.6 : 2.6;
    ctx.beginPath();
    ctx.arc(1.5, -2.5, er, 0, 6.2832);
    ctx.arc(10.5, -2.5, er, 0, 6.2832);
    ctx.fill();
  }

  // plume
  const pw = Math.sin(t * 13) * 3;
  ctx.fillStyle = look.helmet;
  ink(ctx, 2.4);
  ctx.beginPath();
  ctx.moveTo(-2, -R + 1);
  ctx.bezierCurveTo(-4, -R - 16, -20, -R - 16 + pw, -24, -R - 4 + pw);
  ctx.bezierCurveTo(-14, -R - 6, -8, -R, 4, -R + 1.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // --- shield bubble (drawn unrotated)
  if (st.shieldT > 0) {
    const fade = st.shieldT < 0.45 ? 0.4 + 0.6 * Math.abs(Math.sin(t * 22)) : 1;
    const br = 33 + Math.sin(t * 9) * 1.5;
    glow(ctx, k.x, k.y, br * 1.5, '#bfe9ff', 0.5 * fade);
    ctx.globalAlpha = fade;
    ctx.fillStyle = 'rgba(150,215,255,0.22)';
    ctx.strokeStyle = '#e9f8ff';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(k.x, k.y, br, 0, 6.2832);
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(k.x, k.y, br - 7, -2.4 + t * 2, -1.5 + t * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
