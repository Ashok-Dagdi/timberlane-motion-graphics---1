/* ==================================================================
   export-standalone.mjs — write the standalone HTML file from node
   ------------------------------------------------------------------
   The app's "⬇ HTML" button is the canonical path: it inlines the fonts
   *and* re-encodes the stock plates it can reach, so the file is complete
   offline. This is the same document built from the source files directly —
   fonts inlined, plates left as URLs (the engine paints its procedural
   interior art until they arrive) — which is what you want in CI, or when
   you just need the artefact on disk:

     node tools/export-standalone.mjs [--out render-out/timberlane-layers.html]
     node tools/export-standalone.mjs --scene samples/starter-scene.json
   ================================================================== */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require_ = createRequire(import.meta.url);
const { JSDOM } = require_("jsdom");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const L = (f) => fs.readFileSync(path.join(ROOT, "src/layers", f), "utf8");
const arg = (k, d) => {
  const i = process.argv.indexOf("--" + k);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d;
};

/* the engine as classic scripts, on a window with no rendering — the same
   order export-html.js embeds them in, so nothing about the document differs */
const ENG = ["engine-core.js", "logo.js", "engine-draw.js", "engine-schema.js", "music.js", "scene-timberlane.js", "editor.js"];
const w = new JSDOM("<!doctype html><html><body></body></html>", { runScripts: "outside-only" }).window;
for (const f of ["engine-core.js", "logo.js", "engine-draw.js", "engine-schema.js", "music.js", "scene-timberlane.js", "html-shell.js"]) w.eval(L(f));

const sceneFile = arg("scene", null);
const scene = sceneFile
  ? JSON.parse(fs.readFileSync(path.resolve(ROOT, sceneFile), "utf8"))
  : w.eval("JSON.parse(JSON.stringify(TLM.SCENES.timberlane))");
w.TLM.normalize(scene);

/* type faces: the repo installs them, so base64 them straight off disk */
const FACES = [
  ["Anton", "normal", "400", "@fontsource/anton/files/anton-latin-400-normal.woff2"],
  ["Archivo", "normal", "100 900", "@fontsource-variable/archivo/files/archivo-latin-wght-normal.woff2"],
  ["Archivo", "italic", "100 900", "@fontsource-variable/archivo/files/archivo-latin-wght-italic.woff2"],
  ["JetBrains Mono", "normal", "100 800", "@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2"],
  ["JetBrains Mono", "italic", "100 800", "@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-italic.woff2"],
  ["Playfair Display", "normal", "400 900", "@fontsource-variable/playfair-display/files/playfair-display-latin-wght-normal.woff2"],
  ["Playfair Display", "italic", "400 900", "@fontsource-variable/playfair-display/files/playfair-display-latin-wght-italic.woff2"],
];
const fontCSS = FACES.map(([fam, style, weight, rel]) => {
  const p = path.join(ROOT, "node_modules", rel);
  if (!fs.existsSync(p)) return ""; /* a fontless install still exports */
  const b64 = fs.readFileSync(p).toString("base64");
  return `@font-face{font-family:"${fam}";font-style:${style};font-weight:${weight};font-display:block;src:url("data:font/woff2;base64,${b64}") format("woff2");}`;
})
  .filter(Boolean)
  .join("\n");

const html = w.TLM.buildShell({
  scene,
  fontCSS,
  parts: ENG.map((f) => ["tl-" + f.replace(/\.js$/, ""), L(f)]),
});
const out = path.resolve(ROOT, arg("out", "render-out/" + (scene.name || "scene") + ".html"));
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(
  path.relative(ROOT, out) +
    " · " +
    (Buffer.byteLength(html) / 1024).toFixed(0) +
    " KB · " +
    scene.layers.length +
    " layers · " +
    (scene.meta.width + "×" + scene.meta.height) +
    " · " +
    (fontCSS.match(/@font-face/g) || []).length +
    " faces inlined" +
    (sceneFile ? " · scene: " + sceneFile : ""),
);
