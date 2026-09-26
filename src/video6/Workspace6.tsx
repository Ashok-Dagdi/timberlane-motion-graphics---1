import { useEffect, useRef, useState } from "react";
import { Panel } from "../components/Chrome";
import { StoryStage } from "./StoryStage";
import { useStoryPlayback } from "./useStoryPlayback";
import { CHAPTERS, chapterAt, DURATION } from "./timeline";
import { MUSIC, score6 } from "./audio";
import { fmt } from "../video/anim";

export function Title06() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5 py-6">
      <div>
        <p className="font-mono2 text-[10px] tracking-[0.42em] text-ember">PIECE 006 · SHORT STORY · RAMESH</p>
        <h2 className="mt-3 font-display text-[clamp(36px,5.4vw,74px)] leading-[0.92] tracking-[0.01em]">
          HE BOUGHT A FLAT.
          <span className="text-ember"> THEY BUILT A HOME.</span>
        </h2>
      </div>
      <p className="max-w-[460px] font-grotesk text-[13px] leading-relaxed text-ash">
        A 24-second, 9:16 story. Ramesh collects the keys to a 3BHK in Bengaluru, calls Timberlane,
        and watches empty rooms become a life. Eight chapters, a typewriter narration, and an
        original 80&nbsp;BPM short-film score. A composite narrative — not a documented testimonial.
      </p>
    </div>
  );
}

export function Workspace06() {
  const pb = useStoryPlayback(true);
  const ch = chapterAt(pb.time);
  const pct = (pb.time / DURATION) * 100;
  return (
    <main className="grid flex-1 gap-5 xl:grid-cols-[250px_minmax(0,1fr)_290px]">
      <div className="order-2 space-y-4 xl:order-1">
        <Panel title="CHAPTERS" tag={`${ch.no} LIVE`}>
          <ul className="space-y-1">
            {CHAPTERS.map((c) => {
              const on = c.id === ch.id;
              const prog = Math.max(0, Math.min(1, (pb.time - c.in) / (c.out - c.in)));
              return (
                <li key={c.id}>
                  <button onClick={() => pb.seek(c.in, true)} className="flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-white/5" style={{ background: on ? "rgba(255,90,31,.12)" : undefined }}>
                    <span className="mt-0.5 font-mono2 text-[10px]" style={{ color: on ? "#ff5a1f" : "#3a3e45" }}>{c.no}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex justify-between gap-2">
                        <span className="truncate font-mono2 text-[11px] tracking-[0.12em]" style={{ color: on ? "#f1efec" : "#8b9097" }}>{c.name}</span>
                        <span className="font-mono2 text-[9px] text-steel">{c.in.toFixed(0)}s</span>
                      </span>
                      <span className="mt-0.5 block truncate font-grotesk text-[10px] text-ash/70">{c.note}</span>
                      <span className="mt-1.5 block h-[2px] w-full bg-white/8">
                        <span className="block h-full bg-ember" style={{ width: `${on ? prog * 100 : pb.time >= c.out ? 100 : 0}%` }} />
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>
        <Panel title="STORY NOTE">
          <p className="font-grotesk text-[11px] leading-relaxed text-ash">
            Ramesh is a composite homeowner written for the reel — a 3BHK buyer in Bengaluru,
            family of four, calling Timberlane because the rooms were empty. Not a named client case.
          </p>
        </Panel>
      </div>

      <div className="order-1 flex flex-col gap-4 xl:order-2">
        <div className="relative h-[min(62vh,620px)] rounded-2xl border border-white/[0.06] bg-black/40 p-3">
          <StoryStage time={pb.time} playing={pb.playing} onToggle={pb.toggle} />
          <div className="pointer-events-none absolute left-5 top-5 font-mono2 text-[9px] tracking-[0.28em] text-ash/70">CH {ch.no} · {ch.name}</div>
          <div className="pointer-events-none absolute right-5 top-5 font-mono2 text-[9px] tracking-[0.28em] text-ember/80">{pb.playing ? "▶ PLAYING" : "❚❚ PAUSED"}</div>
        </div>
        <div className="glass space-y-3 rounded-xl p-4">
          <div className="mb-1 flex justify-between font-mono2 text-[10px] tabular-nums">
            <span className="text-ember">{fmt(pb.time)}</span>
            <span className="text-steel">00:24:00</span>
          </div>
          <div className="relative h-2 overflow-hidden rounded-full bg-black/40">
            <div className="absolute inset-y-0 left-0 bg-ember" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button onClick={pb.toggle} className="flex h-11 w-11 items-center justify-center rounded-full bg-ember text-ink">
              {pb.playing ? (
                <svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor"><rect width="4.5" height="16" rx="1" /><rect x="9.5" width="4.5" height="16" rx="1" /></svg>
              ) : (
                <svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor"><path d="M1 1l12 7-12 7z" /></svg>
              )}
            </button>
            <button onClick={() => pb.seek(0, true)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10" aria-label="Restart">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
            </button>
            <button onClick={() => pb.setMuted(!pb.muted)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10" aria-label="Mute" style={{ color: pb.muted ? "#5a5f66" : "#f1efec" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5 6 9H2v6h4l5 4z" />{pb.muted && <path d="m22 9-6 6M16 9l6 6" />}</svg>
            </button>
            <span className="font-mono2 text-[11px] text-fog">{fmt(pb.time)} <span className="text-steel">/ 00:24</span></span>
            <div className="ml-auto flex gap-1.5">
              {[0.5, 1].map((r) => (
                <button key={r} onClick={() => pb.setRate(r)} className="rounded-md px-2.5 py-1.5 font-mono2 text-[10px]" style={{ background: pb.rate === r ? "#ff5a1f" : "rgba(255,255,255,.05)", color: pb.rate === r ? "#08080a" : "#8b9097" }}>{r}×</button>
              ))}
              <button onClick={() => pb.setLoop(!pb.loop)} className="rounded-md border px-2.5 py-1.5 font-mono2 text-[10px]" style={{ borderColor: pb.loop ? "rgba(255,90,31,.55)" : "rgba(255,255,255,.1)", color: pb.loop ? "#ff5a1f" : "#5a5f66" }}>LOOP</button>
            </div>
          </div>
        </div>
      </div>

      <div className="order-3 space-y-4">
        <Panel title="SOUNDTRACK" tag="HOME / 80">
          <Meter playing={pb.playing} />
        </Panel>
        <Panel title="CAST">
          <dl className="grid grid-cols-2 gap-y-2 font-mono2 text-[10px] tracking-[0.12em]">
            {[
              ["LEAD", "RAMESH, 34"],
              ["HOME", "3BHK · BENGALURU"],
              ["FAMILY", "FOUR"],
              ["STUDIO", "TIMBERLANE"],
              ["ARC", "KEYS → HOME"],
              ["LENGTH", "00:24"],
            ].map(([k, v]) => (
              <div key={k} className="contents"><dt className="text-steel">{k}</dt><dd className="text-right text-fog">{v}</dd></div>
            ))}
          </dl>
        </Panel>
      </div>
    </main>
  );
}

function Meter({ playing }: { playing: boolean }) {
  const [, force] = useState(0);
  const vals = useRef<number[]>(Array(24).fill(0));
  useEffect(() => {
    let raf = 0;
    let n = 0;
    const tick = () => {
      score6.spectrum(vals.current);
      if (n++ % 2 === 0) force((x) => x + 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div>
      <div className="flex h-16 items-end gap-[3px]">
        {vals.current.map((v, i) => (
          <span key={i} className="flex-1 rounded-[1px]" style={{ height: `${Math.max(4, v * 100)}%`, background: v > 0.45 ? "#ff5a1f" : "#3a3e45" }} />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-y-1 font-mono2 text-[10px] tracking-[0.14em]">
        <div className="text-steel">TRACK</div><div className="text-right text-fog">{MUSIC.title}</div>
        <div className="text-steel">TEMPO</div><div className="text-right text-fog">{MUSIC.bpm} BPM</div>
        <div className="text-steel">KEY</div><div className="text-right text-fog">{MUSIC.key}</div>
      </div>
      <p className="mt-2 font-grotesk text-[10px] leading-relaxed text-ash/70">
        Felt piano and warm pads, a soft pulse from chapter three, and a chime on every page turn. {playing ? "Playing." : "Paused."}
      </p>
    </div>
  );
}
