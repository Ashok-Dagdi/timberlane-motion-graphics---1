import type { ReactNode } from "react";
import { BAR, C, F, IMPACTS, STAMP_AT, b, shotAt } from "./timeline";
import { E, clamp, hit, lerp, p, shake, wander } from "../video/anim";
import { Flash, LogoMark, PostFX, Reveal, WipeLine } from "../video/fx";
import { IMG } from "../video/assets";
import { DROP_COUNT, IsoRoom, dropsLanded } from "./iso";

/* ------------------------------------------------------------------ */
/*  shared bits                                                        */
/* ------------------------------------------------------------------ */
const type = (s: string, k: number) => s.slice(0, Math.floor(clamp(k) * s.length));

function Blueprint({ reveal = 1 }: { reveal?: number }) {
  const R = 1500 * reveal;
  const mask = reveal >= 1 ? undefined : `radial-gradient(circle at 50% 50%, #000 ${R}px, transparent ${R + 260}px)`;
  return (
    <div className="absolute inset-0" style={{ background: C.bg }}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(${C.grid2} 1px, transparent 1px), linear-gradient(90deg, ${C.grid2} 1px, transparent 1px), linear-gradient(${C.grid} 2px, transparent 2px), linear-gradient(90deg, ${C.grid} 2px, transparent 2px)`,
          backgroundSize: "27px 27px, 27px 27px, 108px 108px, 108px 108px",
          backgroundPosition: "0 0, 0 0, -1px -1px, -1px -1px",
          maskImage: mask,
          WebkitMaskImage: mask,
        }}
      />
    </div>
  );
}

function StepHead({ t, start, step, a, bLine, aOutline = false }: {
  t: number; start: number; step: string; a: string; bLine: string; aOutline?: boolean;
}) {
  return (
    <div className="absolute" style={{ left: 70, right: 70, top: 130 }}>
      <div style={{ fontFamily: F.m, fontWeight: 700, fontSize: 21, letterSpacing: "0.4em", color: C.ember, marginBottom: 22 }}>
        <Reveal text={step} t={t} start={start} step={0.012} dur={0.35} from={130} />
      </div>
      <WipeLine t={t} start={start + 0.15} dur={0.5}>
        <div
          style={{
            fontFamily: F.d, fontSize: 128, lineHeight: 0.98,
            color: aOutline ? "transparent" : C.bone,
            WebkitTextStroke: aOutline ? `3px ${C.bone}` : undefined,
          }}
        >
          {a}
        </div>
      </WipeLine>
      <WipeLine t={t} start={start + 0.32} dur={0.5}>
        <div style={{ fontFamily: F.d, fontSize: 128, lineHeight: 0.98, color: C.ember }}>{bLine}</div>
      </WipeLine>
    </div>
  );
}

/* ================================================================= */
/*  01 · ORIGIN (0 → 2.22)                                            */
/* ================================================================= */
function SceneOrigin({ t }: { t: number }) {
  const grid = E.expoOut(p(t, 0.02, 1.2));
  const hx = E.expoOut(p(t, 0.05, 0.6));
  const vy = E.expoOut(p(t, 0.12, 0.7));
  const ring = E.quintInOut(p(t, 0.3, 0.95));
  const coord = E.expoOut(p(t, 0.35, 1.3));
  const dive = E.expoIn(p(t, 1.8, BAR));

  return (
    <div className="vframe">
      <Blueprint reveal={grid} />
      <div
        className="absolute inset-0"
        style={{ transform: `scale(${1 + dive * 2.4})`, transformOrigin: "540px 960px", opacity: 1 - dive * 0.9 }}
      >
        {/* crosshair */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 959, height: 2, background: C.ember, transform: `scaleX(${hx})`, boxShadow: `0 0 18px ${C.ember}` }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: 539, width: 2, background: C.ember, transform: `scaleY(${vy})`, boxShadow: `0 0 18px ${C.ember}` }} />

        <svg className="absolute inset-0" viewBox="0 0 1080 1920">
          <circle cx={540} cy={960} r={120} fill="none" stroke={C.bone} strokeWidth={3} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ring} />
          <circle cx={540} cy={960} r={200} fill="none" stroke={C.steel} strokeWidth={2} strokeDasharray="6 10" style={{ transformOrigin: "540px 960px", transform: `rotate(${t * 40}deg)` }} opacity={ring} />
          {Array.from({ length: 24 }, (_, i) => {
            const a = (i / 24) * Math.PI * 2 + t * 0.4;
            const r1 = 210;
            const r2 = i % 6 === 0 ? 246 : 228;
            return (
              <line key={i}
                x1={540 + Math.cos(a) * r1} y1={960 + Math.sin(a) * r1}
                x2={540 + Math.cos(a) * r2} y2={960 + Math.sin(a) * r2}
                stroke={i % 6 === 0 ? C.ember : C.ash} strokeWidth={i % 6 === 0 ? 3 : 1.5} opacity={ring}
              />
            );
          })}
          <circle cx={540} cy={960} r={8 + hit(t, 0.95, 0.4) * 10} fill={C.ember} opacity={ring} />
        </svg>

        {/* coordinates */}
        <div
          className="tnum absolute"
          style={{ left: 580, top: 1010, fontFamily: F.m, fontWeight: 700, fontSize: 24, letterSpacing: "0.08em", color: C.bone, opacity: E.quadOut(p(t, 0.35, 0.6)) }}
        >
          <div>LAT {lerp(0, 12.9716, coord).toFixed(4)}° N</div>
          <div style={{ color: C.ember, marginTop: 6 }}>LON {lerp(0, 77.5946, coord).toFixed(4)}° E</div>
          <div style={{ color: C.ash, marginTop: 6, fontSize: 18 }}>{coord > 0.98 ? "● LOCKED · BENGALURU" : "○ ACQUIRING…"}</div>
        </div>

        {/* title */}
        <div className="absolute" style={{ left: 70, right: 70, top: 330 }}>
          <div style={{ fontFamily: F.m, fontWeight: 700, fontSize: 21, letterSpacing: "0.42em", color: C.ash, marginBottom: 26 }}>
            <Reveal text="TIMBERLANE · DESIGN PROCESS" t={t} start={0.25} step={0.01} dur={0.35} from={130} />
          </div>
          <div style={{ fontFamily: F.d, fontSize: 160, lineHeight: 0.92, color: C.bone }}>
            <Reveal text="FROM" t={t} start={0.38} step={0.035} dur={0.6} />
          </div>
          <div style={{ fontFamily: F.d, fontSize: 160, lineHeight: 0.92, color: C.ember }}>
            <Reveal text="SKETCH" t={t} start={0.52} step={0.035} dur={0.6} />
          </div>
        </div>
        <div className="absolute" style={{ left: 70, right: 70, top: 1250 }}>
          <div style={{ fontFamily: F.d, fontSize: 160, lineHeight: 0.92, color: "transparent", WebkitTextStroke: `3px ${C.bone}` }}>
            <Reveal text="TO SPACE." t={t} start={0.78} step={0.035} dur={0.6} />
          </div>
        </div>

        {/* scale bar */}
        <div className="absolute" style={{ left: 70, bottom: 150, opacity: E.quadOut(p(t, 1.0, 1.3)) }}>
          <div style={{ display: "flex" }}>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} style={{ width: 90, height: 12, background: i % 2 ? "transparent" : C.bone, border: `2px solid ${C.bone}`, transform: `scaleX(${E.expoOut(p(t, 1.0 + i * 0.06, 1.4 + i * 0.06))})`, transformOrigin: "left" }} />
            ))}
          </div>
          <div style={{ fontFamily: F.m, fontSize: 17, letterSpacing: "0.2em", color: C.ash, marginTop: 10 }}>0 · 1 · 2 · 3 · 4 M</div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================= */
/*  02 · FLOOR PLAN (2.22 → 6.67)                                     */
/* ================================================================= */
function D({ d, k, sw = 3, stroke = C.ember, dash }: { d: string; k: number; sw?: number; stroke?: string; dash?: string }) {
  if (k <= 0) return null;
  return (
    <path
      d={d} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="square" strokeLinejoin="miter"
      pathLength={1} strokeDasharray={dash ?? 1} strokeDashoffset={dash ? 0 : 1 - k} opacity={dash ? k : 1}
    />
  );
}

const ROOMS = [
  { x: 60, y: 60, w: 500, h: 320, name: "KITCHEN", area: "14.2 m²", lx: 400, ly: 345 },
  { x: 60, y: 380, w: 500, h: 560, name: "LIVING + DINING", area: "31.6 m²", lx: 250, ly: 650 },
  { x: 560, y: 60, w: 380, h: 360, name: "BEDROOM", area: "15.4 m²", lx: 750, ly: 400 },
  { x: 560, y: 420, w: 380, h: 200, name: "BATH", area: "4.8 m²", lx: 660, ly: 600 },
  { x: 560, y: 620, w: 380, h: 320, name: "BALCONY", area: "6.9 m²", lx: 750, ly: 905 },
];

function ScenePlan({ t }: { t: number }) {
  const L = t - b(1);
  const outer = E.quintInOut(p(L, 0.05, 0.9));
  const inner = E.quintInOut(p(L, 0.6, 1.3));
  const doors = E.quintInOut(p(L, 1.1, 1.5));
  const dims = E.quintInOut(p(L, 0.4, 1.2));
  const dimNum = E.expoOut(p(L, 0.7, 1.6));
  const f = (i: number) => E.quintInOut(p(L, 1.25 + i * 0.07, 1.6 + i * 0.07));
  const lab = (i: number) => E.backOut(p(L, 1.9 + i * 0.1, 2.3 + i * 0.1));
  const hi = L > 2.7 ? Math.floor((L - 2.7) / 0.24) % 6 : -1;
  const tilt = E.cubicInOut(p(L, 3.8, 4.44));
  const fade = E.quadIn(p(L, 4.1, 4.44));
  const compass = E.backOut(p(L, 1.6, 2.2));

  return (
    <div className="vframe" style={{ opacity: 1 - fade }}>
      <Blueprint />
      <div style={{ opacity: 1 - tilt }}>
        <StepHead t={t} start={b(1) + 0.1} step="STEP 01 — PLANNING" a="EVERY LINE" bLine="HAS A PURPOSE." />
      </div>

      <div
        className="absolute"
        style={{
          left: 80, top: 560, width: 920, height: 920,
          transform: `perspective(2400px) rotateX(${tilt * 54.7}deg) rotateZ(${tilt * -45}deg) scale(${1 - tilt * 0.22})`,
          transformOrigin: "50% 50%",
        }}
      >
        <svg viewBox="0 0 1000 1000" width={920} height={920} style={{ overflow: "visible" }}>
          {/* room highlight pulses */}
          {ROOMS.map((r, i) => (
            <rect key={r.name} x={r.x} y={r.y} width={r.w} height={r.h} fill={C.ember} opacity={hi === i ? 0.13 : 0} />
          ))}

          {/* dimensions */}
          <D d="M60,20 L940,20" k={dims} stroke={C.ash} sw={2} />
          <D d="M60,8 L60,32 M940,8 L940,32" k={dims} stroke={C.ash} sw={2} />
          <D d="M20,60 L20,940" k={dims} stroke={C.ash} sw={2} />
          <D d="M8,60 L32,60 M8,940 L32,940" k={dims} stroke={C.ash} sw={2} />
          {dims > 0.3 && (
            <>
              <rect x={440} y={4} width={120} height={32} fill={C.bg} />
              <text className="tnum" x={500} y={28} textAnchor="middle" fill={C.bone} style={{ fontFamily: F.m, fontWeight: 700, fontSize: 22 }}>
                {(11.6 * dimNum).toFixed(2)} M
              </text>
              <g transform="rotate(-90 20 500)">
                <rect x={-40} y={484} width={120} height={32} fill={C.bg} />
                <text className="tnum" x={20} y={508} textAnchor="middle" fill={C.bone} style={{ fontFamily: F.m, fontWeight: 700, fontSize: 22 }}>
                  {(11.6 * dimNum).toFixed(2)} M
                </text>
              </g>
            </>
          )}

          {/* walls */}
          <D d="M60,600 L60,60 L940,60 L940,940 L60,940 L60,680" k={outer} stroke={C.bone} sw={14} />
          <D d="M560,60 L560,290 M560,370 L560,620" k={inner} stroke={C.bone} sw={10} />
          <D d="M560,420 L660,420 M740,420 L940,420" k={inner} stroke={C.bone} sw={10} />
          <D d="M560,620 L940,620" k={inner} stroke={C.bone} sw={10} />
          <D d="M60,380 L300,380" k={inner} stroke={C.bone} sw={10} />
          <D d="M560,620 L560,940" k={inner} stroke={C.fog} sw={3} dash="14 10" />

          {/* doors */}
          <D d="M560,370 L640,370 A80,80 0 0,0 560,290" k={doors} sw={2.5} />
          <D d="M740,420 L740,500 A80,80 0 0,1 660,420" k={doors} sw={2.5} />
          <D d="M60,680 L140,680 A80,80 0 0,0 60,600" k={doors} sw={2.5} />

          {/* furniture */}
          <D d="M80,80 L540,80 L540,150 L150,150 L150,350 L80,350 Z" k={f(0)} />
          <D d="M250,230 L450,230 L450,310 L250,310 Z" k={f(1)} />
          <D d="M90,700 L180,700 L180,920 L90,920 Z M110,720 L160,720 L160,900 L110,900" k={f(2)} />
          <D d="M210,700 L510,700 L510,920 L210,920 Z" k={f(3)} sw={2} />
          <D d="M300,770 L410,770 L410,860 L300,860 Z" k={f(4)} />
          <D d="M250,918 L470,918" k={f(5)} sw={8} />
          <D d="M420,460 A60,60 0 1,1 419.9,460 M350,520 A14,14 0 1,1 349.9,520 M490,520 A14,14 0 1,1 489.9,520" k={f(6)} />
          <D d="M700,110 L900,110 L900,350 L700,350 Z M715,125 L795,125 L795,175 L715,175 Z M805,125 L885,125 L885,175 L805,175 Z" k={f(7)} />
          <D d="M580,80 L620,80 L620,270 L580,270 Z" k={f(8)} />
          <D d="M800,440 L920,440 L920,600 L800,600 Z M815,455 L905,455 L905,585 L815,585 Z" k={f(9)} />
          <D d="M610,450 A22,22 0 1,1 609.9,450" k={f(10)} />
          <D d="M660,760 A30,30 0 1,1 659.9,760 M780,760 A30,30 0 1,1 779.9,760 M880,700 A24,24 0 1,1 879.9,700" k={f(11)} />

          {/* labels */}
          {ROOMS.map((r, i) => {
            const k = lab(i);
            if (k <= 0.001) return null;
            return (
              <g key={r.name} transform={`translate(${r.lx} ${r.ly}) scale(${Math.max(0.001, k)})`}>
                <text textAnchor="middle" fill={C.bone} style={{ fontFamily: F.m, fontWeight: 700, fontSize: 22, letterSpacing: "0.12em" }}>
                  {r.name}
                </text>
                <text y={26} textAnchor="middle" fill={C.ember} style={{ fontFamily: F.m, fontWeight: 700, fontSize: 18 }}>
                  {r.area}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* compass + meta */}
      <div style={{ opacity: 1 - tilt }}>
        <div className="absolute" style={{ right: 80, bottom: 170, width: 120, height: 120, transform: `scale(${Math.max(0.001, compass)})` }}>
          <svg viewBox="0 0 100 100" width={120} height={120} style={{ transform: `rotate(${(1 - compass) * -180}deg)` }}>
            <circle cx={50} cy={50} r={44} fill="none" stroke={C.ash} strokeWidth={2} />
            <polygon points="50,10 60,50 50,44 40,50" fill={C.ember} />
            <polygon points="50,90 60,50 50,56 40,50" fill={C.steel} />
            <text x={50} y={8} textAnchor="middle" fill={C.bone} style={{ fontFamily: F.m, fontWeight: 700, fontSize: 12 }}>N</text>
          </svg>
        </div>
        <div
          className="absolute"
          style={{
            left: 80, bottom: 200, fontFamily: F.m, fontWeight: 700, fontSize: 22, letterSpacing: "0.2em", color: C.fog,
            opacity: E.quadOut(p(L, 1.8, 2.2)),
          }}
        >
          <div>2 BHK · 1,240 SQ FT</div>
          <div style={{ color: C.ash, fontSize: 18, marginTop: 8 }}>SCALE 1:50 · DWG TL-004</div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================= */
/*  03 · ISO BUILD (6.67 → 11.11)                                     */
/* ================================================================= */
function SceneBuild({ t, under = 1 }: { t: number; under?: number }) {
  const L = t - b(3);
  const push = E.expoIn(p(L, 3.9, 4.44));
  const landed = dropsLanded(t);
  return (
    <div className="vframe" style={{ opacity: under }}>
      <Blueprint />
      <div className="absolute inset-0" style={{ transform: `scale(${1 + push * 0.6})`, transformOrigin: "540px 1000px" }}>
        <IsoRoom t={t} />
      </div>
      <div style={{ opacity: 1 - push }}>
        <StepHead t={t} start={b(3) + 0.1} step="STEP 02 — 3D VISUALISATION" a="WE BUILD IT" bLine="IN 3D FIRST." />
        <div className="absolute" style={{ left: 80, right: 80, bottom: 150 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: F.m, fontWeight: 700, fontSize: 20, letterSpacing: "0.2em", color: C.fog, marginBottom: 14 }}>
            <span>MODULES PLACED</span>
            <span className="tnum" style={{ color: C.ember }}>
              {String(landed).padStart(2, "0")} / {String(DROP_COUNT).padStart(2, "0")}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {Array.from({ length: DROP_COUNT }, (_, i) => (
              <span key={i} style={{ flex: 1, height: 12, background: i < landed ? C.ember : C.grid, boxShadow: i < landed ? `0 0 12px ${C.ember}` : undefined }} />
            ))}
          </div>
          <div style={{ marginTop: 14, fontFamily: F.m, fontSize: 17, letterSpacing: "0.2em", color: C.ash }}>
            LOD 400 · ISO 30° · RENDER-READY
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================= */
/*  04 · RENDER (11.11 → 15.56)                                       */
/* ================================================================= */
type Callout = { x: number; y: number; label: string };
const PANELS: { img: string; a: string; bLine: string; outline: boolean; calls: Callout[] }[] = [
  {
    img: IMG.kitchen, a: "SKETCH", bLine: "TO SPACE.", outline: true,
    calls: [
      { x: 300, y: 720, label: "QUARTZ TOP · 20 MM" },
      { x: 780, y: 600, label: "3000K WARM LED" },
      { x: 360, y: 1180, label: "SOFT-CLOSE HINGES" },
      { x: 760, y: 1360, label: "MATTE LAMINATE" },
    ],
  },
  {
    img: IMG.livingHero, a: "EXACTLY", bLine: "AS DRAWN.", outline: false,
    calls: [
      { x: 340, y: 660, label: "OAK VENEER · 18 MM" },
      { x: 760, y: 880, label: "ACCENT LIGHT · 2700K" },
      { x: 320, y: 1200, label: "BOUCLÉ UPHOLSTERY" },
      { x: 740, y: 1400, label: "ENGINEERED OAK FLOOR" },
    ],
  },
];

function CalloutPin({ c, scanY, t, i }: { c: Callout; scanY: number; t: number; i: number }) {
  const since = (scanY - c.y) / 1920 / 0.9; // normalised by scan speed
  const k = clamp(since * 6);
  if (k <= 0) return null;
  const right = c.x < 540;
  const len = 120;
  const lk = E.expoOut(clamp(since * 6 - 0.3));
  const pulse = 1 + (Math.sin(t * 6 + i) * 0.5 + 0.5) * 0.8;
  return (
    <div className="absolute" style={{ left: c.x, top: c.y }}>
      <span style={{ position: "absolute", left: -22 * pulse, top: -22 * pulse, width: 44 * pulse, height: 44 * pulse, borderRadius: 99, border: `2px solid ${C.ember}`, opacity: 0.7 / pulse }} />
      <span style={{ position: "absolute", left: -10, top: -10, width: 20, height: 20, borderRadius: 99, background: C.ember, border: `3px solid ${C.bone}`, transform: `scale(${E.backOut(k)})` }} />
      <span style={{ position: "absolute", top: -1, height: 2, width: len * lk, left: right ? 10 : -10 - len * lk, background: C.bone }} />
      <div
        style={{
          position: "absolute", top: -22, whiteSpace: "nowrap",
          left: right ? 10 + len + 6 : undefined, right: right ? undefined : 10 + len + 6,
          background: "rgba(8,8,10,.82)", border: `2px solid ${C.ember}`, padding: "8px 14px",
          fontFamily: F.m, fontWeight: 700, fontSize: 19, letterSpacing: "0.08em", color: C.bone,
          opacity: clamp(since * 6 - 0.6), transform: `translateX(${(1 - clamp(since * 6 - 0.6)) * (right ? -16 : 16)}px)`,
        }}
      >
        {c.label}
      </div>
    </div>
  );
}

function SceneRender({ t }: { t: number }) {
  const L = t - b(5);
  const idx = L < BAR ? 0 : 1;
  const local = L - idx * BAR;
  const P0 = PANELS[idx];
  const scan = E.cubicInOut(p(local, 0.1, 1.4));
  const scanY = scan * 1920;
  const pct = Math.round(scan * 100);
  const exit = idx === 1 ? E.quintInOut(p(local, 1.78, BAR)) : 0;
  const clip = `inset(${exit * 10.42}% ${exit * 8.33}% ${exit * 48.96}% ${exit * 8.33}% round ${exit * 4}px)`;
  const kb = 1.02 + local * 0.02;

  return (
    <div className="vframe" style={{ background: C.sheet }}>
      <div className="absolute inset-0" style={{ clipPath: clip, WebkitClipPath: clip }}>
        <div className="absolute inset-0" style={{ transform: `scale(${kb})`, willChange: "transform" }}>
          {/* edge-detected sketch */}
          <div className="absolute inset-0" style={{ background: C.bg, willChange: "transform" }}>
            <img
              src={P0.img} alt="" draggable={false}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(1) contrast(1.25) brightness(.5)", opacity: 0.4 }}
            />
            <img
              src={P0.img} alt="" draggable={false}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "url(#edge4)", mixBlendMode: "screen", opacity: 0.95 }}
            />
            <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(${C.grid2} 1px, transparent 1px), linear-gradient(90deg, ${C.grid2} 1px, transparent 1px)`, backgroundSize: "54px 54px", opacity: 0.6, mixBlendMode: "screen" }} />
          </div>
          {/* photo, revealed by the scan */}
          <div className="absolute inset-0" style={{ clipPath: `inset(0 0 ${100 - scan * 100}% 0)`, WebkitClipPath: `inset(0 0 ${100 - scan * 100}% 0)`, willChange: "transform" }}>
            <img src={P0.img} alt="" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "saturate(.9) contrast(1.08) brightness(.9)" }} />
            <div className="absolute inset-0 mix-blend-overlay" style={{ background: "radial-gradient(70% 45% at 50% 40%, rgba(255,122,47,.3), transparent 70%)" }} />
          </div>
        </div>

        {/* scan bar */}
        {scan > 0.001 && scan < 0.999 && (
          <>
            <div style={{ position: "absolute", left: 0, right: 0, top: scanY - 160, height: 160, background: "linear-gradient(180deg, transparent, rgba(255,90,31,.28))" }} />
            <div style={{ position: "absolute", left: 0, right: 0, top: scanY - 2, height: 4, background: C.ember, boxShadow: `0 0 30px 8px ${C.ember}` }} />
            <div className="tnum" style={{ position: "absolute", right: 30, top: scanY + 12, background: C.ember, color: C.ink, fontFamily: F.m, fontWeight: 700, fontSize: 20, padding: "6px 12px", letterSpacing: "0.1em" }}>
              RENDER {String(pct).padStart(3, "0")}%
            </div>
          </>
        )}

        {/* legibility */}
        <div className="absolute inset-x-0 top-0" style={{ height: 620, background: "linear-gradient(180deg, rgba(8,8,10,.85), rgba(8,8,10,.4) 60%, transparent)" }} />
        <div className="absolute inset-x-0 bottom-0" style={{ height: 320, background: "linear-gradient(0deg, rgba(8,8,10,.85), transparent)" }} />

        {P0.calls.map((c, i) => (
          <CalloutPin key={`${idx}-${i}`} c={c} scanY={scanY} t={t} i={i} />
        ))}

        <StepHead t={t} start={b(5 + idx) + 0.12} step={`STEP 03 — RENDER PASS 0${idx + 1}`} a={P0.a} bLine={P0.bLine} aOutline={P0.outline} />

        <div className="absolute" style={{ left: 70, right: 70, bottom: 130, display: "flex", justifyContent: "space-between", fontFamily: F.m, fontWeight: 700, fontSize: 19, letterSpacing: "0.2em", color: C.fog }}>
          <span>PASS 0{idx + 1}/02 · 2048 SPP</span>
          <span style={{ color: scan >= 1 ? C.ember : C.ash }}>{scan >= 1 ? "● COMPLETE" : "○ DENOISING"}</span>
        </div>
      </div>
    </div>
  );
}

/* ================================================================= */
/*  05 · TITLE BLOCK (15.56 → 20)                                     */
/* ================================================================= */
const ROWS: { k: string; v: string; big?: boolean }[] = [
  { k: "CLIENT", v: "YOU" },
  { k: "DESIGNED BY", v: "TIMBERLANE INTERIORS" },
  { k: "LOCATION", v: "BENGALURU, KA" },
];

function Cell({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return <div style={{ position: "absolute", ...style }}>{children}</div>;
}

function SceneTitle({ t }: { t: number }) {
  const L = t - b(7);
  const SL = STAMP_AT - b(7);
  const border = E.quintInOut(p(L, 0.0, 0.6));
  const hLine = (i: number) => E.expoOut(p(L, 0.25 + i * 0.06, 0.75 + i * 0.06));
  const vLine = E.expoOut(p(L, 0.45, 0.95));
  const sig = E.quintInOut(p(L, 1.05, 1.6));

  // stamp
  const sk = p(L, SL - 0.18, SL);
  const since = L - SL;
  const sScale = sk <= 0 ? 0 : since < 0 ? lerp(2.8, 1, E.quadIn(sk)) : 1 + Math.exp(-since * 14) * Math.sin(since * 50) * 0.05;
  const sShake = shake(L, SL, 0.35, 18) * 8;
  const ringK = p(L, SL, SL + 0.7);

  const ctaK = E.backOut(p(L, SL + 0.3, SL + 0.75));
  const url = "timberlane.co.in";

  const TY = 1030;
  const rowY = [TY, TY + 170, TY + 280, TY + 390, TY + 500, TY + 560];

  return (
    <div className="vframe" style={{ background: C.sheet }}>
      <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(${C.grid2} 1px, transparent 1px), linear-gradient(90deg, ${C.grid2} 1px, transparent 1px)`, backgroundSize: "27px 27px", opacity: 0.5 }} />

      <svg className="absolute inset-0" viewBox="0 0 1080 1920">
        <rect x={40} y={40} width={1000} height={1840} fill="none" stroke={C.bone} strokeWidth={4} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - border} />
        <rect x={56} y={56} width={968} height={1808} fill="none" stroke={C.steel} strokeWidth={1.5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - border} />
        {/* dimension above frame */}
        <g opacity={border}>
          <line x1={90} y1={180} x2={990} y2={180} stroke={C.ash} strokeWidth={2} />
          <line x1={90} y1={168} x2={90} y2={192} stroke={C.ash} strokeWidth={2} />
          <line x1={990} y1={168} x2={990} y2={192} stroke={C.ash} strokeWidth={2} />
          <rect x={480} y={166} width={120} height={28} fill={C.sheet} />
          <text x={540} y={188} textAnchor="middle" fill={C.fog} style={{ fontFamily: F.m, fontWeight: 700, fontSize: 19 }}>9.00 M</text>
        </g>
        {/* table lines */}
        {rowY.map((y, i) => (
          <line key={i} x1={90} x2={90 + 900 * hLine(i)} y1={y} y2={y} stroke={i === 0 || i === 5 ? C.bone : C.steel} strokeWidth={i === 0 || i === 5 ? 3 : 1.5} />
        ))}
        <line x1={90} x2={90} y1={TY} y2={TY + 560 * vLine} stroke={C.bone} strokeWidth={3} />
        <line x1={990} x2={990} y1={TY} y2={TY + 560 * vLine} stroke={C.bone} strokeWidth={3} />
        <line x1={440} x2={440} y1={TY} y2={TY + 170 * vLine} stroke={C.steel} strokeWidth={1.5} />
        <line x1={380} x2={380} y1={TY + 170} y2={TY + 170 + 330 * vLine} stroke={C.steel} strokeWidth={1.5} />
        {[315, 540, 765].map((x) => (
          <line key={x} x1={x} x2={x} y1={TY + 500} y2={TY + 500 + 60 * vLine} stroke={C.steel} strokeWidth={1.5} />
        ))}
        {/* signature */}
        <path
          d="M620,1255 C640,1225 660,1285 680,1245 S720,1225 740,1262 S780,1280 800,1238 S840,1262 870,1250"
          fill="none" stroke={C.ember} strokeWidth={3.5} strokeLinecap="round"
          pathLength={1} strokeDasharray={1} strokeDashoffset={1 - sig}
        />
      </svg>

      {/* header */}
      <div className="absolute" style={{ left: 90, right: 90, top: 92, display: "flex", justifyContent: "space-between", fontFamily: F.m, fontWeight: 700, fontSize: 20, letterSpacing: "0.16em" }}>
        <span style={{ color: C.bone }}>{type("DWG NO. TL-2026-004", p(L, 0.2, 0.7))}</span>
        <span style={{ color: C.ember }}>{type("ISSUED FOR CONSTRUCTION", p(L, 0.35, 0.95))}</span>
      </div>

      {/* drawing frame (match-cut from the render) */}
      <div className="absolute overflow-hidden" style={{ left: 90, top: 200, width: 900, height: 780, border: `3px solid ${C.bone}`, borderRadius: 4 }}>
        <img src={IMG.livingHero} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.04 + L * 0.012})`, filter: "saturate(.9) contrast(1.08) brightness(.9)" }} />
        <div className="absolute inset-0 mix-blend-overlay" style={{ background: "radial-gradient(70% 55% at 50% 40%, rgba(255,122,47,.3), transparent 70%)" }} />
        <div className="absolute" style={{ left: 18, bottom: 16, background: "rgba(8,8,10,.8)", padding: "6px 12px", fontFamily: F.m, fontWeight: 700, fontSize: 17, letterSpacing: "0.14em", color: C.bone }}>
          VIEW A · LIVING — AS BUILT
        </div>
      </div>

      {/* title block contents */}
      <Cell style={{ left: 110, top: TY + 30, display: "flex", alignItems: "center", gap: 18, opacity: E.quadOut(p(L, 0.55, 0.9)) }}>
        <LogoMark t={t} start={b(7) + 0.5} size={96} color={C.ember} bar={C.bone} />
        <div>
          <div style={{ fontFamily: F.d, fontSize: 50, color: C.bone, letterSpacing: "0.04em", lineHeight: 1 }}>TIMBERLANE</div>
          <div style={{ fontFamily: F.m, fontWeight: 700, fontSize: 15, letterSpacing: "0.36em", color: C.ash, marginTop: 6 }}>INTERIORS</div>
        </div>
      </Cell>
      <Cell style={{ left: 465, top: TY + 30 }}>
        <div style={{ fontFamily: F.m, fontWeight: 700, fontSize: 16, letterSpacing: "0.26em", color: C.ash }}>PROJECT</div>
        <div style={{ fontFamily: F.d, fontSize: 64, color: C.ember, lineHeight: 1.05, marginTop: 8 }}>{type("YOUR DREAM", p(L, 0.7, 1.0))}</div>
        <div style={{ fontFamily: F.d, fontSize: 64, color: C.bone, lineHeight: 1.0 }}>{type("HOME", p(L, 0.95, 1.1))}</div>
      </Cell>
      {ROWS.map((r, i) => (
        <div key={r.k}>
          <Cell style={{ left: 110, top: rowY[i + 1] + 40, fontFamily: F.m, fontWeight: 700, fontSize: 18, letterSpacing: "0.22em", color: C.ash, opacity: hLine(i + 1) }}>
            {r.k}
          </Cell>
          <Cell style={{ left: 405, top: rowY[i + 1] + 30, fontFamily: F.d, fontSize: 44, color: C.bone, letterSpacing: "0.02em" }}>
            {type(r.v, p(L, 0.9 + i * 0.22, 1.3 + i * 0.22))}
          </Cell>
        </div>
      ))}
      {["SCALE 1:1", "SHEET 01/01", "REV A", "2026"].map((s, i) => (
        <Cell key={s} style={{ left: 90 + i * 225, width: 225, top: rowY[4] + 18, textAlign: "center", fontFamily: F.m, fontWeight: 700, fontSize: 18, letterSpacing: "0.16em", color: i === 2 ? C.ember : C.fog, opacity: E.quadOut(p(L, 1.5 + i * 0.06, 1.8 + i * 0.06)) }}>
          {s}
        </Cell>
      ))}

      {/* stamp */}
      {ringK > 0 && ringK < 1 && (
        <div style={{ position: "absolute", left: 700 - 200, top: 1300 - 200, width: 400, height: 400, borderRadius: 999, border: `5px solid ${C.ember}`, transform: `scale(${0.3 + E.expoOut(ringK) * 1.8})`, opacity: (1 - ringK) * 0.7 }} />
      )}
      {sk > 0 && (
        <div
          style={{
            position: "absolute", left: 700 - 240, top: 1300 - 95, width: 480, height: 190,
            transform: `translate(${sShake}px, ${sShake * 0.6}px) rotate(-13deg) scale(${sScale})`,
            opacity: Math.min(1, sk * 2) * 0.94,
            border: `7px solid ${C.ember}`, borderRadius: 14, padding: 7,
            boxShadow: since < 0 ? `0 ${40 * (1 - sk)}px 60px rgba(0,0,0,.5)` : undefined,
          }}
        >
          <div style={{ width: "100%", height: "100%", border: `3px solid ${C.ember}`, borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ fontFamily: F.d, fontSize: 98, color: C.ember, letterSpacing: "0.06em", lineHeight: 0.95 }}>APPROVED</div>
            <div style={{ fontFamily: F.m, fontWeight: 700, fontSize: 16, letterSpacing: "0.3em", color: C.ember, marginTop: 4 }}>TIMBERLANE · QC PASSED</div>
            <div className="grain absolute" style={{ inset: -40, opacity: 0.55, mixBlendMode: "multiply" }} />
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="absolute inset-x-0 flex justify-center" style={{ top: 1650 }}>
        {ctaK > 0.001 && (
          <div
            style={{
              transform: `scale(${ctaK})`, background: C.ember, color: C.ink, borderRadius: 999,
              padding: "24px 52px", fontFamily: F.g, fontWeight: 800, fontSize: 32, letterSpacing: "0.08em",
              boxShadow: `0 18px 60px rgba(255,90,31,.45)`, whiteSpace: "nowrap",
            }}
          >
            BOOK A FREE DESIGN CONSULT →
          </div>
        )}
      </div>
      <div className="absolute inset-x-0 text-center" style={{ top: 1768, fontFamily: F.m, fontWeight: 700, fontSize: 32, letterSpacing: "0.06em", color: C.bone }}>
        {type(url, p(L, SL + 0.55, SL + 1.0))}
        {L > SL + 0.5 && <span style={{ color: C.ember, opacity: Math.sin(L * 14) > 0 ? 1 : 0.2 }}>_</span>}
        <div style={{ marginTop: 8, fontSize: 22, letterSpacing: "0.24em", color: C.ash, opacity: E.quadOut(p(L, SL + 0.9, SL + 1.2)) }}>+91 88846 51111</div>
      </div>
    </div>
  );
}

/* ================================================================= */
/*  COMPOSITION                                                       */
/* ================================================================= */
export function DraftComposition({ t }: { t: number }) {
  let sx = wander(t, 1, 0.3) * 3;
  let sy = wander(t, 2, 0.26) * 3;
  let sr = 0;
  let sc = 1;
  IMPACTS.forEach((im, i) => {
    const a = shake(t, im, 0.3, 11 + i);
    sx += a * 9;
    sy += a * 6;
    sr += a * 0.2;
    sc += hit(t, im, 0.4) * 0.012;
  });
  const shot = shotAt(t);
  const buildUnder = t >= b(3) - 0.27 && t < b(3) ? p(t, b(3) - 0.27, b(3)) : 1;

  return (
    <div style={{ position: "relative", width: 1080, height: 1920, background: C.bg, overflow: "hidden", contain: "strict" }}>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <defs>
          <filter id="edge4" colorInterpolationFilters="sRGB">
            <feColorMatrix type="saturate" values="0" />
            <feGaussianBlur stdDeviation="1.3" />
            <feConvolveMatrix order="3" kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1" preserveAlpha="true" />
            <feMorphology operator="dilate" radius="1.6" />
            <feColorMatrix type="matrix" values="11 0 0 0 0  3.9 0 0 0 0  1.3 0 0 0 0  0 0 0 1 0" />
          </filter>
        </defs>
      </svg>

      <div className="absolute inset-0" style={{ transform: `translate3d(${sx}px,${sy}px,0) rotate(${sr}deg) scale(${sc})`, willChange: "transform" }}>
        {t < b(1) && <SceneOrigin t={t} />}
        {t >= b(3) - 0.27 && t < b(5) && <SceneBuild t={t} under={buildUnder} />}
        {t >= b(1) && t < b(3) && <ScenePlan t={t} />}
        {t >= b(5) && t < b(7) && <SceneRender t={t} />}
        {t >= b(7) && <SceneTitle t={t} />}
      </div>

      <Flash t={t} at={b(1)} dur={0.14} color={C.ember} max={0.45} />
      <Flash t={t} at={b(5)} dur={0.22} color="#ffffff" max={0.8} />
      <Flash t={t} at={b(6)} dur={0.16} color="#ffffff" max={0.55} />
      <Flash t={t} at={STAMP_AT} dur={0.18} color={C.ember} max={0.3} />

      {/* persistent drafting HUD */}
      <div className="absolute pointer-events-none" style={{ left: 60, right: 60, top: 54, display: "flex", justifyContent: "space-between", fontFamily: F.m, fontWeight: 700, fontSize: 17, letterSpacing: "0.22em", color: C.ash }}>
        <span>TL-004 · SHEET {shot.code}/05</span>
        <span style={{ color: C.ember }}>{shot.name}</span>
      </div>
      {[[24, 24], [1056, 24], [24, 1896], [1056, 1896]].map(([x, y], i) => (
        <svg key={i} className="absolute pointer-events-none" style={{ left: x - 14, top: y - 14 }} width={28} height={28}>
          <line x1={0} y1={14} x2={28} y2={14} stroke={C.steel} strokeWidth={1.5} />
          <line x1={14} y1={0} x2={14} y2={28} stroke={C.steel} strokeWidth={1.5} />
          <circle cx={14} cy={14} r={6} fill="none" stroke={C.steel} strokeWidth={1.5} />
        </svg>
      ))}

      <PostFX t={t} />
    </div>
  );
}
