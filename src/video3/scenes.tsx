import { BEATS, C, F } from "./timeline";
import { E, clamp, counter, hit, lerp, p, shake } from "../video/anim";
import { IMG } from "../video/assets";
import { Flash, LogoMark } from "../video/fx";
import { Card, Confetti, Dots, Marquee, PopPlate, PopPost, PopWord, Starburst, Sticker } from "./fx";

const BRAND = {
  url: "timberlane.co.in",
  phone: "+91 88846 51111",
  city: "BENGALURU",
  tagline: "Precision in every detail",
} as const;

export function PopComposition({ t }: { t: number }) {
  /* punchy pop camera: kick at every bar line + constant wobble */
  let sc = 1 + Math.sin(t * 2.3) * 0.004;
  let rot = Math.sin(t * 1.7) * 0.12;
  let sy = 0;
  const intro = E.quadOut(clamp(t / 0.6));
  sc *= lerp(1.06, 1, intro);
  BEATS.forEach((b, i) => {
    sc += hit(t, b, 0.32) * 0.02;
    rot += shake(t, b, 0.25, 9 + i) * 0.5;
    sy += shake(t, b, 0.25, 12 + i) * 8;
  });

  return (
    <div
      style={{ position: "relative", width: 1080, height: 1080, background: C.paper, overflow: "hidden", contain: "strict" }}
    >
      <div className="absolute inset-0" style={{ transform: `translate3d(0,${sy}px,0) rotate(${rot}deg) scale(${sc})` }}>
        {t < 2.5 && <SceneCover t={t} />}
        {t >= 2.5 && t < 5 && <SceneCards t={t} />}
        {t >= 5 && t < 7.5 && <SceneNumbers t={t} />}
        {t >= 7.5 && t < 10 && <SceneBlinds t={t} />}
        {t >= 10 && t < 12.5 && <SceneQuotes t={t} />}
        {t >= 12.5 && <SceneStamp t={t} />}
      </div>

      {[2.5, 5, 7.5, 10, 12.5].map((b) => (
        <Flash key={b} t={t} at={b} dur={0.12} color="#fffdf7" max={0.5} />
      ))}
      <PopPost t={t} />
    </div>
  );
}

/* ================================================================= */
/*  P1 — COVER                                                       */
/* ================================================================= */
function SceneCover({ t }: { t: number }) {
  const L = t;
  return (
    <div className="absolute inset-0" style={{ background: C.paper }}>
      <Dots />
      {/* rotating dashed ring */}
      <svg className="absolute" style={{ left: 540 - 350, top: 520 - 350 }} width={700} height={700} viewBox="0 0 700 700">
        <circle
          cx={350} cy={350} r={320} fill="none" stroke={C.ember} strokeWidth={5}
          strokeDasharray="26 20" strokeLinecap="round"
          style={{ transformOrigin: "350px 350px", transform: `rotate(${L * 14}deg)`, opacity: 0.75 }}
        />
      </svg>
      {/* orbiting sparkles */}
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2 + L * 0.55;
        const r = 400 + Math.sin(L * 1.4 + i) * 22;
        const x = 540 + Math.cos(a) * r;
        const y = 520 + Math.sin(a) * r;
        const k = E.backOut(p(L, 0.5 + i * 0.05, 1.0 + i * 0.05));
        if (k <= 0.001) return null;
        return (
          <span
            key={i}
            style={{
              position: "absolute", left: x, top: y, width: i % 2 ? 14 : 22, height: i % 2 ? 14 : 22,
              background: i % 3 === 0 ? C.ember : i % 3 === 1 ? C.gold : C.mint,
              border: `3px solid ${C.ink}`, borderRadius: i % 2 ? 999 : 4,
              transform: `translate(-50%,-50%) rotate(${L * 60 + i * 30}deg) scale(${Math.max(0.001, k)})`,
            }}
          />
        );
      })}

      <div className="absolute inset-x-0 text-center" style={{ top: 330 }}>
        <PopWord
          text="FRESH"
          t={L} start={0.28} step={0.055}
          style={{ fontFamily: F.d, fontSize: 205, lineHeight: 0.95, color: C.ink }}
          charStyle={{ textShadow: `7px 7px 0 ${C.gold}` }}
        />
        <br />
        <PopWord
          text="LOOKS"
          t={L} start={0.52} step={0.055}
          style={{ fontFamily: F.d, fontSize: 205, lineHeight: 0.95, color: C.ember }}
          charStyle={{ WebkitTextStroke: "3px #141311", textShadow: `7px 7px 0 ${C.ink}` }}
          seed={5}
        />
      </div>

      <Starburst x={892} y={252} size={196} t={L} color={C.gold} text="NEW!" spin={26}
        scale={E.backOut(p(L, 0.9, 1.4))} tilt={-8} fs={40} />
      <Sticker x={180} y={250} text="★ POP CUT" t={L} start={1.1} bg={C.mint} rot={-8} fs={22} />

      <div
        className="absolute inset-x-0 text-center"
        style={{
          top: 872, fontFamily: F.m, fontWeight: 700, fontSize: 24, letterSpacing: "0.3em", color: C.ink,
          opacity: E.quadOut(p(L, 1.35, 1.7)),
          transform: `translateY(${(1 - E.backOut(p(L, 1.35, 1.85))) * 60}px)`,
        }}
      >
        TIMBERLANE · 15s · 96 BPM
      </div>
      <div
        className="absolute inset-x-0 text-center"
        style={{
          top: 918, fontFamily: F.d, fontSize: 44, color: C.emberDeep,
          opacity: E.quadOut(p(L, 1.5, 1.8)),
          transform: `translateY(${Math.sin(L * 7) * 6}px)`,
        }}
      >
        ↓
      </div>

      <Marquee t={L} text="FRESH LOOKS • TIMBERLANE • POP CUT • " y={0} h={68} bg={C.ink} fg={C.cream} dir={1} />
      <Marquee t={L} text="★ INTERIORS ★ KITCHENS ★ WARDROBES " y={1012} h={68} bg={C.ember} fg={C.ink} dir={-1} speed={170} />
    </div>
  );
}

/* ================================================================= */
/*  P2 — FLIP CARDS                                                  */
/* ================================================================= */
const ROOMS = [
  { img: IMG.livingHero, name: "LIVING", meta: "SOFAS · LIGHT · ART", tag: "HOT", tagBg: C.ember, rot: -4 },
  { img: IMG.kitchen, name: "KITCHEN", meta: "MODULAR · SMART", tag: "NEW", tagBg: C.gold, rot: 3 },
  { img: IMG.bedroom, name: "BEDROOM", meta: "CALM · WARM · SOFT", tag: "5★", tagBg: C.mint, rot: -3 },
];

function SceneCards({ t }: { t: number }) {
  const L = t - 2.5;
  return (
    <div className="absolute inset-0" style={{ background: C.paper }}>
      <Dots color="rgba(20,19,17,.07)" />

      <div className="absolute inset-x-0 text-center" style={{ top: 78 }}>
        <PopWord
          text="PICK A ROOM"
          t={L} start={0.05} step={0.03} dur={0.45} from={140}
          style={{ fontFamily: F.d, fontSize: 84, color: C.ink }}
          charStyle={{ textShadow: `4px 4px 0 ${C.gold}` }}
        />
        <div
          style={{
            width: 440, height: 14, background: C.ember, borderRadius: 99, margin: "10px auto 0",
            border: `3px solid ${C.ink}`, transform: `rotate(-1deg) scaleX(${E.backOut(p(L, 0.35, 0.8))})`,
          }}
        />
      </div>

      {ROOMS.map((r, i) => {
        const k = E.backOut(p(L, 0.3 + i * 0.2, 0.3 + i * 0.2 + 0.55));
        const flipX = -(1 - Math.min(k, 1.15)) * 95;
        return (
          <div key={r.name}>
            <Card x={60 + i * 330} y={270} w={300} h={600} rot={r.rot} flipX={flipX} opacity={p(L, 0.3 + i * 0.2, 0.36 + i * 0.2) > 0 ? 1 : 0}>
              <div style={{ position: "relative", height: 380, borderBottom: `5px solid ${C.ink}` }}>
                <PopPlate src={r.img} t={L} dur={2.5} from={1.1} to={1.24} />
              </div>
              <div style={{ background: C.ink, padding: "20px 18px 8px" }}>
                <div style={{ fontFamily: F.d, fontSize: 46, color: C.cream, letterSpacing: "0.03em" }}>{r.name}</div>
              </div>
              <div style={{ background: C.cream, padding: "12px 18px 0" }}>
                <div style={{ fontFamily: F.m, fontWeight: 700, fontSize: 17, letterSpacing: "0.12em", color: C.graphite }}>
                  {r.meta}
                </div>
              </div>
            </Card>
            <Sticker
              x={60 + i * 330 + 300 - 18} y={270 + 6} text={r.tag} t={L}
              start={0.75 + i * 0.2} bg={r.tagBg} rot={12 - i * 6} fs={22}
            />
          </div>
        );
      })}

      <Sticker x={540} y={948} text="KITCHENS · WARDROBES · FULL HOMES ↗" t={L} start={1.85} bg={C.ink} fg={C.cream} rot={-1} fs={21} />
    </div>
  );
}

/* ================================================================= */
/*  P3 — NUMBER POPS                                                 */
/* ================================================================= */
const STATS = [
  { v: 200, suffix: "+", label: "HOMES DELIVERED", burst: C.gold, spin: 22 },
  { v: 8, suffix: "", label: "YEARS OF CRAFT", burst: C.ember, spin: -18, pad: 2 },
  { v: 14, suffix: "", label: "IN-HOUSE DESIGNERS", burst: C.mint, spin: 26, pad: 2 },
];

function SceneNumbers({ t }: { t: number }) {
  const L = t - 5;
  return (
    <div className="absolute inset-0" style={{ background: C.ink }}>
      <Dots color="rgba(255,253,247,.07)" />
      <div className="absolute inset-x-0 text-center" style={{ top: 64 }}>
        <div style={{ fontFamily: F.m, fontWeight: 700, fontSize: 23, letterSpacing: "0.44em", color: C.cream }}>
          BY THE NUMBERS
        </div>
        <div
          style={{
            width: 220, height: 5, background: C.ember, margin: "16px auto 0",
            transform: `scaleX(${E.backOut(p(L, 0.2, 0.6))})`,
          }}
        />
      </div>

      {STATS.map((s, i) => {
        const cx = 200 + i * 340;
        const pop = E.backOut(p(L, 0.3 + i * 0.2, 0.3 + i * 0.2 + 0.5));
        const n = counter(L, 0.55 + i * 0.2, 1.65 + i * 0.2, s.v);
        const bounce = 1 + Math.sin(Math.max(0, L - 0.8 - i * 0.2) * 10) * 0.02 * p(L, 0.8 + i * 0.2, 1.1 + i * 0.2);
        return (
          <div key={s.label} style={{ opacity: pop > 0.001 ? 1 : 0 }}>
            <Starburst x={cx} y={470} size={310} t={L} color={s.burst} spin={s.spin} scale={Math.max(0.001, pop)} spikes={16} />
            <div
              className="tnum absolute text-center"
              style={{
                left: cx - 170, width: 340, top: 400,
                fontFamily: F.d, fontSize: 150, color: C.ink, lineHeight: 1,
                transform: `scale(${Math.max(0.001, pop) * bounce})`,
              }}
            >
              {s.pad ? String(n).padStart(s.pad, "0") : n}
              <span style={{ color: C.cream, WebkitTextStroke: `2px ${C.ink}` }}>{s.suffix}</span>
            </div>
            <div
              className="absolute text-center"
              style={{
                left: cx - 170, width: 340, top: 640,
                fontFamily: F.m, fontWeight: 700, fontSize: 20, letterSpacing: "0.2em", color: C.cream,
                opacity: E.quadOut(p(L, 0.6 + i * 0.2, 0.9 + i * 0.2)),
              }}
            >
              {s.label}
            </div>
          </div>
        );
      })}

      <Sticker x={914} y={120} text="EST. 2017" t={L} start={0.9} bg={C.gold} rot={6} fs={20} />

      <div style={{ transform: `translateY(${(1 - E.backOut(p(L, 1.35, 1.85))) * 130}px)` }}>
        <Marquee t={L} text="★ TRUSTED ACROSS BENGALURU ★ 200+ HOMES " y={946} h={72} bg={C.ember} fg={C.ink} dir={1} speed={180} />
      </div>
    </div>
  );
}

/* ================================================================= */
/*  P4 — BLIND WIPE (before / after)                                 */
/* ================================================================= */
const SLATS = 12;

function SceneBlinds({ t }: { t: number }) {
  const L = t - 7.5;
  const sh = 1080 / SLATS;
  const wow = E.backOut(p(L, 1.5, 2.0));
  return (
    <div className="absolute inset-0" style={{ background: C.ink }}>
      <div className="absolute inset-0" style={{ perspective: 1100 }}>
        <PopPlate src={IMG.leatherSofa} t={L} dur={2.5} from={1.08} to={1.14} grade="grey" />
        {Array.from({ length: SLATS }, (_, i) => {
          const k = E.quintInOut(p(L, 0.35 + i * 0.055, 0.35 + i * 0.055 + 0.5));
          if (k <= 0.001) return null;
          return (
            <div
              key={i}
              style={{
                position: "absolute", left: 0, right: 0, top: i * sh, height: sh + 1,
                overflow: "hidden", transformOrigin: "50% 0%",
                transform: `rotateX(${(1 - k) * -88}deg)`,
                backfaceVisibility: "hidden",
                borderBottom: "2px solid rgba(20,19,17,.55)",
              }}
            >
              <img
                src={IMG.leatherSofa}
                alt=""
                draggable={false}
                style={{
                  position: "absolute", left: 0, top: -i * sh, width: 1080, height: 1080,
                  objectFit: "cover", filter: "saturate(1.2) contrast(1.06) brightness(.94)",
                }}
              />
              <div className="absolute inset-0" style={{ background: C.ink, opacity: Math.sin(k * Math.PI) * 0.22 }} />
            </div>
          );
        })}
      </div>

      <div style={{ opacity: 1 - E.quadOut(p(L, 1.0, 1.5)) }}>
        <Sticker x={170} y={110} text="BEFORE" t={L} start={0.05} bg={C.ink} fg={C.cream} rot={-5} />
      </div>
      <Sticker x={910} y={110} text="AFTER ★" t={L} start={1.15} bg={C.ember} rot={5} />

      <Starburst x={540} y={470} size={250} t={L} color={C.gold} text="WOW!" spin={30}
        scale={Math.max(0.001, wow)} tilt={Math.sin(L * 5) * 4} fs={52} />

      <div className="absolute inset-x-0 text-center" style={{ bottom: 120 }}>
        <div
          style={{
            display: "inline-block", background: C.cream, border: `4px solid ${C.ink}`,
            borderRadius: 14, padding: "10px 26px", boxShadow: `6px 6px 0 ${C.ink}`,
            fontFamily: F.d, fontSize: 44, color: C.ink,
            transform: `translateY(${(1 - E.backOut(p(L, 1.7, 2.15))) * 120}px) rotate(-1deg)`,
            opacity: p(L, 1.7, 1.78) > 0 ? 1 : 0,
          }}
        >
          WE DON'T DECORATE —
        </div>
        <br />
        <div
          style={{
            display: "inline-block", background: C.ember, border: `4px solid ${C.ink}`,
            borderRadius: 14, padding: "10px 26px", boxShadow: `6px 6px 0 ${C.ink}`,
            fontFamily: F.d, fontSize: 44, color: C.ink, marginTop: 12,
            transform: `translateY(${(1 - E.backOut(p(L, 1.85, 2.3))) * 120}px) rotate(1deg)`,
            opacity: p(L, 1.85, 1.93) > 0 ? 1 : 0,
          }}
        >
          WE TRANSFORM.
        </div>
      </div>
    </div>
  );
}

/* ================================================================= */
/*  P5 — CLIENT LOVE (quote carousel)                                */
/* ================================================================= */
const QUOTES = [
  { q: "“Timberlane didn't just design our home — they listened to who we are.”", n: "PRIYA & ARJUN", c: "WHITEFIELD" },
  { q: "“Every finish, every corner told our story. We couldn't be more thrilled.”", n: "ANIKA MEHTA", c: "JAYANAGAR" },
  { q: "“Our 3BHK became a magazine-worthy home. Seamless, start to finish.”", n: "RAVI & SUNITA", c: "KORAMANGALA" },
];
const SEG = 0.8;

function QuoteCard({ qi, enter, exit }: { qi: number; enter: number; exit: number }) {
  const q = QUOTES[qi];
  const e = E.backOut(clamp(enter, 0, 1));
  const x = (1 - Math.min(e, 1.2)) * 950 - E.quadIn(clamp(exit, 0, 1)) * 950;
  const op = 1 - E.quadIn(clamp(exit, 0, 1));
  if (enter <= 0 || op <= 0.001) return null;
  return (
    <div
      className="absolute"
      style={{
        left: 130, top: 330, width: 820,
        transform: `translateX(${x}px) rotate(${(1 - Math.min(e, 1)) * 9 - 2}deg)`,
        opacity: op,
      }}
    >
      <div
        style={{
          background: C.cream, border: `5px solid ${C.ink}`, borderRadius: 24,
          boxShadow: `12px 12px 0 rgba(20,19,17,.4)`, padding: "54px 60px 48px", position: "relative",
        }}
      >
        {/* tape corners */}
        <span style={{ position: "absolute", left: 44, top: -22, width: 130, height: 44, background: "rgba(255,176,58,.85)", border: `3px solid ${C.ink}`, transform: "rotate(-8deg)" }} />
        <span style={{ position: "absolute", right: 44, top: -22, width: 130, height: 44, background: "rgba(255,176,58,.85)", border: `3px solid ${C.ink}`, transform: "rotate(8deg)" }} />
        {/* stars */}
        <div style={{ display: "flex", gap: 10, marginBottom: 26 }}>
          {Array.from({ length: 5 }, (_, i) => {
            const sk = E.backOut(p(enter, 0.25 + i * 0.09, 0.25 + i * 0.09 + 0.4));
            return (
              <svg key={i} width={36} height={36} viewBox="0 0 24 24"
                style={{ transform: `scale(${Math.max(0.001, sk)})` }}>
                <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z"
                  fill={C.gold} stroke={C.ink} strokeWidth={1.4} strokeLinejoin="round" />
              </svg>
            );
          })}
        </div>
        <div style={{ fontFamily: F.g, fontWeight: 500, fontSize: 35, lineHeight: 1.4, color: C.ink }}>
          {q.q}
        </div>
        <div style={{ marginTop: 28, fontFamily: F.m, fontWeight: 700, fontSize: 24, letterSpacing: "0.14em", color: C.emberDeep }}>
          {q.n} <span style={{ color: C.ash }}>· {q.c}</span>
        </div>
      </div>
    </div>
  );
}

function SceneQuotes({ t }: { t: number }) {
  const L = t - 10;
  const idx = Math.min(2, Math.floor(L / SEG));
  const local = L - idx * SEG;
  return (
    <div className="absolute inset-0" style={{ background: C.ember }}>
      <Dots color="rgba(20,19,17,.16)" />
      <div
        style={{
          position: "absolute", left: 60, top: 40, fontFamily: F.s, fontSize: 420,
          lineHeight: 1, color: C.ink, opacity: 0.22, transform: "rotate(-8deg)",
        }}
      >
        “
      </div>

      <div className="absolute inset-x-0 text-center" style={{ top: 84 }}>
        <div
          style={{
            display: "inline-block", background: C.ink, color: C.cream,
            fontFamily: F.m, fontWeight: 700, fontSize: 23, letterSpacing: "0.34em",
            padding: "14px 30px 14px 38px", borderRadius: 999,
            transform: `scale(${E.backOut(p(L, 0.05, 0.5))}) rotate(-1deg)`,
          }}
        >
          CLIENT LOVE ★ 5.0 RATED
        </div>
      </div>

      {idx > 0 && local < 0.32 && <QuoteCard qi={idx - 1} enter={1} exit={local / 0.3} />}
      <QuoteCard qi={idx} enter={local / 0.42} exit={0} />

      {/* dots */}
      <div className="absolute inset-x-0 flex justify-center" style={{ bottom: 150, gap: 16 }}>
        {QUOTES.map((_, i) => (
          <span
            key={i}
            style={{
              width: i === idx ? 44 : 18, height: 18, borderRadius: 99,
              background: i === idx ? C.cream : C.ink, border: `3px solid ${C.ink}`,
              transition: "none",
            }}
          />
        ))}
      </div>

      {/* rotating badge */}
      <div
        style={{
          position: "absolute", right: 66, bottom: 66, width: 168, height: 168,
          opacity: E.quadOut(p(L, 0.25, 0.6)),
          transform: `scale(${E.backOut(p(L, 0.25, 0.75))})`,
        }}
      >
        <div style={{ position: "absolute", inset: 0, borderRadius: 999, background: C.cream, border: `5px solid ${C.ink}` }} />
        <svg viewBox="0 0 200 200" width={168} height={168} style={{ position: "absolute", inset: 0, transform: `rotate(${L * 40}deg)` }}>
          <defs>
            <path id="popring" d="M100,100 m-70,0 a70,70 0 1,1 140,0 a70,70 0 1,1 -140,0" />
          </defs>
          <text fill={C.ink} style={{ fontFamily: F.m, fontWeight: 700, fontSize: 19, letterSpacing: "0.24em" }}>
            <textPath href="#popring">FIVE STAR RATED • FIVE STAR •</textPath>
          </text>
        </svg>
        <svg viewBox="0 0 24 24" width={56} height={56} style={{ position: "absolute", left: 56, top: 56 }}>
          <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z"
            fill={C.ember} stroke={C.ink} strokeWidth={1.4} strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

/* ================================================================= */
/*  P6 — STAMP CARD                                                  */
/* ================================================================= */
function slam(L: number, s: number) {
  const f = E.quadIn(p(L, s, s + 0.2));
  return {
    y: (1 - f) * -360,
    jx: shake(L, s + 0.2, 0.28, 26) * 10,
    sq: L >= s + 0.2 ? 1 - Math.max(0, 1 - (L - s - 0.2) / 0.16) * 0.16 : 1,
    op: p(L, s, s + 0.04) > 0 ? 1 : 0,
  };
}

function SceneStamp({ t }: { t: number }) {
  const L = t - 12.5;
  const logo = slam(L, 0.12);
  const word = slam(L, 0.34);
  const ctaK = E.backOut(p(L, 0.95, 1.45));
  const wiggle = L > 1.45 ? Math.sin((L - 1.45) * 7) * 2 : 0;

  return (
    <div className="absolute inset-0" style={{ background: C.paper }}>
      <Dots />
      <Confetti t={L} start={0.05} count={130} ox={540} oy={210} life={2.7} />

      {/* impact rings at the slams */}
      {[
        { s: 0.32, x: 540, y: 210 },
        { s: 0.54, x: 540, y: 400 },
      ].map((r, i) => {
        const k = p(L, r.s, r.s + 0.7);
        if (k <= 0.001 || k >= 1) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute", left: r.x - 90, top: r.y - 90, width: 180, height: 180,
              borderRadius: 999, border: `5px solid ${C.ember}`,
              transform: `scale(${0.3 + E.expoOut(k) * 2.6})`, opacity: (1 - k) * 0.7,
            }}
          />
        );
      })}

      <div
        className="absolute inset-x-0 flex justify-center"
        style={{
          top: 130,
          transform: `translate(${logo.jx}px,${logo.y}px) scaleY(${logo.sq})`,
          opacity: logo.op,
        }}
      >
        <LogoMark t={t} start={12.55} size={132} color={C.ember} bar={C.ink} />
      </div>

      <div
        className="absolute inset-x-0 text-center"
        style={{
          top: 300,
          transform: `translate(${word.jx}px,${word.y}px) scaleY(${word.sq})`,
          opacity: word.op,
        }}
      >
        <div style={{ fontFamily: F.d, fontSize: 108, color: C.ink, letterSpacing: "0.02em", textShadow: `5px 5px 0 ${C.gold}` }}>
          TIMBERLANE
        </div>
        <div style={{ marginTop: 10, fontFamily: F.m, fontWeight: 700, fontSize: 22, letterSpacing: "0.5em", color: C.graphite, paddingLeft: "0.5em" }}>
          INTERIORS · {BRAND.city}
        </div>
      </div>

      <div
        className="absolute inset-x-0 text-center"
        style={{
          top: 520, fontFamily: F.s, fontStyle: "italic", fontSize: 46, color: C.emberDeep,
          opacity: E.quadOut(p(L, 0.75, 1.05)),
          transform: `translateY(${(1 - E.backOut(p(L, 0.75, 1.25))) * 60}px)`,
        }}
      >
        {BRAND.tagline}.
      </div>

      {/* CTA */}
      <div className="absolute inset-x-0 flex justify-center" style={{ top: 640 }}>
        <div style={{ position: "relative", transform: `scale(${Math.max(0.001, ctaK)}) rotate(${wiggle}deg)` }}>
          {ctaK > 0.001 && (
            <>
              <div
                style={{
                  background: C.ember, border: `5px solid ${C.ink}`, borderRadius: 999,
                  padding: "26px 58px", boxShadow: `8px 8px 0 ${C.ink}`,
                  fontFamily: F.g, fontWeight: 800, fontSize: 33, letterSpacing: "0.06em", color: C.ink,
                  whiteSpace: "nowrap",
                }}
              >
                BOOK A FREE CONSULT ★
              </div>
              <Starburst x={500} y={-30} size={118} t={L} color={C.gold} text="FREE!" spin={40}
                scale={E.backOut(p(L, 1.25, 1.7))} fs={24} />
            </>
          )}
        </div>
      </div>

      <div
        className="absolute inset-x-0 text-center"
        style={{
          top: 800, fontFamily: F.d, fontSize: 58, color: C.ink, letterSpacing: "0.02em",
          opacity: p(L, 1.3, 1.38) > 0 ? 1 : 0,
          transform: `translateY(${(1 - E.backOut(p(L, 1.3, 1.75))) * 80}px)`,
        }}
      >
        {BRAND.url}
      </div>
      <div
        className="absolute inset-x-0 text-center"
        style={{
          top: 876, fontFamily: F.m, fontWeight: 700, fontSize: 27, letterSpacing: "0.22em", color: C.graphite,
          opacity: p(L, 1.45, 1.53) > 0 ? 1 : 0,
          transform: `translateY(${(1 - E.backOut(p(L, 1.45, 1.9))) * 80}px)`,
        }}
      >
        {BRAND.phone}
      </div>

      <div style={{ transform: `translateY(${(1 - E.backOut(p(L, 1.2, 1.7))) * 120}px)` }}>
        <Marquee t={L} text="TIMBERLANE.CO.IN • +91 88846 51111 • BOOK NOW • " y={1004} h={66} bg={C.ink} fg={C.cream} dir={-1} speed={170} />
      </div>
    </div>
  );
}
