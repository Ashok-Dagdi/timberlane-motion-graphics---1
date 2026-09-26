/* stills.mjs — grab single verification stills: node tools/stills.mjs 01:7 02:6.5 06:16.5 */
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { createServer } from "./serve.mjs";

const TOOLS = process.env.TOOLS_DIR || "/home/user/tools";
const specs = process.argv.slice(2);
if (!specs.length) {
  console.error("usage: node tools/stills.mjs 01:7 02:6.5 …");
  process.exit(1);
}
const server = await createServer(path.resolve(import.meta.dirname, "../dist"), Number(process.env.PORT || 4326));
const browser = await puppeteer.launch({
  executablePath: path.join(TOOLS, "chromium/headless_shell"),
  headless: "shell",
  pipe: true,
  env: { ...process.env, LD_LIBRARY_PATH: path.join(TOOLS, "chromium/lib") },
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--force-color-profile=srgb", "--font-render-hinting=none", "--hide-scrollbars", "--mute-audio", "--disable-frame-rate-limit"],
});
const outDir = process.env.STILLS_DIR || "/tmp/probe";
fs.mkdirSync(outDir, { recursive: true });
for (const spec of specs) {
  const [id, t] = spec.split(":");
  const page = await browser.newPage();
  const meta = { "01": [1080, 1920], "02": [1920, 810], "03": [1080, 1080], "04": [1080, 1920], "05": [1080, 1920], "06": [1080, 1920], "07": [1080, 1920] }[id];
  await page.setViewport({ width: meta[0], height: meta[1], deviceScaleFactor: 1 });
  await page.setRequestInterception(true);
  page.on("request", (r) => {
    const url = r.url();
    if (/pexels\.com/.test(url)) {
      const m = url.match(/(?:photos|video-files)\/(\d+)\//);
      const base = path.join(import.meta.dirname, "plates", m ? m[1] : "");
      const exts = /video-files\//.test(url) ? [".mp4"] : [".jpg", ".jpeg", ".png"];
      const local = exts.map((e) => base + e).find((f) => fs.existsSync(f));
      if (local) {
        r.respond({ status: 200, contentType: local.endsWith(".mp4") ? "video/mp4" : "image/jpeg", body: fs.readFileSync(local) }).catch(() => {});
        return;
      }
      r.abort().catch(() => {});
      return;
    }
    r.continue().catch(() => {});
  });
  await page.goto(`http://127.0.0.1:4326/render.html?piece=${id}&t=${t}`, { waitUntil: "load" });
  await page.evaluateHandle("document.fonts.ready");
  await page.evaluate(() => window.__preload());
  await page.evaluate((nt) => window.__setTime(Number(nt)), t);
  await new Promise((r) => setTimeout(r, 300));
  const file = path.join(outDir, `still_${id}_${String(t).replace(".", "_")}.png`);
  await page.screenshot({ type: "png", path: file });
  console.log("wrote", file);
  await page.close();
}
await browser.close();
server.close();
