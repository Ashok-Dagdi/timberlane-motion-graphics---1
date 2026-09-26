import { chromium } from "playwright";
const b = await chromium.launch();
const errors = [];
const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 0.5 });
p.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
p.on("console", (m) => { if (m.type() === "error") errors.push("C: " + m.text().slice(0, 160)); });
for (const t of [1.9, 4.3, 6.9, 9.4, 11.9, 14.4, 17.2, 19.4, 3.0, 5.15]) {
  await p.goto(`http://localhost:4173/?ad=${t}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(1000);
  await p.screenshot({ path: `shots/ad${String(t).replace(".", "_")}.png` });
}
await p.setViewportSize({ width: 1600, height: 1100 });
await p.goto("http://localhost:4173/", { waitUntil: "networkidle" });
await p.waitForTimeout(1200);
await p.getByRole("button", { name: /07 · MATERIAL/ }).click();
await p.waitForTimeout(1200);
await p.screenshot({ path: "shots/page_ad.png" });
console.log("ERRORS:", errors.length ? errors.join("\n") : "none");
await b.close();
