// Game shell: run flow (ready -> flying -> ended), input, and turning sim events into sights and sounds.
import { CFG, M, HELMETS, CAPES } from './core/config.js';
import { clamp } from './core/rng.js';
import { regionAt } from './core/world.js';
import { createRun, launch, kick, shield, step, distanceM, START } from './core/sim.js';
import { Renderer } from './render/renderer.js';
import { Sound } from './audio/sound.js';
import { createUI } from './ui/hud.js';
import { load, save } from './storage.js';

const store = load();
const canvas = document.getElementById('game');
const renderer = new Renderer(canvas);
const sound = new Sound();
sound.volume = store.volume;
sound.muted = store.muted;
const fx = renderer.fx;

const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
renderer.setReducedMotion(motion.matches);
motion.addEventListener?.('change', () => renderer.setReducedMotion(motion.matches));

let run;
let aim = null; // { p0, p1, power, angle, id }
let launchTime = -1;
let firstOfSession = true;
let regionKey = 0;
let tutorial = null; // { stage } while the first-run tips are active
let acc = 0;
let last = performance.now() / 1000;
let readySince = last;
let resultTimer = 0;
let bestAtStart = store.best;

const look = { helmet: HELMETS[0].color, cape: 'plain' };
function syncLook() {
  look.helmet = (HELMETS.find((h) => h.id === store.helmet) || HELMETS[0]).color;
  look.cape = store.cape;
}
syncLook();

const ui = createUI(
  {
    kick: () => {
      const ok = kick(run);
      if (!ok && run.phase === 'flying') sound.empty();
      return ok || run.phase !== 'flying';
    },
    shield: () => {
      const ok = shield(run);
      if (!ok && run.phase === 'flying' && run.shieldT <= 0) sound.empty();
      return ok || run.phase !== 'flying' || run.shieldT > 0;
    },
    restart: (same) => {
      sound.unlock();
      sound.ui();
      newRun(same ? run.seed : undefined);
    },
    look: () => {
      syncLook();
      save(store);
    },
    volume: (v) => {
      store.volume = v;
      sound.unlock();
      sound.setVolume(v);
      sound.ui();
      save(store);
    },
    mute: () => {
      store.muted = !store.muted;
      sound.unlock();
      sound.setMuted(store.muted);
      ui.syncSound();
      save(store);
    },
    ui: () => {
      sound.unlock();
      sound.ui();
    },
  },
  store
);

function newRun(seed) {
  clearTimeout(resultTimer);
  if (seed === undefined) seed = 1 + Math.floor(Math.random() * 999999);
  run = createRun(seed);
  aim = null;
  launchTime = -1;
  acc = 0;
  regionKey = 0;
  bestAtStart = store.best;
  readySince = performance.now() / 1000;
  tutorial = store.tutorialDone ? null : { stage: 0 };
  fx.clear();
  renderer.updateCamera(run, 0, true);
  ui.setPhase('ready', firstOfSession);
  ui.tip('');
  ui.hint('kick', false);
  ui.hint('shield', false);
}

// ---------------------------------------------------------------- launch input
function readAim(e) {
  aim.p1 = { x: e.clientX, y: e.clientY };
  let dx = aim.p0.x - aim.p1.x, dy = aim.p0.y - aim.p1.y;
  // pulling back (slingshot) and pointing forward both work: we always fire to the right
  if (dx < 0) {
    dx = -dx;
    dy = -dy;
  }
  const ref = clamp(Math.min(renderer.w, renderer.h) * 0.42, 110, 240);
  aim.power = clamp(Math.hypot(dx, dy) / ref, 0, 1);
  aim.angle = clamp(Math.atan2(-dy, dx), CFG.angleMin, CFG.angleMax);
  sound.creak(aim.power);
}

canvas.addEventListener('pointerdown', (e) => {
  sound.unlock();
  ui.closePanels();
  if (run.phase !== 'ready' || aim || ui.modalOpen) return;
  aim = { p0: { x: e.clientX, y: e.clientY }, p1: null, power: 0, angle: 0.7, id: e.pointerId };
  readAim(e);
  canvas.setPointerCapture?.(e.pointerId);
  canvas.classList.add('aiming');
});
canvas.addEventListener('pointermove', (e) => {
  if (aim && e.pointerId === aim.id) readAim(e);
});
function endAim(e, fire) {
  if (!aim || e.pointerId !== aim.id) return;
  canvas.classList.remove('aiming');
  const a = aim;
  aim = null;
  if (fire && a.power >= 0.12) {
    launch(run, a.angle, a.power);
    launchTime = performance.now() / 1000;
    firstOfSession = false;
    ui.setPhase('flying', false);
  } else if (fire) {
    ui.tip('Drag farther to wind the catapult', 2200);
  }
}
canvas.addEventListener('pointerup', (e) => endAim(e, true));
canvas.addEventListener('pointercancel', (e) => endAim(e, false));
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const key = e.key.toLowerCase();
  if (key === ' ' || key === 'k' || key === 'arrowright') {
    e.preventDefault();
    sound.unlock();
    if (run.phase === 'flying') kick(run) || sound.empty();
    else if (run.phase === 'ended') newRun();
  } else if (key === 's' || key === 'shift' || key === 'arrowdown') {
    if (run.phase === 'flying') shield(run);
  } else if (key === 'r') {
    newRun();
  } else if (key === 'm') {
    store.muted = !store.muted;
    sound.setMuted(store.muted);
    ui.syncSound();
    save(store);
  }
});

window.addEventListener('resize', () => renderer.resize());
window.addEventListener('orientationchange', () => setTimeout(() => renderer.resize(), 200));
document.addEventListener('visibilitychange', () => {
  sound.suspend(document.hidden);
  last = performance.now() / 1000;
});

// ---------------------------------------------------------------- sim events -> feedback
const WORDS = { mushroom: 'Boing!', bell: 'Dong!', banner: 'Fwump!', royal: 'Fwump!', awning: 'Whee!', windmill: 'Whoosh!', ramp: 'Hup!', spring: 'Sproing!' };

function onHit(e) {
  const { kind, res, x, y, o } = e;
  if (res === 'good') {
    switch (kind) {
      case 'mushroom':
        sound.spring(o.s);
        fx.burst('dust', x, y + 14, 8, { color: '#fbf1d8', speed: 160, life: 0.5, gravity: -60, size: 4 });
        break;
      case 'bell':
        fx.burst('note', x, y - 20, 4, { color: '#fff3b0', speed: 150, life: 0.9, gravity: -200, size: 5, spread: 2 });
        fx.ring(o.x, o.y - o.h + 20, '#fff3b0', 80);
        break;
      case 'banner':
      case 'royal':
      case 'awning':
        sound.cloth();
        fx.burst('dust', x, y, 6, { color: '#fff', speed: 140, life: 0.4, gravity: 0, size: 4 });
        break;
      case 'windmill':
        sound.whoosh();
        fx.burst('dust', x, y, 12, { color: '#ffffff', speed: 380, life: 0.5, gravity: 0, size: 4, dir: -0.5, spread: 0.9 });
        break;
      case 'ramp':
        sound.wood();
        fx.burst('dust', x, y + 14, 6, { color: '#e6cfa5', speed: 170, life: 0.4, gravity: 200, size: 4 });
        break;
      case 'spring':
        sound.spring(0.75);
        fx.burst('spark', x, y, 10, { color: '#ffe680', speed: 300, life: 0.6, gravity: 300, size: 6 });
        break;
    }
    sound.chainNote(e.chain, kind === 'bell' ? 'bell' : undefined);
    fx.word(e.chain >= 3 && e.chain % 5 === 0 ? `Chain ×${e.chain}!` : WORDS[kind], x, y - 44, e.chain >= 5 ? '#ffe680' : '#fff8e0');
    renderer.shake(2 + e.speed / 500);
  } else if (res === 'soft') {
    sound.hay();
    fx.burst('straw', x, y, 16, { color: '#eec65a', speed: 300, life: 0.8, gravity: 700, size: 7, spread: 2.6 });
    fx.word('Floof', x, y - 44);
  } else if (res === 'deflect') {
    sound.deflect();
    sound.chainNote(e.chain);
    fx.ring(x, y, '#bfe9ff', 90);
    fx.burst('spark', x, y, 12, { color: '#e9f8ff', speed: 340, life: 0.5, gravity: 200, size: 6 });
    fx.word('Deflect!', x, y - 48, '#bfe9ff');
    renderer.shake(4);
  } else {
    if (kind === 'goat') {
      sound.goat();
      fx.word('Baaa!', x, y - 48, '#ffb4a0');
      fx.burst('spark', x, y, 8, { color: '#fff', speed: 280, life: 0.4, gravity: 0, size: 6 });
    } else if (kind === 'goose') {
      sound.goose();
      fx.word('Honk!', x, y - 48, '#ffb4a0');
      fx.burst('leaf', x, y, 12, { color: '#ffffff', speed: 240, life: 1, gravity: 260, size: 6 });
    } else {
      sound.bramble();
      fx.word('Ouch!', x, y - 48, '#ffb4a0');
      fx.burst('leaf', x, y, 14, { color: '#4f8448', speed: 260, life: 0.8, gravity: 600, size: 5 });
    }
    sound.impact(500);
    renderer.shake(5);
  }
}

function onGround(e) {
  const pal = regionAt(e.x).region;
  switch (e.kind) {
    case 'skip':
      sound.splash(false);
      sound.chainNote(e.chain);
      fx.burst('drop', e.x, e.y, 10, { color: '#bfe6ff', speed: 300, life: 0.6, gravity: 1100, size: 4, spread: 1.6 });
      fx.word('Skip!', e.x, e.y - 50, '#bfe6ff');
      break;
    case 'splash':
      sound.splash(true);
      fx.burst('drop', e.x, e.y, 20, { color: '#bfe6ff', speed: 420, life: 0.8, gravity: 1200, size: 5, spread: 2 });
      fx.word('Splosh', e.x, e.y - 50, '#bfe6ff');
      break;
    case 'wade':
      sound.splash(false);
      fx.burst('drop', e.x, e.y, 3, { color: '#bfe6ff', speed: 200, life: 0.4, gravity: 1100, size: 3, spread: 1.4 });
      break;
    default:
      sound.impact(e.speed);
      if (e.shield) fx.ring(e.x, e.y - 10, '#bfe9ff', 60);
      fx.burst('dust', e.x, e.y - 4, 3 + Math.min(8, e.speed / 120), { color: '#f4ead2', speed: 90 + e.speed * 0.15, life: 0.5, gravity: -40, size: 5, spread: 2.6 });
      fx.burst('leaf', e.x, e.y - 4, Math.min(5, e.speed / 200), { color: pal.grass, speed: 220, life: 0.6, gravity: 800, size: 4, spread: 1.8 });
      if (e.speed > 380) renderer.shake(e.speed / 240);
  }
}

function processEvents() {
  for (const e of run.events) {
    switch (e.t) {
      case 'launch':
        sound.release(e.power);
        fx.burst('dust', START.x, START.y + 20, 12, { color: '#f4ead2', speed: 240, life: 0.6, gravity: 0, size: 6 });
        renderer.shake(3 + e.power * 2);
        break;
      case 'kick':
        sound.kick();
        fx.ring(e.x, e.y, '#ffe680', 70);
        fx.burst('spark', e.x - 10, e.y + 10, 10, { color: '#ffe680', speed: 320, life: 0.45, gravity: 300, size: 6, dir: 2.4, spread: 1.2 });
        if (tutorial && tutorial.stage === 1) tutorial.kicked = true;
        break;
      case 'shield':
        sound.shield();
        fx.ring(e.x, e.y, '#bfe9ff', 80);
        break;
      case 'hit':
        onHit(e);
        break;
      case 'ground':
        onGround(e);
        break;
      case 'recharge':
        sound.recharge();
        fx.word(e.gained ? 'Recharged!' : 'Full!', e.x, e.y - 80, '#ffe680');
        fx.burst('spark', e.x, e.y, 14, { color: '#fff3b0', speed: 360, life: 0.7, gravity: 200, size: 7 });
        break;
      case 'end':
        finish();
        break;
    }
  }
  run.events.length = 0;
}

// ---------------------------------------------------------------- run end
function finish() {
  const d = distanceM(run);
  const prevBest = store.best;
  const record = d > prevBest && d >= 1;
  const items = [...HELMETS.map((h) => ({ ...h, name: `${h.name} plume` })), ...CAPES.map((c) => ({ ...c, name: `${c.name} cape` }))];
  const unlocked = items.filter((i) => i.at > prevBest && i.at <= d).map((i) => i.name);
  store.best = Math.max(prevBest, d);
  store.runs++;
  store.tutorialDone = true;
  save(store);
  const next = items.filter((i) => i.at > store.best).sort((a, b) => a.at - b.at)[0];
  const result = {
    distance: d, best: store.best, prevBest, record, unlocked, next, seed: run.seed,
    chain: run.bestChain, bounces: run.bounces, time: Math.round(run.t),
    topSpeed: Math.round(run.topSpeed / M), regionName: regionAt(run.maxX).region.name,
  };
  ui.tip('');
  ui.hint('kick', false);
  ui.hint('shield', false);
  ui.setPhase('ended', false);
  if (record) sound.record();
  else sound.finish();
  const mine = run;
  resultTimer = setTimeout(() => {
    if (run === mine) ui.showResult(result, !renderer.reduced);
  }, 750);
}

// ---------------------------------------------------------------- first-run tips
function runTutorial() {
  if (!tutorial || run.phase !== 'flying') return;
  const t = run.t;
  if (tutorial.stage === 0 && t > 1.3) {
    tutorial.stage = 1;
    ui.tip('Tap KICK for a burst of speed. You only have a few!', 5200);
    ui.hint('kick', true);
  } else if (tutorial.stage === 1 && (tutorial.kicked || t > 7)) {
    tutorial.stage = 2;
    tutorial.at = t;
    ui.hint('kick', false);
    ui.hint('shield', true);
    ui.tip('SHIELD turns goats, geese and brambles into bounces.', 5200);
  } else if (tutorial.stage === 2 && t > tutorial.at + 6) {
    tutorial.stage = 3;
    ui.hint('shield', false);
    ui.tip('Anything with a golden glow refills KICK and SHIELD.', 5200);
  }
}

// ---------------------------------------------------------------- main loop
let trailT = 0;
function frame(nowMs) {
  const time = nowMs / 1000;
  const dt = Math.min(0.05, Math.max(0, time - last));
  last = time;

  if (run.phase === 'flying') {
    acc += dt;
    while (acc >= CFG.dt && run.phase === 'flying') {
      step(run, CFG.dt);
      acc -= CFG.dt;
    }
  }
  processEvents();

  const k = run.k;
  const speed = Math.hypot(k.vx, k.vy);
  sound.wind(run.phase === 'flying' ? speed : 0, !k.onGround);
  if (run.phase === 'flying') {
    runTutorial();
    trailT -= dt;
    if (trailT <= 0 && !k.onGround && speed > 520) {
      trailT = 0.045;
      fx.burst('dust', k.x, k.y, 1, { color: 'rgba(255,255,255,0.75)', speed: 12, life: 0.35, gravity: 0, size: 3 });
    }
    const info = regionAt(k.x);
    const key = info.lap * 10 + info.index;
    if (key !== regionKey) {
      regionKey = key;
      ui.region(info.region.name);
    }
  }

  renderer.updateCamera(run, dt, false);
  const dist = distanceM(run);
  ui.frame(run, dist, dist > bestAtStart && bestAtStart > 0);
  renderer.draw(run, {
    time,
    look,
    aim,
    sinceLaunch: launchTime < 0 ? -1 : time - launchTime,
    hand: run.phase === 'ready' && !ui.modalOpen && (!store.tutorialDone || time - readySince > 5),
  });
  requestAnimationFrame(frame);
}

const urlSeed = Number(new URLSearchParams(location.search).get('seed'));
newRun(urlSeed > 0 ? Math.floor(urlSeed) : undefined);
requestAnimationFrame(frame);

// handy for tuning from the console
window.pilgrim = { get run() { return run; }, store, newRun };
