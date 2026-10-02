/* ==================================================================
   Studio08.tsx — the thin React shell around the layers studio
   ------------------------------------------------------------------
   Piece 08 is the one that isn't a composition: it is the tool. The
   reel plays inside the same canvas you can drag things around in,
   and the HTML you download from it is that same editor. So all React
   does here is mount the vanilla studio, keep the app chrome honest,
   and offer a live preview of the exported file.
   ================================================================== */
import { useCallback, useEffect, useRef, useState } from "react";

import "./engine-core.js";
import "./logo.js";
import "./engine-draw.js";
import "./engine-schema.js";
import "./music.js";
import "./scene-timberlane.js";
import "./editor.js";
import { buildStandaloneHTML } from "./export-html.js";

type TLMType = {
  mountEditor: (root: HTMLElement, opts: Record<string, unknown>) => EditorApi;
  SCENES: Record<string, unknown>;
  normalize: (s: unknown) => void;
  music?: { pause?: () => void; stop?: () => void };
};
type EditorApi = {
  scene: SceneLike;
  setTime: (t: number, resync?: boolean | number) => void;
  destroy: () => void;
  openDocs: () => void;
  exportHTML: () => void;
  exportJSON: () => void;
  loadJSON: (text: string) => void;
  toast: (m: string) => void;
};
type SceneLike = {
  name?: string;
  title?: string;
  meta: { width: number; height: number; duration: number; fps?: number };
  music?: { bpm?: number; title?: string; key?: string };
  layers: unknown[];
};

const TLM = (window as unknown as { TLM: TLMType }).TLM;

export function Title08() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-[10px] tracking-[.28em] text-graphite">
          <span className="h-1.5 w-1.5 rounded-full bg-ember" />
          PIECE 08 · THE LAYERS STUDIO
        </div>
        <h2 className="mt-1.5 font-display text-4xl leading-[.9] tracking-[-.01em] text-bone uppercase sm:text-5xl">
          Editable reel <span className="text-ember">— 50 layers,</span> 30 seconds
        </h2>
      </div>
      <p className="max-w-[46ch] text-[11.5px] leading-relaxed text-graphite">
        The whole film is one JSON scene painted by a canvas engine. Drag the type, resize the layouts, retime the
        blocks, then export a single HTML file that opens the same editor on anyone&rsquo;s desktop.
      </p>
    </div>
  );
}

export function Workspace08() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<EditorApi | null>(null);
  const [ready, setReady] = useState(false);
  const [panel, setPanel] = useState<"" | "html">("");
  const [preview, setPreview] = useState<{ uri: string; kb: number; plates: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  /* mount the studio once */
  useEffect(() => {
    const host = hostRef.current;
    if (!host || apiRef.current) return;
    const scene = (TLM.SCENES.timberlane as SceneLike) && JSON.parse(JSON.stringify(TLM.SCENES.timberlane));
    TLM.normalize(scene);
    const api = TLM.mountEditor(host, {
      scene,
      start: 0,
      onExportHTML: async (s: SceneLike) => {
        setBusy(true);
        try {
          const r = await buildStandaloneHTML(s, { plates: true });
          setPreview({ uri: URL.createObjectURL(r.blob), kb: Math.round(r.bytes / 1024), plates: r.platesInlined });
          setPanel("html");
          return r;
        } finally {
          setBusy(false);
        }
      },
    });
    apiRef.current = api;
    setReady(true);
    return () => {
      try {
        api.destroy();
      } catch {
        /* already gone */
      }
      apiRef.current = null;
      setReady(false);
    };
  }, []);

  /* stop the score when the piece is switched away */
  useEffect(
    () => () => {
      try {
        TLM.music?.pause?.();
        TLM.music?.stop?.();
      } catch {
        /* no audio context yet */
      }
    },
    [],
  );

  const buildPreview = useCallback(async () => {
    const api = apiRef.current;
    if (!api) return;
    setBusy(true);
    try {
      const r = await buildStandaloneHTML(api.scene, { plates: true });
      if (preview) URL.revokeObjectURL(preview.uri);
      setPreview({ uri: URL.createObjectURL(r.blob), kb: Math.round(r.bytes / 1024), plates: r.platesInlined });
      setPanel("html");
    } finally {
      setBusy(false);
    }
  }, [preview]);

  const loadFile = useCallback(() => {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = ".json,application/json";
    inp.onchange = () => {
      const f = inp.files?.[0];
      if (!f) return;
      const fr = new FileReader();
      fr.onload = () => apiRef.current?.loadJSON(String(fr.result));
      fr.readAsText(f);
    };
    inp.click();
  }, []);

  return (
    <div className="flex min-h-0 flex-col gap-2.5">
      {/* one line of chrome: what this is + the two things you'd otherwise hunt for */}
      <div className="glass flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl px-3 py-2">
        <span className="font-mono2 text-[10px] tracking-[.2em] text-graphite uppercase">
          {ready ? "ENGINE READY" : "MOUNTING…"} · SCENE
        </span>
        <span className="font-display text-[13px] tracking-[.04em] text-bone uppercase">
          {apiRef.current?.scene?.layers?.length ?? 0} layers
        </span>
        <span className="text-[10.5px] text-graphite">
          {apiRef.current?.scene?.meta?.width}×{apiRef.current?.scene?.meta?.height} · {apiRef.current?.scene?.meta?.duration}s ·{" "}
          {apiRef.current?.scene?.meta?.fps ?? 30}fps · {apiRef.current?.scene?.music?.bpm ?? 120} BPM “
          {apiRef.current?.scene?.music?.title ?? "Warm Concrete"}”
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Chip label="SAMPLE JSON" onClick={() => apiRef.current?.exportJSON()} hint="the scene this reel is built from" />
          <Chip label="IMPORT JSON" onClick={loadFile} hint="load any scene file — see README → Scene JSON" />
          <Chip label="FIELD DOCS" onClick={() => apiRef.current?.openDocs()} hint="every layer type, every prop" />
          <Chip label={busy ? "BUILDING…" : "PREVIEW EXPORT"} onClick={buildPreview} accent hint="render the standalone .html and look at it" />
        </div>
      </div>

      {panel === "html" && (
        <div className="glass overflow-hidden rounded-xl">
          <div className="flex items-center gap-3 border-b border-white/8 px-3 py-2">
            <span className="font-mono2 text-[10px] tracking-[.2em] text-ember uppercase">STANDALONE FILE</span>
            <span className="text-[10.5px] text-graphite">
              {(preview?.kb ?? 0).toLocaleString()} KB · fonts + score + {preview?.plates ?? 0} plates inlined ·{" "}
              <span className="text-bone">press E inside it to edit</span>
            </span>
            <a
              className="ml-auto rounded-lg border border-white/12 bg-white/6 px-2.5 py-1 font-mono2 text-[10px] tracking-[.16em] text-bone uppercase hover:border-ember hover:text-ember"
              href={preview?.uri}
              download="timberlane-layers.html"
            >
              download .html
            </a>
            <button
              className="rounded-lg border border-white/12 px-2.5 py-1 font-mono2 text-[10px] tracking-[.16em] text-graphite uppercase hover:text-bone"
              onClick={() => setPanel("")}
            >
              close
            </button>
          </div>
          <iframe
            ref={iframeRef}
            title="exported file preview"
            src={preview?.uri}
            className="h-[62vh] w-full bg-[#07080a]"
            sandbox="allow-scripts allow-downloads allow-pointer-lock"
          />
        </div>
      )}

      {/* the studio itself */}
      <div
        ref={hostRef}
        className="relative min-h-[620px] overflow-hidden rounded-2xl border border-white/10 bg-[#0b0c0e]"
        style={{ height: panel === "html" ? 520 : "min(78vh, 940px)" }}
      />
    </div>
  );
}

function Chip({ label, onClick, hint, accent }: { label: string; onClick: () => void; hint?: string; accent?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={hint}
      className={
        "rounded-lg border px-2.5 py-1 font-mono2 text-[10px] tracking-[.16em] uppercase transition " +
        (accent
          ? "border-ember/60 bg-ember/15 text-ember hover:bg-ember/25"
          : "border-white/12 bg-white/5 text-graphite hover:border-white/25 hover:text-bone")
      }
    >
      {label}
    </button>
  );
}
