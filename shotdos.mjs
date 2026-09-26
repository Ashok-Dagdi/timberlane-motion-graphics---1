import { chromium } from "playwright";
const b = await chromium.launch();
const errors = [];
const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 0.5 });
p.on("pageerror", (e) => errors.push("PAGEERROR: " + String(e).slice(0, 200)));
p.on("console", (m) => { if (m.type() === "error") errors.push("CONSOLE: " + m.text().slice(0, 200)); });
const times = [1.2, 3.4, 5.8, 8.0, 10.4, 12.8, 14.9, 17.8];
for (const t of times) {
  await p.goto(`http://localhost:4173/?doss=${t}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(1100);
  await p.screenshot({ path: `shots/doss${String(t).replace(".", "_")}.png` });
  console.log("captured", t);
}
// full app: switch to 05
await p.setViewportSize({ width: 1600, height: 1100 });
await p.goto("http://localhost:4173/", { waitUntil: "networkidle" });
await p.waitForTimeout(1800);
await p.getByRole("button", { name: /05 · DOSSIER/ }).click();
await p.waitForTimeout(1400);
await p.screenshot({ path: "shots/page_doss.png", fullPage: true });
console.log("captured page_doss");
console.log("ERRORS:", errors.length ? errors.join("\n") : "none");
await b.close();
