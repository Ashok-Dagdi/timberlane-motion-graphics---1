/* The score is a plain object on TLM (see music.js) — exported here so
   src/render.tsx can bake it offline into the master MP4 like any other
   piece. Same contract: { ctx, master, events[], init(), vol, muted }. */
import "./music.js";

type Score = {
  ctx: AudioContext | null;
  master: GainNode | null;
  events: { t: number; run: (when: number) => void }[];
  vol: number;
  muted: boolean;
  init: () => unknown;
};
const TLM = (window as unknown as { TLM: { music: Score } }).TLM;
export const score8: Score = TLM.music;
export const MUSIC = { bpm: 120, key: "A minor", title: "Warm Concrete", duration: 30 };
