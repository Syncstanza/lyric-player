const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

/* The probe runs inside the YouTube Music page. Pull it out of main.js and run it against a fake page. */
const lines = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8').split('\n');
const a = lines.findIndex((l) => l.startsWith('const PICK_VIDEO'));
const b = lines.findIndex((l, i) => i > a && l.startsWith('const probeCall'));
const probeScript = new Function(lines.slice(a, b).join('\n') + '\nreturn probeScript;')();

function look(want, st) {
  const ctx = {
    window: st.win, URL, Date, Math, isFinite, Number,
    navigator: { mediaSession: { metadata: { title: 'T', artist: 'A', album: '', artwork: [] } } },
    location: { href: 'https://music.youtube.com/watch?v=' + st.vid },
    document: {
      querySelector: (sel) => (sel.includes('ad-showing') && st.ad ? {} : null),
      querySelectorAll: (sel) => (sel === 'video' ? [st.v] : []),
      getElementsByTagName: () => [],
    },
  };
  ctx.window.document = ctx.document;
  vm.runInNewContext(probeScript(want, true, null), ctx);
}

test('volume is put back whenever YouTube moves it, and left alone during an ad', () => {
  const v = { readyState: 4, paused: false, volume: 1, muted: false, duration: 200, currentTime: 5, playbackRate: 1 };
  const st = { v, win: {}, vid: 'abc', ad: false };
  look(80, st);
  assert.strictEqual(v.volume, 0.8);                 // first look applies the wanted volume
  v.volume = 1; look(80, st);
  assert.strictEqual(v.volume, 0.8);                 // YouTube jumped it to 100 mid-song: put back
  st.vid = 'def'; v.volume = 1; look(80, st);
  assert.strictEqual(v.volume, 0.8);                 // a new song
  v.volume = 1; look(60, st);
  assert.strictEqual(v.volume, 0.6);                 // the slider moved
  st.ad = true; st.vid = 'ghi'; v.volume = 1; look(60, st);
  assert.strictEqual(v.volume, 1);                   // during an ad it is not touched
});

test("YouTube's own loudness evening is kept (loud songs stay a little quieter), never above the wanted volume", () => {
  let raw = 1;
  class Media {}
  Object.defineProperty(Media.prototype, 'volume', { configurable: true, enumerable: true, get() { return raw; }, set(x) { raw = x; } });
  const el = new Media();
  Object.assign(el, {});
  const v = new Proxy(el, { get: (t, k) => (k === 'readyState' ? 4 : k === 'paused' ? false : k === 'muted' ? false : k === 'duration' ? 200 : k === 'currentTime' ? 5 : k === 'playbackRate' ? 1 : k === 'tagName' ? 'VIDEO' : t[k]), set: (t, k, val) => { t[k] = val; return true; } });
  const listeners = {};
  const win = {};
  const ctx = vm.createContext({
    window: win, URL, Date, Math, isFinite, Number, HTMLMediaElement: Media,
    navigator: { mediaSession: { metadata: { title: 'T', artist: 'A', album: '', artwork: [] } } },
    location: { href: 'https://music.youtube.com/watch?v=abc' },
    document: {
      querySelector: () => null, querySelectorAll: (sel) => (sel === 'video' ? [v] : []), getElementsByTagName: () => [],
      addEventListener: (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); },
    },
  });
  win.document = ctx.document;
  const run = (want) => vm.runInContext(probeScript(want, true, null), ctx);
  run(80);
  assert.ok(Math.abs(raw - 0.8) < 1e-9);
  Media.prototype.volume = 0.6;                       // YouTube evens out a loud song
  assert.ok(Math.abs(raw - 0.48) < 1e-9, `got ${raw}`); // 0.8 wanted x 0.6
  Media.prototype.volume = 1;                         // YouTube's reset to 100
  assert.ok(Math.abs(raw - 0.8) < 1e-9, `got ${raw}`); // never louder than wanted
  Media.prototype.volume = 0.6; run(50);              // the slider moved to 50
  assert.ok(Math.abs(raw - 0.3) < 1e-9, `got ${raw}`);
});
