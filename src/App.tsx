import { useEffect, useRef, useState } from "react";
import { Stage, useMediaPreload } from "./components/Stage";
import { AudioMeter, Palette, Panel, ShotList, Timeline, Transport } from "./components/Chrome";
import { usePlayback } from "./video/usePlayback";
import { BRAND } from "./video/assets";
import { shotAt } from "./video/timeline";

import { CinStage } from "./video2/CinStage";
import { useCinPlayback } from "./video2/useCinPlayback";
import { CREDITS, shotAt as shotAt2, SHOTS as SHOTS2 } from "./video2/timeline";
import { MUSIC as MUSIC2, score2 } from "./video2/audio";
import { PopStage } from "./video3/PopStage";
import { usePopPlayback } from "./video3/usePopPlayback";
import { shotAt as shotAt3, SHOTS as SHOTS3 } from "./video3/timeline";
import { MUSIC as MUSIC3, score3 } from "./video3/audio";
import { Title04, Workspace04 } from "./video4/Workspace4";
import { Title05, Workspace05 } from "./video5/Workspace5";
import { Title06, Workspace06 } from "./video6/Workspace6";
import { Title07, Workspace07 } from "./video7/Workspace7";
import { fmt } from "./video/anim";

const TICKER =
  "20.0 SEC · 9:16 VERTICAL · 1080×1920 · 120 BPM · 7 SHOTS · EMBER & GRAPHITE · REAL-TIME MOTION GRAPHICS · ";
const TICKER2 =
  "30.0 SEC · 2.37:1 SCOPE · 1920×810 · 66 BPM · 5 SHOTS · AMBER & GOLD · FELT PIANO · STRING SECTION · ";
const TICKER4 =
  "20.0 SEC · 9:16 VERTICAL · 108 BPM · BLUEPRINT → ISOMETRIC → RENDER · 9 BEAT DROPS · APPROVED · ";
const TICKER3 =
  "15.0 SEC · 1:1 SQUARE · 1080×1080 · 96 BPM · 6 CARDS · FUNK BASS · RHODES · STICKER POP · ";
const TICKER5 =
  "20.0 SEC · 9:16 VERTICAL · 104 BPM · GODREJ AQUA 0043 · DOSSIER · DATA · 5.0 RATED · ";
const TICKER6 =
  "24.0 SEC · 9:16 VERTICAL · 80 BPM · RAMESH · 3BHK · KEYS TO HOME · A SHORT STORY · ";
const TICKER7 =
  "20.0 SEC · 9:16 VERTICAL · 96 BPM · MATERIAL TRUTH · OAK · STONE · BRASS · ±1 MM · ONE TEAM · ";

export default function App() {
  const [piece, setPiece] = useState<"01" | "02" | "03" | "04" | "05" | "06" | "07">("01");
  const pb1 = usePlayback(piece === "01");
  const pb2 = useCinPlayback(piece === "02");
  const pb3 = usePopPlayback(piece === "03");
  const { loaded, total, ready } = useMediaPreload();

  // pause the non-active pieces
  if (piece !== "01" && pb1.playing) pb1.pause();
  if (piece !== "02" && pb2.playing) pb2.pause();
  if (piece !== "03" && pb3.playing) pb3.pause();
  (window as unknown as { __reel?: string }).__reel = piece;

  return (
    <div className="min-h-screen bg-ink text-bone">
      {/* ambient light */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            piece === "01"
              ? "radial-gradient(900px 620px at 50% -12%, rgba(255,90,31,.16), transparent 68%), radial-gradient(700px 500px at 100% 110%, rgba(255,90,31,.07), transparent 70%)"
              : piece === "02"
                ? "radial-gradient(900px 620px at 50% -12%, rgba(230,192,136,.12), transparent 68%), radial-gradient(700px 500px at 100% 110%, rgba(230,192,136,.06), transparent 70%)"
                : "radial-gradient(900px 620px at 50% -12%, rgba(246,234,214,.10), transparent 68%), radial-gradient(700px 500px at 100% 110%, rgba(255,176,58,.12), transparent 70%)",
          transition: "background .8s",
        }}
      />
      <div className="dotgrid pointer-events-none fixed inset-0 z-0 opacity-60" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1640px] flex-col px-4 pb-8 pt-5 lg:px-8">
        {/* ------------------------------- header */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] pb-5">
          <div className="flex items-center gap-4">
            <svg width="40" height="40" viewBox="0 0 100 100">
              <rect x="4" y="4" width="92" height="92" rx="14" fill="none" stroke={piece === "02" ? "#e6c088" : "#ff5a1f"} strokeWidth="5" />
              <rect x="20" y="26" width="60" height="9" rx="2" fill="#f1efec" />
              <rect x="45.5" y="26" width="9" height="50" rx="2" fill={piece === "02" ? "#e6c088" : "#ff5a1f"} />
              <rect x="20" y="43" width="18" height="4" rx="2" fill="#f1efec" opacity=".5" />
              <rect x="62" y="43" width="18" height="4" rx="2" fill="#f1efec" opacity=".5" />
            </svg>
            <div>
              <h1 className="font-display text-[26px] leading-none tracking-[0.06em] text-bone">TIMBERLANE</h1>
              <p className="mt-1 font-mono2 text-[10px] tracking-[0.34em] text-ash">
                INTERIORS · {BRAND.city} · MOTION REEL
              </p>
            </div>
          </div>

          {/* piece switcher */}
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
            {[
              { id: "01" as const, k: "01 · VERTICAL", d: "20s · 9:16 · BEAT" },
              { id: "02" as const, k: "02 · SCOPE", d: "30s · 2.37:1 · AMBIENT" },
              { id: "03" as const, k: "03 · SQUARE", d: "15s · 1:1 · POP" },
              { id: "04" as const, k: "04 · BLUEPRINT", d: "20s · 9:16 · PROCESS" },
              { id: "05" as const, k: "05 · DOSSIER", d: "20s · 9:16 · CASE" },
              { id: "06" as const, k: "06 · RAMESH", d: "24s · 9:16 · STORY" },
              { id: "07" as const, k: "07 · MATERIAL", d: "20s · 9:16 · AD" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPiece(p.id)}
                className="rounded-full px-4 py-2 font-mono2 text-[10px] tracking-[0.18em] transition-colors"
                style={{
                  background: piece === p.id ? (p.id === "02" ? "#e6c088" : p.id === "04" ? "#d3d6da" : "#ff5a1f") : "transparent",
                  color: piece === p.id ? "#08080a" : "#8b9097",
                }}
              >
                <span className="font-bold">{p.k}</span>
                <span className="ml-2 opacity-75">{p.d}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 font-mono2 text-[10px] tracking-[0.2em] text-ash">
              {ready ? "● READY" : `● CACHING ${loaded}/${total}`}
            </span>
            <a
              href="https://timberlane.co.in"
              target="_blank"
              rel="noreferrer"
              className="rounded-full px-4 py-2 font-grotesk text-[11px] font-bold tracking-[0.16em] transition-colors"
              style={{ background: piece === "01" ? "#f1efec" : piece === "02" ? "#e6c088" : "#ff5a1f", color: "#08080a" }}
            >
              VISIT SITE ↗
            </a>
          </div>
        </header>

        {/* ------------------------------- title block */}
        {piece === "01" ? <Title01 /> : piece === "02" ? <Title02 /> : piece === "03" ? <Title03 /> : piece === "04" ? <Title04 /> : piece === "05" ? <Title05 /> : piece === "06" ? <Title06 /> : <Title07 />}

        {/* ------------------------------- workspace */}
        {piece === "01" ? (
          <Workspace01 pb={pb1} ready={ready} progress={total ? loaded / total : 0} />
        ) : piece === "02" ? (
          <Workspace02 pb={pb2} />
        ) : piece === "03" ? (
          <Workspace03 pb={pb3} />
        ) : piece === "04" ? (
          <Workspace04 />
        ) : piece === "05" ? (
          <Workspace05 />
        ) : piece === "06" ? (
          <Workspace06 />
        ) : (
          <Workspace07 />
        )}

        {/* ------------------------------- ticker */}
        <div className="mt-7 overflow-hidden border-y border-white/[0.07] py-3">
          <div
            className="ui-marquee flex whitespace-nowrap font-display text-[20px] tracking-[0.12em] text-steel"
          >
            <span>{(piece === "01" ? TICKER : piece === "02" ? TICKER2 : piece === "03" ? TICKER3 : piece === "04" ? TICKER4 : piece === "05" ? TICKER5 : piece === "06" ? TICKER6 : TICKER7).repeat(3)}</span>
            <span>{(piece === "01" ? TICKER : piece === "02" ? TICKER2 : piece === "03" ? TICKER3 : piece === "04" ? TICKER4 : piece === "05" ? TICKER5 : piece === "06" ? TICKER6 : TICKER7).repeat(3)}</span>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 pt-5 font-mono2 text-[10px] tracking-[0.2em] text-steel">
          <span>
            TIMBERLANE INTERIORS · {BRAND.phone} · <span className={piece === "02" ? "text-[#e6c088]" : piece === "04" ? "text-[#d3d6da]" : "text-ember"}>{BRAND.url}</span>
          </span>
          <span>PLATES: PEXELS · SCORE &amp; ANIMATION: ORIGINAL, REAL-TIME</span>
        </footer>
      </div>
    </div>
  );
}

/* ------------------------------- titles */
function Title01() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5 py-6">
      <div>
        <p className="font-mono2 text-[10px] tracking-[0.42em] text-ember">PIECE 001 · SOCIAL VERTICAL · EMBER CUT</p>
        <h2 className="mt-3 font-display text-[clamp(36px,5.4vw,74px)] leading-[0.92] tracking-[0.01em]">
          PRECISION IN
          <span className="text-ember"> EVERY FRAME</span>
        </h2>
      </div>
      <p className="max-w-[440px] font-grotesk text-[13px] leading-relaxed text-ash">
        A 20-second, 9:16 vertical brand film. Seven beat-locked cuts, kinetic typography, a
        before/after transform wipe and an original 120&nbsp;BPM synth score. Built for Instagram,
        Reels, and YouTube Shorts.
      </p>
    </div>
  );
}

function Title02() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5 py-6">
      <div>
        <p className="font-mono2 text-[10px] tracking-[0.42em] text-[#e6c088]">PIECE 002 · CINEMATIC SCOPE · AMBER CUT</p>
        <h2 className="mt-3 font-display text-[clamp(36px,5.4vw,74px)] leading-[0.92] tracking-[0.01em]">
          THE ART OF
          <span className="text-[#e6c088]"> SLOW SPACES</span>
        </h2>
      </div>
      <p className="max-w-[440px] font-grotesk text-[13px] leading-relaxed text-ash">
        A 30-second, 2.37:1 anamorphic cinematic film. Five slow dissolves, floating dust,
        lens flares, halation and an original 66&nbsp;BPM felt-piano + string score. Built for
        website hero, cinema pre-roll and luxury brand contexts.
      </p>
    </div>
  );
}

/* ------------------------------- workspace 01 */
function Workspace01({ pb, ready, progress }: { pb: ReturnType<typeof usePlayback>; ready: boolean; progress: number }) {
  const [grain, setGrain] = useState(true);
  const [guides, setGuides] = useState(false);
  const [burnIn, setBurnIn] = useState(false);
  const shot = shotAt(pb.time);
  return (
    <main className="grid flex-1 gap-5 xl:grid-cols-[250px_minmax(0,1fr)_290px]">
      <div className="order-2 space-y-4 xl:order-1">
        <Panel title="SHOT LIST" tag={`${shot.code} LIVE`}>
          <ShotList time={pb.time} onSeek={(v) => pb.seek(v, true)} />
        </Panel>
        <Panel title="DELIVERY SPEC">
          <dl className="grid grid-cols-2 gap-y-2 font-mono2 text-[10px] tracking-[0.12em]">
            {[
              ["FORMAT", "9:16 VERTICAL"],
              ["RESOLUTION", "1080 × 1920"],
              ["DURATION", "20.000 s"],
              ["FRAME RATE", "60 fps RT"],
              ["CUTS", "7 / ON-BEAT"],
              ["PLATFORMS", "IG · YT · FB"],
            ].map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-steel">{k}</dt>
                <dd className="text-right text-fog">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>

      <div className="order-1 flex flex-col gap-4 xl:order-2">
        <div className="relative h-[min(62vh,600px)] flex-1 rounded-2xl border border-white/[0.06] bg-black/30 p-3 xl:h-[min(60vh,640px)] xl:flex-none">
          <Stage
            time={pb.time}
            playing={pb.playing}
            onToggle={pb.toggle}
            grain={grain}
            guides={guides}
            burnIn={burnIn}
            ready={ready}
            progress={progress}
          />
          <div className="pointer-events-none absolute left-5 top-5 font-mono2 text-[9px] tracking-[0.28em] text-ash/70">
            PREVIEW · {shot.code} {shot.name}
          </div>
          <div className="pointer-events-none absolute right-5 top-5 font-mono2 text-[9px] tracking-[0.28em] text-ember/80">
            {pb.playing ? "▶ PLAYING" : "❚❚ PAUSED"}
          </div>
        </div>

        <div className="glass space-y-3 rounded-xl p-4">
          <Timeline
            time={pb.time}
            onScrubStart={() => {
              if (pb.playing) pb.pause();
            }}
            onScrub={(v) => pb.seek(v)}
            onScrubEnd={() => {}}
          />
          <Transport
            time={pb.time}
            playing={pb.playing}
            onToggle={pb.toggle}
            onRestart={() => pb.seek(0, true)}
            muted={pb.muted}
            onMute={() => pb.setMuted(!pb.muted)}
            rate={pb.rate}
            onRate={pb.setRate}
            loop={pb.loop}
            onLoop={() => pb.setLoop(!pb.loop)}
            grain={grain}
            onGrain={() => setGrain(!grain)}
            guides={guides}
            onGuides={() => setGuides(!guides)}
            burnIn={burnIn}
            onBurnIn={() => setBurnIn(!burnIn)}
          />
          <p className="font-mono2 text-[9px] tracking-[0.18em] text-steel">
            SPACE PLAY/PAUSE · ← → STEP FRAME · SHIFT+← → 1s · R RESTART · M MUTE · L LOOP
          </p>
        </div>
      </div>

      <div className="order-3 space-y-4">
        <Panel title="SOUNDTRACK" tag="LIVE DSP">
          <AudioMeter playing={pb.playing} />
        </Panel>
        <Panel title="COLOUR SCRIPT" tag="ORANGE / GREY">
          <Palette />
        </Panel>
      </div>
    </main>
  );
}

/* ------------------------------- workspace 02 (cinematic) */
function Workspace02({ pb }: { pb: ReturnType<typeof useCinPlayback> }) {
  const shot = shotAt2(pb.time);
  const pct = (pb.time / 30) * 100;
  return (
    <main className="grid flex-1 gap-5 xl:grid-cols-[250px_minmax(0,1fr)_290px]">
      <div className="order-2 space-y-4 xl:order-1">
        <Panel title="SCENES" tag={`${String(SHOTS2.indexOf(shot) + 1).padStart(2, "0")} LIVE`}>
          <ul className="space-y-1">
            {SHOTS2.map((s) => {
              const on = s.id === shot.id;
              const prog = Math.max(0, Math.min(1, (pb.time - s.in) / (s.out - s.in)));
              return (
                <li key={s.id}>
                  <button
                    onClick={() => pb.seek(s.in, true)}
                    className="group flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/5"
                    style={{ background: on ? "rgba(230,192,136,.10)" : undefined }}
                  >
                    <span className="mt-0.5 font-mono2 text-[10px] tabular-nums" style={{ color: on ? "#e6c088" : "#3a3e45" }}>
                      {String(SHOTS2.indexOf(s) + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-serif2 text-[14px] italic tracking-[0.02em]" style={{ color: on ? "#f1efec" : "#8b9097" }}>
                          {s.name}
                        </span>
                        <span className="font-mono2 text-[9px] tabular-nums text-steel">
                          {s.in.toFixed(1)}s
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate font-grotesk text-[10px] text-ash/70">{s.note}</span>
                      <span className="mt-1.5 block h-[2px] w-full bg-white/8">
                        <span className="block h-full bg-[#e6c088]" style={{ width: `${on ? prog * 100 : pb.time >= s.out ? 100 : 0}%` }} />
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel title="FILM CREDITS" tag="EDIT 01">
          <dl className="grid grid-cols-2 gap-y-2 font-mono2 text-[10px] tracking-[0.12em]">
            {CREDITS.map((c) => (
              <div key={c.k} className="contents">
                <dt className="text-steel">{c.k}</dt>
                <dd className="text-right text-fog">{c.v}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel title="LENS NOTES">
          <ul className="space-y-1.5 font-grotesk text-[11px] leading-relaxed text-ash">
            <li>• Scope 2.37:1 anamorphic framing</li>
            <li>• Horizontal streak flares, color-fringed</li>
            <li>• Slow dissolves on every cut</li>
            <li>• Warm golden-hour grade</li>
            <li>• Floating dust, halation, film grain</li>
            <li>• Felt piano + string section score</li>
          </ul>
        </Panel>
      </div>

      {/* stage — wider, letterboxed feel */}
      <div className="order-1 flex flex-col gap-4 xl:order-2">
        <div className="relative flex-1 rounded-2xl border border-white/[0.06] bg-black/50 p-3" style={{ minHeight: 360 }}>
          <CinStage time={pb.time} playing={pb.playing} onToggle={pb.toggle} />
          <div className="pointer-events-none absolute left-5 top-5 font-mono2 text-[9px] tracking-[0.28em] text-ash/70">
            REEL · {shot.name}
          </div>
          <div className="pointer-events-none absolute right-5 top-5 font-mono2 text-[9px] tracking-[0.28em] text-[#e6c088]/80">
            {pb.playing ? "▶ PLAYING" : "❚❚ PAUSED"}
          </div>
        </div>

        {/* cinematic transport */}
        <div className="glass space-y-3 rounded-xl p-4">
          <div>
            <div className="mb-1.5 flex justify-between font-mono2 text-[10px] tabular-nums tracking-[0.14em]">
              <span className="text-[#e6c088]">{fmt(pb.time)}</span>
              <span className="text-steel">00:30:00</span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-black/40">
              <div className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#e6c088,#ff5a1f)" }} />
              <div className="absolute inset-0 flex">
                {SHOTS2.map((s) => (
                  <div
                    key={s.id}
                    className="h-full border-r border-black/40 last:border-r-0"
                    style={{ width: `${((s.out - s.in) / 30) * 100}%` }}
                  />
                ))}
              </div>
              <div className="absolute inset-y-0" style={{ left: `${pct}%`, width: 2, marginLeft: -1, background: "#e6c088", boxShadow: "0 0 12px #e6c088" }} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={pb.toggle}
              className="flex h-11 w-11 items-center justify-center rounded-full text-ink transition-transform hover:scale-105 active:scale-95"
              style={{ background: "#e6c088" }}
            >
              {pb.playing ? (
                <svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor"><rect x="0" y="0" width="4.5" height="16" rx="1" /><rect x="9.5" y="0" width="4.5" height="16" rx="1" /></svg>
              ) : (
                <svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor"><path d="M1 1l12 7-12 7z" /></svg>
              )}
            </button>

            <button
              onClick={() => pb.seek(0, true)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] transition-colors hover:bg-white/10"
              aria-label="Restart"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
            </button>

            <button
              onClick={() => pb.setMuted(!pb.muted)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] transition-colors hover:bg-white/10"
              aria-label="Mute"
              style={{ color: pb.muted ? "#5a5f66" : "#f1efec" }}
            >
              {pb.muted ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M11 5 6 9H2v6h4l5 4z" /><path d="m22 9-6 6M16 9l6 6" /></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M11 5 6 9H2v6h4l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></svg>
              )}
            </button>

            <span className="font-mono2 text-[11px] tabular-nums tracking-[0.12em] text-fog">
              {fmt(pb.time)} <span className="text-steel">/ 00:30:00</span>
            </span>

            <div className="ml-auto flex items-center gap-1.5">
              {[0.5, 1].map((r) => (
                <button
                  key={r}
                  onClick={() => pb.setRate(r)}
                  className="rounded-md px-2.5 py-1.5 font-mono2 text-[10px] tracking-[0.1em] transition-colors"
                  style={{
                    background: pb.rate === r ? "#e6c088" : "rgba(255,255,255,.05)",
                    color: pb.rate === r ? "#08080a" : "#8b9097",
                  }}
                >
                  {r}×
                </button>
              ))}
              <button
                onClick={() => pb.setLoop(!pb.loop)}
                className="rounded-md border px-2.5 py-1.5 font-mono2 text-[10px] tracking-[0.14em]"
                style={{
                  borderColor: pb.loop ? "rgba(230,192,136,.55)" : "rgba(255,255,255,.1)",
                  color: pb.loop ? "#e6c088" : "#5a5f66",
                  background: pb.loop ? "rgba(230,192,136,.10)" : "transparent",
                }}
              >
                LOOP
              </button>
            </div>
          </div>
          <p className="font-mono2 text-[9px] tracking-[0.18em] text-steel">
            SPACE PLAY/PAUSE · ← → STEP · SHIFT+← → 1s · R RESTART · M MUTE · L LOOP
          </p>
        </div>
      </div>

      {/* right rail — cinematic score & palette */}
      <div className="order-3 space-y-4">
        <Panel title="SOUNDTRACK" tag="AMBER / 66">
          <CinAudioMeter playing={pb.playing} />
        </Panel>
        <Panel title="COLOUR SCRIPT" tag="AMBER / GOLD">
          <div className="grid grid-cols-4 gap-2">
            {[
              { hex: "#e6c088", name: "GOLD" },
              { hex: "#ffb07c", name: "AMBER" },
              { hex: "#f7e9d2", name: "CREAM" },
              { hex: "#ff5a1f", name: "EMBER" },
              { hex: "#f1efec", name: "BONE" },
              { hex: "#8b9097", name: "ASH" },
              { hex: "#3a3e45", name: "STEEL" },
              { hex: "#050607", name: "INK" },
            ].map((s) => (
              <div key={s.hex} className="space-y-1.5">
                <div className="h-10 w-full rounded-md" style={{ background: s.hex, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.08)" }} />
                <div className="font-mono2 text-[8px] tracking-[0.12em] text-ash">{s.name}</div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="TYPOGRAPHY">
          <ul className="space-y-3">
            <li>
              <div className="font-serif2 italic text-[22px] text-bone">Playfair Display</div>
              <div className="mt-1 font-mono2 text-[9px] tracking-[0.2em] text-steel">EDITORIAL / WHISPER</div>
            </li>
            <li>
              <div className="font-display text-[22px] tracking-[0.04em] text-bone">ANTON</div>
              <div className="mt-1 font-mono2 text-[9px] tracking-[0.2em] text-steel">DISPLAY / DECLARATIVE</div>
            </li>
            <li>
              <div className="font-mono2 text-[14px] tracking-[0.3em] text-bone">JETBRAINS MONO</div>
              <div className="mt-1 font-mono2 text-[9px] tracking-[0.2em] text-steel">CREDITS / TECHNICAL</div>
            </li>
          </ul>
        </Panel>
      </div>
    </main>
  );
}

/* cinematic audio meter */
function CinAudioMeter({ playing }: { playing: boolean }) {
  const [, force] = useState(0);
  const valsRef = useRef<number[]>(Array(32).fill(0));
  useEffect(() => {
    let raf = 0;
    let n = 0;
    const tick = () => {
      score2.spectrum(valsRef.current);
      if (n++ % 2 === 0) force((x) => x + 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div>
      <div className="flex h-20 items-end gap-[3px]">
        {valsRef.current.map((v: number, i: number) => (
          <span
            key={i}
            className="flex-1 rounded-[1px]"
            style={{
              height: `${Math.max(3, v * 100)}%`,
              background: v > 0.72 ? "#e6c088" : v > 0.35 ? "#8b9097" : "#3a3e45",
              boxShadow: v > 0.5 ? "0 0 8px rgba(230,192,136,.5)" : undefined,
            }}
          />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 font-mono2 text-[10px] tracking-[0.14em]">
        <div className="text-steel">TRACK</div><div className="text-right text-fog">{MUSIC2.title}</div>
        <div className="text-steel">TEMPO</div><div className="text-right text-fog">{MUSIC2.bpm} BPM</div>
        <div className="text-steel">KEY</div><div className="text-right text-fog">{MUSIC2.key}</div>
        <div className="text-steel">INSTRUMENTS</div><div className="text-right text-fog">PIANO · STRINGS</div>
      </div>
      <p className="mt-3 font-grotesk text-[10px] leading-relaxed text-ash/70">
        Original score synthesised live — felt piano with long hall reverb, a slow string section
        (four-voice chorus + vibrato per voice), sub-bass swell and breathy room tone. {playing ? "Playing." : "Paused."}
      </p>
    </div>
  );
}

/* ------------------------------- title 03 */
function Title03() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5 py-6">
      <div>
        <p className="font-mono2 text-[10px] tracking-[0.42em] text-ember">PIECE 003 · POP SQUARE · CREAM CUT</p>
        <h2 className="mt-3 font-display text-[clamp(36px,5.4vw,74px)] leading-[0.92] tracking-[0.01em]">
          FRESH LOOKS,
          <span className="text-ember"> FAST CUTS</span>
        </h2>
      </div>
      <p className="max-w-[440px] font-grotesk text-[13px] leading-relaxed text-ash">
        A 15-second, 1:1 square pop film. Six sticker-card scenes, bouncing display type, flip
        cards, a venetian blind wipe and an original 96&nbsp;BPM funk-pop score with live Rhodes
        chops. Built loud for the Instagram feed.
      </p>
    </div>
  );
}

/* ------------------------------- workspace 03 (pop square) */
function Workspace03({ pb }: { pb: ReturnType<typeof usePopPlayback> }) {
  const shot = shotAt3(pb.time);
  const pct = (pb.time / 15) * 100;
  return (
    <main className="grid flex-1 gap-5 xl:grid-cols-[250px_minmax(0,1fr)_290px]">
      <div className="order-2 space-y-4 xl:order-1">
        <Panel title="CARDS" tag={`${String(SHOTS3.indexOf(shot) + 1).padStart(2, "0")} LIVE`}>
          <ul className="space-y-1">
            {SHOTS3.map((s) => {
              const on = s.id === shot.id;
              const prog = Math.max(0, Math.min(1, (pb.time - s.in) / (s.out - s.in)));
              return (
                <li key={s.id}>
                  <button
                    onClick={() => pb.seek(s.in, true)}
                    className="group flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/5"
                    style={{ background: on ? "rgba(255,90,31,.12)" : undefined }}
                  >
                    <span className="mt-0.5 font-mono2 text-[10px] tabular-nums" style={{ color: on ? "#ff5a1f" : "#3a3e45" }}>
                      {String(SHOTS3.indexOf(s) + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-grotesk text-[12px] font-bold tracking-[0.14em]" style={{ color: on ? "#f1efec" : "#8b9097" }}>
                          {s.name}
                        </span>
                        <span className="font-mono2 text-[9px] tabular-nums text-steel">
                          {s.in.toFixed(1)}s
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate font-grotesk text-[10px] text-ash/70">{s.note}</span>
                      <span className="mt-1.5 block h-[2px] w-full bg-white/8">
                        <span className="block h-full bg-ember" style={{ width: `${on ? prog * 100 : pb.time >= s.out ? 100 : 0}%` }} />
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel title="DELIVERY SPEC">
          <dl className="grid grid-cols-2 gap-y-2 font-mono2 text-[10px] tracking-[0.12em]">
            {[
              ["FORMAT", "1:1 SQUARE"],
              ["RESOLUTION", "1080 × 1080"],
              ["DURATION", "15.000 s"],
              ["FRAME RATE", "60 fps RT"],
              ["CARDS", "6 / ON-BAR"],
              ["PLATFORMS", "IG FEED"],
            ].map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-steel">{k}</dt>
                <dd className="text-right text-fog">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel title="STYLE NOTES">
          <ul className="space-y-1.5 font-grotesk text-[11px] leading-relaxed text-ash">
            <li>• Chunky sticker cards, hard offset shadows</li>
            <li>• Bouncing display type, marquee ribbons</li>
            <li>• 3D flap cards for the room picker</li>
            <li>• Venetian blind before/after wipe</li>
            <li>• Starbursts, stamps &amp; confetti burst</li>
            <li>• Funk bass + Rhodes funk-pop score</li>
          </ul>
        </Panel>
      </div>

      {/* stage */}
      <div className="order-1 flex flex-col gap-4 xl:order-2">
        <div className="relative h-[min(62vh,620px)] flex-1 rounded-2xl border border-white/[0.06] bg-black/30 p-3 xl:flex-none">
          <PopStage time={pb.time} playing={pb.playing} onToggle={pb.toggle} />
          <div className="pointer-events-none absolute left-5 top-5 font-mono2 text-[9px] tracking-[0.28em] text-ash/70">
            PREVIEW · {shot.name}
          </div>
          <div className="pointer-events-none absolute right-5 top-5 font-mono2 text-[9px] tracking-[0.28em] text-ember/80">
            {pb.playing ? "▶ PLAYING" : "❚❚ PAUSED"}
          </div>
        </div>

        {/* pop transport */}
        <div className="glass space-y-3 rounded-xl p-4">
          <div>
            <div className="mb-1.5 flex justify-between font-mono2 text-[10px] tabular-nums tracking-[0.14em]">
              <span className="text-ember">{fmt(pb.time)}</span>
              <span className="text-steel">00:15:00</span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-black/40">
              <div className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#ffb03a,#ff5a1f)" }} />
              <div className="absolute inset-0 flex">
                {SHOTS3.map((s) => (
                  <div
                    key={s.id}
                    className="h-full border-r border-black/40 last:border-r-0"
                    style={{ width: `${((s.out - s.in) / 15) * 100}%` }}
                  />
                ))}
              </div>
              <div className="absolute inset-y-0" style={{ left: `${pct}%`, width: 2, marginLeft: -1, background: "#ff5a1f", boxShadow: "0 0 12px #ff5a1f" }} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={pb.toggle}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-ember text-ink transition-transform hover:scale-105 active:scale-95"
            >
              {pb.playing ? (
                <svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor"><rect x="0" y="0" width="4.5" height="16" rx="1" /><rect x="9.5" y="0" width="4.5" height="16" rx="1" /></svg>
              ) : (
                <svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor"><path d="M1 1l12 7-12 7z" /></svg>
              )}
            </button>

            <button
              onClick={() => pb.seek(0, true)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] transition-colors hover:bg-white/10"
              aria-label="Restart"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
            </button>

            <button
              onClick={() => pb.setMuted(!pb.muted)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] transition-colors hover:bg-white/10"
              aria-label="Mute"
              style={{ color: pb.muted ? "#5a5f66" : "#f1efec" }}
            >
              {pb.muted ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M11 5 6 9H2v6h4l5 4z" /><path d="m22 9-6 6M16 9l6 6" /></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M11 5 6 9H2v6h4l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></svg>
              )}
            </button>

            <span className="font-mono2 text-[11px] tabular-nums tracking-[0.12em] text-fog">
              {fmt(pb.time)} <span className="text-steel">/ 00:15:00</span>
            </span>

            <div className="ml-auto flex items-center gap-1.5">
              {[0.5, 1].map((r) => (
                <button
                  key={r}
                  onClick={() => pb.setRate(r)}
                  className="rounded-md px-2.5 py-1.5 font-mono2 text-[10px] tracking-[0.1em] transition-colors"
                  style={{
                    background: pb.rate === r ? "#ff5a1f" : "rgba(255,255,255,.05)",
                    color: pb.rate === r ? "#08080a" : "#8b9097",
                  }}
                >
                  {r}×
                </button>
              ))}
              <button
                onClick={() => pb.setLoop(!pb.loop)}
                className="rounded-md border px-2.5 py-1.5 font-mono2 text-[10px] tracking-[0.14em]"
                style={{
                  borderColor: pb.loop ? "rgba(255,90,31,.55)" : "rgba(255,255,255,.1)",
                  color: pb.loop ? "#ff5a1f" : "#5a5f66",
                  background: pb.loop ? "rgba(255,90,31,.10)" : "transparent",
                }}
              >
                LOOP
              </button>
            </div>
          </div>
          <p className="font-mono2 text-[9px] tracking-[0.18em] text-steel">
            SPACE PLAY/PAUSE · ← → STEP · SHIFT+← → 1s · R RESTART · M MUTE · L LOOP
          </p>
        </div>
      </div>

      {/* right rail */}
      <div className="order-3 space-y-4">
        <Panel title="SOUNDTRACK" tag="POP / 96">
          <PopAudioMeter playing={pb.playing} />
        </Panel>
        <Panel title="COLOUR SCRIPT" tag="POP / CREAM">
          <div className="grid grid-cols-4 gap-2">
            {[
              { hex: "#ff5a1f", name: "EMBER" },
              { hex: "#ffb03a", name: "GOLD" },
              { hex: "#f6ead6", name: "CREAM" },
              { hex: "#63d6b4", name: "MINT" },
              { hex: "#fffdf7", name: "PAPER" },
              { hex: "#8b9097", name: "ASH" },
              { hex: "#2a2a2c", name: "GRAPHITE" },
              { hex: "#141311", name: "INK" },
            ].map((s) => (
              <div key={s.hex} className="space-y-1.5">
                <div className="h-10 w-full rounded-md" style={{ background: s.hex, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.08)" }} />
                <div className="font-mono2 text-[8px] tracking-[0.12em] text-ash">{s.name}</div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="TYPOGRAPHY">
          <ul className="space-y-3">
            <li>
              <div className="font-display text-[24px] tracking-[0.04em] text-bone">ANTON</div>
              <div className="mt-1 font-mono2 text-[9px] tracking-[0.2em] text-steel">DISPLAY / BOUNCE</div>
            </li>
            <li>
              <div className="font-grotesk text-[18px] font-bold text-bone">Archivo Bold</div>
              <div className="mt-1 font-mono2 text-[9px] tracking-[0.2em] text-steel">STICKERS / LABELS</div>
            </li>
            <li>
              <div className="font-mono2 text-[14px] tracking-[0.2em] text-bone">JETBRAINS MONO</div>
              <div className="mt-1 font-mono2 text-[9px] tracking-[0.2em] text-steel">RIBBONS / META</div>
            </li>
          </ul>
        </Panel>
      </div>
    </main>
  );
}

/* pop audio meter */
function PopAudioMeter({ playing }: { playing: boolean }) {
  const [, force] = useState(0);
  const valsRef = useRef<number[]>(Array(28).fill(0));
  useEffect(() => {
    let raf = 0;
    let n = 0;
    const tick = () => {
      score3.spectrum(valsRef.current);
      if (n++ % 2 === 0) force((x) => x + 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div>
      <div className="flex h-20 items-end gap-[3px]">
        {valsRef.current.map((v: number, i: number) => (
          <span
            key={i}
            className="flex-1 rounded-[1px]"
            style={{
              height: `${Math.max(3, v * 100)}%`,
              background: v > 0.72 ? "#ffb03a" : v > 0.35 ? "#ff5a1f" : "#3a3e45",
              boxShadow: v > 0.5 ? "0 0 8px rgba(255,90,31,.6)" : undefined,
            }}
          />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 font-mono2 text-[10px] tracking-[0.14em]">
        <div className="text-steel">TRACK</div><div className="text-right text-fog">{MUSIC3.title}</div>
        <div className="text-steel">TEMPO</div><div className="text-right text-fog">{MUSIC3.bpm} BPM</div>
        <div className="text-steel">KEY</div><div className="text-right text-fog">{MUSIC3.key}</div>
        <div className="text-steel">INSTRUMENTS</div><div className="text-right text-fog">BASS · RHODES · KIT</div>
      </div>
      <p className="mt-3 font-grotesk text-[10px] leading-relaxed text-ash/70">
        Original score synthesised live — funk bass through a snapping lowpass, Rhodes offbeat
        chops with tremolo, portamento square lead, slapback delay and a vinyl crackle bed. {playing ? "Playing." : "Paused."}
      </p>
    </div>
  );
}
