import { useEffect, useRef, useState } from "react";
import { Panel } from "../components/Chrome";
import { CaseStage } from "./CaseStage";
import { useCasePlayback } from "./useCasePlayback";
import { shotAt, SHOTS } from "./timeline";
import { MUSIC, score5 } from "./audio";
import { fmt } from "../video/anim";

export function Title05() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5 py-6">
      <div>
        <p className="font-mono2 text-[10px] tracking-[0.42em] text-ember">PIECE 005 · CASE FILE · GODREJ AQUA 0043</p>
        <h2 className="mt-3 font-display text-[clamp(36px,5.4vw,74px)] leading-[0.92] tracking-[0.01em]">
          A CASE STUDY
          <span className="text-ember"> IN SPACE</span>
        </h2>
      </div>
      <p className="max-w-[440px] font-grotesk text-[13px] leading-relaxed text-ash">
        A 20-second, 9:16 vertical dossier on the Godrej Aqua 4BHK — data cards, plan + zones,
        a material board, before/after, a 5.0-rated testimonial, and the case closed. Original
        104&nbsp;BPM minimal score with Rhodes, glass arps and a diamond-sparkle tail.
      </p>
    </div>
  );
}

export function Workspace05() {
  const pb = useCasePlayback(true);
  const shot = shotAt(pb.time);
  const pct = (pb.time / 20) * 100;
  return (
    <main className="grid flex-1 gap-5 xl:grid-cols-[250px_minmax(0,1fr)_290px]">
      <div className="order-2 space-y-4 xl:order-1">
        <Panel title="SLIDES" tag={`${shot.code} LIVE`}>
          <ul className="space-y-1">
            {SHOTS.map((s) => {
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
                      {s.code}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-mono2 text-[11px] tracking-[0.14em]" style={{ color: on ? "#f1efec" : "#8b9097" }}>
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
              ["FORMAT", "9:16 VERTICAL"],
              ["RESOLUTION", "1080 × 1920"],
              ["DURATION", "20.000 s"],
              ["FRAME RATE", "60 fps RT"],
              ["SLIDES", "8 / ON-BAR"],
              ["GRID", "104 BPM"],
            ].map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-steel">{k}</dt>
                <dd className="text-right text-fog">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel title="DOSSIER NOTES">
          <ul className="space-y-1.5 font-grotesk text-[11px] leading-relaxed text-ash">
            <li>· Godrej Aqua 4BHK · OMR, Bengaluru</li>
            <li>· Data cells, ghost typography, scan lines</li>
            <li>· Plan + zones light-table layout</li>
            <li>· Material board with climbing %</li>
            <li>· Before/after ember wipe</li>
            <li>· 5.0 review · Aarav Sinha</li>
          </ul>
        </Panel>
      </div>

      <div className="order-1 flex flex-col gap-4 xl:order-2">
        <div className="relative h-[min(62vh,620px)] flex-1 rounded-2xl border border-white/[0.06] bg-black/40 p-3 xl:flex-none">
          <CaseStage time={pb.time} playing={pb.playing} onToggle={pb.toggle} />
          <div className="pointer-events-none absolute left-5 top-5 font-mono2 text-[9px] tracking-[0.28em] text-ash/70">
            SLIDE {shot.code} · {shot.name}
          </div>
          <div className="pointer-events-none absolute right-5 top-5 font-mono2 text-[9px] tracking-[0.28em] text-ember/80">
            {pb.playing ? "▶ PLAYING" : "❚❚ PAUSED"}
          </div>
        </div>

        <div className="glass space-y-3 rounded-xl p-4">
          <div>
            <div className="mb-1.5 flex justify-between font-mono2 text-[10px] tabular-nums tracking-[0.14em]">
              <span className="text-ember">{fmt(pb.time)}</span>
              <span className="text-steel">00:20:00</span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-black/40">
              <div className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#ff5a1f,#ffb03a)" }} />
              <div className="absolute inset-0 flex">
                {SHOTS.map((s) => (
                  <div
                    key={s.id}
                    className="h-full border-r border-black/40 last:border-r-0"
                    style={{ width: `${((s.out - s.in) / 20) * 100}%` }}
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
              {fmt(pb.time)} <span className="text-steel">/ 00:20:00</span>
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

      <div className="order-3 space-y-4">
        <Panel title="SOUNDTRACK" tag="DOSSIER / 104">
          <AudioMeter5 playing={pb.playing} />
        </Panel>
        <Panel title="COLOUR SCRIPT" tag="FILE / EMBER">
          <div className="grid grid-cols-4 gap-2">
            {[
              { hex: "#ff5a1f", name: "EMBER" },
              { hex: "#ffb03a", name: "GOLD" },
              { hex: "#c6ccd2", name: "FOG" },
              { hex: "#8d949d", name: "ASH" },
              { hex: "#3c434c", name: "STEEL" },
              { hex: "#151a20", name: "GRPH" },
              { hex: "#0e1216", name: "COAL" },
              { hex: "#eef0f2", name: "BONE" },
            ].map((s) => (
              <div key={s.hex} className="space-y-1.5">
                <div className="h-10 w-full rounded-md" style={{ background: s.hex, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.08)" }} />
                <div className="font-mono2 text-[8px] tracking-[0.12em] text-ash">{s.name}</div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="INSTRUMENTATION">
          <ul className="space-y-1.5 font-grotesk text-[11px] leading-relaxed text-ash">
            <li>· 8th-note subbass pulse</li>
            <li>· Dry 16th ticks · data snaps</li>
            <li>· Rhodes chords on 1 &amp; 3</li>
            <li>· Glass arp with long echo</li>
            <li>· Short hall · reverse swells</li>
            <li>· Diamond-sparkle glock tail</li>
          </ul>
        </Panel>
      </div>
    </main>
  );
}

function AudioMeter5({ playing }: { playing: boolean }) {
  const [, force] = useState(0);
  const valsRef = useRef<number[]>(Array(28).fill(0));
  useEffect(() => {
    let raf = 0;
    let n = 0;
    const tick = () => {
      score5.spectrum(valsRef.current);
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
              background: v > 0.72 ? "#eef0f2" : v > 0.35 ? "#ff5a1f" : "#3a3e45",
              boxShadow: v > 0.5 ? "0 0 8px rgba(255,90,31,.5)" : undefined,
            }}
          />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 font-mono2 text-[10px] tracking-[0.14em]">
        <div className="text-steel">TRACK</div><div className="text-right text-fog">{MUSIC.title}</div>
        <div className="text-steel">TEMPO</div><div className="text-right text-fog">{MUSIC.bpm} BPM</div>
        <div className="text-steel">KEY</div><div className="text-right text-fog">{MUSIC.key}</div>
        <div className="text-steel">STYLE</div><div className="text-right text-fog">MINIMAL DATA</div>
      </div>
      <p className="mt-3 font-grotesk text-[10px] leading-relaxed text-ash/70">
        Original score synthesised live — data-tight sub pulse, dry ticks, Rhodes chords, glass
        arp through long echo, reverse swells into each slide, and a diamond-sparkle glock tail. {playing ? "Playing." : "Paused."}
      </p>
    </div>
  );
}
