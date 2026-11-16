// Particles and floating words. Small, pooled-by-cap, and quiet when reduced motion is on.
import { INK } from './palette.js';
import { star } from './props.js';

const MAX = 240;

export class Fx {
  constructor() {
    this.p = [];
    this.words = [];
    this.scale = 1; // lowered for reduced motion
  }

  clear() {
    this.p.length = 0;
    this.words.length = 0;
  }

  burst(kind, x, y, n, opt = {}) {
    n = Math.max(1, Math.round(n * this.scale));
    const { color = '#fff', speed = 220, up = 0.6, size = 5, life = 0.6, gravity = 900, spread = Math.PI * 2, dir = -Math.PI / 2 } = opt;
    for (let i = 0; i < n && this.p.length < MAX; i++) {
      const a = dir + (Math.random() - 0.5) * spread;
      const s = speed * (0.35 + Math.random() * 0.65);
      this.p.push({
        kind, x, y,
        vx: Math.cos(a) * s + (opt.vx || 0),
        vy: Math.sin(a) * s * (up ? 1 : 1) + (opt.vy || 0),
        g: gravity, life: life * (0.6 + Math.random() * 0.4), age: 0,
        size: size * (0.6 + Math.random() * 0.6), color,
        rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 12,
      });
    }
  }

  ring(x, y, color, size = 60) {
    if (this.p.length < MAX) this.p.push({ kind: 'ring', x, y, vx: 0, vy: 0, g: 0, life: 0.38, age: 0, size, color, rot: 0, vr: 0 });
  }

  word(text, x, y, color = '#fff8e0') {
    this.words.push({ text, x, y, age: 0, color });
    if (this.words.length > 6) this.words.shift();
  }

  update(dt) {
    for (let i = this.p.length - 1; i >= 0; i--) {
      const q = this.p[i];
      q.age += dt;
      if (q.age >= q.life) {
        this.p[i] = this.p[this.p.length - 1];
        this.p.pop();
        continue;
      }
      q.vy += q.g * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.rot += q.vr * dt;
    }
    for (let i = this.words.length - 1; i >= 0; i--) {
      const w = this.words[i];
      w.age += dt;
      w.y -= 46 * dt;
      if (w.age > 1.1) this.words.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const q of this.p) {
      const k = q.age / q.life;
      ctx.globalAlpha = k < 0.7 ? 1 : (1 - k) / 0.3;
      ctx.fillStyle = q.color;
      switch (q.kind) {
        case 'dust':
          ctx.globalAlpha *= 0.7;
          ctx.beginPath();
          ctx.arc(q.x, q.y, q.size * (1 + k * 1.6), 0, 6.2832);
          ctx.fill();
          break;
        case 'drop':
          ctx.beginPath();
          ctx.ellipse(q.x, q.y, q.size * 0.6, q.size, Math.atan2(q.vy, q.vx) + 1.57, 0, 6.2832);
          ctx.fill();
          break;
        case 'straw':
        case 'leaf':
          ctx.save();
          ctx.translate(q.x, q.y);
          ctx.rotate(q.rot);
          if (q.kind === 'straw') ctx.fillRect(-q.size, -1, q.size * 2, 2.4);
          else {
            ctx.beginPath();
            ctx.ellipse(0, 0, q.size, q.size * 0.5, 0, 0, 6.2832);
            ctx.fill();
          }
          ctx.restore();
          break;
        case 'ring':
          ctx.globalAlpha = (1 - k) * 0.9;
          ctx.strokeStyle = q.color;
          ctx.lineWidth = 5 * (1 - k) + 1;
          ctx.beginPath();
          ctx.arc(q.x, q.y, q.size * (0.3 + k), 0, 6.2832);
          ctx.stroke();
          break;
        case 'note':
          ctx.font = `bold ${q.size * 4}px Georgia, serif`;
          ctx.fillText('♪', q.x, q.y);
          break;
        default:
          star(ctx, q.x, q.y, q.size * (1 - k * 0.5));
      }
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    for (const w of this.words) {
      const pop = Math.min(1, w.age * 9);
      ctx.globalAlpha = w.age > 0.8 ? (1.1 - w.age) / 0.3 : 1;
      ctx.font = `italic bold ${22 + pop * 8}px Georgia, 'Palatino Linotype', serif`;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 6;
      ctx.strokeText(w.text, w.x, w.y);
      ctx.fillStyle = w.color;
      ctx.fillText(w.text, w.x, w.y);
    }
    ctx.globalAlpha = 1;
  }
}
