const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../renderer/fluid.js');

const song = (gaps, text) => gaps.reduce((acc, g) => { const t = acc.length ? acc[acc.length - 1].time + acc[acc.length - 1].gap : 0; acc.push({ time: t, gap: g, text }); return acc; }, []);

test('fast, dense singing is livelier than slow, sparse singing', () => {
  const lines = [...song([1.5, 1.5, 1.5, 1.5], 'a quick line of words here'), ...song([6, 6, 6, 6], 'slow line')].map((l, i, a) => ({ time: i < 4 ? i * 1.5 : 6 + (i - 4) * 6, text: l.text }));
  const at = F.makeCadence(lines);
  const fast = at(3.2).energy, slow = at(6 + 6 * 2 + 0.3).energy;
  assert.ok(fast > slow, `${fast} should be above ${slow}`);
});

test('a new lyric line gives a swell that fades away', () => {
  const lines = [0, 4, 8, 12].map((t) => ({ time: t, text: 'some words to sing along' }));
  const at = F.makeCadence(lines);
  assert.ok(at(4.0).pulse > 0.95);
  assert.ok(at(4.5).pulse < at(4.1).pulse);
  assert.ok(at(7.5).pulse < 0.05);
});

test('before the first line it is calm, and with no timed lyrics it uses a steady default', () => {
  const at = F.makeCadence([{ time: 5, text: 'first' }, { time: 9, text: 'second' }]);
  assert.ok(at(1).energy < 0.3);
  assert.deepEqual(F.makeCadence([])(10), F.IDLE);
  assert.deepEqual(F.makeCadence(null)(10), F.IDLE);
  assert.deepEqual(F.makeCadence([{ time: 1, text: 'only one' }])(10), F.IDLE);
});

test('a long instrumental break settles the thread', () => {
  const lines = [{ time: 0, text: 'sing sing sing' }, { time: 2, text: 'sing sing sing' }, { time: 40, text: 'back again' }];
  const at = F.makeCadence(lines);
  assert.ok(at(30).energy < at(2.5).energy);
});

test('energy and pulse always stay inside 0..1', () => {
  const lines = Array.from({ length: 50 }, (_, i) => ({ time: i * (i % 3 + 0.3), text: 'x'.repeat((i * 7) % 90 + 1) })).sort((a, b) => a.time - b.time);
  const at = F.makeCadence(lines);
  for (let t = 0; t < 120; t += 0.37) { const r = at(t); assert.ok(r.energy >= 0 && r.energy <= 1 && r.pulse >= 0 && r.pulse <= 1, JSON.stringify(r)); }
});

test('animation level: saved choice wins, TVs default to light, others to full', () => {
  assert.equal(F.levelFrom('off', false), 'off');
  assert.equal(F.levelFrom(undefined, true), 'light');
  assert.equal(F.levelFrom(undefined, false), 'full');
  assert.equal(F.levelFrom('nonsense', false), 'full');
  assert.equal(F.NEXT_LEVEL.full, 'light');
  assert.equal(F.NEXT_LEVEL.off, 'full');
});

test('drawing the thread works on a fake canvas and puts the dot on the line', () => {
  const calls = [];
  const ctx = new Proxy({}, { get: (_t, k) => (k === 'arc' ? (...a) => calls.push(a) : () => {}), set: () => true });
  F.drawThread(ctx, { w: 400, h: 36, head: 0.5, t: 1, amp: 1, energy: 0.8, pulse: 0.3, colors: { done: '#c08a5e', rest: '#333', dot: '#e0b48a' } });
  assert.equal(calls.length, 2);
  assert.ok(Math.abs(calls[0][0] - 200) < 8);
  F.drawThread(ctx, { w: 400, h: 36, head: 0.5, t: 1, amp: 0, energy: 0.8, pulse: 0, colors: { done: '#c08a5e', rest: '#333', dot: '#e0b48a' } });
  assert.equal(calls[2][1], 18); // paused: perfectly flat, dot on the middle line
});
