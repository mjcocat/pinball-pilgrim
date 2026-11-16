// Colour helpers and the region palette blend used by the whole renderer.
import { regionAt } from '../core/world.js';

export const INK = '#3b2a22';
export const WOOD = '#a06d3f';
export const WOOD_DARK = '#7b5230';
export const CREAM = '#fbf1d8';
export const GOLD = '#f4c542';

const cache = new Map();
function rgb(hex) {
  let c = cache.get(hex);
  if (!c) {
    const n = parseInt(hex.slice(1), 16);
    c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    cache.set(hex, c);
  }
  return c;
}

export function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  return `rgb(${(A[0] + (B[0] - A[0]) * t) | 0},${(A[1] + (B[1] - A[1]) * t) | 0},${(A[2] + (B[2] - A[2]) * t) | 0})`;
}

/** amt > 0 lightens toward white, amt < 0 darkens toward ink. */
export function shade(hex, amt) {
  return amt >= 0 ? mix(hex, '#ffffff', amt) : mix(hex, '#2a1c1c', -amt);
}

const KEYS = ['skyTop', 'skyBot', 'sun', 'far', 'mid', 'near', 'grass', 'soil', 'accent'];

export function paletteAt(x) {
  const info = regionAt(x);
  const a = info.region, b = info.next, t = info.blend;
  const pal = { night: a.night + (b.night - a.night) * t, region: a, info };
  for (const k of KEYS) pal[k] = t > 0 ? mix(a[k], b[k], t) : a[k];
  return pal;
}

export function ink(ctx, w = 3) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = w;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
}

export function glow(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 6.2832);
  ctx.fill();
  ctx.globalAlpha = 1;
}
