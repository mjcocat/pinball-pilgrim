// Entirely synthesised sound palette (Web Audio). No samples. Every voice is short, soft-edged and
// routed through one compressor so chains of bounces never turn harsh.
const PENTA = [0, 2, 4, 7, 9]; // D major pentatonic
const ROOT = 293.66; // D4
// The travelling tune: each successful bounce in a chain plays the next step.
const PHRASE = [0, 2, 4, 5, 4, 2, 4, 7, 5, 4, 5, 7, 9, 7, 5, 7, 8, 7, 5, 4, 5, 7, 9, 10];

const degree = (n) => ROOT * Math.pow(2, (PENTA[((n % 5) + 5) % 5] + 12 * Math.floor(n / 5)) / 12);

export class Sound {
  constructor() {
    this.ctx = null;
    this.volume = 0.8;
    this.muted = false;
    this.last = {};
    this.creakStep = 0;
  }

  /** Must be called from a user gesture. Safe to call repeatedly. */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = (this.ctx = new AC());
      this.master = ctx.createGain();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 5;
      this.master.connect(comp).connect(ctx.destination);
      this.applyVolume();

      const len = ctx.sampleRate * 2;
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

      // continuous wind bed, shaped by speed
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      this.windFilter = ctx.createBiquadFilter();
      this.windFilter.type = 'bandpass';
      this.windFilter.Q.value = 0.7;
      this.windGain = ctx.createGain();
      this.windGain.gain.value = 0;
      src.connect(this.windFilter).connect(this.windGain).connect(this.master);
      src.start();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  applyVolume() {
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume * 0.9, this.ctx.currentTime, 0.03);
  }
  setVolume(v) {
    this.volume = v;
    this.applyVolume();
  }
  setMuted(m) {
    this.muted = m;
    this.applyVolume();
  }
  suspend(on) {
    if (!this.ctx) return;
    if (on) this.ctx.suspend();
    else this.ctx.resume();
  }

  // ---- building blocks
  ok(name, gap) {
    if (!this.ctx || this.muted) return false;
    const now = this.ctx.currentTime;
    if (now - (this.last[name] || -9) < gap) return false;
    this.last[name] = now;
    return true;
  }

  tone({ type = 'sine', f = 440, f2, dur = 0.2, g = 0.2, at = 0, attack = 0.005, lp, vib }) {
    const ctx = this.ctx, t0 = ctx.currentTime + at;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    const a = ctx.createGain();
    a.gain.setValueAtTime(0.0001, t0);
    a.gain.exponentialRampToValueAtTime(g, t0 + attack);
    a.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = o;
    if (vib) {
      const l = ctx.createOscillator(), lg = ctx.createGain();
      l.frequency.value = vib.rate;
      lg.gain.value = vib.depth;
      l.connect(lg).connect(o.frequency);
      l.start(t0);
      l.stop(t0 + dur + 0.05);
    }
    if (lp) {
      const fl = ctx.createBiquadFilter();
      fl.type = lp.type || 'lowpass';
      fl.frequency.value = lp.f;
      fl.Q.value = lp.q || 0.7;
      node = o.connect(fl);
    }
    node.connect(a).connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  noise({ dur = 0.2, g = 0.2, at = 0, type = 'lowpass', f = 1000, f2, q = 0.8, attack = 0.004 }) {
    const ctx = this.ctx, t0 = ctx.currentTime + at;
    const s = ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const fl = ctx.createBiquadFilter();
    fl.type = type;
    fl.Q.value = q;
    fl.frequency.setValueAtTime(f, t0);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    const a = ctx.createGain();
    a.gain.setValueAtTime(0.0001, t0);
    a.gain.exponentialRampToValueAtTime(g, t0 + attack);
    a.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(fl).connect(a).connect(this.master);
    s.start(t0, Math.random() * 1.5);
    s.stop(t0 + dur + 0.05);
  }

  pluck(f, g = 0.16, at = 0, dur = 0.45) {
    this.tone({ type: 'triangle', f, dur, g, at, lp: { f: 2600 } });
    this.tone({ type: 'sine', f: f * 2, dur: dur * 0.5, g: g * 0.25, at });
  }

  bellTone(f, g = 0.2, at = 0) {
    const parts = [[1, 1, 2.2], [2, 0.5, 1.5], [2.76, 0.35, 1.1], [5.4, 0.18, 0.6], [8.9, 0.08, 0.35]];
    for (const [r, a, d] of parts) this.tone({ f: f * r, dur: d, g: g * a, at, attack: 0.003 });
  }

  // ---- world voices
  wind(speed, airborne) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, k = Math.min(1, speed / 1300);
    this.windGain.gain.setTargetAtTime(airborne ? 0.02 + k * k * 0.13 : k * 0.03, t, 0.12);
    this.windFilter.frequency.setTargetAtTime(280 + k * 1300, t, 0.15);
  }

  /** Ratchet clicks as the catapult is wound; pitch climbs with tension. */
  creak(power) {
    const step = Math.round(power * 22);
    if (step === this.creakStep || !this.ctx || this.muted) return;
    this.creakStep = step;
    this.tone({ type: 'sawtooth', f: 70 + power * 110, f2: 60 + power * 80, dur: 0.07, g: 0.11, lp: { f: 700 + power * 900, q: 3, type: 'bandpass' } });
    this.noise({ dur: 0.025, g: 0.07, type: 'highpass', f: 2500 });
  }

  release(power) {
    if (!this.ctx || this.muted) return;
    this.creakStep = 0;
    this.tone({ f: 150, f2: 48, dur: 0.22, g: 0.5 });
    this.noise({ dur: 0.09, g: 0.3, f: 500 });
    this.tone({ type: 'sawtooth', f: 240, f2: 90, dur: 0.16, g: 0.09, lp: { f: 900 } });
    this.noise({ dur: 0.45, g: 0.1 + power * 0.14, type: 'bandpass', f: 350, f2: 2600, q: 1.2, attack: 0.08 });
  }

  impact(speed) {
    if (!this.ok('impact', 0.05)) return;
    const k = Math.min(1, speed / 1000);
    const f = 85 + k * 110 + Math.random() * 18;
    this.tone({ f: f * 1.6, f2: f * 0.6, dur: 0.14, g: 0.12 + k * 0.3 });
    this.noise({ dur: 0.07, g: 0.05 + k * 0.16, f: 500 + k * 900 });
  }

  spring(size = 1) {
    if (!this.ok('spring', 0.04)) return;
    const f = 250 / size;
    this.tone({ f, f2: f * 2.6, dur: 0.26, g: 0.2, vib: { rate: 30, depth: 26 } });
    this.tone({ type: 'triangle', f: f * 0.5, f2: f * 1.3, dur: 0.14, g: 0.14 });
  }

  cloth() {
    if (!this.ok('cloth', 0.05)) return;
    this.noise({ dur: 0.14, g: 0.22, type: 'bandpass', f: 1100, f2: 320, q: 1.1 });
    this.noise({ dur: 0.12, g: 0.13, type: 'bandpass', f: 800, f2: 260, q: 1.1, at: 0.085 });
    this.tone({ f: 130, f2: 80, dur: 0.12, g: 0.14 });
  }

  whoosh() {
    if (!this.ok('whoosh', 0.2)) return;
    this.noise({ dur: 0.5, g: 0.2, type: 'bandpass', f: 300, f2: 1900, q: 1.4, attack: 0.12 });
    this.tone({ type: 'triangle', f: 110, f2: 70, dur: 0.3, g: 0.12 });
  }

  wood() {
    if (!this.ok('wood', 0.05)) return;
    this.tone({ type: 'triangle', f: 320, f2: 180, dur: 0.09, g: 0.25 });
    this.tone({ type: 'square', f: 620, f2: 400, dur: 0.04, g: 0.05, lp: { f: 1800 } });
    this.noise({ dur: 0.05, g: 0.12, type: 'bandpass', f: 1400, q: 2 });
  }

  splash(big) {
    if (!this.ok('splash', 0.08)) return;
    this.noise({ dur: big ? 0.3 : 0.14, g: big ? 0.2 : 0.09, type: 'highpass', f: 1500, f2: 3800, attack: 0.01 });
    const n = big ? 3 : 1;
    for (let i = 0; i < n; i++) {
      const f = 380 + Math.random() * 380;
      this.tone({ f, f2: f * 1.7, dur: 0.07, g: 0.11, at: 0.03 + i * 0.055 });
    }
  }

  hay() {
    if (!this.ok('hay', 0.1)) return;
    this.noise({ dur: 0.22, g: 0.2, f: 1000, f2: 350, attack: 0.02 });
    this.noise({ dur: 0.1, g: 0.05, type: 'highpass', f: 3000, at: 0.04 });
  }

  kick() {
    if (!this.ctx || this.muted) return;
    this.tone({ type: 'triangle', f: 170, f2: 560, dur: 0.13, g: 0.26 });
    this.noise({ dur: 0.2, g: 0.16, type: 'bandpass', f: 600, f2: 2800, q: 1.5 });
    this.tone({ f: 120, f2: 60, dur: 0.1, g: 0.25 });
  }

  shield() {
    if (!this.ctx || this.muted) return;
    for (const [f, at] of [[587.3, 0], [880, 0.04], [1174.7, 0.08]]) this.tone({ f, dur: 0.5, g: 0.09, at, attack: 0.05 });
  }

  deflect() {
    if (!this.ok('deflect', 0.08)) return;
    this.tone({ type: 'square', f: 880, dur: 0.12, g: 0.06, lp: { f: 2400, q: 4, type: 'bandpass' } });
    this.bellTone(1174.7, 0.11);
  }

  goat() {
    if (!this.ok('goat', 0.4)) return;
    this.tone({ type: 'sawtooth', f: 360, f2: 250, dur: 0.48, g: 0.2, attack: 0.03, vib: { rate: 11, depth: 34 }, lp: { f: 1150, q: 5, type: 'bandpass' } });
  }

  goose() {
    if (!this.ok('goose', 0.4)) return;
    for (const at of [0, 0.15]) this.tone({ type: 'square', f: 410, f2: 300, dur: 0.12, g: 0.13, at, attack: 0.012, lp: { f: 1500, q: 5, type: 'bandpass' } });
  }

  bramble() {
    if (!this.ok('bramble', 0.2)) return;
    this.noise({ dur: 0.2, g: 0.2, type: 'bandpass', f: 2600, f2: 900, q: 2 });
    this.tone({ f: 200, f2: 120, dur: 0.12, g: 0.15 });
  }

  /**
   * The tune that grows as the chain grows: melody alone, then a harmony, then bass and sparkle.
   * `timbre` lets a bell hit carry the melody note as a bell.
   */
  chainNote(chain, timbre) {
    if (!this.ctx || this.muted || chain < 1) return;
    const i = (chain - 1) % PHRASE.length;
    const lift = Math.min(2, Math.floor((chain - 1) / PHRASE.length)); // each full phrase climbs
    const f = degree(PHRASE[i] + lift * 2);
    if (timbre === 'bell') this.bellTone(f, 0.2);
    else this.pluck(f, 0.17);
    if (chain >= 4) this.pluck(degree(PHRASE[i] + lift * 2 + 2), 0.07, 0.03);
    if (chain >= 7 && i % 2 === 0) this.tone({ type: 'triangle', f: degree(PHRASE[i] % 5) / 2, dur: 0.5, g: 0.16, lp: { f: 700 } });
    if (chain >= 10) this.tone({ f: f * 4, dur: 0.18, g: 0.035, at: 0.09 });
    if (chain >= 10 && i % 4 === 3) this.noise({ dur: 0.06, g: 0.04, type: 'highpass', f: 6000, at: 0.12 });
  }

  recharge() {
    if (!this.ctx || this.muted) return;
    for (let i = 0; i < 3; i++) this.tone({ f: degree(5 + i * 2), dur: 0.22, g: 0.1, at: 0.05 + i * 0.07 });
  }

  empty() {
    if (!this.ok('empty', 0.15)) return;
    this.tone({ type: 'triangle', f: 150, f2: 110, dur: 0.09, g: 0.12 });
  }

  finish() {
    if (!this.ctx || this.muted) return;
    this.pluck(degree(4), 0.14, 0.1, 0.5);
    this.pluck(degree(2), 0.14, 0.32, 0.5);
    this.pluck(degree(0), 0.16, 0.56, 0.9);
  }

  record() {
    if (!this.ctx || this.muted) return;
    [0, 2, 4, 5, 7, 9, 10].forEach((d, i) => this.pluck(degree(d + 5), 0.15, 0.25 + i * 0.085, 0.4));
    for (const d of [5, 7, 9, 10]) this.bellTone(degree(d), 0.1, 0.9);
  }

  ui() {
    if (!this.ok('ui', 0.04)) return;
    this.tone({ type: 'triangle', f: 660, f2: 880, dur: 0.06, g: 0.1 });
  }
}
