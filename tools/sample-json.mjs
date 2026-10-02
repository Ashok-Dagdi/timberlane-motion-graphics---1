/* ==================================================================
   sample-json.mjs — regenerate the sample scenes and the field manual
   ------------------------------------------------------------------
   The README and docs/ must never describe a format the engine has moved
   away from, so both the JSON samples and the type reference are printed
   out of the engine itself:

     node tools/sample-json.mjs
       → samples/timberlane-scene.json   the 30 s reel, 75 layers, as JSON
       → samples/starter-scene.json      a hand-sized scene to edit and import
       → docs/layer-types.md             every type, every field, every enum
   ================================================================== */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const L = (f) => fs.readFileSync(path.join(ROOT, "src/layers", f), "utf8");

["engine-core.js", "logo.js", "engine-draw.js", "engine-schema.js", "scene-timberlane.js"].forEach((f) =>
  vm.runInThisContext(L(f), { filename: "src/layers/" + f }),
);
const TLM = globalThis.TLM;
const write = (rel, text) => {
  const p = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text.endsWith("\n") ? text : text + "\n");
  console.log("  " + rel + "  " + (Buffer.byteLength(text) / 1024).toFixed(1) + " KB");
};
const J = (o) => JSON.stringify(o, null, 2);

/* ── 1 · the real reel, exported the way the editor exports it ────── */
const scene = JSON.parse(JSON.stringify(TLM.SCENES.timberlane));
TLM.normalize(scene);
write("samples/timberlane-scene.json", J(scene));

/* ── 2 · a starter scene: small enough to read, complete enough to run ──
   Every key below is checked against the schema at the bottom of this file,
   which is also the check the importer makes. If a field is not in the
   schema it is not in this sample. */
const starter = {
  name: "starter-8s",
  title: "STUDIO ONE — first scene",
  fps: 30,
  meta: { width: 1080, height: 1080, duration: 8, base: "#0b0c0e" },
  theme: {
    fonts: { display: "Anton", grotesk: "Archivo", mono: "JetBrains Mono", serif: "Playfair Display" },
    accent: "#C45A0F",
    ink: "#f4f1ea",
  },
  music: { bpm: 120, key: "A minor", title: "no score needed — the picture stands alone" },
  beats: [0, 1.5, 4, 6],
  camera: {
    keys: [
      { t: 0, x: 0, y: 0, zoom: 1.02, ease: "swift" },
      { t: 4, x: -14, y: 10, zoom: 1.09, ease: "expoOut" },
      { t: 6.5, x: 6, y: -6, zoom: 1.03, ease: "swift" },
    ],
    drift: 4,
    beat: { amount: 0.006, every: 1 },
  },
  assets: {
    /* a key → any image URL, a data: URI, or "logo:<name>?tint=%23fff".
       props.src on a photo/video layer names the key. */
    room: "https://images.pexels.com/photos/31949939/pexels-photo-31949939.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  layers: [
    { id: "bg", type: "bg", in: 0, dur: 8, props: { colors: ["#191c20", "#0b0c0e"], mode: "linear", angle: 90, drift: 0.12 } },
    {
      id: "plate",
      type: "photo",
      in: 0,
      dur: 8,
      t: { x: 540, y: 372, w: 900, h: 620 },
      anim: { enter: "wipeU", exit: "fade", dur: 1.1, ease: "expoOut" },
      props: { src: "room", radius: 10, dim: 0.18, scrim: true, scrimAlpha: 0.5, tint: "#C45A0F", tintAlpha: 0.18, tintBlend: "soft-light", kb: { zoom: 1.06, x: 10, y: -6 } },
    },
    {
      id: "kick",
      type: "text",
      in: 0.6,
      dur: 6.6,
      t: { x: 540, y: 752, w: 860 },
      anim: { enter: "up", exit: "fade", dur: 0.7, ease: "expoOut", stagger: 0.05 },
      props: { text: "MAKE ROOM\nFOR **LIGHT.**", font: "display", size: 132, leading: 0.92, tracking: -4, align: "center", color: "#f4f1ea", accent: "#C45A0F", reveal: "wordsUp" },
    },
    {
      id: "rule",
      type: "shape",
      in: 1.4,
      dur: 5.6,
      t: { x: 540, y: 862, w: 620, h: 3 },
      anim: { enter: "fade", exit: "fade", dur: 0.4, ease: "swift" },
      props: { shape: "line", fill: "#C45A0F", stroke: "#C45A0F", strokeW: 3, grow: true, growDur: 0.55, cap: "round" },
    },
    {
      id: "counter",
      type: "counter",
      in: 3.2,
      dur: 3.6,
      t: { x: 300, y: 946 },
      props: { from: 0, to: 1240, decimals: 0, thousand: false, suffix: "", label: "PROJECTS DELIVERED", size: 44, font: "grotesk", color: "#f4f1ea", align: "center", bar: true, barColor: "#C45A0F", ease: "expoOut", tail: 0.5 },
    },
    { id: "studio", type: "text", in: 3.2, dur: 3.6, t: { x: 790, y: 946 }, props: { text: "STUDIO ONE · BENGALURU", font: "mono", size: 22, tracking: 5, align: "center", color: "#8b929a", upper: true } },
    { id: "grain", type: "grain", in: 0, dur: 8, props: { alpha: 0.06, tile: 128, contrast: 0.5, blend: "overlay" } },
    { id: "vig", type: "vignette", in: 0, dur: 8, props: { color: "#07080a", alpha: 0.6, r: 0.86, feather: 0.5 } },
  ],
};
write("samples/starter-scene.json", J(starter));

/* ── 2b · lint both samples against the schema ───────────────────────
   The engine ignores keys it doesn't know, which is kind but silent: a typo
   reads as "my change did nothing". So the generator refuses to ship a
   sample that contains a key no painter would ever look at. */
function lint(label, S) {
  const bad = [];
  const known = {};
  TLM.typeNames().forEach((ty) => {
    const g = TLM.fieldsFor(ty);
    known[ty] = new Set([...g.common, ...g.own].map((f) => f.key).concat(["id", "type", "props"]));
  });
  /* the allow-lists come out of COMMON, so the linter follows the schema
     rather than keeping a second copy of it that could go stale */
  const common = TLM.fieldsFor(TLM.typeNames()[0]).common.map((f) => f.key);
  const tKeys = new Set(common.filter((k) => k.indexOf("t.") === 0).map((k) => k.slice(2)));
  const aKeys = new Set(common.filter((k) => k.indexOf("anim.") === 0).map((k) => k.slice(5)));
  const layerKeys = new Set(["id", "type", "props"].concat(common.map((k) => k.split(".")[0])).concat(["locked", "hidden"]));
  (S.layers || []).forEach((l) => {
    Object.keys(l).forEach((k) => {
      if (!layerKeys.has(k)) bad.push(label + ": layer " + l.id + " has unknown key `" + k + "`");
    });
    Object.keys(l.t || {}).forEach((k) => {
      if (!tKeys.has(k)) bad.push(label + ": layer " + l.id + " t." + k + " is not a placement field");
    });
    Object.keys(l.anim || {}).forEach((k) => {
      if (!aKeys.has(k)) bad.push(label + ": layer " + l.id + " anim." + k + " does not exist");
      else if (k === "ease" && !TLM.EASE[l.anim.ease]) bad.push(label + ": layer " + l.id + " ease \"" + l.anim.ease + "\" is not an easing");
    });
    const set = known[l.type];
    if (!set) {
      bad.push(label + ": layer " + l.id + " has unknown type `" + l.type + "`");
      return;
    }
    Object.keys(l.props || {}).forEach((k) => {
      if (!set.has("props." + k)) bad.push(label + ": " + l.type + " does not read props." + k);
    });
    const vals = {};
    [...(TLM.fieldsFor(l.type).common || []), ...(TLM.fieldsFor(l.type).own || [])].forEach((f) => {
      if (f.values) vals[f.key] = f.values;
    });
    Object.keys(vals).forEach((key) => {
      const v = key.indexOf("props.") === 0 ? (l.props || {})[key.slice(6)] : (l.anim || {})[key.slice(5)];
      if (v !== undefined && vals[key].indexOf(v) === -1) bad.push(label + ": layer " + l.id + " " + key + "=\"" + v + "\" (use " + vals[key].slice(0, 6).join("/") + "…)");
    });
  });
  return bad;
}
const problems = lint("timberlane-scene.json", scene).concat(lint("starter-scene.json", starter));
if (problems.length) {
  console.error("\n" + problems.length + " field problem(s):");
  problems.slice(0, 24).forEach((p) => console.error("  · " + p));
  process.exitCode = 1;
} else {
  console.log("  both samples lint clean against the schema ✓");
}

/* ── 3 · the field manual, generated ─────────────────────────────── */
const md =
  "# Layer types — field reference\n\n" +
  "Generated by `node tools/sample-json.mjs` from `src/layers/engine-schema.js`,\n" +
  "the same table the editor builds its inspector from, so it cannot drift.\n\n" +
  "Rules that apply to every layer:\n\n" +
  "| key | meaning |\n|---|---|\n" +
  "| `id` | unique string; everything else is optional |\n" +
  "| `type` | one of the types below |\n" +
  "| `in` | first second the layer exists |\n" +
  "| `dur` | how long it exists (`in + dur` = last frame) |\n" +
  "| `name` | label in the editor's layer list |\n" +
  "| `t` | placement: `x`, `y` are the box centre in canvas px, `w`/`h` the box, `r` corner radius, `rot` degrees, `anchorX/Y` to move the pivot, `z` paint offset, `parallax` camera drag 0–1 |\n" +
  "| `anim` | behaviour: `enter`, `exit`, `dur`, `ease`, `stagger`, `delay` |\n" +
  "| `props` | the type-specific fields below |\n\n" +
  TLM.schemaMarkdown() +
  "\n";
write("docs/layer-types.md", md);
console.log("\nsamples + reference regenerated ✓");
