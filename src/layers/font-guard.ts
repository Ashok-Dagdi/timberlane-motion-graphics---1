/* Canvas only paints a webfont once the browser has actually loaded it, and
   nothing in the DOM asks for these faces outside the canvas. One invisible
   node per family forces the load; `document.fonts.ready` then means the
   frame is safe to capture. */
let done = false;
const SPEC: [string, string][] = [
  ["Anton", "400"],
  ["Archivo", "700"],
  ["Archivo", "800"],
  ["JetBrains Mono", "500"],
  ["Playfair Display", "500"],
];
export function preloadFontFaces(): void {
  if (done || typeof document === "undefined") return;
  done = true;
  const box = document.createElement("div");
  box.setAttribute("aria-hidden", "true");
  box.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none;font-size:8px;line-height:1";
  for (const [fam, w] of SPEC) {
    const s = document.createElement("span");
    s.style.fontFamily = `"${fam}", sans-serif`;
    s.style.fontWeight = w;
    s.textContent = "Handgloves 0123456789 — Timberlane";
    box.appendChild(s);
  }
  document.body.appendChild(box);
}
export async function fontsReady(): Promise<void> {
  try {
    await document.fonts.ready;
  } catch {
    /* older engines: carry on, text still renders in the fallback stack */
  }
}
