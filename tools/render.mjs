/* ------------------------------------------------------------------
   render.mjs — export all seven Timberlane pieces as MP4 masters.

   The pieces are real-time React compositions driven purely by a time
   value `t`, so they can be rendered offline and frame-accurately:

     1. build the app + the render harness (npm run build:all)
     2. serve dist/ locally
     3. drive a headless Chromium: set t = i / fps, capture, repeat
     4. PNG frames are piped straight into ffmpeg (libx264 + yuv420p)
     5. each score is rendered offline through an OfflineAudioContext in
        the same page and muxed in as AAC — no realtime audio drift

   usage
     node tools/render.mjs                     # all 7 pieces
     node tools/render.mjs --only 01 05        # selected pieces
     node tools/render.mjs --fps-scale 0.5     # quick draft (half frames)
     node tools/render.mjs --no-audio          # picture only
     node tools/render.mjs --out /path/to/dir  # where the MP4s land
     node tools/render.mjs --preset fast --crf 20

   Plates live on the Pexels CDN. Where that is unreachable (offline CI,
   sandboxed render box) any local stand-in at
   tools/plates/<pexels-photo-id>.jpg is served in its place, so the
   render never depends on the network. Drop the real photos in under
   those names and re-run for identical frames with original plates.
   ------------------------------------------------------------------ */
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { createServer } from "./serve.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");
const TOOLS = process.env.TOOLS_DIR || "/home/user/tools";
const PLATES = path.join(__dirname, "plates");
const PORT = Number(process.env.PORT || 4321);

/* ---- locate the two external binaries (override with env) ---------- */
const which = (cmd) => {
  try {
    return execFileSync("which", [cmd], { encoding: "utf8" }).trim().split("\n")[0] || null;
  } catch {
    return null;
  }
};
const firstExisting = (list) => list.find((p) => p && fs.existsSync(p)) ?? null;

const CHROME =
  process.env.CHROME_PATH ||
  firstExisting([
    path.join(TOOLS, "chromium/headless_shell"),
    which("google-chrome"),
    which("chromium"),
    which("chromium-browser"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    // puppeteer-managed browsers in ~/.cache/puppeteer
    ...["chrome", "chrome-headless-shell"].flatMap((kind) => {
      const root = path.join(os.homedir(), ".cache/puppeteer", kind);
      if (!fs.existsSync(root)) return [];
      return fs.readdirSync(root).flatMap((v) =>
        [
          path.join(root, v, "chrome-linux64", kind === "chrome" ? "chrome" : "chrome-headless-shell"),
          path.join(root, v, "chrome-linux", kind),
          path.join(root, v, "chrome-mac-x64", kind === "chrome" ? "Google Chrome for Testing" : kind),
          path.join(root, v, "chrome-win64", `${kind}.exe`),
        ].filter(Boolean),
      );
    }),
  ]);

const FFMPEG =
  process.env.FFMPEG_PATH ||
  firstExisting([
    which("ffmpeg"),
    path.join(TOOLS, "node_modules/@ffmpeg-installer/linux-x64/ffmpeg"),
    path.join(REPO, "node_modules/@ffmpeg-installer/linux-x64/ffmpeg"),
    path.join(REPO, "node_modules/ffmpeg-static/ffmpeg"),
  ]);

/* ------------------------------------------------------------------ */
/*  the eight masters                                                  */
/* ------------------------------------------------------------------ */
const PIECES = [
  { id: "01", slug: "vertical-ember", w: 1080, h: 1920, fps: 30, duration: 20, title: "PRECISION IN EVERY FRAME" },
  { id: "02", slug: "cinematic-scope", w: 1920, h: 810, fps: 24, duration: 30, title: "AMBER SCOPE" },
  { id: "03", slug: "square-pop", w: 1080, h: 1080, fps: 30, duration: 15, title: "STICKER POP" },
  { id: "04", slug: "blueprint-draft", w: 1080, h: 1920, fps: 30, duration: 20, title: "BLUEPRINT TO RENDER" },
  { id: "05", slug: "dossier-case", w: 1080, h: 1920, fps: 30, duration: 20, title: "CASE DOSSIER" },
  { id: "06", slug: "ramesh-story", w: 1080, h: 1920, fps: 30, duration: 24, title: "RAMESH · KEYS TO HOME" },
  { id: "07", slug: "material-ad", w: 1080, h: 1920, fps: 30, duration: 20, title: "MATERIAL TRUTH" },
  { id: "08", slug: "timberlane-layers", w: 1080, h: 1920, fps: 30, duration: 30, title: "TIMBERLANE · LAYERS STUDIO" },
];

/* ------------------------------------------------------------------ */
/*  cli                                                                */
/* ------------------------------------------------------------------ */
const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 || argv[i + 1]?.startsWith("--") ? dflt : argv[i + 1];
};
const onlyIdx = argv.indexOf("--only");
const only = onlyIdx === -1 ? null : argv.slice(onlyIdx + 1).filter((a) => !a.startsWith("--"));
const fpsScale = Number(flag("fps-scale", 1));
const withAudio = !argv.includes("--no-audio");
const crf = String(flag("crf", 17));
const preset = String(flag("preset", "medium"));
const OUT = path.resolve(flag("out", path.join(REPO, "render-out")));
const pieces = only ? PIECES.filter((p) => only.includes(p.id) || only.includes(p.slug)) : PIECES;

if (!pieces.length) {
  console.error("no pieces matched --only");
  process.exit(1);
}
if (!CHROME) {
  console.error(
    "No Chrome/Chromium found. Install one (npx puppeteer browsers install chrome-headless-shell)\n" +
      "or point CHROME_PATH at the executable.",
  );
  process.exit(1);
}
if (!FFMPEG) {
  console.error("No ffmpeg found. Install it (brew/apt install ffmpeg, or npm i @ffmpeg-installer/ffmpeg)\nor point FFMPEG_PATH at the binary.");
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

/* ------------------------------------------------------------------ */
/*  plate overrides                                                    */
/* ------------------------------------------------------------------ */
const plateFor = (url) => {
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const m = u.pathname.match(/\/photos\/(\d+)\//) || u.pathname.match(/\/video-files\/(\d+)\//);
  if (!m) return null;
  // video URLs must only ever match a video override — a same-id .jpg would
  // otherwise be served as "video/mp4"-shaped JPEG bytes and error the element
  const exts = /\/video-files\//.test(u.pathname) ? [".mp4"] : [".jpg", ".jpeg", ".png", ".webp"];
  for (const ext of exts) {
    const f = path.join(PLATES, m[1] + ext);
    if (fs.existsSync(f)) return f;
  }
  return null;
};

/* ------------------------------------------------------------------ */
/*  ffmpeg                                                             */
/* ------------------------------------------------------------------ */
function ffmpeg(args, { input } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", ...args], {
      stdio: [input ? "pipe" : "ignore", "ignore", "pipe"],
    });
    let err = "";
    let alive = true;
    let settled = false;
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => {
      alive = false;
      if (settled) return;
      settled = true;
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${err.slice(0, 900)}`));
    });
    p.on("error", (e) => {
      alive = false;
      if (!settled) (settled = true), reject(e);
    });
    if (input) {
      p.stdin.on("error", () => {}); // EPIPE once ffmpeg exits
      (async () => {
        try {
          for await (const chunk of input) {
            if (!alive) break;
            if (!p.stdin.write(chunk)) await new Promise((r) => p.stdin.once("drain", r));
          }
          if (alive) p.stdin.end();
        } catch (e) {
          if (!settled) (settled = true), reject(e);
        }
      })();
    }
  });
}

/* ------------------------------------------------------------------ */
/*  audio: offline-render a piece's score to WAV                       */
/* ------------------------------------------------------------------ */
async function renderAudio(page, piece, tmpDir) {
  const wavPath = path.join(tmpDir, `score-${piece.id}.wav`);
  const t0 = Date.now();
  const b64 = await page.evaluate(async (id) => {
    const bytes = await window.__renderAudio(id);
    let s = "";
    const CH = 0x8000;
    for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(s);
  }, piece.id);
  const buf = Buffer.from(b64, "base64");
  fs.writeFileSync(wavPath, buf);
  log(`  ♪ score ${piece.id} · ${(buf.length / 1e6).toFixed(2)} MB wav · ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  return wavPath;
}

/* ------------------------------------------------------------------ */
/*  main                                                               */
/* ------------------------------------------------------------------ */
const server = await createServer(path.join(REPO, "dist"), PORT);
const BASE = `http://127.0.0.1:${PORT}`;
log(`serving dist on :${PORT}`);

// Portable browser bundles (e.g. @sparticuz/chromium) ship the shared libs
// Chromium needs in a `lib/` folder next to the executable — put it on the
// loader path if it's there.
const chromeLib = path.join(path.dirname(CHROME), "lib");
const env = { ...process.env };
if (fs.existsSync(chromeLib)) {
  env.LD_LIBRARY_PATH = env.LD_LIBRARY_PATH ? `${chromeLib}:${env.LD_LIBRARY_PATH}` : chromeLib;
}
log(`chrome: ${CHROME}`);
log(`ffmpeg: ${FFMPEG}`);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "shell",
  pipe: true,
  protocolTimeout: 900_000,
  env,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--force-color-profile=srgb",
    "--disable-lcd-text",
    "--font-render-hinting=none",
    "--hide-scrollbars",
    "--mute-audio",
    "--autoplay-policy=no-user-gesture-required",
    "--disable-frame-rate-limit",
    "--disable-gpu-vsync",
    "--disable-features=AudioServiceOutOfProcess,IsolateOrigins,site-per-process,TranslateUI",
  ],
});

const summary = [];
try {
  for (const piece of pieces) {
    const t0 = Date.now();
    const frames = Math.round(piece.duration * piece.fps * fpsScale);
    const fps = piece.fps * fpsScale;
    const out = path.join(OUT, `${piece.id}-${piece.slug}.mp4`);
    const tmpDir = path.join(OUT, ".tmp", piece.id);
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.mkdirSync(tmpDir, { recursive: true });

    log(`▶ ${piece.id} · ${piece.title} · ${piece.w}×${piece.h} @ ${fps}fps · ${frames} frames`);

    const page = await browser.newPage();
    page.on("pageerror", (e) => log(`  ! pageerror: ${String(e).slice(0, 200)}`));
    page.on("console", (m) => m.type() === "error" && log(`  ! console: ${m.text().slice(0, 160)}`));
    await page.setViewport({ width: piece.w, height: piece.h, deviceScaleFactor: 1 });

    // serve local plate stand-ins in place of the (possibly offline) Pexels CDN
    const intercept = { hit: 0, blocked: 0 };
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const url = req.url();
      if (/pexels\.com/.test(url)) {
        const local = plateFor(url);
        if (local) {
          intercept.hit++;
          req
            .respond({
              status: 200,
              contentType: /\.mp4$/.test(local) ? "video/mp4" : "image/jpeg",
              body: fs.readFileSync(local),
            })
            .catch(() => {});
          return;
        }
        intercept.blocked++;
        req.abort().catch(() => {});
        return;
      }
      req.continue().catch(() => {});
    });

    await page.goto(`${BASE}/render.html?piece=${piece.id}&t=0`, { waitUntil: "load", timeout: 180_000 });
    await page.evaluateHandle("document.fonts.ready");
    const pre = await page.evaluate(() => window.__preload());
    const meta = await page.evaluate(() => window.__meta());
    log(
      `  meta ${meta.w}×${meta.h} ${meta.fps}fps ${meta.frames}f · plates ${pre.ok}/${pre.total} ok` +
        ` (${intercept.hit} local override${intercept.hit === 1 ? "" : "s"}, ${intercept.blocked} blocked)`,
    );
    if (pre.failed.length) {
      const ids = pre.failed.map((u) => (u.match(/(?:photos|video-files)\/(\d+)/) || [, u])[1]);
      log(`  · missing plates → tools/plates/{${[...new Set(ids)].join(",")}}.jpg`);
    }

    const cdp = await page.createCDPSession();
    async function* frameStream() {
      for (let i = 0; i < frames; i++) {
        const t = i / fps;
        await page.evaluate((nt) => window.__setTime(nt), t);
        const shot = await cdp.send("Page.captureScreenshot", {
          format: "png",
          optimizeForSpeed: true,
          captureBeyondViewport: false,
          clip: { x: 0, y: 0, width: piece.w, height: piece.h, scale: 1 },
        });
        yield Buffer.from(shot.data, "base64");
        if (i % 60 === 0 || i === frames - 1) {
          const el = (Date.now() - t0) / 1000;
          const rate = (i + 1) / el;
          log(`  frame ${String(i + 1).padStart(4)}/${frames} · t=${t.toFixed(3)}s · ${rate.toFixed(2)} fps · eta ${((frames - i - 1) / rate).toFixed(0)}s`);
        }
      }
    }

    const audioPath = withAudio ? await renderAudio(page, piece, tmpDir) : null;

    const args = ["-f", "image2pipe", "-vcodec", "png", "-framerate", String(fps), "-i", "-"];
    if (audioPath) {
      args.push("-i", audioPath, "-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2");
    }
    args.push(
      "-c:v", "libx264", "-preset", preset, "-crf", crf, "-pix_fmt", "yuv420p",
      "-profile:v", "high", "-movflags", "+faststart",
      "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
      "-metadata", `title=TIMBERLANE ${piece.id} · ${piece.title}`,
      "-metadata", "artist=Timberlane Interiors",
      "-shortest", out,
    );

    log("  encoding…");
    await ffmpeg(args, { input: frameStream() });
    await page.close();

    const size = fs.statSync(out).size;
    const secs = (Date.now() - t0) / 1000;
    summary.push({ id: piece.id, out, size, secs, frames, fps, w: piece.w, h: piece.h, audio: !!audioPath });
    log(`  ✓ ${piece.id} → ${path.basename(out)} · ${(size / 1e6).toFixed(1)} MB · ${secs.toFixed(0)}s wall`);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
} finally {
  await browser.close();
  server.close();
}

console.log("\n──────────────────────────────────────────────────────────");
for (const s of summary) {
  console.log(
    `${s.id}  ${path.basename(s.out).padEnd(28)} ${s.w}×${s.h}  ${String(s.frames).padStart(4)}f @ ${s.fps}fps  ` +
      `${(s.size / 1e6).toFixed(1).padStart(6)} MB  ${s.audio ? "h264+aac" : "h264"}  ${s.secs.toFixed(0)}s`,
  );
}
console.log(`\n${summary.length} master(s) written to ${OUT}`);
