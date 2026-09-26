import type { CSSProperties, ReactNode } from "react";
import { C } from "./timeline";
import { E, clamp, lerp, p, wander } from "./anim";

/* ------------------------------------------------------------------ */
/*  Image plate with Ken-Burns + colour grade                          */
/* ------------------------------------------------------------------ */
export function Plate({
  src,
  t,
  from = 1.18,
  to = 1.02,
  dur = 4,
  x = 0,
  y = 0,
  rot = 0,
  grade = "warm",
  style,
  className = "",
}: {
  src: string;
  t: number;
  from?: number;
  to?: number;
  dur?: number;
  x?: number;
  y?: number;
  rot?: number;
  grade?: "warm" | "cool" | "mono" | "none" | "blueprint";
  style?: CSSProperties;
  className?: string;
}) {
  const k = clamp(t / dur);
  const s = lerp(from, to, E.quadOut(k));
  const filter =
    grade === "warm"
      ? "saturate(0.82) contrast(1.1) brightness(0.86)"
      : grade === "cool"
        ? "saturate(0.35) contrast(1.15) brightness(0.72)"
        : grade === "mono"
          ? "grayscale(1) contrast(1.22) brightness(0.62)"
          : grade === "blueprint"
            ? "grayscale(1) contrast(1.5) brightness(0.45)"
            : "none";
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} style={style}>
      <img
        src={src}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          inset: "-6%",
          width: "112%",
          height: "112%",
          objectFit: "cover",
          transform: `translate3d(${x}px,${y}px,0) scale(${s}) rotate(${rot}deg)`,
          filter,
          willChange: "transform",
        }}
      />
      {grade === "warm" && (
        <>
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg,rgba(8,8,10,.55),rgba(8,8,10,.1) 40%,rgba(8,8,10,.72))" }}
          />
          <div
            className="absolute inset-0 mix-blend-overlay"
            style={{ background: "radial-gradient(70% 45% at 50% 30%,rgba(255,122,47,.35),transparent 70%)" }}
          />
        </>
      )}
      {grade === "blueprint" && (
        <>
          <div className="absolute inset-0" style={{ background: "rgba(14,15,17,.72)" }} />
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(rgba(139,144,151,.35) 1px,transparent 1px),linear-gradient(90deg,rgba(139,144,151,.35) 1px,transparent 1px)",
              backgroundSize: "54px 54px",
            }}
          />
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Per-character mask reveal                                          */
/* ------------------------------------------------------------------ */
export function Reveal({
  text,
  t,
  start,
  step = 0.028,
  dur = 0.6,
  style,
  charStyle,
  from = 108,
  className = "",
  ease = E.heavyOut,
  rotate = 0,
}: {
  text: string;
  t: number;
  start: number;
  step?: number;
  dur?: number;
  style?: CSSProperties;
  charStyle?: CSSProperties;
  from?: number;
  className?: string;
  ease?: (x: number) => number;
  rotate?: number;
}) {
  return (
    <span className={`inline-flex ${className}`} style={style}>
      {text.split("").map((ch, i) => {
        const k = ease(p(t, start + i * step, start + i * step + dur));
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              overflow: "hidden",
              verticalAlign: "bottom",
              lineHeight: 0.84,
              paddingBottom: "0.06em",
            }}
          >
            <span
              style={{
                display: "inline-block",
                transform: `translateY(${(1 - k) * from}%) rotate(${(1 - k) * rotate}deg)`,
                opacity: k > 0.01 ? 1 : 0,
                ...charStyle,
              }}
            >
              {ch === " " ? "\u00A0" : ch}
            </span>
          </span>
        );
      })}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Line wiped open by a travelling ember edge                         */
/* ------------------------------------------------------------------ */
export function WipeLine({
  t,
  start,
  dur = 0.55,
  children,
  style,
  edge = true,
  dir = "left",
}: {
  t: number;
  start: number;
  dur?: number;
  children: ReactNode;
  style?: CSSProperties;
  edge?: boolean;
  dir?: "left" | "right";
}) {
  const k = E.quintInOut(p(t, start, start + dur));
  const clip = dir === "left" ? `inset(-15% ${(1 - k) * 100}% -15% 0%)` : `inset(-15% 0% -15% ${(1 - k) * 100}%)`;
  return (
    <div style={{ position: "relative", ...style }}>
      <div style={{ clipPath: clip, WebkitClipPath: clip }}>{children}</div>
      {edge && k > 0.001 && k < 0.999 && (
        <div
          style={{
            position: "absolute",
            top: "-12%",
            bottom: "-12%",
            left: dir === "left" ? `${k * 100}%` : `${(1 - k) * 100}%`,
            width: 6,
            background: C.ember,
            boxShadow: `0 0 34px ${C.ember}`,
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Corner viewfinder brackets                                         */
/* ------------------------------------------------------------------ */
export function Brackets({ t, start, inset = 46, size = 62, color = C.ember, w = 3 }: {
  t: number; start: number; inset?: number; size?: number; color?: string; w?: number;
}) {
  const k = E.backOut(p(t, start, start + 0.5));
  const off = (1 - k) * 60;
  const corners = [
    { top: inset, left: inset, bt: true, bl: true, dx: -off, dy: -off },
    { top: inset, right: inset, bt: true, br: true, dx: off, dy: -off },
    { bottom: inset, left: inset, bb: true, bl: true, dx: -off, dy: off },
    { bottom: inset, right: inset, bb: true, br: true, dx: off, dy: off },
  ] as const;
  return (
    <>
      {corners.map((c, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: size,
            height: size,
            top: "top" in c ? c.top : undefined,
            bottom: "bottom" in c ? c.bottom : undefined,
            left: "left" in c ? c.left : undefined,
            right: "right" in c ? c.right : undefined,
            borderTop: "bt" in c ? `${w}px solid ${color}` : undefined,
            borderBottom: "bb" in c ? `${w}px solid ${color}` : undefined,
            borderLeft: "bl" in c ? `${w}px solid ${color}` : undefined,
            borderRight: "br" in c ? `${w}px solid ${color}` : undefined,
            transform: `translate(${c.dx}px,${c.dy}px)`,
            opacity: k,
          }}
        />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Blueprint grid that draws itself in                                */
/* ------------------------------------------------------------------ */
export function DrawGrid({ t, start, dur = 0.9, opacity = 0.16 }: { t: number; start: number; dur?: number; opacity?: number }) {
  const cols = 6;
  const rows = 10;
  return (
    <svg className="absolute inset-0" viewBox="0 0 1080 1920" style={{ opacity }}>
      {Array.from({ length: cols - 1 }, (_, i) => {
        const k = E.expoOut(p(t, start + i * 0.035, start + i * 0.035 + dur));
        const x = ((i + 1) * 1080) / cols;
        return <line key={`v${i}`} x1={x} y1={960 - k * 960} x2={x} y2={960 + k * 960} stroke={C.fog} strokeWidth={1} />;
      })}
      {Array.from({ length: rows - 1 }, (_, i) => {
        const k = E.expoOut(p(t, start + 0.1 + i * 0.025, start + 0.1 + i * 0.025 + dur));
        const y = ((i + 1) * 1920) / rows;
        return <line key={`h${i}`} x1={540 - k * 540} y1={y} x2={540 + k * 540} y2={y} stroke={C.fog} strokeWidth={1} />;
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Timberlane monogram — draws on, then fills                         */
/* ------------------------------------------------------------------ */
export function LogoMark({
  t,
  start,
  size = 180,
  color = C.ember,
  bar = C.bone,
}: {
  t: number;
  start: number;
  size?: number;
  color?: string;
  bar?: string;
}) {
  const draw = E.quintInOut(p(t, start, start + 0.7));
  const fill = E.expoOut(p(t, start + 0.45, start + 1.0));
  const L = 420;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: "visible" }}>
      <rect
        x="4" y="4" width="92" height="92" rx="14"
        fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={L} strokeDashoffset={L * (1 - draw)}
      />
      <g opacity={fill}>
        <rect x="20" y="26" width="60" height="9" rx="2" fill={bar} />
        <rect x="45.5" y="26" width="9" height="50" rx="2" fill={color} />
        <rect x="20" y="43" width="18" height="4" rx="2" fill={bar} opacity={0.5} />
        <rect x="62" y="43" width="18" height="4" rx="2" fill={bar} opacity={0.5} />
        <rect x="20" y="53" width="13" height="4" rx="2" fill={bar} opacity={0.32} />
        <rect x="67" y="53" width="13" height="4" rx="2" fill={bar} opacity={0.32} />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Post FX stack                                                      */
/* ------------------------------------------------------------------ */
export function PostFX({ t, grain = true }: { t: number; grain?: boolean }) {
  const gx = Math.floor(t * 24) % 7;
  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(120% 78% at 50% 44%,transparent 38%,rgba(0,0,0,.62) 100%)" }}
      />
      <div
        className="absolute inset-0 pointer-events-none mix-blend-screen"
        style={{
          background: `radial-gradient(38% 26% at ${20 + wander(t, 3, 0.35) * 26}% ${18 + wander(t, 8, 0.28) * 20}%,rgba(255,110,40,.16),transparent 70%)`,
        }}
      />
      {grain && (
        <div
          className="absolute pointer-events-none grain mix-blend-overlay"
          style={{
            inset: -220,
            opacity: 0.4,
            transform: `translate(${gx * 31}px,${((gx * 17) % 9) * 24}px)`,
          }}
        />
      )}
      <div className="absolute inset-0 pointer-events-none scan opacity-[0.05]" />
    </>
  );
}

/* white / ember flash frames on cuts */
export function Flash({ t, at, dur = 0.16, color = "#ffffff", max = 0.85 }: {
  t: number; at: number; dur?: number; color?: string; max?: number;
}) {
  const k = t < at ? 0 : 1 - E.expoOut(p(t, at, at + dur));
  if (k <= 0.002) return null;
  return <div className="absolute inset-0 pointer-events-none" style={{ background: color, opacity: k * max }} />;
}

/** ember bars that shutter across the frame */
export function Shutter({ t, start, dur = 0.45, bars = 5, dir = 1 }: {
  t: number; start: number; dur?: number; bars?: number; dir?: 1 | -1;
}) {
  const k = p(t, start, start + dur);
  if (k <= 0 || k >= 1) return null;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: bars }, (_, i) => {
        const local = E.quintInOut(clamp((k - i * 0.05) / 0.5));
        const out = E.quintInOut(clamp((k - 0.42 - i * 0.05) / 0.5));
        const h = 1920 / bars;
        const d = i % 2 === 0 ? dir : -dir;
        const xIn = (1 - local) * 1180 * d;
        const xOut = out * -1180 * d;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: i * h,
              left: 0,
              width: 1080,
              height: h + 1,
              background: i % 2 === 0 ? C.ember : C.ember3,
              transform: `translateX(${xIn + xOut}px)`,
            }}
          />
        );
      })}
    </div>
  );
}

/** technical HUD strip */
export function Hud({ t, label, right, opacity = 1 }: { t: number; label: string; right?: string; opacity?: number }) {
  return (
    <div
      className="absolute left-[46px] right-[46px] flex items-center justify-between"
      style={{ bottom: 58, opacity, fontFamily: "var(--font-mono2)", fontSize: 19, letterSpacing: "0.18em", color: C.ash }}
    >
      <span className="flex items-center gap-3">
        <span style={{ width: 8, height: 8, background: C.ember, display: "inline-block", opacity: Math.sin(t * 9) > 0 ? 1 : 0.25 }} />
        {label}
      </span>
      <span>{right}</span>
    </div>
  );
}
