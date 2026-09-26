import type { CSSProperties, ReactNode } from "react";
import { BAR, BEAT, C, F, IMG7, SHOTS } from "./timeline";
import { E, clamp, hit, lerp, p, shake } from "../video/anim";
import { IMG } from "../video/assets";
import { LogoMark, PostFX } from "../video/fx";

export function AdComposition({ t }: { t: number }) {
  let sc = 1 + Math.sin(t * 2.2) * 0.003;
  let rot = 0;
  let sy = 0;
  for (let i = 0; i < 8; i++) {
    const b = i * BAR;
    sc += hit(t, b, 0.3) * 0.018;
    rot += shake(t, b, 0.25, 10 + i) * 0.4;
    sy += shake(t, b, 0.25, 13 + i) * 6;
  }
  sc += hit(t, 16.75, 0.3) * 0.02;
  sy += shake(t, 16.75, 0.3, 18) * 10;
  const idx = Math.min(7, Math.floor(t / BAR));
  const L = t - idx * BAR;

  return (
    <div style={{ position: "relative", width: 1080, height: 1920, background: C.ink, overflow: "hidden", contain: "strict" }}>
      <div className="absolute inset-0" style={{ transform: `translate3d(0,${sy}px,0) rotate(${rot}deg) scale(${sc})` }}>
        {idx === 0 && <SFinish L={L} />}
        {idx === 1 && <SLayers L={L} />}
        {idx === 2 && <SMaterial L={L} m={MATS[0]} />}
        {idx === 3 && <SMaterial L={L} m={MATS[1]} />}
        {idx === 4 && <SMaterial L={L} m={MATS[2]} />}
        {idx === 5 && <SWorkshop L={L} />}
        {idx === 6 && <SSite L={L} />}
        {idx === 7 && <SEnd L={L} t={t} />}
      </div>
      {idx < 7 && <Chrome idx={idx} L={L} />}
      {[2.5, 5, 7.5, 10, 12.5, 15, 17.5].map((b) => (
        <Flash key={b} t={t} at={b} />
      ))}
      <PostFX t={t} />
    </div>
  );
}

/* ---------------- shared ---------------- */

function Flash({ t, at }: { t: number; at: number }) {
  const k = t < at ? 0 : 1 - E.expoOut(p(t, at, at + 0.14));
  if (k <= 0.002) return null;
  return <div className="pointer-events-none absolute inset-0" style={{ background: "#fff", opacity: k * 0.4 }} />;
}

function Chrome({ idx, L }: { idx: number; L: number }) {
  return (
    <>
      <div className="pointer-events-none absolute" style={{ left: 64, right: 64, top: 64, display: "flex", justifyContent: "space-between", fontFamily: F.m, fontSize: 20, letterSpacing: "0.3em", color: C.fog }}>
        <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ width: 14, height: 14, background: C.ember, display: "inline-block" }} />
          MATERIAL TRUTH
        </span>
        <span>
          <span style={{ color: C.ember }}>{String(idx + 1).padStart(2, "0")}</span> / 08
        </span>
      </div>
      <div className="pointer-events-none absolute" style={{ left: 64, right: 64, bottom: 64, display: "flex", gap: 8 }}>
        {SHOTS.map((s, i) => (
          <div key={s.id} style={{ flex: 1, height: 5, background: "rgba(242,240,236,.18)" }}>
            <div style={{ height: "100%", background: C.ember, width: `${i < idx ? 100 : i === idx ? clamp(L / BAR) * 100 : 0}%` }} />
          </div>
        ))}
      </div>
    </>
  );
}

function Slam({ L, at, children, style }: { L: number; at: number; children: ReactNode; style?: CSSProperties }) {
  const k = p(L, at, at + 0.28);
  const e = E.expoOut(k);
  return (
    <div
      style={{
        ...style,
        opacity: k <= 0 ? 0 : Math.min(1, k * 3),
        transform: `scale(${lerp(1.5, 1, e)})`,
        transformOrigin: "left center",
        filter: k > 0 && k < 1 ? `blur(${(1 - e) * 8}px)` : undefined,
      }}
    >
      {children}
    </div>
  );
}

function Photo({ src, L, from = 1.16, to = 1.03, dim = 0.75, sat = 0.9, pos = "center" }: {
  src: string; L: number; from?: number; to?: number; dim?: number; sat?: number; pos?: string;
}) {
  const s = lerp(from, to, E.quadOut(clamp(L / BAR)));
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      style={{
        position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: pos,
        transform: `scale(${s})`, filter: `saturate(${sat}) contrast(1.08) brightness(${dim})`,
      }}
    />
  );
}

function Grid({ opacity = 0.06 }: { opacity?: number }) {
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: `linear-gradient(rgba(242,240,236,${opacity}) 1px,transparent 1px),linear-gradient(90deg,rgba(242,240,236,${opacity}) 1px,transparent 1px)`,
        backgroundSize: "60px 60px",
      }}
    />
  );
}

/* ---------------- 01 · THE FINISH ---------------- */

function SFinish({ L }: { L: number }) {
  const head = { fontFamily: F.d, fontSize: 200, lineHeight: 0.9, color: C.bone, textShadow: "0 20px 60px rgba(0,0,0,.6)" };
  return (
    <div className="absolute inset-0">
      <Photo src={IMG.luxeLiving} L={L} from={1.2} to={1.06} dim={0.72} />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(10,10,12,.4),rgba(10,10,12,.05) 35%,rgba(10,10,12,.92))" }} />
      <div className="absolute" style={{ left: 72, right: 72, bottom: 360 }}>
        <Slam L={L} at={0.1} style={head}>YOU SEE</Slam>
        <Slam L={L} at={0.1 + BEAT} style={head}>THE</Slam>
        <Slam L={L} at={0.1 + BEAT * 2} style={{ ...head, color: C.ember }}>FINISH.</Slam>
        <div style={{ marginTop: 40, height: 4, width: 220, background: C.ember, transform: `scaleX(${E.expoOut(p(L, 1.5, 1.9))})`, transformOrigin: "left" }} />
        <div style={{ marginTop: 28, fontFamily: F.s, fontStyle: "italic", fontSize: 44, color: C.fog, opacity: E.quadOut(p(L, 1.6, 2.05)) }}>
          Every surface starts long before the last coat.
        </div>
      </div>
    </div>
  );
}

/* ---------------- 02 · THE LAYERS ---------------- */

const LAYERS = [
  { top: "#c8955f", l: "#a3743f", r: "#86592c", name: "FINISH", spec: "VENEER · LAMINATE · PU" },
  { top: "#e2cda4", l: "#c7b083", r: "#aa956a", name: "CORE", spec: "18 MM PLY" },
  { top: C.ember, l: C.emberDeep, r: "#a3320a", name: "EDGE", spec: "2 MM BAND · SEALED" },
  { top: "#a1a6ad", l: "#72777e", r: "#595d63", name: "HARDWARE", spec: "SOFT-CLOSE FITTINGS" },
  { top: "#454a52", l: "#2e3137", r: "#23252a", name: "BACK", spec: "MOISTURE BARRIER" },
];

function SLayers({ L }: { L: number }) {
  const ex = E.expoOut(p(L, 0.35, 1.25));
  const cx = 360;
  const w = 540;
  const d = 290;
  const h = 26;
  const gap = lerp(h + 1, 150, ex);
  const cyOf = (i: number) => 1120 + (i - 2) * gap;
  return (
    <div className="absolute inset-0" style={{ background: C.coal }}>
      <Grid />
      <div className="absolute" style={{ left: 72, right: 72, top: 170 }}>
        <Slam L={L} at={0.05} style={{ fontFamily: F.d, fontSize: 112, lineHeight: 0.95, color: C.bone }}>WE OBSESS OVER</Slam>
        <Slam L={L} at={0.05 + BEAT} style={{ fontFamily: F.d, fontSize: 112, lineHeight: 0.95, color: C.ember }}>WHAT'S UNDER IT.</Slam>
      </div>
      <svg className="absolute inset-0" viewBox="0 0 1080 1920">
        {[4, 3, 2, 1, 0].map((i) => {
          const ly = LAYERS[i];
          const cy = cyOf(i);
          const top = `${cx},${cy - d / 2} ${cx + w / 2},${cy} ${cx},${cy + d / 2} ${cx - w / 2},${cy}`;
          const left = `${cx - w / 2},${cy} ${cx},${cy + d / 2} ${cx},${cy + d / 2 + h} ${cx - w / 2},${cy + h}`;
          const right = `${cx},${cy + d / 2} ${cx + w / 2},${cy} ${cx + w / 2},${cy + h} ${cx},${cy + d / 2 + h}`;
          const lk = E.quadOut(p(L, 0.8 + i * 0.1, 1.1 + i * 0.1));
          return (
            <g key={i}>
              <polygon points={left} fill={ly.l} />
              <polygon points={right} fill={ly.r} />
              <polygon points={top} fill={ly.top} stroke="rgba(0,0,0,.25)" strokeWidth={1} />
              {i === 0 &&
                [0.2, 0.4, 0.6, 0.8].map((f) => (
                  <line key={f} x1={cx - w / 2 + (w / 2) * f} y1={cy - (d / 2) * f} x2={cx + (w / 2) * f} y2={cy + (d / 2) * (1 - f)} stroke="rgba(90,55,20,.35)" strokeWidth={2} />
                ))}
              <g opacity={lk}>
                <line x1={cx + w / 2} y1={cy} x2={cx + w / 2 + 60 * lk} y2={cy} stroke={C.ember} strokeWidth={2} />
                <circle cx={cx + w / 2} cy={cy} r={5} fill={C.ember} />
                <text x={cx + w / 2 + 76} y={cy - 4} fill={C.bone} style={{ fontFamily: F.d, fontSize: 40 }}>
                  0{i + 1} {ly.name}
                </text>
                <text x={cx + w / 2 + 76} y={cy + 28} fill={C.ash} style={{ fontFamily: F.m, fontSize: 17, letterSpacing: "0.08em" }}>
                  {ly.spec}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
      <div className="absolute" style={{ left: 72, bottom: 190, fontFamily: F.m, fontSize: 22, letterSpacing: "0.3em", color: C.fog, opacity: E.quadOut(p(L, 1.5, 1.9)) }}>
        5 LAYERS · 1 PANEL · <span style={{ color: C.ember }}>0 SHORTCUTS</span>
      </div>
    </div>
  );
}

/* ---------------- 03–05 · MATERIALS ---------------- */

type Mat = {
  no: string;
  word: string;
  img: string;
  chip: string;
  specs: [string, string][];
  line: string;
  dir: "up" | "left" | "right";
};

const MATS: Mat[] = [
  {
    no: "01", word: "OAK", img: IMG7.oak, chip: C.oak, dir: "up",
    specs: [["GRAIN", "Hand-matched veneer"], ["FINISH", "Matte PU, multi-coat"], ["USE", "Wardrobes · panelling"]],
    line: "Chosen by hand. Not by catalogue.",
  },
  {
    no: "02", word: "STONE", img: IMG7.stone, chip: C.stone, dir: "left",
    specs: [["SLAB", "Quartz · natural stone"], ["EDGE", "Eased, profiled on site"], ["USE", "Counters · vanities"]],
    line: "Cut to the millimetre.",
  },
  {
    no: "03", word: "BRASS", img: IMG7.brass, chip: C.brass, dir: "right",
    specs: [["METAL", "Brushed brass finish"], ["MOTION", "Soft-close fittings"], ["USE", "Handles · lighting"]],
    line: "Touched every day. Built for it.",
  },
];

function SMaterial({ L, m }: { L: number; m: Mat }) {
  const wipe = E.quintInOut(p(L, 0, 0.4));
  const clip =
    m.dir === "up" ? `inset(${(1 - wipe) * 100}% 0 0 0)` : m.dir === "left" ? `inset(0 ${(1 - wipe) * 100}% 0 0)` : `inset(0 0 0 ${(1 - wipe) * 100}%)`;
  const edge: CSSProperties =
    m.dir === "up"
      ? { left: 0, right: 0, top: `${(1 - wipe) * 100}%`, height: 6 }
      : m.dir === "left"
        ? { top: 0, bottom: 0, left: `${wipe * 100}%`, width: 6 }
        : { top: 0, bottom: 0, left: `${(1 - wipe) * 100}%`, width: 6 };
  const wordK = E.heavyOut(p(L, 0.25, 0.8));
  return (
    <div className="absolute inset-0" style={{ background: C.ink }}>
      <div className="absolute inset-0" style={{ clipPath: clip, WebkitClipPath: clip, background: C.coal }}>
        <div className="absolute" style={{ left: 0, right: 0, top: 0, height: 1160, overflow: "hidden" }}>
          <Photo src={m.img} L={L} from={1.28} to={1.08} dim={0.88} sat={1.05} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(16,17,20,.55),transparent 28%,transparent 58%,rgba(16,17,20,1))" }} />
          <div style={{ position: "absolute", left: 72, top: 170, fontFamily: F.m, fontSize: 22, letterSpacing: "0.4em", color: C.bone }}>
            MATERIAL <span style={{ color: C.ember }}>{m.no}</span> / 03
          </div>
        </div>
        <div
          style={{
            position: "absolute", left: 56, top: 820, fontFamily: F.d, fontSize: 340, lineHeight: 0.85, color: C.bone,
            letterSpacing: "0.01em", textShadow: "0 24px 60px rgba(0,0,0,.55)",
            transform: `translateY(${(1 - wordK) * 140}px)`, opacity: wordK,
          }}
        >
          {m.word}
          <span style={{ color: C.ember }}>.</span>
        </div>
        <div
          style={{
            position: "absolute", right: 72, top: 1000, width: 128, height: 128, borderRadius: 999, background: m.chip,
            border: `5px solid ${C.bone}`, boxShadow: "0 16px 40px rgba(0,0,0,.5)",
            transform: `scale(${Math.max(0.001, E.backOut(p(L, 0.55, 0.95)))})`,
          }}
        />
        <div className="absolute" style={{ left: 72, right: 72, top: 1250 }}>
          {m.specs.map(([k, v], i) => {
            const rk = E.expoOut(p(L, 0.6 + i * 0.15, 0.95 + i * 0.15));
            return (
              <div key={k} style={{ display: "flex", alignItems: "baseline", gap: 30, padding: "22px 0", borderTop: `2px solid ${C.slate}`, opacity: rk, transform: `translateX(${(1 - rk) * -60}px)` }}>
                <span style={{ width: 150, fontFamily: F.m, fontSize: 19, letterSpacing: "0.3em", color: C.ember }}>{k}</span>
                <span style={{ fontFamily: F.g, fontWeight: 600, fontSize: 36, color: C.bone }}>{v}</span>
              </div>
            );
          })}
          <div style={{ marginTop: 40, fontFamily: F.s, fontStyle: "italic", fontSize: 48, color: C.fog, opacity: E.quadOut(p(L, 1.3, 1.75)) }}>
            {m.line}
          </div>
        </div>
      </div>
      {wipe > 0.002 && wipe < 0.998 && <div style={{ position: "absolute", ...edge, background: C.ember, boxShadow: `0 0 30px ${C.ember}` }} />}
    </div>
  );
}

/* ---------------- 06 · THE WORKSHOP ---------------- */

const QC = ["MEASURE", "CUT", "EDGE", "DRILL", "ASSEMBLE", "FINISH", "INSPECT"];

function SWorkshop({ L }: { L: number }) {
  const tol = lerp(10, 1, E.expoOut(p(L, 0.3, 1.6)));
  const checked = QC.filter((_, i) => L > 0.6 + i * 0.17).length;
  return (
    <div className="absolute inset-0" style={{ background: C.coal }}>
      <div className="absolute" style={{ left: 0, right: 0, top: 0, height: 860, overflow: "hidden" }}>
        <Photo src={IMG7.workshop} L={L} from={1.2} to={1.05} dim={0.62} sat={0.85} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(16,17,20,.55),transparent 40%,rgba(16,17,20,1))" }} />
      </div>
      <div className="absolute" style={{ left: 72, right: 72, top: 170 }}>
        <Slam L={L} at={0.05} style={{ fontFamily: F.d, fontSize: 132, lineHeight: 0.92, color: C.bone, textShadow: "0 18px 50px rgba(0,0,0,.6)" }}>EXECUTION</Slam>
        <Slam L={L} at={0.05 + BEAT} style={{ fontFamily: F.d, fontSize: 132, lineHeight: 0.92, color: C.ember, textShadow: "0 18px 50px rgba(0,0,0,.6)" }}>IS THE DESIGN.</Slam>
      </div>
      <div className="absolute" style={{ left: 72, right: 72, top: 820 }}>
        <div style={{ fontFamily: F.m, fontSize: 20, letterSpacing: "0.4em", color: C.ash }}>TOLERANCE TARGET</div>
        <div className="tnum" style={{ fontFamily: F.d, fontSize: 230, lineHeight: 1, color: C.bone }}>
          ±{tol.toFixed(1)}
          <span style={{ fontSize: 86, color: C.ember }}> MM</span>
        </div>
      </div>
      <div className="absolute" style={{ left: 72, right: 72, top: 1180, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {QC.map((q, i) => {
          const on = L > 0.6 + i * 0.17;
          const k = E.backOut(p(L, 0.6 + i * 0.17, 0.85 + i * 0.17));
          return (
            <div key={q} style={{ height: 150, border: `2px solid ${on ? C.ember : C.steel}`, background: on ? C.ember : "transparent", padding: "16px 14px", display: "flex", flexDirection: "column", justifyContent: "space-between", transform: `scale(${on ? lerp(0.9, 1, Math.min(1, k)) : 1})` }}>
              <span style={{ fontFamily: F.m, fontSize: 17, color: on ? C.ink : C.ash }}>0{i + 1}</span>
              <span style={{ fontFamily: F.g, fontWeight: 800, fontSize: 21, letterSpacing: "0.04em", color: on ? C.ink : C.fog }}>
                {on ? "✓ " : ""}{q}
              </span>
            </div>
          );
        })}
        <div style={{ height: 150, border: `2px solid ${C.bone}`, display: "grid", placeItems: "center", textAlign: "center" }}>
          <div>
            <div className="tnum" style={{ fontFamily: F.d, fontSize: 56, color: C.bone, lineHeight: 1 }}>{checked}/7</div>
            <div style={{ fontFamily: F.m, fontSize: 15, letterSpacing: "0.24em", color: C.ash, marginTop: 6 }}>QC STAGES</div>
          </div>
        </div>
      </div>
      <div className="absolute" style={{ left: 72, bottom: 190, fontFamily: F.m, fontSize: 21, letterSpacing: "0.28em", color: C.fog, opacity: E.quadOut(p(L, 1.7, 2.1)) }}>
        MEASURED TWICE · CUT ONCE · CHECKED ALWAYS
      </div>
    </div>
  );
}

/* ---------------- 07 · THE SITE ---------------- */

const GANTT: [string, number, number][] = [
  ["DESIGN SIGN-OFF", 0, 2],
  ["FACTORY BUILD", 1, 6],
  ["SITE PREP", 4, 6],
  ["INSTALL", 6, 10],
  ["SNAG + CLEAN", 9, 11],
  ["HANDOVER", 11, 12],
];

function SSite({ L }: { L: number }) {
  const labelW = 290;
  const chartW = 1080 - 144 - labelW;
  const col = chartW / 12;
  const rowH = 118;
  const head = 60;
  const play = E.linear(p(L, 0.3, 1.9)) * 12 * col;
  const stampK = E.backOut(p(L, 1.75, 2.1));
  return (
    <div className="absolute inset-0" style={{ background: C.coal }}>
      <Grid opacity={0.04} />
      <div className="absolute" style={{ left: 72, right: 72, top: 170 }}>
        <Slam L={L} at={0.05} style={{ fontFamily: F.d, fontSize: 140, lineHeight: 0.92, color: C.bone }}>ONE TEAM.</Slam>
        <Slam L={L} at={0.05 + BEAT} style={{ fontFamily: F.d, fontSize: 140, lineHeight: 0.92, color: C.ember }}>EVERY STAGE.</Slam>
      </div>
      <div className="absolute" style={{ left: 72, top: 600, width: 1080 - 144 }}>
        <div style={{ display: "flex", marginLeft: labelW, height: head, alignItems: "center" }}>
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} style={{ width: col, fontFamily: F.m, fontSize: 15, color: C.ash, textAlign: "center" }}>W{i + 1}</div>
          ))}
        </div>
        {GANTT.map(([name, s, e], i) => {
          const k = E.expoOut(p(L, 0.3 + i * 0.16, 0.75 + i * 0.16));
          return (
            <div key={name} style={{ display: "flex", alignItems: "center", height: rowH, borderTop: `1.5px solid ${C.slate}` }}>
              <div style={{ width: labelW, fontFamily: F.m, fontSize: 19, letterSpacing: "0.12em", color: C.fog }}>
                <span style={{ color: C.ember }}>0{i + 1}</span> {name}
              </div>
              <div style={{ position: "relative", width: chartW, height: 56 }}>
                <div
                  style={{
                    position: "absolute", left: s * col, top: 0, height: 56, width: (e - s) * col * k,
                    background: i === GANTT.length - 1 ? C.ember : C.bone, opacity: i === GANTT.length - 1 ? 1 : 0.9,
                  }}
                />
              </div>
            </div>
          );
        })}
        <div style={{ position: "absolute", left: labelW + play, top: head, width: 3, height: rowH * GANTT.length, background: C.ember, boxShadow: `0 0 18px ${C.ember}` }} />
      </div>
      <div
        className="absolute"
        style={{
          right: 80, top: 1390, border: `7px solid ${C.ember}`, padding: "16px 30px", fontFamily: F.d, fontSize: 76, color: C.ember,
          letterSpacing: "0.04em", transform: `rotate(-8deg) scale(${Math.max(0.001, stampK)})`, opacity: p(L, 1.75, 1.8) > 0 ? 1 : 0,
          background: "rgba(255,90,31,.06)",
        }}
      >
        ON SCHEDULE
      </div>
      <div className="absolute" style={{ left: 72, bottom: 250, fontFamily: F.m, fontSize: 21, letterSpacing: "0.26em", color: C.fog, opacity: E.quadOut(p(L, 1.2, 1.6)) }}>
        CRAFTSMEN · TIMELINES · QUALITY
      </div>
      <div className="absolute" style={{ left: 72, bottom: 200, fontFamily: F.m, fontSize: 15, letterSpacing: "0.3em", color: C.steel }}>
        INDICATIVE SCHEDULE
      </div>
    </div>
  );
}

/* ---------------- 08 · MATERIAL TRUTH ---------------- */

function SEnd({ L, t }: { L: number; t: number }) {
  const rev = E.quintInOut(p(L, 0, 0.35));
  const out = E.quadIn(p(L, 2.1, 2.5));
  const clip = `inset(${(1 - rev) * 100}% 0 0 0)`;
  const head = { fontFamily: F.d, fontSize: 236, lineHeight: 0.86, letterSpacing: "0.005em" };
  return (
    <div className="absolute inset-0" style={{ background: C.ink, opacity: 1 - out }}>
      <div className="absolute inset-0" style={{ background: C.ember, clipPath: clip, WebkitClipPath: clip }}>
        <div className="absolute" style={{ left: 72, right: 72, top: 300 }}>
          <div style={{ fontFamily: F.m, fontSize: 22, letterSpacing: "0.44em", color: C.ink, opacity: E.quadOut(p(L, 0.2, 0.5)) }}>
            A TIMBERLANE CAMPAIGN
          </div>
          <Slam L={L} at={0.25} style={{ ...head, color: C.ink, marginTop: 30 }}>MATERIAL</Slam>
          <Slam L={L} at={0.25 + BEAT} style={{ ...head, color: "transparent", WebkitTextStroke: `4px ${C.ink}` }}>TRUTH.</Slam>
          <div style={{ marginTop: 44, fontFamily: F.g, fontWeight: 600, fontSize: 40, lineHeight: 1.3, color: C.ink, opacity: E.quadOut(p(L, 1.1, 1.45)) }}>
            Designed, sourced and executed
            <br />
            by one team.
          </div>
          <div style={{ display: "flex", gap: 26, marginTop: 50, opacity: E.quadOut(p(L, 1.2, 1.55)) }}>
            {[
              [C.oak, "OAK"],
              [C.stone, "STONE"],
              [C.brass, "BRASS"],
            ].map(([c, n]) => (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 44, height: 44, borderRadius: 999, background: c, border: `4px solid ${C.ink}` }} />
                <span style={{ fontFamily: F.m, fontSize: 19, letterSpacing: "0.2em", color: C.ink }}>{n}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute" style={{ left: 72, right: 72, bottom: 170 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24, opacity: E.quadOut(p(L, 1.35, 1.65)) }}>
            <LogoMark t={t} start={17.5 + 1.3} size={96} color={C.ink} bar={C.ink} />
            <div>
              <div style={{ fontFamily: F.d, fontSize: 64, color: C.ink, letterSpacing: "0.04em", lineHeight: 1 }}>TIMBERLANE</div>
              <div style={{ fontFamily: F.m, fontSize: 22, letterSpacing: "0.14em", color: C.ink, marginTop: 8 }}>timberlane.co.in · +91 88846 51111</div>
            </div>
          </div>
          <div
            style={{
              marginTop: 40, display: "inline-block", background: C.ink, color: C.ember, fontFamily: F.g, fontWeight: 800, fontSize: 32,
              letterSpacing: "0.08em", padding: "24px 46px", borderRadius: 999,
              transform: `scale(${Math.max(0.001, E.backOut(p(L, 1.55, 1.95)))})`, transformOrigin: "left center",
            }}
          >
            GET YOUR DESIGN →
          </div>
        </div>
      </div>
      {rev > 0.002 && rev < 0.998 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: `${(1 - rev) * 100}%`, height: 8, background: C.bone }} />
      )}
    </div>
  );
}
