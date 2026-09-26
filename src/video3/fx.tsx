import type { CSSProperties, ReactNode } from "react";
import { C, F } from "./timeline";
import { E, clamp, lerp, p, rnd } from "../video/anim";

/* ------------------------------------------------------------------ */
/*  Halftone dot field                                                 */
/* ------------------------------------------------------------------ */
export function Dots({
  color = "rgba(20,19,17,.10)",
  size = 26,
  r = 2.2,
  style,
}: {
  color?: string;
  size?: number;
  r?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: `radial-gradient(${color} ${r}px, transparent ${r + 0.6}px)`,
        backgroundSize: `${size}px ${size}px`,
        ...style,
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Image plate with pop grade                                         */
/* ------------------------------------------------------------------ */
export function PopPlate({
  src,
  t,
  dur = 2.5,
  from = 1.06,
  to = 1.18,
  grade = "pop",
  style,
}: {
  src: string;
  t: number;
  dur?: number;
  from?: number;
  to?: number;
  grade?: "pop" | "grey";
  style?: CSSProperties;
}) {
  const s = lerp(from, to, E.quadInOut(clamp(t / dur)));
  return (
    <div className="absolute inset-0 overflow-hidden" style={style}>
      <img
        src={src}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          inset: "-7%",
          width: "114%",
          height: "114%",
          objectFit: "cover",
          transform: `scale(${s})`,
          filter:
            grade === "pop"
              ? "saturate(1.18) contrast(1.06) brightness(.94)"
              : "saturate(.12) contrast(1.06) brightness(.72)",
          willChange: "transform",
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Chunky sticker card with flap-in (rotateX)                         */
/* ------------------------------------------------------------------ */
export function Card({
  x,
  y,
  w,
  h,
  rot = 0,
  bg = C.cream,
  flipX = 0,
  opacity = 1,
  shadow = 10,
  radius = 18,
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  rot?: number;
  bg?: string;
  flipX?: number;
  opacity?: number;
  shadow?: number;
  radius?: number;
  children: ReactNode;
}) {
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, opacity }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          background: bg,
          border: `5px solid ${C.ink}`,
          borderRadius: radius,
          boxShadow: `${shadow}px ${shadow}px 0 ${C.ink}`,
          overflow: "hidden",
          transform: `perspective(1400px) rotateX(${flipX}deg) rotate(${rot}deg)`,
          transformOrigin: "50% 0%",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pill sticker that pops in                                          */
/* ------------------------------------------------------------------ */
export function Sticker({
  x,
  y,
  text,
  t,
  start,
  bg = C.ember,
  fg = C.ink,
  fs = 24,
  rot = -4,
}: {
  x: number;
  y: number;
  text: string;
  t: number;
  start: number;
  bg?: string;
  fg?: string;
  fs?: number;
  rot?: number;
}) {
  const k = E.backOut(p(t, start, start + 0.45));
  if (k <= 0.001) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%,-50%) rotate(${rot}deg) scale(${Math.max(0.001, k)})`,
        background: bg,
        color: fg,
        fontFamily: F.g,
        fontWeight: 800,
        fontSize: fs,
        letterSpacing: "0.08em",
        padding: "12px 24px",
        border: `4px solid ${C.ink}`,
        borderRadius: 999,
        boxShadow: `5px 5px 0 ${C.ink}`,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Spiky starburst badge (SVG), rotating                              */
/* ------------------------------------------------------------------ */
function starPoints(n: number, ro: number, ri: number) {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? ro : ri;
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    pts.push(`${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}

export function Starburst({
  x,
  y,
  size,
  t,
  color = C.gold,
  text = "",
  textColor = C.ink,
  spin = 18,
  scale = 1,
  tilt = 0,
  fs = 34,
  spikes = 14,
}: {
  x: number;
  y: number;
  size: number;
  t: number;
  color?: string;
  text?: string;
  textColor?: string;
  spin?: number;
  scale?: number;
  tilt?: number;
  fs?: number;
  spikes?: number;
}) {
  if (scale <= 0.001) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        transform: `rotate(${tilt}deg) scale(${scale})`,
      }}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        style={{ position: "absolute", inset: 0, transform: `rotate(${t * spin}deg)` }}
      >
        <polygon
          points={starPoints(spikes, 48, 37)}
          fill={color}
          stroke={C.ink}
          strokeWidth={2.6}
          strokeLinejoin="round"
        />
      </svg>
      {text && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            fontFamily: F.d,
            fontSize: fs,
            letterSpacing: "0.04em",
            color: textColor,
            textAlign: "center",
            lineHeight: 0.95,
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Seamless mono marquee ribbon (scrub-safe)                          */
/* ------------------------------------------------------------------ */
export function Marquee({
  t,
  text,
  y,
  h = 64,
  bg = C.ink,
  fg = C.cream,
  fs = 26,
  speed = 150,
  dir = 1,
  slide = 1,
}: {
  t: number;
  text: string;
  y: number;
  h?: number;
  bg?: string;
  fg?: string;
  fs?: number;
  speed?: number;
  dir?: 1 | -1;
  slide?: number;
}) {
  const adv = fs * 0.6; // JetBrains Mono advance = 0.6em
  const seg = text.length * adv;
  const off = (t * speed) % seg;
  const reps = Math.ceil((1080 + seg * 2) / seg);
  const x = dir === 1 ? -seg - off : -seg + off;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: y,
        height: h,
        background: bg,
        overflow: "hidden",
        borderTop: `4px solid ${C.ink}`,
        borderBottom: `4px solid ${C.ink}`,
        opacity: slide,
      }}
    >
      <div
        style={{
          display: "flex",
          whiteSpace: "nowrap",
          transform: `translateX(${x}px)`,
          fontFamily: F.m,
          fontWeight: 700,
          fontSize: fs,
          letterSpacing: "0.14em",
          color: fg,
          lineHeight: `${h - 8}px`,
        }}
      >
        {Array.from({ length: reps }, (_, i) => (
          <span key={i}>{text}</span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bouncing display word — letters pop from below                     */
/* ------------------------------------------------------------------ */
export function PopWord({
  text,
  t,
  start,
  step = 0.05,
  dur = 0.55,
  from = 220,
  rotAmp = 9,
  seed = 0,
  style,
  charStyle,
}: {
  text: string;
  t: number;
  start: number;
  step?: number;
  dur?: number;
  from?: number;
  rotAmp?: number;
  seed?: number;
  style?: CSSProperties;
  charStyle?: CSSProperties;
}) {
  return (
    <span className="inline-flex" style={style}>
      {text.split("").map((ch, i) => {
        const pk = p(t, start + i * step, start + i * step + dur);
        if (pk <= 0) return <span key={i} style={{ display: "inline-block", opacity: 0 }}>{ch === " " ? " " : ch}</span>;
        const k = E.backOut(pk);
        const r = (rnd(i * 3.7 + seed * 11.3) - 0.5) * 2 * rotAmp;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              transform: `translateY(${(1 - k) * from}px) rotate(${(1 - k) * r}deg)`,
              ...charStyle,
            }}
          >
            {ch === " " ? " " : ch}
          </span>
        );
      })}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Deterministic confetti burst                                       */
/* ------------------------------------------------------------------ */
const CONF = [C.ember, C.gold, C.mint, C.ink, C.emberDeep];

export function Confetti({
  t,
  start,
  count = 130,
  ox = 540,
  oy = 240,
  life = 2.6,
}: {
  t: number;
  start: number;
  count?: number;
  ox?: number;
  oy?: number;
  life?: number;
}) {
  const dt = t - start;
  if (dt <= 0 || dt > life) return null;
  const fade = dt > life - 0.7 ? 1 - (dt - (life - 0.7)) / 0.7 : 1;
  const parts = Array.from({ length: count }, (_, i) => {
    const a = rnd(i * 1.37) * Math.PI * 2;
    const sp = 280 + rnd(i * 2.11 + 99) * 760;
    const vx = Math.cos(a) * sp;
    const vy = Math.sin(a) * sp - 560;
    const x = ox + vx * dt + Math.sin(dt * 9 + i) * 26;
    const y = oy + vy * dt + 1500 * dt * dt;
    const rot = rnd(i * 3.3) * 360 + dt * (220 + rnd(i * 1.9) * 420);
    const sz = 9 + rnd(i * 4.7) * 13;
    const round = rnd(i * 6.1) > 0.55;
    return { x, y, rot, sz, round, c: CONF[i % CONF.length] };
  });
  return (
    <div className="pointer-events-none absolute inset-0" style={{ opacity: fade }}>
      {parts.map((m, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: m.x,
            top: m.y,
            width: m.sz,
            height: m.round ? m.sz : m.sz * 0.62,
            borderRadius: m.round ? 999 : 2,
            background: m.c,
            transform: `translate(-50%,-50%) rotate(${m.rot}deg)`,
            border: m.c === C.ink ? undefined : "2px solid rgba(20,19,17,.85)",
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pop post stack — warm vignette + grain                             */
/* ------------------------------------------------------------------ */
export function PopPost({ t }: { t: number }) {
  const gx = Math.floor(t * 20) % 6;
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(105% 80% at 50% 45%, transparent 55%, rgba(20,19,17,.20) 100%)" }}
      />
      <div
        className="pointer-events-none absolute grain mix-blend-multiply"
        style={{
          inset: -240,
          opacity: 0.28,
          transform: `translate(${gx * 34}px,${((gx * 11) % 7) * 26}px)`,
        }}
      />
    </>
  );
}
