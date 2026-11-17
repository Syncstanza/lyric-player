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
  const base = { h: 36, w: 600, energy: 0.5, amp: 1, hx: 300 };
  const near = (phase, from, to) => { let best = -Infinity, bx = from; for (let x = from; x <= to; x += 0.25) { const y = 18 - F.waveY(x, { ...base, phase }); if (y > best) { best = y; bx = x; } } return bx; };
  const path = [];
  for (let ph = 0; ph < 0.9; ph += 0.15) path.push(near(ph, 270, 330));
  for (let i = 1; i < path.length; i++) assert.ok(path[i] < path[i - 1], `crest should keep moving the same way: ${path.join(', ')}`);
});

test('the dot rides exactly on the road, paused or playing', () => {
  const calls = [];
  const ctx = new Proxy({}, { get: (_t, k) => (k === 'arc' ? (...a) => calls.push(a) : () => {}), set: () => true });
  const colors = { done: '#c08a5e', rest: '#333', dot: '#e0b48a' };
  for (const amp of [0, 1]) {
    calls.length = 0;
    const pr = { w: 400, h: 36, head: 0.5, phase: 1, amp, energy: 0.6, colors };
    F.drawThread(ctx, pr);
    const [x, y] = calls[calls.length - 1];
    assert.ok(Math.abs(y - F.waveY(x, pr)) < 1e-9);
  }
});

test('smooth moves toward the target at any frame rate', () => {
  let a = 0, b = 0;
  for (let i = 0; i < 30; i++) a = F.smooth(a, 1, 1 / 30, 10);
  for (let i = 0; i < 60; i++) b = F.smooth(b, 1, 1 / 60, 10);
  assert.ok(Math.abs(a - b) < 1e-9 && a > 0.99);
});

test('animation level: saved choice wins, TVs default to light, others to full', () => {
  assert.equal(F.levelFrom('off', false), 'off');
  assert.equal(F.levelFrom(undefined, true), 'light');
  assert.equal(F.levelFrom(undefined, false), 'full');
  assert.equal(F.levelFrom('nonsense', false), 'full');
  assert.equal(F.NEXT_LEVEL.full, 'light');
  assert.equal(F.NEXT_LEVEL.off, 'full');
});
