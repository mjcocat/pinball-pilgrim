// Deterministic kingdom: terrain height + objects, generated chunk by chunk from a seed.
import { CFG, REGIONS, M } from './config.js';
import { mulberry32, hashInt, smooth } from './rng.js';

const CYCLE = REGIONS.reduce((s, r) => s + r.len * M, 0);
const BLEND = 700;

/** Which region a world x sits in, plus blend factor toward the next one. */
export function regionAt(x) {
  const d = Math.max(0, x);
  const lap = Math.floor(d / CYCLE);
  let pos = d - lap * CYCLE;
  let i = 0;
  while (pos >= REGIONS[i].len * M) {
    pos -= REGIONS[i].len * M;
    i++;
  }
  const len = REGIONS[i].len * M;
  return {
    index: i,
    lap,
    region: REGIONS[i],
    next: REGIONS[(i + 1) % REGIONS.length],
    blend: smooth(len - BLEND, len, pos),
  };
}

function pick(weights, rng) {
  let total = 0;
  for (const k in weights) total += weights[k];
  let v = rng() * total;
  for (const k in weights) {
    v -= weights[k];
    if (v <= 0) return k;
  }
  return 'mushroom';
}

export function createWorld(seed) {
  const r = mulberry32(hashInt(seed, 7));
  const p = [r() * 6.28, r() * 6.28, r() * 6.28];
  const chunks = new Map();
  let nextId = 1;

  function ground(x) {
    if (x < -40) return -CFG.wallH; // top of the castle wall
    const t = smooth(300, 1600, x);
    if (t <= 0) return 0;
    return -t * (Math.sin(x * 0.0021 + p[0]) * 70 + Math.sin(x * 0.0053 + p[1]) * 34 + Math.sin(x * 0.0113 + p[2]) * 10);
  }

  function slope(x) {
    if (x < 0) return 0;
    return (ground(x + 4) - ground(x - 4)) / 8;
  }

  function add(list, type, x, extra) {
    // keep ground props from stacking on top of each other
    for (const o of list) if (Math.abs(o.x - x) < 120 && !o.h && !(extra && extra.h)) x = o.x + 135;
    const o = { id: nextId++, type, x, y: ground(x), readyAt: 0, hitT: -99, ...extra };
    list.push(o);
    return o;
  }

  function spawn(list, type, x, rng) {
    switch (type) {
      case 'mushroom': {
        const n = 1 + Math.floor(rng() * 2.6);
        for (let i = 0; i < n; i++) add(list, 'mushroom', x + i * 135, { s: 0.8 + rng() * 0.55, tint: Math.floor(rng() * 3) });
        break;
      }
      case 'bell': add(list, 'bell', x, { h: 150 + rng() * 190 }); break;
      case 'banner': add(list, 'banner', x, { h: 120 + rng() * 170, tint: Math.floor(rng() * 3) }); break;
      case 'royal': add(list, 'royal', x, { h: 120 + rng() * 120 }); break;
      case 'awning': add(list, 'awning', x, { h: 130 + rng() * 70, tint: Math.floor(rng() * 3) }); break;
      case 'goose': add(list, 'goose', x, { h: 230 + rng() * 220, ph: rng() * 6.28 }); break;
      case 'puddle':
        // water does not sit on a hillside: steep spots grow a mushroom instead
        if (Math.abs(slope(x)) > 0.09) add(list, 'mushroom', x, { s: 0.8 + rng() * 0.55, tint: Math.floor(rng() * 3) });
        else add(list, 'puddle', x, { w: 150 + rng() * 90 });
        break;
      default: add(list, type, x, null);
    }
  }

  function chunk(i) {
    let list = chunks.get(i);
    if (list) return list;
    list = [];
    chunks.set(i, list);
    if (i < 0) return list;
    const rng = mulberry32(hashInt(seed, i + 101));
    const x0 = i * CFG.chunk;
    const distM = x0 / M;
    const sparse = 1 + distM / CFG.sparseM;
    const info = regionAt(x0 + CFG.chunk / 2);
    // hazards creep in with distance; none in the first stretch
    const weights = { ...info.region.w };
    const hz = distM < 60 ? 0 : Math.min(2.2, 0.6 + distM / 900);
    for (const k of ['goat', 'bramble', 'goose']) if (weights[k]) weights[k] *= hz;

    let x = x0 + rng() * 220;
    while (x < x0 + CFG.chunk) {
      if (x > 760) spawn(list, pick(weights, rng), x, rng);
      x += (CFG.gapMin + rng() * CFG.gapVar) * sparse;
    }
    if (i % CFG.rechargeEvery === 1) spawn(list, rng() < 0.5 ? 'royal' : 'spring', x0 + 260 + rng() * 360, rng);
    return list;
  }

  /** Visit every object whose anchor lies within [x0, x1]. */
  function forRange(x0, x1, fn) {
    const a = Math.floor(x0 / CFG.chunk);
    const b = Math.floor(x1 / CFG.chunk);
    for (let i = a; i <= b; i++) {
      const list = chunk(i);
      for (let j = 0; j < list.length; j++) {
        const o = list[j];
        if (o.x >= x0 && o.x <= x1) fn(o);
      }
    }
  }

  return { seed, ground, slope, forRange };
}
