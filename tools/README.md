# Offline MP4 renderer

Exports all seven Timberlane pieces as broadcast-ready MP4 masters
(H.264 + AAC, yuv420p, bt709, faststart) without recording the screen in
real time.

## How it works

Every piece is a pure function of time — `t` drives every transform, cut,
counter and camera kick (see `src/video*/timeline.ts` + `anim.ts`). The
app already proves this by being fully scrubbable. The renderer exploits
that:

1. `npm run build:all` builds the app **and** `render.html`, a chrome-free
   harness (`src/render.tsx`) that mounts exactly one composition at
   exactly one `t`.
2. `tools/render.mjs` drives a headless Chromium over CDP:
   `__setTime(i / fps)` → React flushes synchronously → one presented
   frame → `Page.captureScreenshot` (PNG, lossless) → piped straight into
   ffmpeg's `image2pipe` stdin. No intermediate frame files, no realtime
   drift, every frame exact.
3. Audio never touches a sound card: `window.__renderAudio(id)` rebuilds
   each score's arrangement inside an `OfflineAudioContext` (the `Score`
   classes only talk to `window.AudioContext`, which the harness swaps for
   an offline shim), renders the whole 20–30 s stem in one go, and muxes
   it as 192 kbit AAC.
4. CSS transitions/animations are force-disabled in the harness — the
   compositions are 100 % time-driven, so frames are reproducible to the
   pixel.

Frame-accurate by construction: frame *i* of the MP4 is the composition
evaluated at *i / fps*, and the container fps equals the piece's design
fps (30, or 24 for the scope piece).

## Usage

```bash
npm ci
npm run build:all            # app + render harness into dist/

# chrome + ffmpeg are auto-detected (PATH, ~/.cache/puppeteer, …)
node tools/render.mjs                          # all 7 pieces → render-out/
node tools/render.mjs --only 01 05             # subset
node tools/render.mjs --fps-scale 0.25         # quarter-rate draft
node tools/render.mjs --preset fast --crf 20   # faster/smaller
node tools/render.mjs --no-audio               # picture only
PORT=4399 node tools/render.mjs                # move the static server
```

Two workers can share a multicore box safely (disjoint `--only` sets,
different `PORT`s, same `--out`).

Environment overrides: `CHROME_PATH`, `FFMPEG_PATH`, `TOOLS_DIR`, `PORT`.

Helpers:
- `tools/serve.mjs` — the tiny static server used by the renderer.
- `tools/stills.mjs` — single-frame verification stills
  (`node tools/stills.mjs 01:7 02:6.5` → PNGs).

## Plates (stock photography)

The compositions reference Pexels CDN URLs (`src/video/assets.ts`).
The renderer intercepts those requests:

- **online box** — requests pass through, the real photography is used;
- **offline box / CI** — any file at `tools/plates/<pexels-photo-id>.jpg`
  (or `.png/.webp/.mp4`) is served instead; missing ones are aborted and
  the composition's designed fallbacks show. The render never depends on
  the network.

`tools/plates/` is git-ignored: it holds local stand-ins only. To render
with the original Pexels photography, either run online or drop the
twelve source photos in under their IDs (the renderer logs the exact
filenames it looked for).


---

## Without a browser

`render.mjs` is the exact route — Chromium steps `t = i / fps` and bakes the
score through an `OfflineAudioContext`. It needs a browser. When there isn't
one (CI, a sandbox, a clean machine), piece 08 has its own path, and every
tool in this folder runs on node alone:

| tool | does |
|---|---|
| `render-layers.mjs` | paints `src/layers/scene-timberlane.js` — or `--scene <file>` — with `@napi-rs/canvas`: `--selftest` (every painter, no output), `--at 1.2,7.5` (stills), `--master --jpeg --clean` (900 frames → `render-out/timberlane-layers.mp4`, muxing the WAV below when it exists) |
| `score-wav.mjs` | plays `music.js`'s own event list into a 48 kHz WAV with the eleven voices re-implemented as DSP — the same chart, printed. `--table` shows the level per 2 s so a flat mix is visible in the text output |
| `logo.mjs` | `src/layers/logo-src.svg` → the path data in `src/layers/logo.js` (grouped by part, classified so the lockup can be revealed piece by piece) |
| `sample-json.mjs` | regenerates `samples/*.json` and `docs/layer-types.md` from the engine, then lints both samples against the schema |
| `editor-smoke.mjs` | mounts the layer editor in jsdom with real 2D contexts and drives it: inspectors for all 20 types, add/drag/undo/scrub/play, docs, import |
| `standalone-smoke.mjs` | builds the actual "⬇ HTML" document and runs it: boots, plays, <kbd>E</kbd> opens the editor, Esc returns |

Stock plates are handled the same way as above: `tools/plates/<id>.jpg` is
served when the network isn't there, and `engine-draw.js` paints procedural
interior art when a plate is missing — so a headless render is always a
complete film, never a wall of broken-image icons.
