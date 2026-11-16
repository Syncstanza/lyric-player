/* Keyboard shortcuts: the list of actions, their default keys, and the pure logic for matching a key press
   and changing a binding. Works in the browser (window.Shortcuts) and in Node (require) so it can be tested. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Shortcuts = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  // id, label, default key
  const ACTIONS = [
    ['play', 'Play / pause', 'Space'],
    ['next', 'Next song', 'N'],
    ['prev', 'Previous song', 'P'],
    ['seekBack', 'Back 5 seconds', 'ArrowLeft'],
    ['seekFwd', 'Forward 5 seconds', 'ArrowRight'],
    ['volUp', 'Volume up', 'ArrowUp'],
    ['volDown', 'Volume down', 'ArrowDown'],
    ['mute', 'Mute / unmute', 'M'],
    ['shuffle', 'Shuffle on / off', 'S'],
    ['repeat', 'Repeat: off / playlist / song', 'R'],
    ['syncEarlier', 'Lyrics sync: show text earlier (0.5s)', 'BracketLeft'],
    ['syncLater', 'Lyrics sync: show text later (0.5s)', 'BracketRight'],
    ['fullscreen', 'Fullscreen', 'F'],
  ].map(([id, label, key]) => ({ id, label, key }));

  const DEFAULTS = Object.fromEntries(ACTIONS.map((a) => [a.id, a.key]));
  const MODIFIER_CODES = /^(Control|Shift|Alt|Meta|OS)(Left|Right)?$/;

  // A key press as a name: "N", "ArrowLeft", "Ctrl+ArrowRight". Null for a bare modifier or something unusable.
  function keyName(e) {
    const code = e && e.code;
    if (!code || MODIFIER_CODES.test(code) || code === 'Escape' || code === 'Tab' || code === 'Enter') return null;
    let k = code;
    if (/^Key[A-Z]$/.test(code)) k = code.slice(3);
    else if (/^Digit\d$/.test(code)) k = code.slice(5);
    const mods = (e.ctrlKey ? 'Ctrl+' : '') + (e.altKey ? 'Alt+' : '') + (e.shiftKey ? 'Shift+' : '') + (e.metaKey ? 'Meta+' : '');
    return mods + k;
  }

  const PRETTY = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', BracketLeft: '[', BracketRight: ']', Space: 'Space',
    Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'", Backquote: '`', Minus: '-', Equal: '=', Backslash: '\\' };
  function pretty(key) {
    if (!key) return 'none';
    return key.split('+').map((p) => PRETTY[p] || p).join(' + ');
  }

  // The saved bindings on top of the defaults. Anything unknown or malformed is ignored.
  function merge(saved) {
    const out = { ...DEFAULTS };
    if (saved && typeof saved === 'object') {
      for (const a of ACTIONS) {
        if (!(a.id in saved)) continue;
        const v = saved[a.id];
        if (v === '' || v === null) out[a.id] = '';
        else if (typeof v === 'string' && v.length <= 40) out[a.id] = v;
      }
    }
    return out;
  }

  // Which action a key press runs (or null). Ctrl+Right / Ctrl+Left keep working as next / previous unless they were given to something else.
  function resolve(map, e) {
    const name = keyName(e);
    if (!name) return null;
    for (const a of ACTIONS) if (map[a.id] && map[a.id] === name) return a.id;
    if (name === 'Ctrl+ArrowRight') return 'next';
    if (name === 'Ctrl+ArrowLeft') return 'prev';
    return null;
  }

  // Give `key` to `action`. If another action had it, the two swap (that one gets this action's old key).
  function assign(map, action, key) {
    const out = { ...map };
    let swapped = null;
    if (key) {
      for (const a of ACTIONS) {
        if (a.id !== action && out[a.id] === key) { swapped = a.id; out[a.id] = out[action] || ''; }
      }
    }
    out[action] = key || '';
    return { map: out, swapped };
  }

  return { ACTIONS, DEFAULTS, keyName, pretty, merge, resolve, assign };
});
