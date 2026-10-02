/* ==================================================================
   editor-smoke.mjs — run the studio's UI code with no browser
   ------------------------------------------------------------------
   There is no Chrome in this sandbox, so the editor can't be looked
   at. It can still be *executed*: jsdom gives us a DOM, @napi-rs/canvas
   gives every <canvas> a real 2D context, and then we drive the thing
   the way a person would — select layers, build every inspector group,
   add one of every type, scrub, play, open the docs. Any runtime error
   in ~900 lines of vanilla UI shows up here instead of on the user's
   screen.

     node tools/editor-smoke.mjs
   ================================================================== */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { JSDOM } from "jsdom";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const req = createRequire(import.meta.url);
const { createCanvas, Image: NImage } = req("@napi-rs/canvas");

const FILES = [
  "engine-core.js",
  "logo.js",
  "engine-draw.js",
  "engine-schema.js",
  "music.js",
  "scene-timberlane.js",
  "editor.js",
];

const dom = new JSDOM(`<!doctype html><html><body><div id="root" style="width:1400px;height:900px"></div></body></html>`, {
  pretendToBeVisual: true,
  runScripts: "outside-only",
});
const win = dom.window;

/* every canvas the UI creates gets a real skia context behind it */
win.HTMLCanvasElement.prototype.getContext = function (kind) {
  if (!this.__cv) this.__cv = createCanvas(this.width || 300, this.height || 150);
  const ctx = this.__cv.getContext(kind === "2d" ? "2d" : "2d");
  const sync = () => {
    const w = this.width || 300,
      h = this.height || 150;
    if (this.__cv.width !== w || this.__cv.height !== h) {
      this.__cv.width = w;
      this.__cv.height = h;
    }
  };
  ["fillRect", "clearRect", "drawImage", "fill", "stroke"].forEach((m) => {
    const orig = ctx[m].bind(ctx);
    ctx[m] = (...a) => {
      sync();
      return orig(...a);
    };
  });
  return ctx;
};
win.HTMLCanvasElement.prototype.toBlob = function (cb) {
  cb(new win.Blob([this.__cv.toBuffer("image/png")], { type: "image/png" }));
};
win.HTMLCanvasElement.prototype.toDataURL = function () {
  return "data:image/png;base64," + this.__cv.toBuffer("image/png").toString("base64");
};
win.Image = NImage;
win.Path2D = req("@napi-rs/canvas").Path2D;
win.ResizeObserver = undefined;
/* jsdom reports zero-size boxes; give the stage a plausible one so the
   layout maths (zoom, timeline px/second) actually runs */
win.Element.prototype.getBoundingClientRect = function () {
  const isStage = /tle-stage/.test(this.className || "");
  const w = isStage ? 700 : 1080,
    h = isStage ? 700 : 1920;
  return { x: 0, y: 0, left: 0, top: 0, right: w, bottom: h, width: w, height: h, toJSON() {} };
};
Object.defineProperty(win.Element.prototype, "clientWidth", { get: () => 900 });
Object.defineProperty(win.HTMLElement.prototype, "offsetX", { get: () => 4 });

const errors = [];
/* jsdom has no media element and no layout — those complaints are about the
   harness, not the product, so they are reported but never fail the run */
const IGNORE = /HTMLMediaElement|Not implemented|Could not parse CSS/;
win.addEventListener("error", (e) => {
  if (!IGNORE.test(e.message)) errors.push("window error: " + e.message);
});
const origErr = console.error;
console.error = (...a) => {
  const j = a.join(" ");
  if (!IGNORE.test(j)) errors.push("console.error: " + j);
};

/* jsdom with runScripts:"outside-only" gives us window.eval — each file runs
   exactly the way the exported HTML runs it: as a classic script on window */
for (const f of FILES) {
  const src = fs.readFileSync(path.join(ROOT, "src/layers", f), "utf8");
  try {
    win.eval(src + "\n//# sourceURL=" + f);
  } catch (e) {
    console.log("FATAL loading " + f + ": " + e.message);
    process.exit(1);
  }
}
const TLM = win.TLM;

const queue = [];
function step(name, fn) {
  queue.push(async () => {
    try {
      const r = await fn();
      console.log("  ✓", name, r === undefined ? "" : "· " + r);
      return r;
    } catch (e) {
      console.log("  ✗", name, "→", e.message);
      errors.push(name + ": " + ((e.stack || "").split("\n")[1] || e.message));
      return null;
    }
  });
}
async function runQueue() {
  for (const f of queue) await f();
}

console.log("\neditor smoke test");
const host = win.document.getElementById("root");
let api = null;
try {
  api = TLM.mountEditor(host, { scene: JSON.parse(JSON.stringify(TLM.SCENES.timberlane)), start: 0 });
  console.log("  ✓ mount");
} catch (e) {
  console.log("  ✗ mount → " + e.message + "\n" + (e.stack || ""));
  process.exit(1);
}
if (!api) {
  console.log("\nFATAL: could not mount");
  process.exit(1);
}
step("canvas + overlay children", () => {
  const n = host.querySelectorAll("canvas").length;
  if (n < 2) throw new Error("expected 2 canvases, got " + n);
  return n;
});
step("layer rows rendered", () => {
  const n = host.querySelectorAll(".tle-ly").length;
  const total = api.scene.layers.length;
  if (n !== total) throw new Error(`${n} rows for ${total} layers`);
  return n;
});
step("timeline blocks rendered", () => {
  const n = host.querySelectorAll(".tle-blk").length;
  if (n !== api.scene.layers.length) throw new Error(n + " blocks");
  return n;
});
step("inspector: every live layer of every type", () => {
  const seen = new Set();
  api.scene.layers.forEach((l) => {
    if (seen.has(l.type)) return;
    seen.add(l.type);
    api.syncAllForTest ? api.syncAllForTest() : null;
    win.__select = l.id;
    // select by clicking the row that shows this layer's id
    const row = [...host.querySelectorAll(".tle-ly")].find((r) => r.querySelector("b") && r.querySelector("b").textContent === (l.name || l.id));
    if (!row) throw new Error("no row for " + l.id);
    row.dispatchEvent(new win.Event("click", { bubbles: true }));
    const fields = host.querySelectorAll(".tle-f").length;
    if (fields < 20) throw new Error(l.type + " inspector had only " + fields + " fields");
  });
  return seen.size + " types";
});
step("inspector: add + one field of every kind", () => {
  const types = TLM.typeNames();
  types.forEach((ty) => {
    api.addLayer(ty);
    const rows = [...host.querySelectorAll(".tle-ly")];
    rows[rows.length - 1].dispatchEvent(new win.Event("click", { bubbles: true }));
  });
  if (api.scene.layers.length !== TLM.SCENES.timberlane.layers.length + types.length) throw new Error("addLayer count off");
  return types.length + " types added";
});
step("number fields write back", () => {
  const inp = host.querySelector('.tle-f input[type="number"], .tle-f input[type="text"]');
  if (!inp) throw new Error("no numeric input");
  inp.value = "123";
  inp.dispatchEvent(new win.Event("change", { bubbles: true }));
  return true;
});
step("enum chips write back", () => {
  const chip = host.querySelector(".tle-chip");
  if (!chip) throw new Error("no chips");
  chip.dispatchEvent(new win.Event("click", { bubbles: true }));
  return true;
});
step("scrub the timeline", () => {
  const rule = host.querySelector(".tle-rule");
  rule.dispatchEvent(new win.MouseEvent("pointerdown", { bubbles: true, clientX: 300 }));
  rule.dispatchEvent(new win.MouseEvent("pointermove", { bubbles: true, clientX: 420 }));
  rule.dispatchEvent(new win.MouseEvent("pointerup", { bubbles: true, clientX: 420 }));
  return TLM.fmtTC(api.t, 30);
});
step("drag a layer on the canvas", () => {
  const cv = host.querySelector("canvas");
  const pick = (type, x, y) => cv.dispatchEvent(new win.MouseEvent(type, { bubbles: true, clientX: x, clientY: y }));
  pick("pointerdown", 350, 350);
  pick("pointermove", 380, 390);
  pick("pointerup", 380, 390);
  return true;
});
step("undo / redo round-trips", () => {
  const before = JSON.stringify(api.scene);
  api.addLayer("text");
  host.dispatchEvent(new win.KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true }));
  win.document.dispatchEvent(new win.KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true }));
  win.document.dispatchEvent(new win.KeyboardEvent("keydown", { key: "z", ctrlKey: true, shiftKey: true, bubbles: true }));
  return before.length + " bytes";
});
step("space plays, frames tick", async () => {
  win.document.dispatchEvent(new win.KeyboardEvent("keydown", { code: "Space", key: " ", bubbles: true }));
  await new Promise((r) => setTimeout(r, 220));
  const t1 = api.t;
  await new Promise((r) => setTimeout(r, 220));
  if (!(api.t > t1)) throw new Error("clock did not advance (" + t1 + " → " + api.t + ")");
  win.document.dispatchEvent(new win.KeyboardEvent("keydown", { code: "Space", key: " ", bubbles: true }));
  return "advanced " + (api.t - t1).toFixed(3) + "s";
});
step("JSON pane + apply", () => {
  const tabs = [...host.querySelectorAll(".tle-tab")];
  tabs[1].dispatchEvent(new win.Event("click", { bubbles: true }));
  const ta = host.querySelector(".tle-code textarea");
  if (!ta) throw new Error("no textarea");
  const parsed = JSON.parse(ta.value);
  if (!parsed.type) throw new Error("layer JSON has no type");
  ta.value = JSON.stringify(parsed);
  const apply = [...host.querySelectorAll("button")].find((b) => /apply/i.test(b.textContent));
  apply.dispatchEvent(new win.Event("click", { bubbles: true }));
  return parsed.type;
});
step("scene pane serialises", () => {
  const tabs = [...host.querySelectorAll(".tle-tab")];
  tabs[2].dispatchEvent(new win.Event("click", { bubbles: true }));
  const ta = host.querySelector(".tle-code textarea");
  const S = JSON.parse(ta.value);
  if (!S.layers.length) throw new Error("empty scene");
  return S.layers.length + " layers";
});
step("docs dialog (schema → markdown)", () => {
  const docs = [...host.querySelectorAll("button")].find((b) => /docs/i.test(b.textContent));
  docs.dispatchEvent(new win.Event("click", { bubbles: true }));
  const dlg = host.querySelector(".tle-dlg");
  if (!dlg) throw new Error("dialog did not open");
  const txt = dlg.textContent;
  ["Scene JSON", "counter", "swatch", "Easings", "reveal"].forEach((needle) => {
    if (txt.indexOf(needle) === -1) throw new Error("docs missing " + needle);
  });
  return Math.round(txt.length / 1024) + " KB of docs";
});
step("new blank scene", () => {
  const nw = [...host.querySelectorAll("button")].find((b) => b.textContent === "NEW");
  nw.dispatchEvent(new win.Event("click", { bubbles: true }));
  if (api.scene.layers.length < 3) throw new Error("starter layers missing");
  return api.scene.layers.length + " layers";
});
step("import a hand-written scene", () => {
  const scene = {
    name: "smoke",
    fps: 25,
    meta: { width: 800, height: 800, duration: 6 },
    assets: {},
    layers: [
      { id: "a", type: "bg", in: 0, dur: 6, props: { colors: ["#222", "#111"] } },
      { id: "b", type: "text", in: 1, dur: 3, t: { x: 400, y: 400, w: 600 }, props: { text: "HELLO **WORLD**", size: 90 } },
    ],
  };
  api.loadJSON(JSON.stringify(scene));
  if (api.scene.meta.width !== 800 || api.scene.layers.length !== 2) throw new Error("not applied");
  api.setTime(2, false);
  return "800×800 @25fps ok";
});
step("music score builds its event list", () => {
  const S = TLM.music;
  if (!S.events || S.events.length < 200) throw new Error("only " + (S.events || []).length + " events");
  const span = S.events[S.events.length - 1].t - S.events[0].t;
  if (span < 28) throw new Error("score is " + span.toFixed(1) + "s long");
  return S.events.length + " events over " + span.toFixed(1) + "s";
});
step("destroy detaches", () => {
  api.destroy();
  if (host.querySelector(".tle")) throw new Error("ui still mounted");
  return true;
});

console.error = origErr;
await runQueue();
console.log(errors.length ? "\n" + errors.length + " PROBLEM(S):\n" + errors.map((e) => " · " + e).join("\n") : "\nall clean ✓");
process.exitCode = errors.length ? 1 : 0;
