/* ==================================================================
   export-html.js — "⬇ HTML": one file, no build step, still editable
   ------------------------------------------------------------------
   This is the only ESM file in src/layers because it is build-side
   glue: it reads the *same source text* of the engine (Vite `?raw`)
   and pastes it into a standalone document, together with the scene
   JSON and the four type families inlined as base64.

   The result opens from the Desktop with no server and no network:
   it plays as a reel, and pressing E (or ?edit) turns it into the
   full layer editor — drag text, edit props, re-download. That is
   what makes the exported file a deliverable instead of a screenshot.
   ================================================================== */
import coreSrc from "./engine-core.js?raw";
import drawSrc from "./engine-draw.js?raw";
import schemaSrc from "./engine-schema.js?raw";
import logoSrc from "./logo.js?raw";
import musicSrc from "./music.js?raw";
import sceneSrc from "./scene-timberlane.js?raw";
import editorSrc from "./editor.js?raw";
import "./html-shell.js"; /* build-side only: gives us TLM.buildShell */

import antonUrl from "@fontsource/anton/files/anton-latin-400-normal.woff2?url";
import archivoUrl from "@fontsource-variable/archivo/files/archivo-latin-wght-normal.woff2?url";
import archivoIUrl from "@fontsource-variable/archivo/files/archivo-latin-wght-italic.woff2?url";
import monoUrl from "@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2?url";
import monoIUrl from "@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-italic.woff2?url";
import playUrl from "@fontsource-variable/playfair-display/files/playfair-display-latin-wght-normal.woff2?url";
import playIUrl from "@fontsource-variable/playfair-display/files/playfair-display-latin-wght-italic.woff2?url";

/** url → base64 data URI (a `data:` URL in the single-file build is already one) */
async function toDataUri(url, mime) {
  if (!url) return url;
  if (url.startsWith("data:")) return url;
  try {
    const buf = await (await fetch(url)).arrayBuffer();
    let bin = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return "data:" + (mime || "application/octet-stream") + ";base64," + btoa(bin);
  } catch {
    return url; /* dev server, or a font we can't read — keep the URL */
  }
}

/** re-encode a plate through a canvas so an offline file stays a sane size */
async function inlinePlate(src, maxW) {
  if (!src || src.startsWith("data:") || src.startsWith("logo:")) return src;
  try {
    const blob = await (await fetch(src, { mode: "cors" })).blob();
    const bmp = await createImageBitmap(blob);
    const s = Math.min(1, (maxW || 1000) / bmp.width);
    const cv = new OffscreenCanvas(Math.round(bmp.width * s), Math.round(bmp.height * s));
    const x = cv.getContext("2d");
    x.drawImage(bmp, 0, 0, cv.width, cv.height);
    const out = await cv.convertToBlob({ type: "image/jpeg", quality: 0.74 });
    if (out.size > 900000) return null; /* a 4K monster — let the runtime stand-in handle it */
    return await new Promise((res) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result));
      fr.onerror = () => res(null);
      fr.readAsDataURL(out);
    });
  } catch {
    return null; /* CORS or offline: the engine paints its interior stand-in */
  }
}

export async function buildStandaloneHTML(scene, opts) {
  opts = opts || {};
  const embed = opts.plates !== false;
  const S = JSON.parse(JSON.stringify(scene || {}));

  /* ── fonts: base64 so the file is typographically identical offline ── */
  const faces = [
    ["Anton", "normal", "400", antonUrl],
    ["Archivo", "normal", "100 900", archivoUrl],
    ["Archivo", "italic", "100 900", archivoIUrl],
    ["JetBrains Mono", "normal", "100 800", monoUrl],
    ["JetBrains Mono", "italic", "100 800", monoIUrl],
    ["Playfair Display", "normal", "400 900", playUrl],
    ["Playfair Display", "italic", "400 900", playIUrl],
  ];
  const fontCSS = (
    await Promise.all(
      faces.map(async ([fam, style, weight, url]) => {
        const uri = await toDataUri(url, "font/woff2");
        return (
          `@font-face{font-family:"${fam}";font-style:${style};font-weight:${weight};font-display:block;` +
          `src:url("${uri}") format("woff2");}`
        );
      }),
    )
  ).join("\n");

  /* ── plates: inline what we can reach, so the file survives offline ── */
  let inlined = 0;
  if (embed && S.assets) {
    for (const id of Object.keys(S.assets)) {
      const uri = await inlinePlate(S.assets[id], 1080);
      if (uri) {
        S.assets[id] = uri;
        inlined++;
      }
    }
  }

  /* the document itself is assembled by TLM.buildShell (src/layers/html-shell.js) —
     a classic script so the same function can be unit-tested in node */
  const html = globalThis.TLM.buildShell({
    scene: S,
    fontCSS,
    parts: [
      ["tl-engine-core", coreSrc],
      ["tl-logo", logoSrc],
      ["tl-engine-draw", drawSrc],
      ["tl-engine-schema", schemaSrc],
      ["tl-music", musicSrc],
      ["tl-scene-def", sceneSrc],
      ["tl-editor", editorSrc],
    ],
  });
  const bytes = new TextEncoder().encode(html).length;
  return {
    html,
    blob: new Blob([html], { type: "text/html" }),
    name: (S.name || "timberlane-layers") + ".html",
    bytes,
    platesInlined: inlined,
  };
}

/** the same document, as a data URI — handy for a preview iframe */
export function htmlDataUri(html) {
  return "data:text/html;charset=utf-8," + encodeURIComponent(html);
}
