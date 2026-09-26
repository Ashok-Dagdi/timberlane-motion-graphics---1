import { useEffect, useRef, useState } from "react";
import { DURATION, SHOTS, shotAt } from "../video/timeline";
import { MUSIC, score } from "../video/audio";
import { fmt } from "../video/anim";

/* ------------------------------------------------------------------ */
export function Panel({ title, tag, children }: { title: string; tag?: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-xl">
      <header className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
        <h3 className="font-mono2 text-[10px] tracking-[0.3em] text-fog/80">{title}</h3>
        {tag && <span className="font-mono2 text-[10px] tracking-[0.2em] text-ember">{tag}</span>}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
export function ShotList({ time, onSeek }: { time: number; onSeek: (v: number) => void }) {
  const active = shotAt(time);
  return (
    <ul className="space-y-1">
      {SHOTS.map((s) => {
        const on = s.id === active.id;
        const prog = Math.max(0, Math.min(1, (time - s.in) / (s.out - s.in)));
        return (
          <li key={s.id}>
            <button
              onClick={() => onSeek(s.in)}
              className="group relative flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/5"
              style={{ background: on ? "rgba(255,90,31,.10)" : undefined }}
            >
              <span
                className="mt-0.5 font-mono2 text-[10px] tabular-nums"
                style={{ color: on ? "#ff5a1f" : "#3a3e45" }}
              >
                {s.code}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span
                    className="truncate font-grotesk text-[12px] font-bold tracking-[0.14em]"
                    style={{ color: on ? "#f1efec" : "#8b9097" }}
                  >
                    {s.name}
                  </span>
                  <span className="font-mono2 text-[9px] tabular-nums text-steel">
                    {s.in.toFixed(1)}s
                  </span>
                </span>
                <span className="mt-0.5 block truncate font-grotesk text-[10px] text-ash/70">{s.note}</span>
                <span className="mt-1.5 block h-[2px] w-full bg-white/8">
                  <span
                    className="block h-full bg-ember"
                    style={{ width: `${on ? prog * 100 : time >= s.out ? 100 : 0}%` }}
                  />
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
const BANDS = 28;
export function AudioMeter({ playing }: { playing: boolean }) {
  const [, force] = useState(0);
  const vals = useRef<number[]>(Array(BANDS).fill(0));
  useEffect(() => {
    let raf = 0;
    let n = 0;
    const tick = () => {
      score.spectrum(vals.current);
      if (n++ % 2 === 0) force((x) => x + 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div>
      <div className="flex h-20 items-end gap-[3px]">
        {vals.current.map((v, i) => (
          <span
            key={i}
            className="flex-1 rounded-[1px]"
            style={{
              height: `${Math.max(3, v * 100)}%`,
              background: v > 0.72 ? "#ff3d00" : v > 0.35 ? "#ff5a1f" : "#3a3e45",
              boxShadow: v > 0.5 ? "0 0 8px rgba(255,90,31,.7)" : undefined,
            }}
          />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 font-mono2 text-[10px] tracking-[0.14em]">
        <Row k="TRACK" v={MUSIC.title} />
        <Row k="TEMPO" v={`${MUSIC.bpm} BPM`} />
        <Row k="KEY" v={MUSIC.key} />
        <Row k="ENGINE" v="WEB AUDIO" />
      </div>
      <p className="mt-3 font-grotesk text-[10px] leading-relaxed text-ash/70">
        Original score, synthesised live in-browser — kick, sub, plate reverb, dotted-8th delay and a
        sidechain duck, all scheduled against the picture clock. {playing ? "Playing." : "Paused."}
      </p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <>
      <span className="text-steel">{k}</span>
      <span className="text-right text-fog">{v}</span>
    </>
  );
}

/* ------------------------------------------------------------------ */
const SWATCHES = [
  { hex: "#ff5a1f", name: "EMBER" },
  { hex: "#ff3d00", name: "FLARE" },
  { hex: "#ffb07c", name: "AMBER" },
  { hex: "#f1efec", name: "BONE" },
  { hex: "#8b9097", name: "ASH" },
  { hex: "#3a3e45", name: "STEEL" },
  { hex: "#17191d", name: "GRAPHITE" },
  { hex: "#08080a", name: "INK" },
];

export function Palette() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {SWATCHES.map((s) => (
        <div key={s.hex} className="space-y-1.5">
          <div
            className="h-10 w-full rounded-md"
            style={{ background: s.hex, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.08)" }}
          />
          <div className="font-mono2 text-[8px] tracking-[0.12em] text-ash">{s.name}</div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
export function Timeline({
  time,
  onScrubStart,
  onScrub,
  onScrubEnd,
}: {
  time: number;
  onScrubStart: () => void;
  onScrub: (v: number) => void;
  onScrubEnd: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const pick = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    onScrub(Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * DURATION);
  };

  useEffect(() => {
    const move = (e: PointerEvent) => dragging.current && pick(e.clientX);
    const up = () => {
      if (!dragging.current) return;
      dragging.current = false;
      onScrubEnd();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  });

  const pct = (time / DURATION) * 100;

  return (
    <div className="select-none">
      <div
        ref={ref}
        onPointerDown={(e) => {
          dragging.current = true;
          onScrubStart();
          pick(e.clientX);
        }}
        className="relative h-14 cursor-pointer overflow-hidden rounded-lg border border-white/8 bg-black/40"
      >
        {/* scene blocks */}
        <div className="absolute inset-0 flex">
          {SHOTS.map((s, i) => (
            <div
              key={s.id}
              className="relative h-full border-r border-black/60 last:border-r-0"
              style={{
                width: `${((s.out - s.in) / DURATION) * 100}%`,
                background: i % 2 ? "rgba(255,255,255,.035)" : "rgba(255,255,255,.015)",
              }}
            >
              <span className="pointer-events-none absolute left-1.5 top-1 font-mono2 text-[8px] tracking-[0.14em] text-steel">
                {s.code}
              </span>
              <span className="pointer-events-none absolute bottom-1 left-1.5 right-1 truncate font-grotesk text-[9px] font-bold tracking-[0.12em] text-ash/70">
                {s.name}
              </span>
            </div>
          ))}
        </div>

        {/* beat grid — 120 BPM */}
        <div className="pointer-events-none absolute inset-0">
          {Array.from({ length: DURATION * 2 + 1 }, (_, i) => (
            <span
              key={i}
              className="absolute top-0"
              style={{
                left: `${(i / (DURATION * 2)) * 100}%`,
                width: 1,
                height: i % 4 === 0 ? 10 : 5,
                background: i % 4 === 0 ? "rgba(255,90,31,.55)" : "rgba(255,255,255,.16)",
              }}
            />
          ))}
        </div>

        {/* played region */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg,rgba(255,90,31,.06),rgba(255,90,31,.20))" }}
        />
        {/* playhead */}
        <div className="pointer-events-none absolute inset-y-0" style={{ left: `${pct}%` }}>
          <div className="h-full w-[2px] -translate-x-1/2 bg-ember" style={{ boxShadow: "0 0 12px #ff5a1f" }} />
          <div className="absolute -top-0 left-0 h-2 w-2 -translate-x-1/2 rotate-45 bg-ember" />
        </div>
      </div>

      <div className="mt-1.5 flex justify-between font-mono2 text-[9px] tabular-nums text-steel">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i}>{(i * 4).toFixed(0)}s</span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
export function Transport({
  playing, onToggle, onRestart, muted, onMute, rate, onRate, loop, onLoop,
  grain, onGrain, guides, onGuides, burnIn, onBurnIn, time,
}: {
  playing: boolean; onToggle: () => void; onRestart: () => void;
  muted: boolean; onMute: () => void; rate: number; onRate: (v: number) => void;
  loop: boolean; onLoop: () => void; grain: boolean; onGrain: () => void;
  guides: boolean; onGuides: () => void; burnIn: boolean; onBurnIn: () => void; time: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <button
        onClick={onToggle}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-ember text-ink transition-transform hover:scale-105 active:scale-95"
      >
        {playing ? (
          <svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor"><rect x="0" y="0" width="4.5" height="16" rx="1" /><rect x="9.5" y="0" width="4.5" height="16" rx="1" /></svg>
        ) : (
          <svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor"><path d="M1 1l12 7-12 7z" /></svg>
        )}
      </button>

      <IconBtn onClick={onRestart} label="Restart">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
      </IconBtn>

      <IconBtn onClick={onMute} label="Mute" on={!muted}>
        {muted ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M11 5 6 9H2v6h4l5 4z" /><path d="m22 9-6 6M16 9l6 6" /></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M11 5 6 9H2v6h4l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></svg>
        )}
      </IconBtn>

      <span className="font-mono2 text-[11px] tabular-nums tracking-[0.12em] text-fog">
        {fmt(time)} <span className="text-steel">/ 00:20:00</span>
      </span>

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        {[0.25, 0.5, 1].map((r) => (
          <button
            key={r}
            onClick={() => onRate(r)}
            className="rounded-md px-2.5 py-1.5 font-mono2 text-[10px] tracking-[0.1em] transition-colors"
            style={{
              background: rate === r ? "#ff5a1f" : "rgba(255,255,255,.05)",
              color: rate === r ? "#08080a" : "#8b9097",
            }}
          >
            {r}×
          </button>
        ))}
        <Toggle on={loop} onClick={onLoop}>LOOP</Toggle>
        <Toggle on={grain} onClick={onGrain}>GRAIN</Toggle>
        <Toggle on={guides} onClick={onGuides}>SAFE</Toggle>
        <Toggle on={burnIn} onClick={onBurnIn}>TC</Toggle>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, label, on = true }: { children: React.ReactNode; onClick: () => void; label: string; on?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] transition-colors hover:bg-white/10"
      style={{ color: on ? "#f1efec" : "#5a5f66" }}
    >
      {children}
    </button>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded-md border px-2.5 py-1.5 font-mono2 text-[10px] tracking-[0.14em] transition-colors"
      style={{
        borderColor: on ? "rgba(255,90,31,.55)" : "rgba(255,255,255,.1)",
        color: on ? "#ff5a1f" : "#5a5f66",
        background: on ? "rgba(255,90,31,.10)" : "transparent",
      }}
    >
      {children}
    </button>
  );
}
