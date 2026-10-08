'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Chromium only gives the "standard" Gamepad API layout to controllers in its
// built-in VID/PID table; everything else comes through with mapping "" and
// raw driver order, which Luna ignores. The main process looks each one up in
// SDL_GameControllerDB (see gamecontrollerdb.js); this applies the result in
// the page's own world, before any Luna script runs.
function installGamepadRemap(lookup) {
  const BUTTONS = [
    'a', 'b', 'x', 'y', 'leftshoulder', 'rightshoulder', 'lefttrigger', 'righttrigger',
    'back', 'start', 'leftstick', 'rightstick', 'dpup', 'dpdown', 'dpleft', 'dpright', 'guide',
  ];
  const AXES = ['leftx', 'lefty', 'rightx', 'righty'];

  const mappings = new Map();
  const mappingFor = (g) => {
    if (!mappings.has(g.id)) mappings.set(g.id, lookup({ id: g.id, buttons: g.buttons.length, axes: g.axes.length }));
    return mappings.get(g.id);
  };

  // Chromium reports 0 for an axis until it first moves, which would read as
  // a half-pulled trigger, so treat full-range axes as at rest until then.
  const moved = new Set();
  const axis = (g, n) => {
    const v = g.axes[n] || 0;
    if (v !== 0) moved.add(`${g.index}:${n}`);
    return v;
  };

  // A binding is SDL syntax in Chromium's indices: "b3", "a2", "-a7", "a5~".
  const parse = (binding) => /^([+-]?)([ab])(\d+)(~?)$/.exec(binding).slice(1);

  // How far a binding is pushed, 0..1.
  function magnitude(g, binding) {
    const [range, kind, n, invert] = parse(binding);
    if (kind === 'b') return g.buttons[n] ? g.buttons[n].value : 0;
    const v = axis(g, n) * (invert ? -1 : 1);
    if (range === '+') return Math.max(v, 0);
    if (range === '-') return Math.max(-v, 0);
    return moved.has(`${g.index}:${n}`) ? (v + 1) / 2 : 0;
  }

  function button(g, binding) {
    const value = binding ? magnitude(g, binding) : 0;
    const pressed = value > 0.1;
    return Object.freeze({ pressed, touched: pressed, value });
  }

  // A stick axis can be a full axis, or built from halves ("+leftx": "b15").
  function stick(g, bindings, name) {
    let value = 0;
    const full = bindings[name];
    if (full) {
      const [range, kind, n, invert] = parse(full);
      value = kind === 'a' && !range ? axis(g, n) * (invert ? -1 : 1) : magnitude(g, full) * 2 - 1;
    }
    if (bindings[`+${name}`]) value += magnitude(g, bindings[`+${name}`]);
    if (bindings[`-${name}`]) value -= magnitude(g, bindings[`-${name}`]);
    return Math.max(-1, Math.min(1, value));
  }

  function remap(g) {
    if (!g || g.mapping !== '') return g;
    const bindings = mappingFor(g);
    if (!bindings) return g;
    return Object.setPrototypeOf({
      id: g.id.replace(/\(/, '(STANDARD GAMEPAD '),
      index: g.index,
      connected: g.connected,
      timestamp: g.timestamp,
      mapping: 'standard',
      axes: Object.freeze(AXES.map((name) => stick(g, bindings, name))),
      buttons: Object.freeze(BUTTONS.map((name) => button(g, bindings[name]))),
      vibrationActuator: g.vibrationActuator,
    }, Gamepad.prototype);
  }

  const getGamepads = Navigator.prototype.getGamepads;
  Navigator.prototype.getGamepads = function () {
    return Array.from(getGamepads.call(this), remap);
  };

  const eventGamepad = Object.getOwnPropertyDescriptor(GamepadEvent.prototype, 'gamepad');
  Object.defineProperty(GamepadEvent.prototype, 'gamepad', {
    ...eventGamepad,
    get() { return remap(eventGamepad.get.call(this)); },
  });
}

contextBridge.executeInMainWorld({
  func: installGamepadRemap,
  args: [(gamepad) => ipcRenderer.sendSync('gamepad-mapping', gamepad)],
});
