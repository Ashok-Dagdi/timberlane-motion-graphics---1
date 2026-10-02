/* ==================================================================
   standalone-smoke.mjs — boot the exported HTML file, headlessly
   ------------------------------------------------------------------
   "⬇ HTML" has to produce a document that plays by itself, offline, and
   turns into the editor on E. That is exactly the kind of promise you
   cannot keep by eye when there is no browser in the sandbox, so this
   file builds the real document with the real TLM.buildShell, loads it
   into jsdom with real 2D contexts, and drives it: play → frames
   advance → E → the editor is mounted → the JSON round-trips.

     node tools/standalone-smoke.mjs [--write]
   --write also drops render-out/timberlane-layers.html on disk so the
   artefact can be eyeballed or shipped.
   ================================================================== */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { JSDOM } from "jsdom";
import { createCanvas, Image as NImage, Path2D } from "@napi-rs/canvas";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const L = (f) => fs.readFileSync(path.join(ROOT, "src/layers", f), "utf8");
const ENG = ["engine-core.js", "logo.js", "engine-draw.js", "engine-schema.js", "music.js", "scene-timberlane.js", "editor.js"];
const args = process.argv.slice(2);
const WRITE = args.includes("--write");

/* ── 1 · build the document the same way the app does ─────────────── */
const boot = new JSDOM("<!doctype html><html><body></body></html>", { pretendToBeVisual: true, runScripts: "outside-only" });
const stage = boot.window;
stage.HTMLCanvasElement.prototype.getContext = function (k) {
  if (!this.__cv) this.__cv = createCanvas(this.width || 300, this.height || 150);
  return this.__cv.getContext(k || "2d");
};
stage.Image = NImage;
stage.Path2D = Path2D;
stage.eval(L("engine-core.js"));
stage.eval(L("logo.js"));
stage.eval(L("engine-draw.js"));
stage.eval(L("engine-schema.js"));
stage.eval(L("music.js"));
stage.eval(L("scene-timberlane.js"));
stage.eval(L("html-shell.js"));

/* fonts: real bytes from the packages, base64 — what the app produces from ?url */
const FACES = [
  ["Anton", "normal", "400", "node_modules/@fontsource/anton/files/anton-latin-400-normal.woff2"],
  ["Archivo", "normal", "100 900", "node_modules/@fontsource-variable/archivo/files/archivo-latin-wght-normal.woff2"],
  ["Archivo", "italic", "100 900", "node_modules/@fontsource-variable/archivo/files/archivo-latin-wght-italic.woff2"],
  ["JetBrains Mono", "normal", "100 800", "node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2"],
  ["JetBrains Mono", "italic", "100 800", "node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-italic.woff2"],
  ["Playfair Display", "normal", "400 900", "node_modules/@fontsource-variable/playfair-display/files/playfair-display-latin-wght-normal.woff2"],
  ["Playfair Display", "italic", "400 900", "node_modules/@fontsource-variable/playfair-display/files/playfair-display-latin-wght-italic.woff2"],
];
const fontCSS = FACES.map(([fam, style, weight, rel]) => {
  const b64 = fs.readFileSync(path.join(ROOT, rel)).toString("base64");
  return `@font-face{font-family:"${fam}";font-style:${style};font-weight:${weight};font-display:block;src:url("data:font/woff2;base64,${b64}") format("woff2");}`;
}).join("\n");

const scene = stage.eval("JSON.parse(JSON.stringify(TLM.SCENES.timberlane))");
const parts = ENG.map((f) => ["tl-" + f.replace(/\.js$/, "").replace("engine-", "engine-"), L(f)]);
const html = stage.TLM.buildShell({ scene, parts, fontCSS });

const problems = [];
const ok = (name, cond, extra) => {
  console.log((cond ? "  ✓ " : "  ✗ ") + name + (extra ? " · " + extra : ""));
  if (!cond) problems.push(name + (extra ? " — " + extra : ""));
  return cond;
};

console.log("\nstandalone export test");
const KB = (n) => (n / 1024).toFixed(0) + " KB";
ok("document built", html.length > 100000, KB(html.length));
ok("no external stylesheet or script", !/<link[^>]+href/.test(html) && !/<script[^>]+src=/.test(html));
ok("all 7 engine blocks embedded", (html.match(/<script id="tl-/g) || []).length === 7);
ok("7 @font-face rules inlined as base64", (html.match(/@font-face/g) || []).length === 7 && (html.match(/data:font\/woff2;base64/g) || []).length === 7);
ok("scene JSON is embedded once", (html.match(/id="tl-scene"/g) || []).length === 1);
ok("no unescaped </script> inside JSON or engine", (html.match(/<\/script>/g) || []).length === 9); /* 7 engine + scene + player */

/* ── 2 · run it ──────────────────────────────────────────────────── */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const dom = new JSDOM(html, {
  pretendToBeVisual: true,
  runScripts: "dangerously",
  /* patch the canvas *before* the document's own scripts run — jsdom has no
     2D context of its own, so every <canvas> gets a real skia-backed one */
  beforeParse(win) {
    win.HTMLCanvasElement.prototype.getContext = function (k) {
      if (!this.__cv) this.__cv = createCanvas(Math.max(8, this.width | 0), Math.max(8, this.height | 0));
      if (this.__cv.width !== (this.width | 0) || this.__cv.height !== (this.height | 0)) {
        this.__cv.width = Math.max(8, this.width | 0);
        this.__cv.height = Math.max(8, this.height | 0);
      }
      return this.__cv.getContext(k || "2d");
    };
    win.HTMLCanvasElement.prototype.toBlob = function (cb) {
      cb(new win.Blob([this.__cv.toBuffer("image/png")], { type: "image/png" }));
    };
    win.Image = NImage;
    win.Path2D = Path2D;
    win.Element.prototype.getBoundingClientRect = function () {
      const isStage = /tle-stage/.test(this.className || "");
      const ww = isStage ? 700 : 1080,
        hh = isStage ? 700 : 1920;
      return { x: 0, y: 0, left: 0, top: 0, right: ww, bottom: hh, width: ww, height: hh, toJSON() {} };
    };
    /* no audio hardware and no gesture here: the player's try/catch is the
       same path a browser takes when AudioContext is unavailable */
    Object.defineProperty(win, "AudioContext", { value: undefined, configurable: true });
    Object.defineProperty(win, "webkitAudioContext", { value: undefined, configurable: true });
    win.ResizeObserver = undefined;
    win.__errs = [];
    win.addEventListener("error", (e) => win.__errs.push(e.message));
  },
});
const w = dom.window;

const q = (sel) => w.document.querySelector(sel);
const qa = (sel) => [...w.document.querySelectorAll(sel)];
ok("TLM is global", !!w.TLM && !!w.TLM.render);
ok("scene parsed from the JSON block", (() => {
  const S = JSON.parse(q("#tl-scene").textContent);
  return S.layers.length === scene.layers.length && S.meta.width === scene.meta.width;
})(), scene.layers.length + " layers");
ok("player mounted", !!q(".tlp") && !!q(".tlp canvas"));
ok("canvas sized to the viewport", (() => {
  const cv = q(".tlp canvas");
  return cv.width > 0 && cv.height > 0 && cv.width / cv.height > 0.5 && cv.width / cv.height < 0.7;
})(), (() => { const c = q(".tlp canvas"); return c.width + "×" + c.height; })());
ok("transport bar has play / sound / edit", !!q(".tlp-bar button") && qa(".tlp-bar button").length === 3);
ok("timecode reads 00:00:00 at frame 0", /00:00:00/.test(q(".tlp-bar span").textContent), q(".tlp-bar span").textContent.trim());

/* play for ~350 ms */
const buttons = qa(".tlp-bar button");
buttons[0].dispatchEvent(new w.Event("click", { bubbles: true }));
await wait(360);
const tcAfter = q(".tlp-bar span").textContent;
buttons[0].dispatchEvent(new w.Event("click", { bubbles: true })); /* pause: no need to keep painting */
ok("▶ advances the clock", !/^00:00:00/.test(tcAfter), tcAfter.slice(0, 8));
ok("progress bar moved", parseFloat(q(".tlp-prog").style.width || "0") > 0, q(".tlp-prog").style.width);

/* E → editor */
w.dispatchEvent(new w.KeyboardEvent("keydown", { key: "e", bubbles: true }));
await wait(120);
ok("E opens the layer editor", !!q(".tle"), q("#tl-root").className);
ok("editor shows every layer", qa(".tle-ly").length === scene.layers.length, qa(".tle-ly").length + " rows");
ok("every layer has a typed row in the list", qa(".tle-ly i").length === scene.layers.length, qa(".tle-ly i").length + " type labels");
ok("inspector is showing the selected layer", qa(".tle-f").length > 6, qa(".tle-f").length + " fields");

/* the exported editor must be able to re-export: check its fallback exists */
ok("re-download path present in the embedded editor", /outerHTML/.test(L("editor.js")));

/* Esc → back to player */
w.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
await wait(80);
ok("Esc returns to the player", !!q(".tlp") && q(".tle").style.display === "none");

ok("no runtime errors while driving it", w.__errs.length === 0, w.__errs.slice(0, 3).join(" | "));

if (WRITE) {
  const out = path.join(ROOT, "render-out");
  fs.mkdirSync(out, { recursive: true });
  const file = path.join(out, "timberlane-layers.html");
  fs.writeFileSync(file, html);
  console.log("\nwrote " + path.relative(ROOT, file) + " · " + KB(html.length));
}

console.log(problems.length ? "\n" + problems.length + " PROBLEM(S):\n" + problems.map((p) => " · " + p).join("\n") : "\nall clean ✓");
process.exitCode = problems.length ? 1 : 0;
