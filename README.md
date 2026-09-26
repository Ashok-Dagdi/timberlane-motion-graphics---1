# TIMBERLANE — Motion Reel · 7 Films

A real-time motion-design showreel for **Timberlane Interiors** (Bengaluru):
seven scored brand films built as pure React compositions — no video
files, no canvas, no keyframe blobs. Every cut, camera kick, counter and
cross-fade is a function of one number, `t` (seconds), which is what makes
the whole reel scrubbable in the browser *and* exportable frame-accurately
to MP4.

| #  | piece          | format        | length | tempo  | score              |
|----|----------------|---------------|--------|--------|--------------------|
| 01 | VERTICAL       | 1080×1920 9:16| 20 s   | 120 BPM| EMBER / 120        |
| 02 | SCOPE          | 1920×810 2.37:1| 30 s  | 66 BPM | AMBER / 66         |
| 03 | SQUARE         | 1080×1080 1:1 | 15 s   | 96 BPM | POP / 96           |
| 04 | BLUEPRINT      | 1080×1920 9:16| 20 s   | 108 BPM| DRAFT / 108        |
| 05 | DOSSIER        | 1080×1920 9:16| 20 s   | 104 BPM| DOSSIER / 104      |
| 06 | RAMESH (story) | 1080×1920 9:16| 24 s   | 80 BPM | HOME / 80          |
| 07 | MATERIAL       | 1080×1920 9:16| 20 s   | 96 BPM | GRAIN / 96         |

All seven scores are synthesised live in WebAudio (see `src/video*/audio.ts`)
and scheduled against the composition clock, so picture and music stay
frame-locked while scrubbing.

## Run it

```bash
npm ci
npm run dev        # studio UI with transport, shot list, meters
npm run build      # single-file production bundle (dist/index.html)
```

Type faces are self-hosted (`src/fonts.css`, @fontsource) — the build is
fully offline-capable.

## Export the seven films as MP4

```bash
npm run build:all          # app + headless render harness
node tools/render.mjs      # → render-out/01-vertical-ember.mp4 … 07-material-ad.mp4
```

The renderer steps a headless Chromium frame-by-frame (`t = i / fps`),
pipes lossless PNGs into ffmpeg (H.264/yuv420p/bt709 + AAC 192k), and
renders each score offline through an `OfflineAudioContext` — so the MP4s
are exact, not screen captures. Details, flags and the stock-plate
override mechanism: **[tools/README.md](tools/README.md)**.

## Layout

```
src/
  App.tsx            studio shell: piece switcher, tickers, panels
  components/        Stage + chrome (timeline, transport, meters)
  video/             piece 01 — vertical ember cut
  video2/ … video7/  pieces 02–07 (scenes, fx, timeline, audio, workspace)
  render.tsx         chrome-free harness for the offline renderer
tools/
  render.mjs         frame-accurate MP4 exporter (7 masters)
  serve.mjs          static server for dist/
  stills.mjs         single-frame verification stills
render.html          second Vite entry → dist/render.html
```
