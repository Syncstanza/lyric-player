const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

/* Every release tag the app can ask for (normal and early versions) must be one the main process is willing to look up. */
const main = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'app.js'), 'utf8');

test('the update tags the app asks for are all allowed in the main process', () => {
  const allowed = (main.match(/const UPDATE_TAGS = \[([^\]]+)\]/) || [])[1];
  assert.ok(allowed, 'UPDATE_TAGS not found');
  const list = allowed.match(/'([a-z-]+)'/g).map((s) => s.slice(1, -1));
  const block = app.slice(app.indexOf('const dev = st.devChannel'), app.indexOf('const want = B.platform'));
  const asked = [...block.matchAll(/'([a-z]+-(?:latest|dev)|latest)'/g)].map((m) => m[1]);
  assert.ok(asked.length >= 6, `found ${asked.join(',')}`);
  for (const t of asked) assert.ok(list.includes(t), `${t} is not in UPDATE_TAGS`);
});

test('the self-updater also picks the early tags only when Early versions is on', () => {
  for (const t of ['windows-dev', 'linux-dev']) assert.ok(main.includes(`dev ? '${t}'`), t);
  assert.ok(main.includes("loadSettings().devChannel === true"));
});
