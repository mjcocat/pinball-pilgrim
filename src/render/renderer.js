// Camera + frame composition. Order: sky -> parallax hills -> props -> terrain -> puddles -> knight -> fx.
import { CFG } from '../core/config.js';
import { clamp } from '../core/rng.js';
import { START } from '../core/sim.js';
import { paletteAt, INK, CREAM, ink } from './palette.js';
import { drawSky, drawHills, drawGround, drawCastle } from './scenery.js';
import { drawProp, drawPuddle, star } from './props.js';
import { drawKnight } from './knight.js';
import { Fx } from './fx.js';

const PIVOT = { x: -150, y: -CFG.wallH - 26 };

/** Where the knight sits in the catapult cup for a given pull (0..1). */
export function cupPos(pull) {
  const a = -0.42 - pull * 0.5;
  return { x: PIVOT.x + 52 * Math.cos(a) + 18 * Math.sin(a), y: PIVOT.y + 52 * Math.sin(a) - 18 * Math.cos(a) };
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cam = { x: 0, y: -200, zoom: 1, base: 1, restY: 0 };
    this.fx = new Fx();
    this.shakeAmt = 0;
    this.reduced = false;
    this.resize();
  }

  setReducedMotion(on) {
    this.reduced = on;
    this.fx.scale = on ? 0.35 : 1;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = this.canvas.clientWidth || window.innerWidth;
    this.h = this.canvas.clientHeight || window.innerHeight;
    this.dpr = dpr;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    // always show at least ~600 world units of height and ~760 of width
    this.cam.base = Math.min(this.h / 600, this.w / 760);
  }

  shake(amount) {
    if (!this.reduced) this.shakeAmt = Math.min(7, Math.max(this.shakeAmt, amount));
  }

  updateCamera(run, dt, snap) {
    const cam = this.cam, k = run.k;
    const flying = run.phase !== 'ready';
    const gy = run.world.ground(Math.max(k.x, 0));
    const alt = gy - k.y;
    const zoomT = clamp(this.h / cam.base / (alt + 330), this.reduced ? 0.75 : 0.5, 1);
    const S = cam.base * zoomT;
    const visW = this.w / S, visH = this.h / S;
    // look ahead in the direction of travel so upcoming props are readable
    const ahead = flying ? clamp(k.vx * 0.22, -60, 240) : 0;
    const tx = k.x + visW * 0.22 + ahead;
    cam.restY = gy - 0.3 * visH;
    const ty = Math.min(cam.restY, k.y + 0.34 * visH);
    if (snap) {
      cam.x = tx;
      cam.y = ty;
      cam.zoom = zoomT;
    } else {
      cam.x += (tx - cam.x) * (1 - Math.exp(-7 * dt));
      cam.y += (ty - cam.y) * (1 - Math.exp(-6 * dt));
      cam.zoom += (zoomT - cam.zoom) * (1 - Math.exp(-2.4 * dt));
    }
    this.shakeAmt *= Math.exp(-9 * dt);
    this.fx.update(dt);
  }

  draw(run, st) {
    const { ctx, cam, w, h, dpr } = this;
    const S = cam.base * cam.zoom;
    const time = st.time;
    const pal = paletteAt(run.k.x);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawSky(ctx, w, h, pal, cam, time);
    drawHills(ctx, w, h, cam, S, { f: 0.08, rest: 0.6, amp: 46, freq: 0.0021, salt: 1, every: 260, size: 1, density: 0.5, color: pal.far }, time);
    drawHills(ctx, w, h, cam, S, { f: 0.2, rest: 0.68, amp: 34, freq: 0.0034, salt: 2, every: 210, size: 1.5, density: 0.6, color: pal.mid }, time);
    drawHills(ctx, w, h, cam, S, { f: 0.42, rest: 0.75, amp: 26, freq: 0.005, salt: 3, every: 240, size: 2.3, density: 0.45, color: pal.near }, time);

    // --- world space
    const shx = this.shakeAmt ? Math.sin(time * 91) * this.shakeAmt : 0;
    const shy = this.shakeAmt ? Math.cos(time * 77) * this.shakeAmt : 0;
    ctx.setTransform(dpr * S, 0, 0, dpr * S, dpr * (w / 2 - cam.x * S + shx), dpr * (h / 2 - cam.y * S + shy));
    const x0 = cam.x - w / 2 / S, x1 = cam.x + w / 2 / S;
    const bottom = cam.y + h / 2 / S + 40;

    if (x0 < 0) drawCastle(ctx, time, st.aim ? st.aim.power : 0, st.sinceLaunch, st.look.helmet);
    const puddles = [];
    run.world.forRange(x0 - 260, x1 + 260, (o) => {
      if (o.type === 'puddle') puddles.push(o);
      else drawProp(ctx, o, run.t, time);
    });
    drawGround(ctx, run.world, x0, x1, pal, bottom);
    for (const o of puddles) drawPuddle(ctx, o, run.world, run.t, time);

    // --- aim preview
    if (st.aim && st.aim.power > 0.02) {
      const s = CFG.launchMin + (CFG.launchMax - CFG.launchMin) * st.aim.power;
      const vx = Math.cos(st.aim.angle) * s, vy = -Math.sin(st.aim.angle) * s;
      for (let i = 1; i <= 11; i++) {
        const tt = i * 0.075;
        ctx.fillStyle = CREAM;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 1 - i / 13;
        ctx.beginPath();
        ctx.arc(START.x + vx * tt, START.y + vy * tt + 0.5 * CFG.gravity * tt * tt, (7 - i * 0.4) * Math.max(1, 0.85 / S), 0, 6.2832);
        ctx.fill();
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // --- knight
    let k = run.k;
    if (run.phase === 'ready') {
      const c = cupPos(st.aim ? st.aim.power : 0);
      k = { x: c.x, y: c.y + Math.sin(time * 3) * 1.5, vx: 0, vy: 0, ang: -0.15 - (st.aim ? st.aim.power * 0.3 : 0), squash: 0 };
    }
    const mood = run.phase === 'ended' ? 'dizzy' : k.onGround ? 'squint' : k.vy > 450 ? 'wow' : 'calm';
    drawKnight(ctx, k, st.look, { time, shieldT: run.shieldT, mood, airborne: run.phase === 'flying' && !k.onGround });
    if (run.phase === 'ended') {
      ctx.fillStyle = '#ffe680';
      for (let i = 0; i < 3; i++) star(ctx, k.x + Math.cos(time * 4 + i * 2.1) * 20, k.y - 30 + Math.sin(time * 4 + i * 2.1) * 6, 5);
    }
    this.fx.draw(ctx);

    // --- screen-space aim line + tutorial hand
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (st.aim && st.aim.p0) {
      const { p0, p1 } = st.aim;
      ink(ctx, 4);
      ctx.setLineDash([2, 10]);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(251,241,216,0.85)';
      ctx.beginPath();
      ctx.arc(p0.x, p0.y, 9, 0, 6.2832);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, 20, 0, 6.2832);
      ctx.fill();
      ctx.stroke();
    } else if (st.hand) {
      const ph = (time * 0.55) % 1;
      const e = ph < 0.15 ? 0 : ph > 0.8 ? 1 : (ph - 0.15) / 0.65;
      const ease = e * e * (3 - 2 * e);
      const ax = w * 0.6, ay = h * 0.46;
      const bx = ax - Math.min(w * 0.24, 190) * ease, by = ay + Math.min(h * 0.2, 120) * ease;
      ctx.globalAlpha = ph > 0.9 ? (1 - ph) * 10 : Math.min(1, ph * 10);
      ink(ctx, 4);
      ctx.setLineDash([2, 10]);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(251,241,216,0.9)';
      ctx.beginPath();
      ctx.arc(bx, by, 20, 0, 6.2832);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bx, by, 28 + Math.sin(time * 6) * 3, 0, 6.2832);
      ctx.globalAlpha *= 0.4;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}
