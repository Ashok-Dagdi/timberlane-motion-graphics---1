import { C, F } from "./timeline";
import { E, clamp, lerp, p, wander } from "../video/anim";

/* ------------------------------------------------------------------ */
/*  Dotted grid (case-file paper)                                      */
/* ------------------------------------------------------------------ */
export function DotGrid({ opacity = 0.35, spacing = 36 }: { opacity?: number; spacing?: number }) {
  return (
    <svg className="absolute inset-0" viewBox="0 0 1080 1920" style={{ opacity }}>
      <defs>
        <pattern id="dbpdot" x="0" y="0" width={spacing} height={spacing} patternUnits="userSpaceOnUse">
          <circle cx={spacing / 2} cy={spacing / 2} r={1.2} fill="rgba(198,204,210,.28)" />
        </pattern>
      </defs>
      <rect width="1080" height="1920" fill="url(#dbpdot)" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Heavy border corner brackets (dossier framing)                     */
/* ------------------------------------------------------------------ */
export function HudCorners({ inset = 44, size = 52, color = C.steel, weight = 3 }: {
  inset?: number; size?: number; color?: string; weight?: number;
}) {
  const s = { position: "absolute", width: size, height: size } as const;
  return (
    <>
      <div style={{ ...s, top: inset, left: inset, borderTop: `${weight}px solid ${color}`, borderLeft: `${weight}px solid ${color}` }} />
      <div style={{ ...s, top: inset, right: inset, borderTop: `${weight}px solid ${color}`, borderRight: `${weight}px solid ${color}` }} />
      <div style={{ ...s, bottom: inset, left: inset, borderBottom: `${weight}px solid ${color}`, borderLeft: `${weight}px solid ${color}` }} />
      <div style={{ ...s, bottom: inset, right: inset, borderBottom: `${weight}px solid ${color}`, borderRight: `${weight}px solid ${color}` }} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Rolling "scan" line + glow (file open / case close)                */
/* ------------------------------------------------------------------ */
export function Scanner({ t, start, dur = 0.9, y1 = 0, y2 = 1920 }: {
  t: number; start: number; dur?: number; y1?: number; y2?: number;
}) {
  const k = E.quintInOut(p(t, start, start + dur));
  if (k <= 0.001 || k >= 1) return null;
  const y = lerp(y1, y2, k);
  const fade = Math.sin(k * Math.PI);
  return (
    <>
      <div className="pointer-events-none absolute inset-0" style={{
        background: `linear-gradient(180deg,transparent,rgba(255,90,31,${0.18 * fade}) 46%,transparent 54%)`,
        top: y - 320, height: 640,
        position: "absolute",
      }} />
      <div className="pointer-events-none absolute left-0 right-0" style={{ top: y, height: 3, background: C.ember, boxShadow: "0 0 22px rgba(255,90,31,.9)" }} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Ghost oversized number / letter (background watermark)             */
/* ------------------------------------------------------------------ */
export function GhostBig({ text, t, x, y, size = 420, opacity = 0.12, align = "left" }: {
  text: string; t: number; x: number; y: number; size?: number; opacity?: number; align?: CanvasTextAlign;
}) {
  const wx = wander(t, 11, 0.06) * 20;
  const wy = wander(t, 12, 0.05) * 16;
  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: x + wx, top: y + wy,
        fontFamily: F.d, fontSize: size, lineHeight: 0.9, color: "transparent",
        WebkitTextStroke: `1.5px rgba(198,204,210,${opacity})`,
        textAlign: align, whiteSpace: "@nowrap",
        letterSpacing: "-0.02em",
      }}
    >
      {text}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  The data card from CASE FILE 0043 opening                          */
/* ------------------------------------------------------------------ */
export function CaseCard({ t, start }: { t: number; start: number }) {
  const k = E.backOut(p(t, start, start + 0.7));
  const shudder = wander(t, 30, 3) * 0.4;
  return (
    <div
      style={{
        position: "absolute", inset: "0", display: "grid", placeItems: "center",
        perspective: 1400,
      }}
    >
      <div
        style={{
          width: 900,
          background: C.coal,
          border: `2.5px solid ${C.slate}`,
          boxShadow: `0 40px 90px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,255,255,.04)`,
          transform: `rotateX(${lerp(28, 0, E.expoOut(p(t, start, start + 0.8)))}deg) rotate(${shudder}deg)`,
          opacity: k,
        }}
      >
        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "28px 34px 22px", borderBottom: `2px solid ${C.slate}` }}>
          <div style={{ fontFamily: F.m, fontSize: 21, letterSpacing: "0.42em", color: C.ash }}>CASE FILE</div>
          <div style={{ fontFamily: F.d, fontSize: 56, color: C.ember, letterSpacing: "0.04em" }}>0043</div>
        </div>
        {/* body */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "26px 34px 28px", gap: 0 }}>
          <DataCell k="TYPE" v="4BHK RESIDENCE" t={t} start={start + 0.45} />
          <DataCell k="LOCATION" v="OMR · BENGALURU" t={t} start={start + 0.52} />
          <DataCell k="AREA" v="2200 SQ.FT" t={t} start={start + 0.59} />
          <DataCell k="TIMELINE" v="9 MO · 2024—25" t={t} start={start + 0.66} />
          <DataCell k="PALETTE" v="EMBER·GRAPHITE" t={t} start={start + 0.73} />
          <DataCell k="STATUS" v="CASE CLOSED" vColor={C.ember} t={t} start={start + 0.8} />
        </div>
        {/* footer */}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "20px 34px 22px", borderTop: `2px solid ${C.slate}`, fontFamily: F.m, fontSize: 19, letterSpacing: "0.28em", color: C.steel }}>
          <span>GODREJ AQUA · REV C</span>
          <span>TL-INT · 043/76</span>
        </div>
      </div>
    </div>
  );
}

function DataCell({ k, v, t, start, vColor }: { k: string; v: string; t: number; start: number; vColor?: string }) {
  const row = E.backOut(p(t, start, start + 0.4));
  return (
    <div style={{ padding: "10px 0", borderLeft: `1.5px solid ${C.slate}`, paddingLeft: 18, opacity: row, transform: `translateY(${delay(row)}px)` }}>
      <div style={{ fontFamily: F.m, fontSize: 17, letterSpacing: "0.26em", color: C.steel }}>{k}</div>
      <div style={{ fontFamily: F.m, fontSize: 24, letterSpacing: "0.04em", fontWeight: 700, color: vColor ?? C.fog, marginTop: 6 }}>{v}</div>
    </div>
  );
}
const delay = (r: number) => (1 - r) * 20;

/* ------------------------------------------------------------------ */
/*  Mini outline plan (variant of the 3BHK)                            */
/* ------------------------------------------------------------------ */
export function MiniPlan({ t, start, x, y, w, h }: {
  t: number; start: number; x: number; y: number; w: number; h: number;
}) {
  const d = (s: number) => ({ pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - clamp(E.expoOut(p(t, start + s, start + s + 0.5)), 0, 1) });
  const S = "rgba(198,204,210,.75)";
  return (
    <svg className="absolute" style={{ left: x, top: y, width: w, height: h }} viewBox="0 0 720 800" fill="none">
      <rect x={20} y={20} width={680} height={760} stroke={C.bone} strokeWidth={7} {...d(0)} />
      <g stroke={S} strokeWidth={5}>
        <line x1={20} y1={380} x2={320} y2={380} {...d(0.4)} />
        <line x1={400} y1={380} x2={700} y2={380} {...d(0.45)} />
        <line x1={460} y1={380} x2={460} y2={600} {...d(0.5)} />
        <line x1={20} y1={600} x2={360} y2={600} {...d(0.55)} />
      </g>
      <g stroke={C.ember} strokeWidth={2.5}>
        <path d="M320 380 L320 290 A90 90 0 0 1 410 380" {...d(0.7)} />
        <path d="M460 600 L380 600 A90 90 0 0 1 460 510" {...d(0.75)} />
      </g>
      <g stroke={S} strokeWidth={3}>
        <rect x={60} y={440} width={200} height={70} rx={10} {...d(0.85)} />
        <rect x={480} y={440} width={150} height={120} {...d(0.9)} />
        <rect x={60} y={650} width={100} height={60} rx={20} {...d(0.95)} />
      </g>
      <g fill={C.fog} style={{ fontFamily: F.m, fontSize: 22, letterSpacing: "0.18em" }}>
        <text x={80} y={330} opacity={p(t, start + 1.05, start + 1.3)}>LIVING</text>
        <text x={70} y={570} opacity={p(t, start + 1.15, start + 1.4)}>KITCHEN</text>
        <text x={480} y={415} opacity={p(t, start + 1.2, start + 1.45)}>BED 01</text>
        <text x={60} y={780} opacity={p(t, start + 1.25, start + 1.5)}>BATH</text>
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Row with scan highlight + data masking (dossier list)              */
/* ------------------------------------------------------------------ */
export function SpecRow({ t, start, no, name, note }: {
  t: number; start: number; no: string; name: string; note: string;
}) {
  const k = E.expoOut(p(t, start, start + 0.45));
  if (k <= 0.001) return null;
  const scan = E.quintInOut(p(t, start + 0.05, start + 0.5));
  return (
    <div style={{ position: "relative", padding: "26px 30px", borderBottom: `2px solid ${C.slate}`, opacity: k, transform: `translateY(${delay(k)}px)` }}>
      <div
        className="absolute inset-y-[2px] left-0 right-0"
        style={{
          background: C.ember,
          opacity: scan * 0.08,
          transform: `scaleX(${scan})`,
          transformOrigin: "left",
        }}
      />
      <div style={{ display: "flex", alignItems: "baseline", gap: 22, position: "relative" }}>
        <span style={{ fontFamily: F.m, fontSize: 18, letterSpacing: "0.28em", color: C.ember }}>{no}</span>
        <span style={{ flex: 1 }}>
          <span style={{ fontFamily: F.d, fontSize: 64, color: C.bone, letterSpacing: "0.03em", lineHeight: 1.02, display: "block" }}>{name}</span>
          <span style={{ fontFamily: F.m, fontSize: 20, letterSpacing: "0.18em", color: C.ash, display: "block", marginTop: 8 }}>{note}</span>
        </span>
        <span
          style={{
            fontFamily: F.m, fontSize: 24, color: C.ember,
            opacity: E.backOut(p(t, start + 0.25, start + 0.55)),
            transform: `scale(${E.backOut(p(t, start + 0.25, start + 0.55))})`,
          }}
        >✓</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Before/after wipe (photo card)                                     */
/* ------------------------------------------------------------------ */
export function AfterWipe({ src, t, start, dur = 1.4 }: {
  src: string; t: number; start: number; dur?: number;
}) {
  const k = E.quintInOut(p(t, start, start + dur));
  if (k <= 0.001) return null;
  const x = k * 100;
  const edge = E.expoOut(p(t, start + dur * 0.7, start + dur + 0.4));
  return (
    <div className="absolute inset-0 overflow-hidden">
      <img
        src={src}
        alt=""
        draggable={false}
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover", filter: "saturate(1.12) contrast(1.08) brightness(.92)",
          clipPath: `inset(0 ${100 - x}% 0 0)`,
          willChange: "clip-path",
        }}
      />
      <div className="absolute inset-0" style={{ background: `linear-gradient(90deg,transparent,rgba(255,90,31,${0.35 * edge}) 48%,transparent 52%)` }} />
      {/* edge bar */}
      <div className="absolute inset-y-0" style={{ left: `${x}%`, width: 4, marginLeft: -2, background: C.ember, boxShadow: "0 0 26px rgba(255,90,31,.95)" }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dossier post stack                                                 */
/* ------------------------------------------------------------------ */
export function CasePost({ t }: { t: number }) {
  const gx = Math.floor(t * 20) % 6;
  return (
    <>
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(120% 85% at 50% 44%, transparent 46%, rgba(4,5,7,.72) 100%)" }} />
      <div
        className="pointer-events-none absolute inset-0 mix-blend-screen"
        style={{
          background: `radial-gradient(30% 20% at ${34 + wander(t, 4, 0.2) * 18}% ${28 + wander(t, 9, 0.17) * 18}%,rgba(255,110,40,.12),transparent 70%)`,
        }}
      />
      <div className="pointer-events-none absolute grain mix-blend-overlay" style={{ inset: -220, opacity: 0.36, transform: `translate(${gx * 34}px,${((gx * 13) % 6) * 28}px)` }} />
      <div className="pointer-events-none absolute inset-0 scan opacity-[0.045]" />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  N°0043 header bar — appears on all content cases                   */
/* ------------------------------------------------------------------ */
export function CaseBar({ code, name, shot }: { code: string; name: string; shot: string }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0" style={{ padding: "42px 44px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 18, borderBottom: `2px solid ${C.slate}` }}>
        <div>
          <div style={{ fontFamily: F.m, fontSize: 19, letterSpacing: "0.4em", color: C.ash }}>{code} · {name}</div>
          <div style={{ fontFamily: F.m, fontSize: 24, letterSpacing: "0.18em", color: C.ember, marginTop: 8 }}>{shot}</div>
        </div>
        <div style={{ fontFamily: F.d, fontSize: 64, color: C.fog, letterSpacing: "0.04em" }}>0043</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Count-up number (tabular)                                          */
/* ------------------------------------------------------------------ */
export function CountBig({ t, start, value, suffix, prefix, dur = 1.4, size = 150 }: {
  t: number; start: number; value: number;
  suffix?: string; prefix?: string; dur?: number; size?: number;
}) {
  const k = E.quintInOut(p(t, start, start + dur));
  const v = Math.round(value * k);
  return (
    <div className="tnum" style={{ opacity: k, transform: `translateY(${(1 - E.backOut(p(t, start, start + 0.5))) * 24}px)`, fontFamily: F.d, fontSize: size, color: C.bone, lineHeight: 1 }}>
      {prefix}
      {v.toLocaleString("en-US")}
      {suffix && <span style={{ fontSize: size * 0.38, color: C.ember }}> {suffix}</span>}
    </div>
  );
}
