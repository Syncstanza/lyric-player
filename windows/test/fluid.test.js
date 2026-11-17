const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../renderer/fluid.js');

test('the breathing is slow, stays in a calm range and never jumps', () => {
  let prev = F.breath(0);
  for (let t = 0.033; t < 120; t += 0.033) {
    const b = F.breath(t);
    assert.ok(b.energy >= 0.2 && b.energy <= 0.8, `energy ${b.energy}`);
    assert.ok(b.speed > 2 && b.speed < 5, `speed ${b.speed}`);
    assert.ok(Math.abs(b.energy - prev.energy) < 0.02, 'no sudden change between frames');
    prev = b;
  }
});

test('it does not repeat exactly (two different slow rhythms)', () => {
  assert.notEqual(F.breath(1).energy.toFixed(4), F.breath(1 + 9).energy.toFixed(4));
});

test('ripples keep the chosen direction (crests move toward lower x, which looked left to right on screen)', () => {
  const base = { h: 36, hx: 200, amp: 1, energy: 0.6 };
  // follow one crest (the one near x = 230) as the phase grows
  const near = (phase, from, to) => { let best = -Infinity, bx = from; for (let x = from; x <= to; x += 0.25) { const y = 18 - F.waveY(x, { ...base, phase }); if (y > best) { best = y; bx = x; } } return bx; };
  let x = near(0.3, 215, 245);
  const path = [x];
  for (const ph of [0.6, 0.9, 1.2, 1.5]) { x = near(ph, x - 12, x + 3); path.push(x); }
  for (let i = 1; i < path.length; i++) assert.ok(path[i] < path[i - 1], `crest should keep moving the same way: ${path.join(', ')}`);
});

test('paused means perfectly flat, and the dot is exactly on the thread', () => {
  const calls = [];
  const ctx = new Proxy({}, { get: (_t, k) => (k === 'arc' ? (...a) => calls.push(a) : () => {}), set: () => true });
  const colors = { done: '#c08a5e', rest: '#333', dot: '#e0b48a' };
  F.drawThread(ctx, { w: 400, h: 36, head: 0.5, phase: 1, amp: 0, energy: 0.6, colors });
  assert.equal(calls[1][1], 18);
  F.drawThread(ctx, { w: 400, h: 36, head: 0.5, phase: 1, amp: 1, energy: 0.6, colors });
  assert.ok(Math.abs(calls[3][0] - 200) < 8);
  assert.notEqual(calls[3][1], 18); // playing: the dot rides the wave
});

test('animation level: saved choice wins, TVs default to light, others to full', () => {
  assert.equal(F.levelFrom('off', false), 'off');
  assert.equal(F.levelFrom(undefined, true), 'light');
  assert.equal(F.levelFrom(undefined, false), 'full');
  assert.equal(F.levelFrom('nonsense', false), 'full');
  assert.equal(F.NEXT_LEVEL.full, 'light');
  assert.equal(F.NEXT_LEVEL.off, 'full');
});
