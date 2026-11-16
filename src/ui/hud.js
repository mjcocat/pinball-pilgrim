// DOM overlay: score, action buttons, title, result card, wardrobe, sound panel.
import { CFG, HELMETS, CAPES } from '../core/config.js';

const $ = (id) => document.getElementById(id);

function press(el, fn) {
  // pointerdown (not click) so actions fire the instant the thumb lands
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fn(e);
  });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      fn(e);
    }
  });
}

export function createUI(on, store) {
  const el = {
    dist: $('dist'), distVal: $('distVal'), bestVal: $('bestVal'), chain: $('chain'), chainVal: $('chainVal'),
    actions: $('actions'), kick: $('btnKick'), shield: $('btnShield'), kickPips: $('kickPips'), shieldPips: $('shieldPips'),
    title: $('title'), result: $('result'), wardrobe: $('wardrobe'), tip: $('tip'), region: $('region'),
    soundPanel: $('soundPanel'), btnSound: $('btnSound'), volume: $('volume'), mute: $('btnMute'),
  };
  const shown = { dist: -1, kicks: -1, shields: -1, chain: -1 };
  let tipTimer = 0, regionTimer = 0, countRaf = 0;

  function pips(node, n, max) {
    node.innerHTML = '';
    for (let i = 0; i < max; i++) node.appendChild(Object.assign(document.createElement('i'), { className: i < n ? 'on' : '' }));
  }
  const flash = (node, cls) => {
    node.classList.remove(cls);
    void node.offsetWidth;
    node.classList.add(cls);
  };

  press(el.kick, () => on.kick() || flash(el.kick, 'nope'));
  press(el.shield, () => on.shield() || flash(el.shield, 'nope'));
  press($('btnRestart'), () => on.restart());
  press($('btnAgain'), () => on.restart());
  press($('btnSame'), () => on.restart(true));
  press($('btnWardrobe'), () => openWardrobe());
  press($('btnWardrobe2'), () => openWardrobe());
  press($('btnWardrobeClose'), () => {
    el.wardrobe.hidden = true;
    on.ui();
  });
  press(el.btnSound, () => {
    el.soundPanel.hidden = !el.soundPanel.hidden;
    el.btnSound.setAttribute('aria-expanded', String(!el.soundPanel.hidden));
    on.ui();
  });
  el.soundPanel.addEventListener('pointerdown', (e) => e.stopPropagation());
  el.volume.addEventListener('input', () => on.volume(el.volume.value / 100));
  press(el.mute, () => on.mute());
  // cards swallow presses so they never start a launch drag underneath
  for (const o of [el.result, el.wardrobe]) o.addEventListener('pointerdown', (e) => e.stopPropagation());

  function syncSound() {
    el.volume.value = Math.round(store.volume * 100);
    el.mute.textContent = store.muted ? 'Unmute' : 'Mute';
    el.mute.setAttribute('aria-pressed', String(store.muted));
    $('soundWaves').toggleAttribute('hidden', store.muted);
    $('soundOff').toggleAttribute('hidden', !store.muted);
  }

  function swatches(host, items, key, chip) {
    host.innerHTML = '';
    for (const it of items) {
      const locked = store.best < it.at;
      const b = document.createElement('button');
      b.className = 'swatch' + (store[key] === it.id ? ' sel' : '') + (locked ? ' locked' : '');
      b.setAttribute('aria-label', locked ? `${it.name}, unlocks at ${it.at} metres` : it.name);
      const c = document.createElement('span');
      chip(c, it);
      b.append(c, locked ? `${it.at} m` : it.name);
      if (!locked) {
        press(b, () => {
          store[key] = it.id;
          on.look();
          openWardrobe();
        });
      }
      host.appendChild(b);
    }
  }

  function openWardrobe() {
    const color = (HELMETS.find((h) => h.id === store.helmet) || HELMETS[0]).color;
    swatches($('helmets'), HELMETS, 'helmet', (c, it) => {
      c.className = 'chip';
      c.style.setProperty('--c', it.color);
    });
    swatches($('capes'), CAPES, 'cape', (c, it) => {
      c.className = 'chip ' + it.id;
      c.style.setProperty('--c', color);
    });
    el.wardrobe.hidden = false;
    on.ui();
  }

  syncSound();
  el.bestVal.textContent = Math.floor(store.best);

  return {
    syncSound,
    closePanels() {
      el.soundPanel.hidden = true;
    },
    get modalOpen() {
      return !el.result.hidden || !el.wardrobe.hidden;
    },

    frame(run, dist, isRecord) {
      const d = Math.floor(dist);
      if (d !== shown.dist) {
        shown.dist = d;
        el.distVal.textContent = d;
        el.dist.classList.toggle('record', isRecord);
      }
      if (run.kicks !== shown.kicks) {
        if (run.kicks > shown.kicks && shown.kicks >= 0) flash(el.kick, 'gain');
        shown.kicks = run.kicks;
        pips(el.kickPips, run.kicks, CFG.kicks);
        el.kick.classList.toggle('empty', run.kicks === 0);
      }
      if (run.shields !== shown.shields) {
        if (run.shields > shown.shields && shown.shields >= 0) flash(el.shield, 'gain');
        shown.shields = run.shields;
        pips(el.shieldPips, run.shields, CFG.shields);
        el.shield.classList.toggle('empty', run.shields === 0);
      }
      el.shield.classList.toggle('active', run.shieldT > 0);
      const k = run.k;
      el.kick.classList.toggle('urgent', run.phase === 'flying' && run.kicks > 0 && k.onGround && Math.hypot(k.vx, k.vy) < 170);
      const chain = run.chain >= 2 ? run.chain : 0;
      if (chain !== shown.chain) {
        shown.chain = chain;
        el.chain.hidden = !chain;
        el.chainVal.textContent = '×' + chain;
        if (chain) flash(el.chain, 'pop');
      }
    },

    hint(which, onOff) {
      (which === 'kick' ? el.kick : el.shield).classList.toggle('hint', onOff);
    },

    setPhase(phase, firstOfSession) {
      el.actions.hidden = phase !== 'flying';
      el.title.classList.toggle('hide', phase !== 'ready');
      el.title.classList.toggle('compact', !firstOfSession);
      if (phase === 'ready') {
        el.result.hidden = true;
        cancelAnimationFrame(countRaf);
        shown.kicks = shown.shields = shown.dist = shown.chain = -1;
        el.bestVal.textContent = Math.floor(store.best);
      }
    },

    tip(text, ms = 3600) {
      clearTimeout(tipTimer);
      el.tip.textContent = text;
      el.tip.classList.toggle('show', !!text);
      if (text) tipTimer = setTimeout(() => el.tip.classList.remove('show'), ms);
    },

    region(name) {
      clearTimeout(regionTimer);
      el.region.textContent = `❧ ${name} ❧`;
      el.region.classList.add('show');
      regionTimer = setTimeout(() => el.region.classList.remove('show'), 2600);
    },

    showResult(r, animate) {
      $('ribbon').hidden = !r.record;
      $('resultTitle').textContent = r.record ? 'A new record!' : r.distance < 60 ? 'A modest tumble' : "Journey's end";
      $('resultBest').textContent = r.record ? `Previous best ${Math.floor(r.prevBest)} m` : `Best ${Math.floor(r.best)} m`;
      $('stats').innerHTML = '';
      for (const s of [`Longest chain ×${r.chain}`, `Top speed ${r.topSpeed} m/s`, `${r.bounces} bounces`, `${r.time}s aloft`, r.regionName]) {
        $('stats').appendChild(Object.assign(document.createElement('li'), { textContent: s }));
      }
      const u = $('unlocks');
      u.innerHTML = '';
      for (const name of r.unlocked) u.appendChild(Object.assign(document.createElement('span'), { className: 'new', textContent: `Unlocked: ${name}` }));
      if (r.next) u.appendChild(Object.assign(document.createElement('div'), { className: 'muted', textContent: `Next unlock: ${r.next.name} at ${r.next.at} m` }));
      $('btnSame').textContent = `Kingdom #${r.seed} · replay this same kingdom`;
      el.result.hidden = false;
      el.bestVal.textContent = Math.floor(r.best);
      const target = Math.floor(r.distance), out = $('resultDist');
      cancelAnimationFrame(countRaf);
      if (!animate) {
        out.textContent = target;
        return;
      }
      const t0 = performance.now();
      const tick = (now) => {
        const k = Math.min(1, (now - t0) / 800);
        out.textContent = Math.floor(target * (1 - Math.pow(1 - k, 3)));
        if (k < 1) countRaf = requestAnimationFrame(tick);
      };
      tick(t0);
    },
  };
}
