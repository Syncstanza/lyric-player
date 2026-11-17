/* Fluid UI helpers: the "sound-thread" progress line.
   A slow, loose "breathing" (not tied to the lyrics or the audio) so it feels alive without being busy.
   The ripples always travel from left to right. Pure functions; works in the browser (window.Fluid) and in Node for the tests. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Fluid = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const TWO_PI = Math.PI * 2;

  // Two very slow waves of different lengths added together, so the swell never repeats exactly: how big the ripple is,
  // and how fast it drifts. energy 0..1 (about 0.25 to 0.75), speed in radians per second.
  function breath(t) {
    const e = 0.5 + 0.17 * Math.sin(TWO_PI * t / 9) + 0.08 * Math.sin(TWO_PI * t / 23 + 1.3);
    return { energy: clamp(e, 0, 1), speed: 3 + 1.6 * e };
  }

  const SIGMA = 46, FREQ = 0.19;
  // Height of the thread at x. The phase only grows, and the sign makes the crests move to the right.
  function waveY(x, p) {
    const cy = p.h / 2, amp = (3 + 9 * p.energy) * p.amp;
    return cy + amp * Math.exp(-Math.pow((x - p.hx) / SIGMA, 2)) * Math.sin((x - p.hx) * FREQ - p.phase);
  }

  // p: { w, h, head (0..1), phase, amp (0..1: playing amount), energy, colors {done, rest, dot} }
  function drawThread(ctx, p) {
    const { w, h } = p, pad = 7;
    const x0 = pad, x1 = w - pad;
    p.hx = x0 + (x1 - x0) * clamp(p.head, 0, 1);
    const hx = p.hx, yAt = (x) => waveY(x, p);
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 4;
    const path = (a, b) => { ctx.beginPath(); ctx.moveTo(a, yAt(a)); for (let x = a + 3; x < b; x += 3) ctx.lineTo(x, yAt(x)); ctx.lineTo(b, yAt(b)); ctx.stroke(); };
    ctx.strokeStyle = p.colors.rest; path(Math.max(x0, hx - 1), x1); // ahead of the dot
    ctx.strokeStyle = p.colors.done; ctx.lineWidth = 4.5; if (hx > x0 + 1) path(x0, hx); // behind the dot
    const hy = yAt(hx); // the dot sits on the thread
    ctx.fillStyle = p.colors.dot;
    ctx.globalAlpha = 0.26; ctx.beginPath(); ctx.arc(hx, hy, 10, 0, TWO_PI); ctx.fill();
    ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(hx, hy, 6.5, 0, TWO_PI); ctx.fill();
  }

  // 'full' | 'light' | 'off'. TVs start on light.
  function levelFrom(saved, isTv) {
    return saved === 'full' || saved === 'light' || saved === 'off' ? saved : (isTv ? 'light' : 'full');
  }
  const NEXT_LEVEL = { full: 'light', light: 'off', off: 'full' };

  return { breath, waveY, drawThread, levelFrom, NEXT_LEVEL };
});
