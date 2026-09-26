import { chromium } from "playwright";
const b = await chromium.launch();
const errors = [];
const p = await b.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 1 });
p.on("pageerror", (e) => errors.push(String(e).slice(0, 180)));
const times = [1.4, 4.4, 7.4, 10.4, 13.6, 16.4, 19.4, 22.4];
for (const t of times) {
  await p.goto(`http://localhost:4173/?story=${t}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(900);
  await p.screenshot({ path: `shots/story${String(t).replace(".", "_")}.png` });
  console.log("ok", t);
}
console.log("ERRORS", errors.length ? errors.join(" | ") : "none");
await b.close();
