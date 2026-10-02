/* ==================================================================
   render-layers.mjs — offline stills + master MP4 for the layer engine
   ------------------------------------------------------------------
   The repo's renderer drives a headless Chrome. There is no browser in
   this sandbox, so this tool runs the *same* engine (src/layers/*.js,
   loaded exactly as text, the way the exported HTML loads it) on a
   native canvas instead. Two jobs:

     node tools/render-layers.mjs                       → 8 check-frames in render-out/layers/
     node tools/render-layers.mjs --at 0,7.5,29.9       → stills at those times
     node tools/render-layers.mjs --master              → 900 PNG frames + ffmpeg → MP4
     node tools/render-layers.mjs --master --jpeg --clean   → q93 JPEG frames, muxed with render-out/timberlane-layers.wav, frames removed
     node tools/render-layers.mjs --master --fps 15     → half-rate draft
     node tools/render-layers.mjs --selftest           → assert every painter ran, no errors

   Frames are deterministic: TLM.render is a pure function of (scene, t),
   so a still and the exported video are the same picture.
   ================================================================== */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const require_ = createRequire(import.meta.url);
const argv = process.argv.slice(2);
const flag = (n, d) => {
  const i = argv.indexOf("--" + n);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : i >= 0 ? true : d;
};

const ENGINE = [
  "engine-core.js",
  "logo.js",
  "engine-draw.js",
  "engine-schema.js",
  "music.js",
  "scene-timberlane.js",
];

/* ---------------------------------------------------------------- */
/* 1. load the engine as classic scripts — byte-identical to the app */
/* ---------------------------------------------------------------- */
global.window = global;
const warnings = [];
const origWarn = console.warn;
console.warn = (...a) => {
  warnings.push(a.join(" "));
  if (VERBOSE) origWarn("[engine]", ...a);
};
for (const f of ENGINE) {
  const src = fs.readFileSync(path.join(ROOT, "src/layers", f), "utf8");
  vm.runInThisContext(src, { filename: "src/layers/" + f });
}
const TLM = global.TLM;
const VERBOSE = argv.includes("-v") || argv.includes("--verbose");

/* ---------------------------------------------------------------- */
/* 2. fonts — @expo-google-fonts ships real TTFs; register every face */
/*    under "Family <weightToken>" and let fontString pick by weight  */
/* ---------------------------------------------------------------- */
const NCanvas = require_("@napi-rs/canvas");
const { createCanvas, Image: NImage } = NCanvas;
/* the engine guards on globalThis.Path2D; Node doesn't have one, canvas does */
global.Path2D = NCanvas.Path2D;
global.DOMMatrix = NCanvas.DOMMatrix;
const FM = NCanvas.GlobalFonts;
const REG = {}; /* family → { "700": alias, "700i": alias, … } */
const PKG_DIR = path.join(ROOT, "node_modules", "@expo-google-fonts");
if (fs.existsSync(PKG_DIR)) {
  for (const pkg of fs.readdirSync(PKG_DIR)) {
    const base = path.join(PKG_DIR, pkg);
    for (const sub of fs.readdirSync(base)) {
      const m = /^(\d{3})([A-Za-z]+)(?:_Italic)?$/.exec(sub);
      if (!m) continue;
      const dir = path.join(base, sub);
      if (!fs.statSync(dir).isDirectory()) continue;
      for (const file of fs.readdirSync(dir)) {
        if (!/\.ttf$/i.test(file)) continue;
        const fam = file.replace(/_\d{3}.*$/, "").replace(/_/g, " ");
        const alias = fam + " " + sub;
        try {
          FM.registerFromPath(path.join(dir, file), alias);
          const pretty = fam.replace(/([a-z])([A-Z])/g, "$1 $2");
          for (const key of [fam, pretty, pretty.toLowerCase()])
            (REG[key] = REG[key] || {})[m[1] + (/_Italic$/.test(sub) ? "i" : "")] = alias;
        } catch (e) {
          warnings.push("font " + file + ": " + e.message);
        }
      }
    }
  }
}
const FAMILIES = Object.keys(REG).sort();
const baseFontString = TLM.fontString;
TLM.fontString = function (props, scene) {
  const fam = TLM.fontFamily(scene, (props && props.font) || "grotesk").replace(/^["']|["']$/g, "");
  const table = REG[fam] || REG[fam.replace(/[^A-Za-z0-9]/g, "")] || REG[fam.toLowerCase()];
  if (!table) return baseFontString(props, scene);
  const want = Number((props && props.weight) || 400);
  const ital = props && props.italic ? "i" : "";
  const keys = Object.keys(table).filter((k) => k.slice(1) === ital || (k.length === 3 && !ital));
  let best = keys[0];
  let bd = 1e9;
  for (const k of keys) {
    const d = Math.abs(Number(k) - want) + (k.slice(1) === ital ? 0 : 40);
    if (d < bd) {
      bd = d;
      best = k;
    }
  }
  const alias = best ? table[best] : Object.values(table)[0];
  return baseFontString(Object.assign({}, props, { family: '"' + alias + '"' }), scene);
};
/* fontFamily normally returns scene.theme.fonts[key]; keep raw aliases usable */
const baseFamily = TLM.fontFamily;
TLM.fontFamily = function (scene, key) {
  const v = baseFamily(scene, key);
  return typeof v === "string" ? v.replace(/^"|"$/g, "") : v;
};

/* ---------------------------------------------------------------- */
/* 3. plates — prefer local overrides (same convention as render.mjs) */
/* ---------------------------------------------------------------- */
const PLATE = [path.join(ROOT, "tools/plates"), path.join(ROOT, "public/plates")];
function localFor(url) {
  if (!url) return null;
  const id = /photos\/(\d+)\//.exec(url);
  const cands = [];
  if (id) {
    for (const d of PLATE) {
      cands.push(path.join(d, id[1] + ".jpg"), path.join(d, id[1] + ".png"), path.join(d, id[1] + ".webp"));
    }
  }
  const named = path.basename(decodeURIComponent(url.split("?")[0]));
  for (const d of PLATE) cands.push(path.join(d, named));
  for (const c of cands) if (fs.existsSync(c)) return c;
  return null;
}

/* `--scene samples/my-scene.json` renders any hand-written or exported file,
   which is also the cheapest way to check a scene is valid before trusting it
   in the browser: a bad file fails here, in one line, not in a blank canvas. */
const sceneArg = flag("scene", null);
let scene;
if (typeof sceneArg === "string") {
  const p = path.resolve(ROOT, sceneArg);
  if (!fs.existsSync(p)) {
    console.error("--scene: no such file: " + sceneArg);
    process.exit(1);
  }
  try {
    scene = JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    console.error("--scene: " + sceneArg + " is not valid JSON — " + e.message);
    process.exit(1);
  }
  if (!scene || !Array.isArray(scene.layers) || !scene.layers.length) {
    console.error("--scene: " + sceneArg + " has no `layers` array — nothing to paint");
    process.exit(1);
  }
} else {
  scene = JSON.parse(JSON.stringify(TLM.SCENES.timberlane));
}
TLM.normalize(scene);
if (typeof sceneArg === "string") console.log("scene: " + sceneArg + " · " + scene.layers.length + " layers · " + scene.meta.width + "×" + scene.meta.height + " · " + scene.meta.duration + "s @" + scene.meta.fps + "fps");
global.Image = NImage;
const pool = new TLM.AssetPool(scene, { createImage: () => new NImage() });
const missing = [];
for (const rec of pool.list) {
  if (/^data:/i.test(rec.src)) continue;
  const local = localFor(rec.src);
  if (!local) {
    missing.push(rec.id);
    rec.failed = true; /* don't try the network in a sandbox without one */
    continue;
  }
  const img = new NImage();
  img.src = new Uint8Array(fs.readFileSync(local));
  pool.set(rec.id, img, "file://" + local);
}

/* ---------------------------------------------------------------- */
/* 4. render                                                          */
/* ---------------------------------------------------------------- */
const SCALE = Number(flag("scale", 1));
const W = Math.round(scene.meta.width * SCALE);
const H = Math.round(scene.meta.height * SCALE);
const cv = createCanvas(W, H);
const ctx = cv.getContext("2d");
const OUT = path.join(ROOT, "render-out", "layers");
fs.mkdirSync(OUT, { recursive: true });

let rendered = 0;
function frame(t) {
  TLM.render(ctx, scene, t, { scale: SCALE, assets: pool, debug: true, guides: argv.includes("--guides") });
  rendered++;
  return cv;
}
function still(t) {
  frame(t);
  const p = path.join(OUT, "t" + t.toFixed(2).replace(".", "-") + ".png");
  fs.writeFileSync(p, cv.toBuffer("image/png"));
  return p;
}

const times = flag("at", null);
if (argv.includes("--selftest")) {
  const fps = scene.meta.fps;
  const n = Math.round(scene.meta.duration * fps);
  const seen = new Set();
  const errs = [];
  const drawFns = Object.keys(TLM.draw);
  const before = warnings.length;
  for (let i = 0; i <= n; i++) {
    const t = i / fps;
    /* which layers are live at t → which painters must have been exercised */
    scene.layers.forEach((l) => {
      if (!l.hidden && t >= (l.in || 0) && t <= (l.in || 0) + (l.dur || 0)) seen.add(l.type);
    });
    try {
      frame(t);
    } catch (e) {
      errs.push("t=" + t.toFixed(3) + " " + e.message);
    }
  }
  const unused = drawFns.filter((k) => !seen.has(k));
  console.log("frames        ", n + 1);
  console.log("painters used ", seen.size + "/" + drawFns.length, [...seen].sort().join(" "));
  console.log("never used    ", unused.length ? unused.join(" ") : "— (every painter has a layer in this scene)");
  console.log("hard errors   ", errs.length ? errs.slice(0, 6).join("\n") : "none");
  console.log("engine warns  ", warnings.length - before || "none");
  console.log("plates        ", missing.length ? "fallback art for: " + missing.join(" ") : "all local");
  console.log("fonts         ", FAMILIES.length ? FAMILIES.join(", ") : "system fallback only");
  const kinds = {};
  warnings.forEach((w2) => { const k = w2.split(" ").slice(1, 3).join(" "); kinds[k] = (kinds[k] || 0) + 1; });
  Object.entries(kinds).sort((a, b) => b[1] - a[1]).slice(0, 14).forEach(([k, v]) => console.log("  warn:", v + "×", k));
  /* also write a contact sheet of the 8 marks so a human can eyeball it */
  const marks = scene.beats.concat([scene.meta.duration * 0.5]);
  const tw = 300,
    th = Math.round((tw * H) / W),
    cols = 3,
    rows = Math.ceil(marks.length / cols);
  const sheet = createCanvas(cols * tw, rows * th);
  const sx = sheet.getContext("2d");
  marks.forEach((t, i) => {
    frame(t);
    sx.drawImage(cv, (i % cols) * tw, Math.floor(i / cols) * th, tw, th);
  });
  fs.writeFileSync(path.join(OUT, "contact.png"), sheet.toBuffer("image/png"));
  process.exitCode = errs.length || warnings.length - before ? 1 : 0;
} else if (argv.includes("--master") || argv.includes("--frames")) {
  const fps = Number(flag("fps", scene.meta.fps));
  const dir = path.join(ROOT, "render-out", "layers-frames");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const n = Math.round(scene.meta.duration * fps);
  const t0 = Date.now();
  /* PNG frames are exact but enormous (900 × ~2 MB); for a photo-based reel a
     q93 JPEG costs the encoder nothing visible and is 8× cheaper on disk. */
  const ext = argv.includes("--jpeg") ? "jpg" : "png";
  const enc = ext === "jpg" ? { fmt: "image/jpeg", q: Number(flag("quality", "93")) } : { fmt: "image/png", q: 0 };
  for (let i = 0; i <= n; i++) {
    const t = i / fps;
    frame(t);
    fs.writeFileSync(path.join(dir, "f" + String(i).padStart(4, "0") + "." + ext), enc.q ? cv.toBuffer(enc.fmt, enc.q) : cv.toBuffer(enc.fmt));
    if (i % 60 === 0) console.log(i + "/" + n + "  " + ((Date.now() - t0) / 1000).toFixed(1) + "s");
  }
  console.log("frames done in", ((Date.now() - t0) / 1000).toFixed(1) + "s →", dir);
  const out = path.resolve(ROOT, flag("out", "render-out/timberlane-layers.mp4"));
  let ff = null;
  try {
    ff = require_("@ffmpeg-installer/ffmpeg").path;
  } catch {
    ff = null;
  }
  if (!ff) {
    const which = spawnSync("which", ["ffmpeg"]);
    ff = which.status === 0 ? which.stdout.toString().trim() : null;
  }
  if (!ff) {
    console.log("no ffmpeg found — frames are in render-out/layers-frames/");
    process.exit(0);
  }
  /* the score, if it has been bounced (node tools/score-wav.mjs) — the master
     is the only place the reel needs a printed soundtrack */
  const wav = path.resolve(ROOT, flag("audio", "render-out/timberlane-layers.wav"));
  const hasAudio = fs.existsSync(wav);
  const args = ["-y", "-framerate", String(fps), "-i", path.join(dir, "f%04d." + ext)];
  if (hasAudio) args.push("-i", wav);
  args.push(
    "-map", "0:v",
    ...(hasAudio ? ["-map", "1:a", "-c:a", "aac", "-b:a", "224k"] : []),
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-profile:v", "high",
    "-crf", String(flag("crf", "18")),
    "-preset", flag("preset", "medium"),
    "-movflags", "+faststart",
    "-shortest",
    out,
  );
  const r = spawnSync(ff, args, { stdio: "inherit" });
  console.log(r.status === 0 ? "wrote " + out + (hasAudio ? "  (+ " + path.relative(ROOT, wav) + ")" : "  (silent — run tools/score-wav.mjs first)") : "ffmpeg failed (" + r.status + ")");
  if (r.status === 0 && argv.includes("--clean")) fs.rmSync(dir, { recursive: true, force: true });
} else if (times) {
  String(times)
    .split(",")
    .map((x) => Number(x))
    .filter((x) => !isNaN(x))
    .forEach((t) => console.log("→", still(t)));
} else {
  const marks = scene.beats.concat([14.6, 22.4, 29.4]);
  marks.forEach((t) => console.log("→", still(t)));
  console.log(
    "plates:",
    missing.length ? missing.length + " using designed fallback (" + missing.join(" ") + ")" : "all local",
  );
}
console.warn = origWarn;
if (!VERBOSE && warnings.length) console.log("engine warnings:", warnings.length, "— rerun with -v to see them");
