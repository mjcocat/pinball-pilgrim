// Headless tuning harness: plays many seeded runs with simple bots and prints distance/time stats.
//   node tools/sim.mjs            -> stats table
//   node tools/sim.mjs --check    -> exits non-zero if tuning drifts out of its target window
import { CFG, M } from '../src/core/config.js';
import { createRun, launch, kick, shield, step, distanceM, goosePos } from '../src/core/sim.js';
import { mulberry32 } from '../src/core/rng.js';
import { HAZARDS } from '../src/core/config.js';

const N = Number(process.argv.find((a) => /^\d+$/.test(a)) || 300);

function hazardAhead(run) {
  const k = run.k;
  let hit = false;
  run.world.forRange(k.x, k.x + 30 + Math.max(0, k.vx) * 0.28, (o) => {
    if (!HAZARDS.has(o.type)) return;
    const y = o.type === 'goose' ? goosePos(o, run.t).y : o.y - 30;
    if (Math.abs(k.y + k.vy * 0.15 - y) < 90) hit = true;
  });
  return hit;
}

const bots = {
  // launches at a random-ish angle and never touches the buttons
  idle: () => {},
  // presses KICK when sinking slowly, never shields
  casual: (run) => {
    const k = run.k;
    const alt = run.world.ground(k.x) - k.y;
    if (alt < 60 && Math.hypot(k.vx, k.vy) < 330) kick(run);
  },
  // also shields incoming hazards
  skilled: (run) => {
    const k = run.k;
    const alt = run.world.ground(k.x) - k.y;
    if (run.shieldT <= 0 && hazardAhead(run)) shield(run);
    if (alt < 70 && k.vy > 0 && Math.hypot(k.vx, k.vy) < 420) kick(run);
  },
};

function play(seed, bot) {
  const rng = mulberry32(seed * 7919 + 13);
  const run = createRun(seed);
  const skilled = bot === bots.skilled;
  const angle = ((skilled ? 38 + rng() * 8 : 20 + rng() * 45) * Math.PI) / 180;
  const power = skilled ? 0.92 + rng() * 0.08 : 0.45 + rng() * 0.55;
  launch(run, angle, power);
  let guard = 0;
  while (run.phase === 'flying' && guard++ < 120 * 600) {
    bot(run);
    step(run, CFG.dt);
  }
  return { d: distanceM(run), t: run.t, chain: run.bestChain, capped: run.phase === 'flying' };
}

const q = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(arr.length * p))];
const out = {};
console.log('bot      |  dist p10 / p50 / p90 / max (m) |  time p10 / p50 / p90 (s) | chain p50 | never-ending');
for (const name of Object.keys(bots)) {
  const res = [];
  for (let s = 1; s <= N; s++) res.push(play(s, bots[name]));
  const d = res.map((r) => r.d).sort((a, b) => a - b);
  const t = res.map((r) => r.t).sort((a, b) => a - b);
  const c = res.map((r) => r.chain).sort((a, b) => a - b);
  out[name] = { d50: q(d, 0.5), t50: q(t, 0.5), capped: res.filter((r) => r.capped).length };
  console.log(
    `${name.padEnd(8)} | ${[q(d, 0.1), q(d, 0.5), q(d, 0.9), d[d.length - 1]].map((v) => v.toFixed(0).padStart(5)).join(' /')} | ` +
      `${[q(t, 0.1), q(t, 0.5), q(t, 0.9)].map((v) => v.toFixed(0).padStart(5)).join(' /')} | ${String(q(c, 0.5)).padStart(5)} | ${out[name].capped}`
  );
}

if (process.argv.includes('--check')) {
  const fail = [];
  if (out.idle.d50 < 120) fail.push('idle runs are too short to be fun');
  if (out.skilled.t50 < 45 || out.skilled.t50 > 150) fail.push('skilled runs should last roughly 1-2 minutes');
  if (out.skilled.d50 <= out.casual.d50 || out.casual.d50 <= out.idle.d50) fail.push('skill should pay off');
  if (out.skilled.capped + out.casual.capped + out.idle.capped > 0) fail.push('some runs never end');
  if (fail.length) {
    console.error('TUNING CHECK FAILED:\n - ' + fail.join('\n - '));
    process.exit(1);
  }
  console.log('tuning check ok');
}
