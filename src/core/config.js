// Tuning constants for PINBALL PILGRIM. World units are pixels; M px = 1 metre.
export const M = 40;

export const CFG = {
  dt: 1 / 120,
  gravity: 1500,
  drag: 0.05,
  r: 18, // knight radius
  wallH: 230, // castle wall height
  launchMin: 560,
  launchMax: 1280,
  angleMin: (8 * Math.PI) / 180,
  angleMax: (76 * Math.PI) / 180,
  maxSpeed: 1700,

  // ground
  bounceMin: 150, // slower impacts turn into a roll
  groundE: 0.62, // restitution
  groundF: 0.95, // tangential speed kept per bounce
  rollFric: 70, // px/s^2
  rollDrag: 0.2, // 1/s

  // actions
  kicks: 3,
  shields: 2,
  kickX: 400,
  kickY: 480,
  shieldTime: 1.8,

  // chain
  chainWindow: 3.2,

  // world generation
  chunk: 900,
  gapMin: 120,
  gapVar: 180,
  sparseM: 3000, // every this many metres, object spacing grows by +100%
  rechargeEvery: 2, // chunks

  // run end
  stillSpeed: 38,
  stillTime: 0.8,
  stillTimeCharged: 1.6,
  stuckTime: 5,
};

// Region colours + object weights. `len` is metres. Regions cycle forever.
export const REGIONS = [
  {
    id: 'meadow', name: 'Castle Meadows', len: 300, decor: 'castle', night: 0,
    skyTop: '#7fc6e6', skyBot: '#fdeec6', sun: '#fff3c4',
    far: '#bcd9cc', mid: '#93c69c', near: '#72b06b', grass: '#86c95c', soil: '#b98a55', accent: '#f2d04b',
    w: { mushroom: 3, banner: 2, ramp: 2, haystack: 2, puddle: 1, bell: 1, goat: 1, awning: 1 },
  },
  {
    id: 'wood', name: 'Mushroom Wood', len: 400, decor: 'pine', night: 0,
    skyTop: '#69b3c4', skyBot: '#f4e6b6', sun: '#fff0b8',
    far: '#9fc4b3', mid: '#5f9f85', near: '#3f7f63', grass: '#62b05a', soil: '#8a6a48', accent: '#f08a7a',
    w: { mushroom: 7, bramble: 2, puddle: 2, banner: 1, ramp: 1, bell: 1, goose: 1 },
  },
  {
    id: 'village', name: 'Market Village', len: 400, decor: 'house', night: 0,
    skyTop: '#f2bf82', skyBot: '#fdeccb', sun: '#fff1c9',
    far: '#e6b995', mid: '#cf9670', near: '#aeb866', grass: '#a2c452', soil: '#c08c53', accent: '#e85d4a',
    w: { awning: 5, banner: 3, bell: 2, haystack: 2, puddle: 2, goat: 2, ramp: 1, mushroom: 1 },
  },
  {
    id: 'mills', name: 'Windmill Hills', len: 400, decor: 'mill', night: 0.1,
    skyTop: '#ee9a6c', skyBot: '#fbdba4', sun: '#ffe2a0',
    far: '#dc9f8a', mid: '#bd8572', near: '#c5a54c', grass: '#cdb64c', soil: '#a8763f', accent: '#fff2c0',
    w: { windmill: 4, haystack: 3, ramp: 3, goat: 2, goose: 2, banner: 1, mushroom: 1, bell: 1 },
  },
  {
    id: 'abbey', name: 'Bell Abbey', len: 500, decor: 'spire', night: 0.85,
    skyTop: '#4d437f', skyBot: '#f0a48c', sun: '#ffd9b0',
    far: '#7f6da3', mid: '#5f568b', near: '#48527c', grass: '#62937a', soil: '#6a5a5e', accent: '#bfe6ff',
    w: { bell: 6, banner: 2, awning: 2, goose: 2, bramble: 2, mushroom: 2, ramp: 1 },
  },
];

export const HAZARDS = new Set(['goat', 'bramble', 'goose']);

// Cosmetics, unlocked by best distance (metres).
export const HELMETS = [
  { id: 'crimson', name: 'Crimson', color: '#d8432f', at: 0 },
  { id: 'royal', name: 'Royal Blue', color: '#3567c9', at: 250 },
  { id: 'forest', name: 'Forest', color: '#3d9a55', at: 600 },
  { id: 'sun', name: 'Sunflower', color: '#f0b429', at: 1200 },
  { id: 'plum', name: 'Midnight Plum', color: '#6b3fa0', at: 2000 },
];
export const CAPES = [
  { id: 'plain', name: 'Plain', at: 0 },
  { id: 'stripes', name: 'Stripes', at: 400 },
  { id: 'checks', name: 'Checks', at: 900 },
  { id: 'stars', name: 'Starry', at: 1600 },
];
