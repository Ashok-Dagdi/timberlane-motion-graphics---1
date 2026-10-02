# Scene JSON — how to write one

A **scene** is the whole film: one plain JSON object that says what the canvas
is, what plays when, and where everything sits. Nothing else in this project
holds content.

The same file shape is used in five places, which is the point:

| where | what it does with it |
|---|---|
| `samples/timberlane-scene.json` | the 30 s Timberlane reel, 75 layers, as data |
| **IMPORT** in the layer editor | loads it, after `TLM.normalize` fills in every default |
| **EXPORT JSON** in the layer editor | writes it back out, byte-for-byte the same shape |
| `#tl-scene` in the downloaded HTML | the standalone file *is* a scene + the engine |
| `node tools/render-layers.mjs --scene <file>` | renders it to PNGs/MP4 with no browser |

The field manual for all 20 layer types is generated from the schema the
inspector is built from: **[docs/layer-types.md](layer-types.md)**. This
document is the part that can't be generated — how the pieces fit.

---

## 1 · The shape

```jsonc
{
  "name": "my-spot-30s",              // file slug; used for download names
  "title": "STUDIO ONE — 30s",        // shown in the editor header
  "fps": 30,                          // the frame grid; TC maths reads this
  "meta": {
    "width": 1080, "height": 1920,    // the design canvas; output scales to fit
    "duration": 30,                   // seconds; the timeline stops here
    "base": "#0b0c0e"                 // page colour behind everything
  },
  "theme": {
    "fonts": {                        // the four families a scene may name
      "display": "Anton", "grotesk": "Archivo",
      "mono": "JetBrains Mono", "serif": "Playfair Display"
    },
    "accent": "#C45A0F", "ink": "#f4f1ea"
  },
  "music": { "bpm": 120, "key": "A minor", "title": "Warm Concrete" },
  "beats": [0, 2.6, 6.2, 10.4],       // seconds; drive pulse + camera kick
  "camera": {
    "keys": [ { "t": 0, "x": 0, "y": 0, "zoom": 1.04, "ease": "swift" } ],
    "drift": 5,                       // px of ambient breathing
    "beat": { "amount": 0.008, "every": 1 }   // scale kick on every Nth beat
  },
  "assets": { "hero": "https://…/photo.jpg" },
  "layers": [ /* one object per layer, back to front */ ]
}
```

Strict rules, because it is parsed with `JSON.parse`:

- **no comments**, no trailing commas, no single quotes — the block above is
  annotated for reading, `samples/*.json` are the valid versions.
- **no functions or expressions**. Anything that needs maths is a number here
  and the engine does the maths at paint time.
- unknown keys are *ignored*, not fatal. That makes scenes forward-compatible
  — and it is why you should run the linter (below) instead of squinting.

## 2 · A layer, in order of how much you'll use each part

```jsonc
{
  "id": "kick",            // unique string. Required. Everything else optional.
  "type": "text",          // one of the 20 types in layer-types.md
  "name": "headline",      // label in the editor's layer list
  "in": 2.4,               // first second the layer exists
  "dur": 4,                // how long it lives (last frame = in + dur)
  "t": { "x": 540, "y": 900, "w": 880 },   // placement, canvas px
  "anim": { "enter": "up", "exit": "fade", "dur": 0.6, "ease": "expoOut", "stagger": 0.06 },
  "parallax": 0.4,         // 0 = locked to the canvas, 1 = full camera drag
  "blend": "source-over",  // any canvas composite op
  "props": { "text": "YOUR HOME,\n**REIMAGINED.**", "size": 150, "font": "display" }
}
```

`paint order = array order`. Index 0 is the back plate. The editor's layer
list shows this flipped (top of the list = front) because that is how design
tools behave; the JSON keeps the paint order.

### `t` — placement

`t.x` / `t.y` are the **centre** of the box, not the top-left, and `t.w` /
`t.h` are its size. Set `anchorX`/`anchorY` (0–1) to move the pivot to a
corner: `anchorX: 0, anchorY: 0` gives you a conventional top-left box.
`t.rot` is degrees, `t.scale` a multiplier, `t.opacity` pre-multiplies the
animation, `t.z` nudges paint depth. For a `text` layer `t.w` is the **wrap
width** and `t.h` is advisory — the block grows to fit its lines.

Design against `meta.width/height`. The renderer and the player both scale
that box to whatever they've got, so a 1080×1920 scene is also a correct
1080×1920 phone export and a correct 540×960 preview.

### `anim` — behaviour

| key | means |
|---|---|
| `enter` | `fade up down left right scale zoomIn zoomOut rise blur spinIn wipeL wipeR wipeU wipeD circle maskUp lineMask none` |
| `exit` | the same list, minus the entrance-only ones |
| `dur` / `exitDur` | seconds of each transition (`dur` 0 = pops in) |
| `ease` / `exitEase` | `linear quadOut quadIn cubicOut cubicIn quartOut quintOut expoOut expoIn sineOut sineInOut powerOut backOut backIn elasticOut bounceOut swift snap` |
| `dist` | px of travel for directional enters |
| `stagger` | per-word delay inside a text layer (0–0.4 s) |
| `float` / `floatSpeed` | ambient bob, in px and rad/s |
| `pulse` / `pulseSpeed` | scale breathing on the beat grid |
| `shake` / `shakeDecay` | impact jitter that settles over `shakeDecay` s |
| `spin` | continuous rotation, rev/s |
| `scaleFrom` / `rotFrom` / `skew` | what `scale`, `spinIn` and the shear-in start from |
| `blur` / `blurAfter` | motion-blur px on the way in / on the way out |
| `drift` / `driftSpeed` | slow lissajous wander (parallax for stills) |
| `breathe` | gentle scale rise across the layer's life |
| `seed` | which point in the ambient cycles it starts from |

Anything that moves is a function of `t`, so scrubbing is exact: the same
scene at `t = 7.5` is the same pixels every time. That is what lets the
offline renderer, the preview and the exported file agree.

### `props` — content

Type-specific, listed per type in [layer-types.md](layer-types.md). Two
conventions worth knowing:

- **text is markup-aware.** `\n` breaks a line; `**word**` paints that run in
  `props.accent`. `reveal` picks the per-word choreography
  (`none wordsUp wordsDown wordsLeft lines scale pop rise blur decode shuffle`).
- **assets are named, not embedded.** `"src": "hero"` looks up `assets.hero`.
  An asset value is an http(s) URL, a `data:` URI, or `logo:<name>?tint=%23fff`
  for the brand marks. If a plate can't load, the painter falls back to
  procedural interior art rather than showing a hole — the timeline never
  depends on the network.

## 3 · Checking a scene

```bash
node tools/sample-json.mjs                       # lints samples/ against the schema
node tools/render-layers.mjs --scene my.json --at 0,2,4,6
```

The second command is the useful one: it paints those four frames with the
real engine and prints nothing but file paths if the scene is sane. A layer
with a typo in a `props` key still renders — silently wrong — so the linter
in `sample-json.mjs` is what catches the mistakes the engine forgives. It
knows the whole vocabulary because it reads it out of `engine-schema.js`, the
same table the inspector builds its controls from.

Inside the app, **IMPORT JSON** accepts the same file, and the DOCS panel has
this contract compressed to one screen.

## 4 · Three edits that rebrand the sample

Start from `samples/starter-scene.json` (8 s, 1080×1080, seven layers):

1. `layers[2].props.text` → your headline. Keep the `**double asterisks**`
   around the word you want in the accent colour.
2. `theme.accent` and every `"#C45A0F"` → your colour. `props.tint`,
   `props.fill`, `props.stroke` and `props.barColor` all take it.
3. `meta.duration`, then each layer's `in`/`dur` → your cut length. Trim to
   the beat: at 120 BPM one beat is 0.5 s, so every `in` on a multiple of 0.5
   lands on the grid. Add `"beats": [0, 2, 4]` and the camera kick follows.

Then: IMPORT it in the editor, drag the headline where you want it, and hit
**⬇ HTML**. The file that downloads is that scene, the engine and the score,
playing offline and still editable.
