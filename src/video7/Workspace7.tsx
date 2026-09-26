import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Panel } from "../components/Chrome";
import { AdComposition } from "./scenes";
import { DURATION, H, SHOTS, W, shotAt } from "./timeline";
import { MUSIC, score7 } from "./audio";
import { fmt } from "../video/anim";

/* ---------------- playback ---------------- */
function useAdPlayback() {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [loop, setLoop] = useState(true);
  const [muted, setMuted] = useState(false);
  const tRef = useRef(0);
  const rateRef = useRef(1);
  const loopRef = useRef(true);
  const raf = useRef(0);
  const last = useRef(0);
  rateRef.current = rate;
  loopRef.current = loop;

  const pause = useCallback(() => {
    setPlaying(false);
    if (raf.current) cancelAnimationFrame(raf.current);
    score7.stop();
  }, []);
  const play = useCallback(() => {
    if (tRef.current >= DURATION - 0.02) { tRef.current = 0; setTime(0); }
    setPlaying(true);
    void score7.start(tRef.current, rateRef.current);
  }, []);
  const toggle = useCallback(() => (playing ? pause() : play()), [playing, pause, play]);
  const seek = useCallback((v: number, resync = false) => {
    const nv = Math.max(0, Math.min(DURATION, v));
    tRef.current = nv;
    setTime(nv);
    if (resync) score7.resync(nv, rateRef.current);
  }, []);

  useEffect(() => {
    if (!playing) return;
    last.current = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last.current) / 1000);
      last.current = now;
      let nt = tRef.current + dt * rateRef.current;
      if (nt >= DURATION) {
        if (loopRef.current) { nt -= DURATION; score7.resync(nt, rateRef.current); }
        else { tRef.current = DURATION; setTime(DURATION); setPlaying(false); score7.stop(); return; }
      }
      tRef.current = nt;
      setTime(nt);
      raf.current = requestAnimationFrame(frame);
    };
    raf.current = requestAnimationFrame(frame);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [playing]);

  useEffect(() => { score7.setMuted(muted); }, [muted]);
  useEffect(() => { if (playing) score7.resync(tRef.current, rate); }, [rate, playing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") { e.preventDefault(); toggle(); }
      else if (e.code === "ArrowRight") seek(tRef.current + (e.shiftKey ? 1 : 1 / 30), true);
      else if (e.code === "ArrowLeft") seek(tRef.current - (e.shiftKey ? 1 : 1 / 30), true);
      else if (e.key.toLowerCase() === "r") seek(0, true);
      else if (e.key.toLowerCase() === "m") setMuted((m) => !m);
      else if (e.key.toLowerCase() === "l") setLoop((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, seek]);

  useEffect(() => () => score7.stop(), []);
  return { time, playing, toggle, seek, rate, setRate, loop, setLoop, muted, setMuted };
}

/* ---------------- stage ---------------- */
function AdStage({ time, playing, onToggle }: { time: number; playing: boolean; onToggle: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setScale(Math.min(r.width / W, r.height / H));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const started = time > 0.001 || playing;
  const shown = started ? time : 1.9; // poster: FINISH headline fully landed
  return (
    <div ref={box} className="relative h-full w-full">
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: W * scale, height: H * scale, transform: "translate(-50%,-50%)", borderRadius: Math.max(10, 24 * scale), overflow: "hidden",
          background: "#0a0a0c", boxShadow: "0 0 0 1px rgba(255,255,255,.08), 0 40px 120px -20px rgba(0,0,0,.95), 0 0 90px -10px rgba(255,90,31,.25)",
        }}
      >
        <div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <AdComposition t={shown} />
        </div>
        <button onClick={onToggle} className="group absolute inset-0 cursor-pointer" aria-label={playing ? "Pause" : "Play"} style={{ background: started && playing ? "transparent" : "rgba(10,10,12,.35)" }}>
          {!playing && (
            <span className="absolute left-1/2 top-1/2 flex items-center justify-center rounded-full transition-transform group-hover:scale-110" style={{ width: 86, height: 86, transform: "translate(-50%,-50%)", background: "#ff5a1f", boxShadow: "0 0 60px rgba(255,90,31,.6)" }}>
              <svg width="28" height="32" viewBox="0 0 28 32" fill="#0a0a0c"><path d="M2 2l24 14L2 30z" /></svg>
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

/* ---------------- page pieces ---------------- */
export function Title07() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5 py-6">
      <div>
        <p className="font-mono2 text-[10px] tracking-[0.42em] text-ember">PIECE 007 · AD CAMPAIGN · MATERIALS &amp; EXECUTION</p>
        <h2 className="mt-3 font-display text-[clamp(36px,5.4vw,74px)] leading-[0.92] tracking-[0.01em]">
          MATERIAL
          <span className="text-ember"> TRUTH.</span>
        </h2>
      </div>
      <p className="max-w-[460px] font-grotesk text-[13px] leading-relaxed text-ash">
        A 20-second, 9:16 campaign spot. You see the finish, then everything under it: an exploded
        five-layer panel, oak, stone and brass up close, a tolerance counter tightening to ±1&nbsp;mm,
        seven QC stages and a site schedule stamped on time. Original 96&nbsp;BPM industrial score.
      </p>
    </div>
  );
}

export function Workspace07() {
  const pb = useAdPlayback();
  const shot = shotAt(pb.time);
  const pct = (pb.time / DURATION) * 100;
  return (
    <main className="grid flex-1 gap-5 xl:grid-cols-[250px_minmax(0,1fr)_290px]">
      <div className="order-2 space-y-4 xl:order-1">
        <Panel title="SPOT BREAKDOWN" tag={`${shot.code} LIVE`}>
          <ul className="space-y-1">
            {SHOTS.map((s) => {
              const on = s.id === shot.id;
              const prog = Math.max(0, Math.min(1, (pb.time - s.in) / (s.out - s.in)));
              return (
                <li key={s.id}>
                  <button onClick={() => pb.seek(s.in, true)} className="flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/5" style={{ background: on ? "rgba(255,90,31,.12)" : undefined }}>
                    <span className="mt-0.5 font-mono2 text-[10px]" style={{ color: on ? "#ff5a1f" : "#3a3e45" }}>{s.code}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex justify-between gap-2">
                        <span className="truncate font-grotesk text-[12px] font-bold tracking-[0.12em]" style={{ color: on ? "#f1efec" : "#8b9097" }}>{s.name}</span>
                        <span className="font-mono2 text-[9px] text-steel">{s.in.toFixed(1)}s</span>
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
        <Panel title="CAMPAIGN LINES">
          <ul className="space-y-2 font-grotesk text-[12px] leading-snug text-fog">
            <li>“You see the finish.”</li>
            <li>“We obsess over what's under it.”</li>
            <li>“Execution is the design.”</li>
            <li>“One team. Every stage.”</li>
            <li className="text-ember">“Material Truth.”</li>
          </ul>
        </Panel>
      </div>

      <div className="order-1 flex flex-col gap-4 xl:order-2">
        <div className="relative h-[min(62vh,620px)] rounded-2xl border border-white/[0.06] bg-black/40 p-3">
          <AdStage time={pb.time} playing={pb.playing} onToggle={pb.toggle} />
          <div className="pointer-events-none absolute left-5 top-5 font-mono2 text-[9px] tracking-[0.28em] text-ash/70">SPOT · {shot.code} {shot.name}</div>
          <div className="pointer-events-none absolute right-5 top-5 font-mono2 text-[9px] tracking-[0.28em] text-ember/80">{pb.playing ? "▶ PLAYING" : "❚❚ PAUSED"}</div>
        </div>
        <div className="glass space-y-3 rounded-xl p-4">
          <div>
            <div className="mb-1.5 flex justify-between font-mono2 text-[10px] tabular-nums tracking-[0.14em]">
              <span className="text-ember">{fmt(pb.time)}</span>
              <span className="text-steel">00:20:00</span>
            </div>
            <div
              className="relative h-2 cursor-pointer overflow-hidden rounded-full bg-black/40"
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                pb.seek(((e.clientX - r.left) / r.width) * DURATION, true);
              }}
            >
              <div className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#3d4148,#ff5a1f)" }} />
              <div className="absolute inset-0 flex">
                {SHOTS.map((s) => (
                  <div key={s.id} className="h-full border-r border-black/50 last:border-r-0" style={{ width: `${((s.out - s.in) / DURATION) * 100}%` }} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button onClick={pb.toggle} className="flex h-11 w-11 items-center justify-center rounded-full bg-ember text-ink transition-transform hover:scale-105">
              {pb.playing ? (
                <svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor"><rect width="4.5" height="16" rx="1" /><rect x="9.5" width="4.5" height="16" rx="1" /></svg>
              ) : (
                <svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor"><path d="M1 1l12 7-12 7z" /></svg>
              )}
            </button>
            <button onClick={() => pb.seek(0, true)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/10" aria-label="Restart">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
            </button>
            <button onClick={() => pb.setMuted(!pb.muted)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/10" aria-label="Mute" style={{ color: pb.muted ? "#5a5f66" : "#f1efec" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M11 5 6 9H2v6h4l5 4z" />{pb.muted ? <path d="m22 9-6 6M16 9l6 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7" />}</svg>
            </button>
            <span className="font-mono2 text-[11px] tabular-nums text-fog">{fmt(pb.time)} <span className="text-steel">/ 00:20:00</span></span>
            <div className="ml-auto flex gap-1.5">
              {[0.5, 1].map((r) => (
                <button key={r} onClick={() => pb.setRate(r)} className="rounded-md px-2.5 py-1.5 font-mono2 text-[10px]" style={{ background: pb.rate === r ? "#ff5a1f" : "rgba(255,255,255,.05)", color: pb.rate === r ? "#08080a" : "#8b9097" }}>{r}×</button>
              ))}
              <button onClick={() => pb.setLoop(!pb.loop)} className="rounded-md border px-2.5 py-1.5 font-mono2 text-[10px]" style={{ borderColor: pb.loop ? "rgba(255,90,31,.55)" : "rgba(255,255,255,.1)", color: pb.loop ? "#ff5a1f" : "#5a5f66" }}>LOOP</button>
            </div>
          </div>
          <p className="font-mono2 text-[9px] tracking-[0.18em] text-steel">SPACE PLAY/PAUSE · ← → STEP · SHIFT+← → 1s · R RESTART · M MUTE · L LOOP</p>
        </div>
      </div>

      <div className="order-3 space-y-4">
        <Panel title="SOUNDTRACK" tag="GRAIN / 96">
          <Meter playing={pb.playing} />
        </Panel>
        <Panel title="MATERIAL PALETTE" tag="EMBER / GREY">
          <div className="grid grid-cols-4 gap-2">
            {[
              ["#ff5a1f", "EMBER"], ["#c8955f", "OAK"], ["#e6e3de", "STONE"], ["#c9a24a", "BRASS"],
              ["#f2f0ec", "BONE"], ["#8b9097", "ASH"], ["#3d4148", "STEEL"], ["#101114", "COAL"],
            ].map(([hex, n]) => (
              <div key={hex} className="space-y-1.5">
                <div className="h-10 w-full rounded-md" style={{ background: hex, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.08)" }} />
                <div className="font-mono2 text-[8px] tracking-[0.12em] text-ash">{n}</div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="COPY NOTE">
          <p className="font-grotesk text-[11px] leading-relaxed text-ash">
            Spec lines (18&nbsp;mm core, ±1&nbsp;mm target, 7 QC stages, 12-week schedule) are campaign placeholders —
            confirm against Timberlane's actual build standards before publishing.
          </p>
        </Panel>
      </div>
    </main>
  );
}

function Meter({ playing }: { playing: boolean }) {
  const [, force] = useState(0);
  const vals = useRef<number[]>(Array(28).fill(0));
  useEffect(() => {
    let raf = 0;
    let n = 0;
    const tick = () => {
      score7.spectrum(vals.current);
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
          <span key={i} className="flex-1 rounded-[1px]" style={{ height: `${Math.max(3, v * 100)}%`, background: v > 0.7 ? "#f2f0ec" : v > 0.35 ? "#ff5a1f" : "#3d4148" }} />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-y-1.5 font-mono2 text-[10px] tracking-[0.14em]">
        <div className="text-steel">TRACK</div><div className="text-right text-fog">{MUSIC.title}</div>
        <div className="text-steel">TEMPO</div><div className="text-right text-fog">{MUSIC.bpm} BPM</div>
        <div className="text-steel">KEY</div><div className="text-right text-fog">{MUSIC.key}</div>
        <div className="text-steel">STYLE</div><div className="text-right text-fog">INDUSTRIAL</div>
      </div>
      <p className="mt-3 font-grotesk text-[10px] leading-relaxed text-ash/70">
        Synthesised live: metallic clank backbeat, hammer hits on every headline slam, circular-saw
        sweeps into each cut, measuring ticks on the tolerance counter, a stamp on the schedule. {playing ? "Playing." : "Paused."}
      </p>
    </div>
  );
}
