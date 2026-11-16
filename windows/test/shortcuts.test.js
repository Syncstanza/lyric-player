const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../renderer/shortcuts.js');

const ev = (code, mods = {}) => ({ code, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, ...mods });

test('key presses get readable names; bare modifiers and Esc/Tab/Enter are not bindable', () => {
  assert.equal(S.keyName(ev('KeyN')), 'N');
  assert.equal(S.keyName(ev('Digit5')), '5');
  assert.equal(S.keyName(ev('ArrowLeft')), 'ArrowLeft');
  assert.equal(S.keyName(ev('ArrowRight', { ctrlKey: true })), 'Ctrl+ArrowRight');
  for (const c of ['ShiftLeft', 'ControlRight', 'AltLeft', 'MetaLeft', 'Escape', 'Tab', 'Enter']) assert.equal(S.keyName(ev(c)), null);
});

test('defaults are single keys and no two actions share one', () => {
  const keys = Object.values(S.DEFAULTS);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(keys.every((k) => !k.includes('+')));
});

test('a key press runs the bound action; the old Ctrl+arrows still skip songs', () => {
  const map = S.merge(null);
  assert.equal(S.resolve(map, ev('KeyN')), 'next');
  assert.equal(S.resolve(map, ev('Space')), 'play');
  assert.equal(S.resolve(map, ev('KeyQ')), null);
  assert.equal(S.resolve(map, ev('ArrowRight', { ctrlKey: true })), 'next');
  assert.equal(S.resolve(map, ev('ArrowLeft', { ctrlKey: true })), 'prev');
});

test('saved bindings win over defaults, junk is ignored, and an empty one unbinds', () => {
  const map = S.merge({ next: 'KeyJ', prev: '', play: 42, nope: 'KeyZ' });
  assert.equal(map.next, 'KeyJ');
  assert.equal(map.prev, '');
  assert.equal(map.play, 'Space');
  assert.equal(S.resolve(map, ev('KeyN')), null);
  assert.equal(S.resolve(map, ev('KeyP')), null);
});

test('giving a key that is already used swaps the two', () => {
  const map = S.merge(null);
  const { map: out, swapped } = S.assign(map, 'next', 'P'); // P was "previous"
  assert.equal(swapped, 'prev');
  assert.equal(out.next, 'P');
  assert.equal(out.prev, 'N');
  const none = S.assign(map, 'next', 'Q');
  assert.equal(none.swapped, null);
  assert.equal(none.map.next, 'Q');
});

test('pretty names', () => {
  assert.equal(S.pretty('ArrowLeft'), '←');
  assert.equal(S.pretty('Ctrl+ArrowRight'), 'Ctrl + →');
  assert.equal(S.pretty(''), 'none');
});
