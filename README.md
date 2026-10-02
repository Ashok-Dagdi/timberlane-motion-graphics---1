# TIMBERLANE — Motion Reel · 8 Films

A real-time motion-design showreel for **Timberlane Interiors** (Bengaluru):
eight scored brand films built as pure React compositions — no video files,
no keyframe blobs. Every cut, camera kick, counter and cross-fade is a
function of one number, `t` (seconds), which is what makes the whole reel
scrubbable in the browser *and* exportable frame-accurately to MP4.

Piece **08** goes further: it is a *layer studio*. The film is a scene of 75
JSON layers painted by a canvas engine, and the editor around it lets you
drag any text or layout box on the canvas, retime it on the timeline, edit
its props, import and export the JSON, and download the whole thing as one
standalone HTML file that still opens and still edits. [→ Layer studio](#8--layer-studio)

| #  | piece          | format        | length | tempo  | score              |
|----|----------------|---------------|--------|--------|--------------------|
| 01 | VERTICAL       | 1080×1920 9:16| 20 s   | 120 BPM| EMBER / 120        |
| 02 | SCOPE          | 1920×810 2.37:1| 30 s  | 66 BPM | AMBER / 66         |
| 03 | SQUARE         | 1080×1080 1:1 | 15 s   | 96 BPM | POP / 96           |
| 04 | BLUEPRINT      | 1080×1920 9:16| 20 s   | 108 BPM| DRAFT / 108        |
| 05 | DOSSIER        | 1080×1920 9:16| 20 s   | 104 BPM| DOSSIER / 104      |
| 06 | RAMESH (story) | 1080×1920 9:16| 24 s   | 80 BPM | HOME / 80          |
| 07 | MATERIAL       | 1080×1920 9:16| 20 s   | 96 BPM | GRAIN / 96         |
| 08 | LAYERS (studio)| 1080×1920 9:16| 30 s   | 120 BPM| WARM CONCRETE / 120|

All eight scores are synthesised live (WebAudio — no audio files, nothing to
license) and scheduled against the composition clock, so picture and music
stay frame-locked while scrubbing. `src/video*/audio.ts` for 01–07,
`src/layers/music.js` for 08.

## Run it

```bash
npm ci
npm run dev        # studio UI with transport, shot list, meters
npm run build      # single-file production bundle (dist/index.html)
```

Type faces are self-hosted (`src/fonts.css`, @fontsource) — the build is
fully offline-capable.

## Export the eight films as MP4

```bash
npm run build:all          # app + headless render harness
node tools/render.mjs      # → render-out/01-vertical-ember.mp4 … 08-timberlane-layers.mp4
```

That route needs Chrome. Without a browser — CI, a sandbox, a laptop with
nothing installed — piece 08 renders from node alone, and its score can be
bounced next to it:

```bash
node tools/score-wav.mjs --table          # the 30 s master audio, from music.js's own chart
node tools/render-layers.mjs --master --jpeg --clean   # 900 frames → render-out/timberlane-layers.mp4
node tools/render-layers.mjs --at 1.2,7.5,29.6          # stills, for looking at the work
node tools/render-layers.mjs --scene samples/starter-scene.json --at 0,2,4   # any scene file
```

The renderer steps a headless Chromium frame-by-frame (`t = i / fps`),
pipes lossless PNGs into ffmpeg (H.264/yuv420p/bt709 + AAC 192k), and
renders each score offline through an `OfflineAudioContext` — so the MP4s
are exact, not screen captures. Details, flags and the stock-plate
override mechanism: **[tools/README.md](tools/README.md)**.

## 8 · Layer studio

| thing | where |
|---|---|
| canvas engine (20 layer types, easing, camera, hit-testing) | `src/layers/engine-core.js`, `engine-draw.js` |
| what every type is, and the inspector's fields | `src/layers/engine-schema.js` → [docs/layer-types.md](docs/layer-types.md) |
| the reel itself, as data | `src/layers/scene-timberlane.js` · `samples/timberlane-scene.json` |
| the editor (canvas drag, timeline, props, undo, docs) | `src/layers/editor.js` |
| "⬇ HTML" — one standalone file, still editable | `src/layers/export-html.js` + `html-shell.js` |
| the score | `src/layers/music.js` |

The four buttons that answer the brief: **● EXPORT VIDEO** records the canvas
and the live score to a `.webm`; **⬇ HTML** downloads the standalone file;
**EXPORT JSON** writes the scene; **IMPORT** reads one back. The exported
HTML plays the reel and, on <kbd>E</kbd>, *is* the editor — the engine, the
scene, the fonts and the score are all inside it, so it works from the
Desktop with no server and no network. The JSON contract, with a lintable
sample to start from: **[docs/scene-json.md](docs/scene-json.md)**.

Three harnesses run without a browser, because a UI you can only test by
looking at is a UI you ship broken:

```bash
node tools/render-layers.mjs --selftest     # every painter, 19 frames each
node tools/editor-smoke.mjs                 # mounts the editor in jsdom: 21 checks
node tools/standalone-smoke.mjs             # boots the exported file and drives it
```

## Layout

```
src/
  App.tsx            studio shell: piece switcher, tickers, panels
  components/        Stage + chrome (timeline, transport, meters)
  video/             piece 01 — vertical ember cut
  video2/ … video7/  pieces 02–07 (scenes, fx, timeline, audio, workspace)
  layers/            piece 08 — the layer studio (engine, editor, export, score)
  render.tsx         chrome-free harness for the offline renderer
tools/
  render.mjs         frame-accurate MP4 exporter (8 masters, needs Chrome)
  render-layers.mjs  the same for piece 08 with no browser at all
  score-wav.mjs      bounces the score to WAV from music.js's own event list
  logo.mjs           SVG → the logo path data in src/layers/logo.js
  sample-json.mjs    regenerates samples/ + docs/layer-types.md, and lints them
  editor-smoke.mjs · standalone-smoke.mjs   jsdom harnesses for the two UIs
  serve.mjs          static server for dist/
  stills.mjs         single-frame verification stills
render.html          second Vite entry → dist/render.html
```
