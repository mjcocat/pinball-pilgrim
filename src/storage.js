// Local-only save data. No accounts, no network.
const KEY = 'pinballPilgrim.v1';
const DEFAULTS = { best: 0, helmet: 'crimson', cape: 'plain', tutorialDone: false, volume: 0.8, muted: false, runs: 0 };

export function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode or storage full: the game still plays, it just forgets */
  }
}
