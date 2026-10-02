/* ------------------------------------------------------------------
   render.tsx — deterministic, frame-accurate render harness.

   The seven pieces are real-time React compositions driven by a single
   `t` (seconds). This entry mounts ONE piece at ONE time with no app
   chrome, so a headless browser can be stepped frame by frame and every
   pixel of the exported MP4 matches what the app draws while scrubbing.

   URLs
     render.html?piece=01&t=1.5   mount piece 01 at t = 1.5s
     render.html?audio=01         render piece 01's score offline (WAV)

   Hooks exposed on window for the driver (tools/render.mjs)
     __meta()                 → { id, w, h, fps, duration, frames }
     __setTime(t)             → re-render at t, then settle (fonts/video)
     __preload()              → warm every remote plate, reports progress
     __renderAudio(id)        → offline-render the score, return 16-bit WAV bytes
   ------------------------------------------------------------------ */
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

import { Composition } from "./video/Composition";
import { CinematicComposition } from "./video2/scenes";
import { PopComposition } from "./video3/scenes";
import { DraftComposition } from "./video4/scenes";
import { DossierComposition } from "./video5/scenes";
import { StoryComposition } from "./video6/scenes";
import { AdComposition } from "./video7/scenes";
import { LayersComposition } from "./layers/LayerCanvas";
import { score8 } from "./layers/score8";

import { IMG, VID } from "./video/assets";
import { score } from "./video/audio";
import { score2 } from "./video2/audio";
import { score3 } from "./video3/audio";
import { score4 } from "./video4/audio";
import { score5 } from "./video5/audio";
import { score6 } from "./video6/audio";
import { score7 } from "./video7/audio";

export type PieceId = "01" | "02" | "03" | "04" | "05" | "06" | "07" | "08";

type Piece = {
  id: PieceId;
  slug: string;
  w: number;
  h: number;
  fps: number;
  duration: number;
  Comp: (p: { t: number }) => ReactElement;
  score: unknown;
};

/** the eight masters, in reel order */
export const PIECES: Piece[] = [
  { id: "01", slug: "vertical-ember", w: 1080, h: 1920, fps: 30, duration: 20, Comp: ({ t }) => <Composition t={t} playing={false} grain guides={false} burnIn={false} />, score: score },
  { id: "02", slug: "cinematic-scope", w: 1920, h: 810, fps: 24, duration: 30, Comp: ({ t }) => <CinematicComposition t={t} />, score: score2 },
  { id: "03", slug: "square-pop", w: 1080, h: 1080, fps: 30, duration: 15, Comp: ({ t }) => <PopComposition t={t} />, score: score3 },
  { id: "04", slug: "blueprint-draft", w: 1080, h: 1920, fps: 30, duration: 20, Comp: ({ t }) => <DraftComposition t={t} />, score: score4 },
  { id: "05", slug: "dossier-case", w: 1080, h: 1920, fps: 30, duration: 20, Comp: ({ t }) => <DossierComposition t={t} />, score: score5 },
  { id: "06", slug: "ramesh-story", w: 1080, h: 1920, fps: 30, duration: 24, Comp: ({ t }) => <StoryComposition t={t} />, score: score6 },
  { id: "07", slug: "material-ad", w: 1080, h: 1920, fps: 30, duration: 20, Comp: ({ t }) => <AdComposition t={t} />, score: score7 },
  { id: "08", slug: "timberlane-layers", w: 1080, h: 1920, fps: 30, duration: 30, Comp: ({ t }) => <LayersComposition t={t} />, score: score8 },
];

export const pieceById = (id: string) => PIECES.find((p) => p.id === id) ?? PIECES[0];
export const frames = (p: Piece) => Math.round(p.duration * p.fps);

const params = new URLSearchParams(location.search);
const piece = pieceById(params.get("piece") ?? params.get("audio") ?? "01");
const startT = Number(params.get("t") ?? 0) || 0;
const audioOnly = params.get("audio") !== null;

/* ------------------------------------------------------------------ */
/*  picture                                                            */
/* ------------------------------------------------------------------ */
function Frame() {
  const [t, setT] = useState(startT);
  const tRef = useRef(t);
  tRef.current = t;

  // registered once — __setTime must never re-seed the clock
  useEffect(() => {
    // freeze every CSS transition/animation: the pieces are 100% time-driven,
    // and any wall-clock animation would make frames non-reproducible.
    const css = document.createElement("style");
    css.textContent =
      "*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}" +
      "html,body{margin:0!important;padding:0!important;background:#000!important;overflow:hidden!important}" +
      "#root{width:" + piece.w + "px!important;height:" + piece.h + "px!important}";
    document.head.appendChild(css);

    /** park every <video> plate on the exact composition frame */
    const syncVideos = async () => {
      const now = tRef.current;
      const vids = [...document.querySelectorAll("video")];
      await Promise.all(
        vids.map((v) => {
          const target = Math.max(0, Math.min(now, (Number.isFinite(v.duration) ? v.duration : 1e9) - 0.05));
          if (Math.abs(v.currentTime - target) < 0.02) return undefined;
          if (v.readyState < 1) return undefined; // plate still loading — fallback shows
          return new Promise<void>((resolve) => {
            const done = () => {
              v.removeEventListener("seeked", done);
              resolve();
            };
            v.addEventListener("seeked", done);
            try {
              v.currentTime = target;
            } catch {
              done();
              return;
            }
            setTimeout(done, 400); // never hang a frame on a slow seek
          });
        }),
      );
    };

    (window as unknown as Record<string, unknown>).__setTime = async (nt: number) => {
      // flushSync: the DOM is at nt before we return, so the compositor's next
      // frame (forced by the screenshot) can never show a stale time.
      flushSync(() => setT(nt));
      await syncVideos();
      // one presented frame so the compositor surface matches the new DOM
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      await document.fonts.ready;
    };

    return () => {
      delete (window as unknown as Record<string, unknown>).__setTime;
    };
  }, []);

  return (
    <div style={{ width: piece.w, height: piece.h, position: "relative", overflow: "hidden", background: "#000" }}>
      <piece.Comp t={t} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  plate preloading (Pexels CDN + any local stand-ins)                */
/* ------------------------------------------------------------------ */
const ALL_MEDIA = [...Object.values(IMG), ...Object.values(VID)];

(window as unknown as Record<string, unknown>).__preload = () => {
  const state = { total: ALL_MEDIA.length, ok: 0, failed: [] as string[] };
  return new Promise((resolve) => {
    let pending = ALL_MEDIA.length;
    const done = (src: string, ok: boolean) => {
      if (ok) state.ok += 1;
      else state.failed.push(src);
      if (--pending === 0) resolve(state);
    };
    ALL_MEDIA.forEach((src) => {
      if (/\.mp4(\?|$)/.test(src)) {
        const v = document.createElement("video");
        v.muted = true;
        v.preload = "auto";
        v.oncanplaythrough = () => done(src, true);
        v.onerror = () => done(src, false);
        v.src = src;
        return;
      }
      const i = new Image();
      i.onload = () => done(src, true);
      i.onerror = () => done(src, false);
      i.decoding = "sync";
      i.src = src;
    });
  });
};

/* ------------------------------------------------------------------ */
/*  offline audio: run each score's arrangement through an             */
/*  OfflineAudioContext instead of the realtime one                    */
/* ------------------------------------------------------------------ */
type ScoreLike = {
  ctx: AudioContext | null;
  events: { t: number; run: (when: number) => void }[];
  master: GainNode;
  muted?: boolean;
  _muted?: boolean;
  vol?: number;
  _vol?: number;
  init: () => void;
};

/** stands in for AudioContext so Score.init() builds an offline graph */
class OfflineShim {
  private offline: OfflineAudioContext;
  destination: AudioDestinationNode;
  sampleRate: number;
  state = "running";

  constructor(offline: OfflineAudioContext) {
    this.offline = offline;
    this.destination = offline.destination;
    this.sampleRate = offline.sampleRate;
  }
  get currentTime() {
    return 0;
  }
  resume = () => Promise.resolve();
  createGain = () => this.offline.createGain();
  createOscillator = () => this.offline.createOscillator();
  createBufferSource = () => this.offline.createBufferSource();
  createBiquadFilter = () => this.offline.createBiquadFilter();
  createDynamicsCompressor = () => this.offline.createDynamicsCompressor();
  createConvolver = () => this.offline.createConvolver();
  createDelay = (max = 1) => this.offline.createDelay(max);
  createStereoPanner = () => this.offline.createStereoPanner();
  createPanner = () => this.offline.createPanner();
  createWaveShaper = () => this.offline.createWaveShaper();
  createChannelMerger = (n?: number) => this.offline.createChannelMerger(n);
  createChannelSplitter = (n?: number) => this.offline.createChannelSplitter(n);
  createAnalyser = () => this.offline.createAnalyser();
  createBuffer = (ch: number, len: number, sr: number) => this.offline.createBuffer(ch, len, sr);
  createPeriodicWave = (real: Float32Array, imag: Float32Array) => this.offline.createPeriodicWave(real, imag);
  createConstantSource = () => this.offline.createConstantSource();
}

function toWav(buffer: AudioBuffer): Uint8Array {
  const ch = Math.min(2, buffer.numberOfChannels);
  const len = buffer.length;
  const data = new DataView(new ArrayBuffer(44 + len * ch * 2));
  const str = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) data.setUint8(off + i, s.charCodeAt(i));
  };
  str(0, "RIFF");
  data.setUint32(4, 36 + len * ch * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  data.setUint32(16, 16, true);
  data.setUint16(20, 1, true);
  data.setUint16(22, ch, true);
  data.setUint32(24, buffer.sampleRate, true);
  data.setUint32(28, buffer.sampleRate * ch * 2, true);
  data.setUint16(32, ch * 2, true);
  data.setUint16(34, 16, true);
  str(36, "data");
  data.setUint32(40, len * ch * 2, true);
  const chans: Float32Array[] = [];
  for (let c = 0; c < ch; c++) chans.push(buffer.getChannelData(c));
  let o = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < ch; c++) {
      const v = Math.max(-1, Math.min(1, chans[c][i]));
      data.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      o += 2;
    }
  }
  return new Uint8Array(data.buffer);
}

(window as unknown as Record<string, unknown>).__renderAudio = async (id: string) => {
  const p = pieceById(id);
  const s = p.score as unknown as ScoreLike;
  const offline = new OfflineAudioContext(2, Math.ceil((p.duration + 0.6) * 48000), 48000);
  const w = window as unknown as { AudioContext: typeof AudioContext };
  const RealAC = w.AudioContext;
  // Score.init() reads window.AudioContext — hand it the offline graph
  w.AudioContext = function () {
    return new OfflineShim(offline);
  } as unknown as typeof AudioContext;
  try {
    s.ctx = null;
    s.init();
    w.AudioContext = RealAC;
    if (s.muted !== undefined) s.muted = false;
    if (s._muted !== undefined) s._muted = false;
    s.master.gain.cancelScheduledValues(0);
    s.master.gain.setValueAtTime(s.vol ?? s._vol ?? 0.85, 0);
    for (const e of s.events) {
      try {
        e.run(Math.max(0.002, e.t));
      } catch {
        /* a voice failed — keep the rest of the arrangement */
      }
    }
    const rendered = await offline.startRendering();
    return toWav(rendered);
  } finally {
    w.AudioContext = RealAC;
  }
};

(window as unknown as Record<string, unknown>).__meta = () => ({
  id: piece.id,
  slug: piece.slug,
  w: piece.w,
  h: piece.h,
  fps: piece.fps,
  duration: piece.duration,
  frames: frames(piece),
});

/* ------------------------------------------------------------------ */
if (audioOnly) {
  document.body.innerHTML = "";
} else {
  createRoot(document.getElementById("root")!).render(<Frame />);
}
