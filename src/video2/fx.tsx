import type { CSSProperties, ReactNode } from "react";
import { C, W, H } from "./timeline";
import { E, clamp, lerp, p, wander } from "../video/anim";

/* ------------------------------------------------------------------ */
/*  Slow Ken Burns with warm golden grade                              */
/* ------------------------------------------------------------------ */
export function CinPlate({
  src, t, dur = 7, from = 1.02, to = 1.14, x = 0, y = 0, style,
}: {
  src: string; t: number; dur?: number; from?: number; to?: number;
  x?: number; y?: number; style?: CSSProperties;
}) {
  const k = clamp(t / dur);
  const s = lerp(from, to, E.quadInOut(k));
  return (
    <div className="absolute inset-0 overflow-hidden" style={style}>
      <img
        src={src}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          left: "-8%", top: "-8%",
          width: "116%", height: "116%",
          objectFit: "cover",
          transform: `translate3d(${x}px,${y}px,0) scale(${s})`,
          filter: "saturate(.88) contrast(1.05) brightness(.84)",
          willChange: "transform",
        }}
      />
      {/* warm golden grade */}
      <div
        className="absolute inset-0 mix-blend-overlay"
        style={{ background: "radial-gradient(60% 50% at 55% 45%, rgba(255,180,100,.28), transparent 70%)" }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg,rgba(5,6,7,.48),rgba(5,6,7,.1) 35%,rgba(5,6,7,.18) 65%,rgba(5,6,7,.56))" }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Anamorphic horizontal lens flare                                   */
/* ------------------------------------------------------------------ */
export function Anamorphic({ t, x = 0.5, y = 0.4, intensity = 1 }: { t: number; x?: number; y?: number; intensity?: number }) {
  const pulse = 0.62 + 0.38 * Math.sin(t * 0.9);
  const drift = wander(t, 7, 0.08) * 0.05;
  const cx = (x + drift) * 100;
  const cy = y * 100;
  return (
    <div className="pointer-events-none absolute inset-0" style={{ mixBlendMode: "screen", opacity: 0.9 * intensity * pulse }}>
      {/* main streak */}
      <div
        style={{
          position: "absolute", left: 0, right: 0, top: `${cy}%`, height: 120, marginTop: -60,
          background: "linear-gradient(90deg,transparent 0%,rgba(255,200,130,.35) 20%,rgba(255,150,90,.75) 48%,rgba(255,110,60,.7) 52%,rgba(255,200,130,.35) 80%,transparent 100%)",
          filter: "blur(6px)",
        }}
      />
      {/* narrow hot center */}
      <div
        style={{
          position: "absolute", left: 0, right: 0, top: `${cy}%`, height: 28, marginTop: -14,
          background: `linear-gradient(90deg,transparent,rgba(255,240,220,.9) ${cx}%,transparent)`,
          filter: "blur(2px)",
        }}
      />
      {/* color-fringed secondary */}
      <div
        style={{
          position: "absolute", left: 0, right: 0, top: `${cy - 2}%`, height: 50, marginTop: -25,
          background: "linear-gradient(90deg,transparent,rgba(100,200,255,.25) 42%,transparent 58%,rgba(255,120,200,.25) 75%,transparent)",
          filter: "blur(3px)",
        }}
      />
      {/* hot source */}
      <div
        style={{
          position: "absolute", left: `${cx}%`, top: `${cy}%`, width: 180, height: 180, marginLeft: -90, marginTop: -90,
          borderRadius: 999, background: "radial-gradient(circle,rgba(255,240,220,.85),rgba(255,180,100,.3) 45%,transparent 70%)",
          filter: "blur(10px)",
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Floating dust motes                                                */
/* ------------------------------------------------------------------ */
export function Dust({ t, count = 40 }: { t: number; count?: number }) {
  const items = Array.from({ length: count }, (_, i) => {
    const seed = i;
    const speed = 0.08 + (seed % 13) * 0.01;
    const baseX = ((seed * 173) % 100);
    const baseY = ((seed * 57) % 100);
    const x = baseX + Math.sin(t * speed + seed) * 6 + Math.cos(t * speed * 0.7 + seed * 0.3) * 4;
    const y = baseY + Math.cos(t * speed * 0.5 + seed * 0.7) * 8 - (t * 2) % 100;
    const yn = ((y + 100) % 100) - 10;
    const size = 2 + (seed % 4);
    const alpha = 0.25 + ((seed % 7) / 14);
    return { x, y: yn, size, alpha };
  });
  return (
    <div className="pointer-events-none absolute inset-0" style={{ mixBlendMode: "screen" }}>
      {items.map((m, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: `${m.x}%`,
            top: `${m.y}%`,
            width: m.size,
            height: m.size,
            borderRadius: 999,
            background: "rgba(255,230,200,.9)",
            filter: `blur(${m.size > 3 ? 1 : 0}px)`,
            opacity: m.alpha,
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Halation — warm bloom around highlights                            */
/* ------------------------------------------------------------------ */
export function Halation({ t, strength = 0.5 }: { t: number; strength?: number }) {
  const flicker = 0.85 + 0.15 * Math.sin(t * 3.1);
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        mixBlendMode: "screen",
        background: `radial-gradient(70% 50% at 50% 45%, rgba(255,170,100,${0.14 * strength * flicker}), transparent 70%)`,
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Light-leak / film burn streak                                      */
/* ------------------------------------------------------------------ */
export function LightLeak({ t, start, dur = 1.8, dir = 1, hue = 24 }: {
  t: number; start: number; dur?: number; dir?: 1 | -1; hue?: number;
}) {
  const k = (t - start) / dur;
  if (k <= 0 || k >= 1) return null;
  const pos = E.quintInOut(k);
  const fade = Math.sin(k * Math.PI);
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ mixBlendMode: "screen", opacity: fade * 0.7 }}
    >
      <div
        style={{
          position: "absolute", top: "-30%", bottom: "-30%", width: "55%",
          left: dir === 1 ? `${pos * 140 - 30}%` : undefined,
          right: dir === -1 ? `${pos * 140 - 30}%` : undefined,
          background: `linear-gradient(${dir === 1 ? 270 : 90}deg,transparent,rgba(255,${140 + hue},80,.55) 45%,rgba(255,${190 + hue * 0.5},160,.4) 55%,transparent)`,
          filter: "blur(32px)",
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Cinematic post-FX stack: heavy grain + vignette + halation + scan  */
/* ------------------------------------------------------------------ */
export function CinPost({ t }: { t: number }) {
  const gx = Math.floor(t * 18) % 5;
  return (
    <>
      {/* heavy vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(100% 75% at 50% 50%, transparent 35%, rgba(0,0,0,.75) 100%)" }}
      />
      {/* warm halation */}
      <Halation t={t} strength={0.8} />
      {/* grain */}
      <div
        className="pointer-events-none absolute grain mix-blend-overlay"
        style={{
          inset: -260,
          opacity: 0.5,
          transform: `translate(${gx * 36}px,${((gx * 13) % 6) * 28}px)`,
        }}
      />
      {/* subtle scanline */}
      <div className="pointer-events-none absolute inset-0 scan opacity-[0.035]" />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Letterbox bars (scope 2.37:1 on a 16:9 frame)                      */
/* ------------------------------------------------------------------ */
export function Letterbox({ t = 0, height = 120 }: { t?: number; height?: number }) {
  const flicker = 0.97 + 0.03 * Math.sin(t * 6.2);
  return (
    <>
      <div className="absolute inset-x-0 top-0" style={{ height, background: C.ink }} />
      <div className="absolute inset-x-0 bottom-0" style={{ height, background: C.ink }} />
      {/* film gate shadow */}
      <div className="absolute inset-x-0 top-0" style={{ height, boxShadow: "inset 0 -22px 30px rgba(0,0,0,.7)", opacity: flicker }} />
      <div className="absolute inset-x-0 bottom-0" style={{ height, boxShadow: "inset 0 22px 30px rgba(0,0,0,.7)", opacity: flicker }} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Slow fade-to-black / from-black driven by a curve                  */
/* ------------------------------------------------------------------ */
export function CinFade({ t, a, b, c, d }: { t: number; a: number; b: number; c: number; d: number }) {
  // in [a,b] fade up from black; in [c,d] fade back to black
  const up = E.quadOut(p(t, a, b));
  const dn = E.quadIn(p(t, c, d));
  const k = Math.min(1 - up, dn);
  if (k <= 0.001) return null;
  return <div className="pointer-events-none absolute inset-0" style={{ background: C.ink, opacity: k }} />;
}

/* ------------------------------------------------------------------ */
/*  Cinematic credits strip (small, elegant)                           */
/* ------------------------------------------------------------------ */
export function Credits({
  items, t, start, step = 0.35, style,
}: {
  items: { k: string; v: string }[]; t: number; start: number; step?: number; style?: CSSProperties;
}) {
  return (
    <div className="flex items-center gap-8" style={style}>
      {items.map((it, i) => {
        const k = E.quadOut(p(t, start + i * step, start + i * step + 0.6));
        return (
          <div key={it.k} style={{ opacity: k, transform: `translateY(${(1 - k) * 12}px)` }}>
            <div style={{ fontFamily: "var(--font-mono2)", fontSize: 11, letterSpacing: "0.3em", color: "#8b9097" }}>
              {it.k}
            </div>
            <div style={{ fontFamily: "var(--font-grotesk)", fontWeight: 500, fontSize: 14, letterSpacing: "0.06em", color: "#f1efec", marginTop: 4 }}>
              {it.v}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Scope frame: a 1920x810 composition centered in a 1920x1080 area   */
/* ------------------------------------------------------------------ */
export function ScopeFrame({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: "relative", width: W, height: H, background: C.ink, overflow: "hidden", contain: "strict" }}>
      {children}
    </div>
  );
}
