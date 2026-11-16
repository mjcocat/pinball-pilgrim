// Pure, DOM-free simulation of one run. Emits events that rendering, audio and UI react to.
import { CFG, M } from './config.js';
import { createWorld } from './world.js';

export const START = { x: -110, y: -(CFG.wallH + 62) };
const R = CFG.r;

export function createRun(seed) {
  return {
    seed,
    world: createWorld(seed),
    k: { x: START.x, y: START.y, vx: 0, vy: 0, ang: 0, spin: 0, onGround: false, squash: 0 },
    phase: 'ready', // ready -> flying -> ended
    t: 0,
    kicks: CFG.kicks,
    shields: CFG.shields,
    shieldT: 0,
    kickReady: 0,
    chain: 0,
    lastGoodT: -99,
    bestChain: 0,
    topSpeed: 0,
    bounces: 0,
    maxX: 0,
    stillT: 0,
    lastProgressT: 0,
    puddleT: 0,
    events: [],
  };
}

export const distanceM = (run) => Math.max(0, run.maxX / M);

export function launch(run, angle, power) {
  if (run.phase !== 'ready') return;
  const s = CFG.launchMin + (CFG.launchMax - CFG.launchMin) * power;
  const k = run.k;
  k.x = START.x;
  k.y = START.y;
  k.vx = Math.cos(angle) * s;
  k.vy = -Math.sin(angle) * s;
  k.spin = 5 + power * 9;
  run.phase = 'flying';
  run.events.push({ t: 'launch', power });
}

export function kick(run) {
  if (run.phase !== 'flying' || run.kicks <= 0 || run.t < run.kickReady) return false;
  const k = run.k;
  run.kicks--;
  run.kickReady = run.t + 0.3;
  k.vx = Math.max(k.vx, 60) + CFG.kickX;
  k.vy = Math.min(k.vy, 80) - CFG.kickY;
  k.y -= 3;
  k.onGround = false;
  k.spin = 14;
  run.stillT = 0;
  run.events.push({ t: 'kick', x: k.x, y: k.y });
  return true;
}

export function shield(run) {
  if (run.phase !== 'flying' || run.shields <= 0 || run.shieldT > 0.2) return false;
  run.shields--;
  run.shieldT = CFG.shieldTime;
  run.events.push({ t: 'shield', x: run.k.x, y: run.k.y });
  return true;
}

function setVel(k, speed, angleDeg) {
  const a = (angleDeg * Math.PI) / 180;
  k.vx = Math.cos(a) * speed;
  k.vy = -Math.sin(a) * speed;
}

function chainUp(run) {
  run.chain = run.t - run.lastGoodT < CFG.chainWindow ? run.chain + 1 : 1;
  run.lastGoodT = run.t;
  if (run.chain > run.bestChain) run.bestChain = run.chain;
  run.bounces++;
}

function recharge(run, o) {
  const before = run.kicks + run.shields;
  run.kicks = Math.min(CFG.kicks, run.kicks + 1);
  run.shields = Math.min(CFG.shields, run.shields + 1);
  run.events.push({ t: 'recharge', x: o.x, y: run.k.y, gained: run.kicks + run.shields - before });
}

/** Position of a goose at the current run time (it bobs about). */
export function goosePos(o, t) {
  return { x: o.x + Math.sin(t * 1.3 + o.ph) * 40, y: o.y - o.h + Math.sin(t * 2.1 + o.ph) * 18 };
}

// Returns 'good' | 'bad' | 'deflect' | 'soft' | null and mutates the knight.
function touch(run, o) {
  const k = run.k;
  const sh = run.shieldT > 0;
  const dx = k.x - o.x;
  const sp = Math.hypot(k.vx, k.vy);
  switch (o.type) {
    case 'mushroom': {
      const cy = o.y - 58 * o.s;
      const ex = dx / (44 * o.s + R * 0.8);
      const ey = (k.y - cy) / (26 * o.s + R * 0.8);
      if (ex * ex + ey * ey >= 1) return null;
      k.vy = -Math.min(1150, Math.max(560 * o.s + 140, Math.abs(k.vy) * 0.8 + 280));
      k.vx = Math.max(k.vx + 50, 240);
      k.y = Math.min(k.y, cy - 10);
      return 'good';
    }
    case 'bell': {
      const cy = o.y - o.h;
      const dy = k.y - cy;
      if (dx * dx + dy * dy >= (34 + R) * (34 + R)) return null;
      const s = Math.min(1500, Math.max(sp * 1.1, 840));
      // bells always ring you onward and upward
      const d = Math.hypot(dx, dy) || 1;
      let ux = Math.abs(dx / d) * 0.5 + 0.72;
      let uy = -Math.abs(dy / d) * 0.5 - 0.5;
      const n = Math.hypot(ux, uy);
      k.vx = (ux / n) * s;
      k.vy = (uy / n) * s;
      return 'good';
    }
    case 'banner':
    case 'royal': {
      if (Math.abs(dx) > 85 + R * 0.6 || Math.abs(k.y - (o.y - o.h)) > 34 + R * 0.6) return null;
      setVel(k, Math.min(1400, Math.max(sp * 0.96, 680)), 31);
      if (o.type === 'royal') recharge(run, o);
      return 'good';
    }
    case 'awning': {
      // slanted cloth from high-left to low-right; only catches from above
      const ax = o.x - 85, ay = o.y - o.h - 28;
      const sx = 170, sy = 56, len = Math.hypot(sx, sy);
      const t = Math.max(0, Math.min(1, ((k.x - ax) * sx + (k.y - ay) * sy) / (len * len)));
      const px = ax + sx * t, py = ay + sy * t;
      if (Math.hypot(k.x - px, k.y - py) > R + 7) return null;
      const nx = sy / len, ny = -sx / len;
      const vn = k.vx * nx + k.vy * ny;
      if (vn > 0) return null;
      k.vx -= 1.9 * vn * nx;
      k.vy -= 1.9 * vn * ny;
      k.vx += nx * 240;
      k.vy += ny * 240;
      k.vx = Math.max(k.vx, 300);
      k.vy = Math.min(k.vy, -420);
      return 'good';
    }
    case 'windmill': {
      const dy = k.y - (o.y - 250);
      if (dx * dx + dy * dy >= (150 + R) * (150 + R)) return null;
      k.vx = Math.max(k.vx + 440, 660);
      k.vy = Math.min(k.vy, 0) - 420;
      o.readyAt = run.t + 2;
      return 'good';
    }
    case 'ramp': {
      if (Math.abs(dx) > 85 + R || k.vx < 60) return null;
      const surf = o.y - ((dx + 85) / 170) * 85;
      if (k.y + R < surf - 6) return null;
      setVel(k, Math.min(1400, Math.max(sp * 1.08, 660)), 36);
      k.y = Math.min(k.y, surf - R);
      return 'good';
    }
    case 'spring': {
      if (Math.abs(dx) > 50 + R || k.y + R < o.y - 42) return null;
      setVel(k, Math.min(1500, Math.max(sp * 1.1, 940)), 50);
      k.y = Math.min(k.y, o.y - 42 - R);
      recharge(run, o);
      return 'good';
    }
    case 'haystack': {
      const ex = dx / (70 + R), ey = (k.y - o.y) / (78 + R);
      if (ex * ex + ey * ey >= 1) return null;
      if (!sh) k.vx *= 0.62;
      k.vx = Math.max(k.vx, 150);
      k.vy = -250;
      o.readyAt = run.t + 1;
      return 'soft';
    }
    case 'goat': {
      const dy = k.y - (o.y - 32);
      if (dx * dx + dy * dy >= (34 + R) * (34 + R)) return null;
      o.readyAt = run.t + 1.5;
      if (sh) {
        k.vx = Math.max(k.vx * 1.05, 440);
        k.vy = -540;
        return 'deflect';
      }
      k.vx = Math.max(k.vx * 0.4, 200);
      k.vy = -560;
      return 'bad';
    }
    case 'bramble': {
      const ex = dx / (62 + R * 0.7), ey = (k.y - (o.y - 20)) / (50 + R * 0.7);
      if (ex * ex + ey * ey >= 1) return null;
      o.readyAt = run.t + 1.2;
      if (sh) {
        k.vy = Math.min(k.vy, -260);
        return 'deflect';
      }
      k.vx = Math.max(k.vx * 0.45, 110);
      k.vy = Math.min(k.vy * 0.3, -190);
      return 'bad';
    }
    case 'goose': {
      const g = goosePos(o, run.t);
      const gx = k.x - g.x, gy = k.y - g.y;
      if (gx * gx + gy * gy >= (30 + R) * (30 + R)) return null;
      o.readyAt = run.t + 1.5;
      if (sh) {
        k.vy = -640;
        k.vx = Math.max(k.vx * 1.05, 420);
        return 'deflect';
      }
      k.vy = Math.abs(k.vy) * 0.3 + 300;
      k.vx *= 0.75;
      return 'bad';
    }
  }
  return null;
}

function objects(run) {
  const k = run.k;
  run.world.forRange(k.x - 260, k.x + 260, (o) => {
    if (o.type === 'puddle' || run.t < o.readyAt) return;
    const sp = Math.hypot(k.vx, k.vy);
    const res = touch(run, o);
    if (!res) return;
    if (o.readyAt <= run.t) o.readyAt = run.t + 0.5;
    o.hitT = run.t;
    k.onGround = false;
    k.squash = 1;
    k.spin = (k.vx / R) * 0.35;
    run.stillT = 0;
    if (res === 'good' || res === 'deflect') chainUp(run);
    else if (res === 'bad') run.chain = 0;
    run.events.push({ t: 'hit', kind: o.type, res, o, x: k.x, y: k.y, speed: sp, chain: run.chain });
  });
}

function puddleAt(run, x) {
  let found = null;
  run.world.forRange(x - 140, x + 140, (o) => {
    if (o.type === 'puddle' && Math.abs(x - o.x) < o.w / 2) found = o;
  });
  return found;
}

function groundCollide(run, dt) {
  const k = run.k, w = run.world;
  // castle wall face
  if (k.x - R < -40 && k.x > -70 && k.y + R > -CFG.wallH + 6) {
    k.x = -40 + R;
    k.vx = Math.abs(k.vx) * 0.5 + 40;
  }
  if (k.x < -330) {
    k.x = -330;
    k.vx = Math.abs(k.vx) * 0.6 + 80;
  }
  const gy = w.ground(k.x);
  if (k.y + R < gy) {
    if (k.y + R < gy - 3) k.onGround = false;
    return;
  }
  const sl = w.slope(k.x);
  const inv = 1 / Math.hypot(sl, 1);
  const nx = sl * inv, ny = -inv; // surface normal (pointing up)
  const tx = inv, ty = sl * inv; // tangent (pointing right)
  k.y = gy - R;
  const vn = k.vx * nx + k.vy * ny;
  let vt = k.vx * tx + k.vy * ty;
  const sh = run.shieldT > 0;
  const pud = puddleAt(run, k.x);
  if (vn < 0) {
    const impact = -vn;
    if (impact > CFG.bounceMin) {
      let e = sh ? 0.86 : CFG.groundE;
      let f = sh ? 1 : CFG.groundF;
      let out = impact * e;
      let kind = 'ground';
      if (pud) {
        if (Math.abs(vt) > 460 && impact < Math.abs(vt) * 1.1) {
          // fast and shallow: skip like a stone
          out = Math.max(impact * 0.7, 230);
          f = 0.98;
          kind = 'skip';
          chainUp(run);
        } else if (!sh) {
          out = impact * 0.22;
          f = 0.68;
          kind = 'splash';
        }
        pud.hitT = run.t;
      }
      vt *= f;
      k.vx = tx * vt + nx * out;
      k.vy = ty * vt + ny * out;
      k.onGround = false;
      k.spin = vt / R;
      k.squash = Math.min(1, impact / 700);
      run.events.push({ t: 'ground', kind, x: k.x, y: gy, speed: impact, shield: sh, chain: run.chain });
    } else {
      k.onGround = true;
    }
  }
  if (k.onGround) {
    const dec = CFG.rollFric * dt;
    vt = Math.abs(vt) <= dec ? 0 : vt - Math.sign(vt) * dec;
    vt *= Math.exp(-(CFG.rollDrag + (pud && !sh ? 1.6 : 0)) * dt);
    k.vx = tx * vt;
    k.vy = ty * vt;
    k.spin = vt / R;
    if (pud && Math.abs(vt) > 90) {
      run.puddleT -= dt;
      if (run.puddleT <= 0) {
        run.puddleT = 0.12;
        pud.hitT = run.t;
        run.events.push({ t: 'ground', kind: 'wade', x: k.x, y: gy, speed: Math.abs(vt) });
      }
    }
  }
}

export function step(run, dt) {
  if (run.phase !== 'flying') return;
  const k = run.k;
  run.t += dt;
  if (run.shieldT > 0) {
    run.shieldT -= dt;
    if (run.shieldT <= 0) run.events.push({ t: 'shieldEnd' });
  }
  k.vy += CFG.gravity * dt;
  const drag = Math.exp(-CFG.drag * dt);
  k.vx *= drag;
  k.vy *= drag;
  const sp = Math.hypot(k.vx, k.vy);
  if (sp > CFG.maxSpeed) {
    k.vx *= CFG.maxSpeed / sp;
    k.vy *= CFG.maxSpeed / sp;
  }
  if (sp > run.topSpeed) run.topSpeed = sp;
  k.x += k.vx * dt;
  k.y += k.vy * dt;
  k.ang += k.spin * dt;
  if (!k.onGround) k.spin *= Math.exp(-0.4 * dt);
  k.squash *= Math.exp(-9 * dt);

  objects(run);
  groundCollide(run, dt);

  if (k.x > run.maxX + 2) {
    run.maxX = k.x;
    run.lastProgressT = run.t;
  }
  if (run.chain > 0 && run.t - run.lastGoodT > CFG.chainWindow) {
    run.chain = 0;
    run.events.push({ t: 'chainEnd' });
  }

  // run ends once the knight has clearly stopped
  const slow = k.onGround && Math.hypot(k.vx, k.vy) < CFG.stillSpeed;
  run.stillT = slow ? run.stillT + dt : 0;
  const limit = run.kicks > 0 ? CFG.stillTimeCharged : CFG.stillTime;
  if (run.stillT > limit || run.t - run.lastProgressT > CFG.stuckTime) {
    run.phase = 'ended';
    k.vx = k.vy = k.spin = 0;
    run.events.push({ t: 'end' });
  }
}
