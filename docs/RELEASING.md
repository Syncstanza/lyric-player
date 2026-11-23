# How releases work

- **`main`** is what people get. Every push to `main` builds Windows, Linux and Android and publishes them as the `latest` releases.
- **`dev`** is where work happens. Pushing to `dev` only runs the tests (nothing is published).

## Early versions (the `dev` channel)
Every push to `dev` also builds the real app (same name, same settings, same signing key) and publishes it as a **pre-release** under its own tag:
- **windows-dev**: installer, portable `.exe` and their `.sha256` files.
- **linux-dev**: `.deb`, AppImage and its `.sha256`.
- **android-dev**: `LyricPlayer.apk` (phone) and `LyricPlayer-TV.apk` (TV).

Nobody gets these by default. A person turns on **Menu > Early versions** in the app, and from then on the update button and the in-place updater look at these tags instead of `latest`, `windows-latest` and `linux-latest`. Turning it off goes back to the normal releases (which can be a little older, so Android may refuse that downgrade until the next normal release; Windows and Linux just replace the file).
Android version codes come from the clock (minutes since 1970, set in both workflows), so an early build and a normal build always install over each other in the order they were made. Merging `dev` into `main` publishes the normal release as before.

## Small update or hotfix
1. Work on `dev`, push, wait for the **Test (dev)** check to pass.
2. Merge `dev` into `main` (`git checkout main && git merge --ff-only dev && git push`, or a pull request on GitHub).

## Big update
Keep committing to `dev` for as long as it takes. Merge to `main` once, when it is ready, so people get one update instead of ten.

## Every release
Add a new entry at the top of `windows/renderer/whatsnew.js` (next id), run `python3 tools/assemble.py windows`, and commit the result.

## If a build shows a red mark
Open the Releases page first. If every platform shows the newest commit, it is only GitHub failing to start a job: run **Build APK** again by hand (Actions, Build APK, Run workflow).


## Announcements

`announcements.json` in the repo root (main branch) is read by the app a few seconds after start. Format:

```json
{ "items": [ { "id": 1, "title": "Short title", "text": "One or two sentences, plain text.", "date": "2026-11-11", "until": "2026-12-01" } ] }
```

- `id` must be a number and go up with each new announcement; people who dismissed id N only see ids above N.
- `until` (optional) hides it after that date. At most the 5 newest are shown. No links or formatting.
- Change the file on `main` and it goes live within minutes, with no new release. An empty list (`"items": []`) shows nothing.
