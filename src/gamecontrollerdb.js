'use strict';

// Finds a "standard" gamepad mapping for controllers Chromium doesn't
// recognise, using only what the Gamepad API reports (vendor/product from
// Gamepad.id, button and axis counts) and SDL_GameControllerDB (vendored as
// gamecontrollerdb.txt).
//
// Mappings come out in SDL's own syntax ({ a: 'b0', lefttrigger: 'a2',
// dpup: '-a7' }), in Chromium's indices. SDL and Chromium number buttons and
// axes alike for typical pads, except that SDL lists hats separately while
// Chromium reports them as the last pairs of axes.

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'gamecontrollerdb.txt');
const PLATFORM = { linux: 'Linux', win32: 'Windows', darwin: 'Mac OS X' }[process.platform];

// SDL hat bit -> [direction, 0 for the hat's X axis or 1 for its Y axis].
const HAT_BITS = { 1: ['-', 1], 2: ['+', 0], 4: ['+', 1], 8: ['-', 0] };

// Xbox-style pads under Linux's xpad driver all report this raw layout, so
// it's a safe guess for ones the DB doesn't list.
const XPAD_BINDINGS = {
  a: 'b0', b: 'b1', x: 'b2', y: 'b3', leftshoulder: 'b4', rightshoulder: 'b5',
  lefttrigger: 'a2', righttrigger: 'a5', back: 'b6', start: 'b7', guide: 'b8',
  leftstick: 'b9', rightstick: 'b10', dpup: 'h0.1', dpdown: 'h0.4', dpleft: 'h0.8', dpright: 'h0.2',
  leftx: 'a0', lefty: 'a1', rightx: 'a3', righty: 'a4',
};

let db = null;

// This platform's entries, keyed by "vendorproduct" as Gamepad.id shows them.
function loadDb() {
  if (db) return db;
  db = new Map();
  let text = '';
  try {
    text = fs.readFileSync(DB_PATH, 'utf8');
  } catch {}
  const swap = (h) => h.slice(2) + h.slice(0, 2);
  for (const line of text.split('\n')) {
    const [guid, , ...fields] = line.split(',');
    // VID/PID GUIDs only; a driver signature means SDL's own HIDAPI numbering.
    if (!fields.includes(`platform:${PLATFORM}`) || !/^[0-9a-f]{32}$/i.test(guid)) continue;
    if (guid.slice(12, 16) !== '0000' || guid.slice(20, 24) !== '0000' || guid.slice(28) !== '0000') continue;
    const key = (swap(guid.slice(8, 12)) + swap(guid.slice(16, 20))).toLowerCase();
    const bindings = Object.fromEntries(fields.map((f) => f.split(':')).filter(([k, v]) => v && k !== 'platform'));
    if (!db.has(key)) db.set(key, []);
    db.get(key).push(bindings);
  }
  return db;
}

// Rewrite SDL bindings ("b3", "-a2", "a5~", "h0.4") into Chromium's indices,
// or null if they need more buttons or axes than the pad has.
function toChromium(bindings, buttons, axes) {
  const refs = Object.values(bindings).map((v) => /^[+-]?([abh])(\d+)/.exec(v) || []);
  const most = (kind) => Math.max(-1, ...refs.filter(([, k]) => k === kind).map(([, , n]) => +n));
  const hats = most('h') + 1;
  const firstHatAxis = axes - 2 * hats;
  if (most('b') >= buttons || most('a') >= firstHatAxis) return null;
  return Object.fromEntries(Object.entries(bindings).map(([target, value]) => {
    const [, n, bit] = /^h(\d+)\.(\d+)$/.exec(value) || [];
    if (!n) return [target, value];
    const [sign, offset] = HAT_BITS[bit] || [];
    return [target, sign && `${sign}a${firstHatAxis + 2 * n + offset}`];
  }).filter(([, v]) => v));
}

// Chromium's Gamepad.id ends with "(Vendor: 2dc8 Product: 310b)".
function mappingForGamepad({ id, buttons, axes }) {
  const [, vendor, product] = /Vendor: ([0-9a-f]{4}) Product: ([0-9a-f]{4})/.exec(id || '') || [];
  if (!vendor) return null;

  // Clones share VID/PIDs with different layouts, and the Gamepad API can't
  // tell them apart, so take the most common layout that fits this pad.
  const votes = new Map();
  for (const entry of loadDb().get(vendor + product) || []) {
    const bindings = toChromium(entry, buttons, axes);
    const key = bindings && JSON.stringify(Object.entries(bindings).sort());
    if (key) votes.set(key, { bindings, count: (votes.get(key)?.count || 0) + 1 });
  }
  const best = [...votes.values()].sort((a, b) => b.count - a.count)[0];
  if (best) return best.bindings;

  if (PLATFORM === 'Linux' && buttons === 11 && axes === 8) return toChromium(XPAD_BINDINGS, buttons, axes);
  return null;
}

module.exports = { mappingForGamepad };
