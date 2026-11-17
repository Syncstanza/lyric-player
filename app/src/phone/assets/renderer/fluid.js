/* Fluid UI helpers: the "sound-thread" progress line and how lively it is.
   The movement follows the cadence of the lyrics (how fast the lines are sung, and a swell at every new line),
   because reading the real audio out of the YouTube page is not safe (it can cut or distort the sound).
   Pure functions; works in the browser (window.Fluid) and in Node for the tests. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Fluid = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const ease = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

  const IDLE = { energy: 0.45, pulse: 0 };

  // lines: [{time, text}] in order. Returns a function tau(seconds) -> { energy 0..1, pulse 0..1 }.
  function makeCadence(lines) {
    const L = (lines || []).filter((l) => l && Number.isFinite(l.time) && l.text && String(l.text).trim());
    if (L.length < 2) return () => IDLE;
    const info = L.map((l, i) => {
      const len = String(l.text).replace(/\s+/g, ' ').trim().length;
      const gap = i + 1 < L.length ? Math.max(0.5, L[i + 1].time - l.time) : 4;
      const sung = Math.min(gap, Math.max(1, len / 13)); // roughly how long the line really lasts (about 13 characters a second)
      return { t: l.time, len, gap, sung, density: len / Math.min(gap, 8) };
    });
    const dens = info.map((x) => x.density).sort((a, b) => a - b);
    const median = dens[dens.length >> 1] || 1;
    const level = (x) => clamp(0.18 + 0.82 * (x.density / (median * 1.9)), 0.2, 1);
    return function at(tau) {
      let i = -1;
      for (let lo = 0, hi = info.length - 1; lo <= hi;) { const mid = (lo + hi) >> 1; if (info[mid].t <= tau) { i = mid; lo = mid + 1; } else hi = mid - 1; }
      if (i < 0) return { energy: 0.2, pulse: 0 };
      const cur = info[i], age = tau - cur.t;
      let e = level(cur);
      if (i > 0 && age < 0.6) e = level(info[i - 1]) + (e - level(info[i - 1])) * ease(age / 0.6); // glide between lines
      if (age > cur.sung && cur.gap > cur.sung + 2.5) e = Math.max(0.12, e * (1 - ease((age - cur.sung) / 2))); // a long break: it settles
      return { energy: e, pulse: Math.exp(-age / 0.45) };
    };
  }

  // The thread. p: { w, h, head (0..1), t (seconds, for the phase), amp (0..1: playing amount), energy, pulse, colors {done, rest, dot}, dpr }
  function drawThread(ctx, p) {
    const { w, h } = p, cy = h / 2, pad = 7;
    const x0 = pad, x1 = w - pad, hx = x0 + (x1 - x0) * clamp(p.head, 0, 1);
    const amp = (3 + 9 * p.energy) * (1 + 0.65 * p.pulse) * p.amp;
    const speed = 5 + 5 * p.energy;
    const sig = 46, freq = 0.19;
    const yAt = (x) => cy + amp * Math.exp(-Math.pow((x - hx) / sig, 2)) * Math.sin((x - hx) * freq - p.t * speed);
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 4;
    const path = (a, b) => { ctx.beginPath(); ctx.moveTo(a, yAt(a)); for (let x = a + 3; x < b; x += 3) ctx.lineTo(x, yAt(x)); ctx.lineTo(b, yAt(b)); ctx.stroke(); };
    ctx.strokeStyle = p.colors.rest; path(Math.max(x0, hx - 1), x1); // ahead of the dot
    ctx.strokeStyle = p.colors.done; ctx.lineWidth = 4.5; if (hx > x0 + 1) path(x0, hx); // behind the dot
    const hy = yAt(hx); // the dot sits on the thread
    ctx.fillStyle = p.colors.dot;
    ctx.globalAlpha = 0.26 + 0.2 * p.pulse; ctx.beginPath(); ctx.arc(hx, hy, 10 + 5 * p.pulse, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(hx, hy, 6.5, 0, Math.PI * 2); ctx.fill();
  }

  // 'full' | 'light' | 'off'. TVs start on light.
  function levelFrom(saved, isTv) {
    return saved === 'full' || saved === 'light' || saved === 'off' ? saved : (isTv ? 'light' : 'full');
  }
  const NEXT_LEVEL = { full: 'light', light: 'off', off: 'full' };

  return { makeCadence, drawThread, levelFrom, NEXT_LEVEL, IDLE };
});
