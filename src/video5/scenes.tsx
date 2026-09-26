import { BEATS, C, F } from "./timeline";
import { E, clamp, counter, hit, lerp, p, shake } from "../video/anim";
import { IMG } from "../video/assets";
import { LogoMark } from "../video/fx";
import { AfterWipe, CaseBar, CaseCard, CasePost, CountBig, DotGrid, GhostBig, HudCorners, MiniPlan, Scanner, SpecRow } from "./fx";

const bp = {
  paper: IMG.contemporary,
  warm: IMG.livingHero,
  lounge: IMG.loungeCurve,
  luxe: IMG.bedroom,
  modern: IMG.leatherSofa,
} as const;

export function DossierComposition({ t }: { t: number }) {
  let sc = 1 + Math.sin(t * 2.4) * 0.004;
  let rot = Math.sin(t * 1.7) * 0.1;
  let sy = 0;
  BEATS.forEach((b, i) => {
    sc += hit(t, b, 0.32) * 0.014;
    rot += shake(t, b, 0.26, 9 + i) * 0.35;
    sy += shake(t, b, 0.26, 12 + i) * 5;
  });
  const intro = E.quadOut(clamp(t / 0.7));
  sc *= lerp(1.06, 1, intro);

  return (
    <div style={{ position: "relative", width: 1080, height: 1920, background: C.ink, overflow: "hidden", contain: "strict" }}>
      <DotGrid opacity={0.5} />
      <div className="absolute inset-0" style={{ transform: `translate3d(0,${sy}px,0) rotate(${rot}deg) scale(${sc})` }}>
        {t < 2.3077 && <SceneFileOpen t={t} />}
        {t >= 2.3077 && t < 4.6154 && <SceneOverview t={t} />}
        {t >= 4.6154 && t < 6.9231 && <SceneBriefing t={t} />}
        {t >= 6.9231 && t < 9.2308 && <ScenePlanSpecs t={t} />}
        {t >= 9.2308 && t < 11.5385 && <SceneMaterials t={t} />}
        {t >= 11.5385 && t < 13.8462 && <SceneTransform t={t} />}
        {t >= 13.8462 && t < 16.1538 && <SceneTestimonial t={t} />}
        {t >= 16.1538 && <SceneClose t={t} />}
      </div>

      {/* cut flashes */}
      {[2.3077, 4.6154, 6.9231, 9.2308, 11.5385, 13.8462, 16.1538].map((b) => (
        <CaseFlash key={b} t={t} at={b} />
      ))}

      {/* vignette + corner film frame + grain */}
      <CasePost t={t} />
    </div>
  );
}

function CaseFlash({ t, at }: { t: number; at: number }) {
  const k = t < at ? 0 : 1 - E.expoOut(p(t, at, at + 0.16));
  if (k <= 0.002) return null;
  return <div className="absolute inset-0 pointer-events-none" style={{ background: C.fog, opacity: k * 0.28 }} />;
}

/** small animated bar for percentages */
function MiniBar({ t, start, target, color = C.ember, h = 10 }: { t: number; start: number; target: number; color?: string; h?: number }) {
  const k = E.quintInOut(p(t, start, start + 0.9));
  return (
    <div style={{ height: h, background: C.slate, borderRadius: 99, overflow: "hidden" }}>
      <div style={{ width: `${target * k}%`, height: "100%", background: color, borderRadius: 99 }} />
    </div>
  );
}

/* ================================================================= */
/*  00 — FILE OPEN                                                   */
/* ================================================================= */
function SceneFileOpen({ t }: { t: number }) {
  const open = E.backOut(p(t, 0.1, 0.8));
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: C.coal }}>
      <Scanner t={t} start={0.1} dur={1.1} y1={760} y2={1160} />
      <GhostBig text="043" t={t} x={-120} y={-80} size={620} opacity={0.1} />
      <HudCorners inset={64} size={60} />

      <div style={{ opacity: open }}>
        <CaseCard t={t} start={0.15} />
      </div>

      <div
        className="absolute"
        style={{
          bottom: 130, left: 0, right: 0, textAlign: "center",
          fontFamily: F.m, fontSize: 21, letterSpacing: "0.42em", color: C.steel,
          opacity: E.quadOut(p(t, 1.2, 1.7)),
        }}
      >
        <span className="pulse" style={{ color: C.ember }}>■</span> OPENING FILE · GODREJ AQUA
      </div>
    </div>
  );
}

/* ================================================================= */
/*  01 — OVERVIEW                                                    */
/* ================================================================= */
const OVERVIEW_CELLS = [
  { k: "TYPE", v: "4BHK RES." },
  { k: "LOCATION", v: "OMR · BLR" },
  { k: "TIMELINE", v: "9 MONTHS" },
  { k: "TEAM", v: "18 PEOPLE" },
];

function SceneOverview({ t }: { t: number }) {
  const L = t - 2.3077;
  const cellK = (i: number) => E.expoOut(p(L, 0.25 + i * 0.12, 0.65 + i * 0.12));
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-y-0" style={{ background: C.ink }} />
      <img
        src={bp.paper}
        alt=""
        style={{
          position: "absolute", inset: "-5%", width: "110%", height: "110%", objectFit: "cover",
          filter: "saturate(.72) contrast(1.06) brightness(.4)",
          transform: `scale(${lerp(1.12, 1.03, E.quintInOut(p(L, 0, 2.4)))})`,
        }}
      />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(9,11,14,.55),rgba(9,11,14,.2) 40%,rgba(9,11,14,.88))" }} />
      <GhostBig text="2200" t={t} x={600} y={-40} size={560} opacity={0.11} />

      <div className="absolute inset-x-0" style={{ padding: "160px 44px 0" }}>
        <div style={{ fontFamily: F.m, fontSize: 21, letterSpacing: "0.44em", color: C.ember, opacity: E.quadOut(p(L, 0.05, 0.4)) }}>
          01 · PROJECT OVERVIEW
        </div>
        <div
          style={{
            marginTop: 24, fontFamily: F.d, fontSize: 158, color: C.bone, lineHeight: 0.96, letterSpacing: "0.01em",
            opacity: E.quadOut(p(L, 0.15, 0.6)),
            transform: `translateY(${(1 - E.heavyOut(p(L, 0.15, 0.75))) * 50}px)`,
            textShadow: "0 22px 60px rgba(0,0,0,.7)",
          }}
        >
          GODREJ
        </div>
        <div
          style={{
            fontFamily: F.s, fontStyle: "italic", fontSize: 110, color: C.fog, lineHeight: 1,
            opacity: E.quadOut(p(L, 0.3, 0.8)),
            transform: `translateX(${(1 - E.expoOut(p(L, 0.3, 0.9))) * -50}px)`,
            textShadow: "0 16px 44px rgba(0,0,0,.7)",
          }}
        >
          aqua residence.
        </div>
      </div>

      {/* four cells */}
      <div className="absolute inset-x-0" style={{ top: 1010, padding: "0 44px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
          {OVERVIEW_CELLS.map((c, i) => (
            <div
              key={c.k}
              style={{
                background: "rgba(15,18,22,.82)", border: `1.5px solid ${C.slate}`,
                padding: "26px 28px", opacity: cellK(i), transform: `translateY(${(1 - cellK(i)) * 30}px)`,
                backdropFilter: "blur(8px)",
              }}
            >
              <div style={{ fontFamily: F.m, fontSize: 17, letterSpacing: "0.3em", color: C.steel }}>{c.k}</div>
              <div style={{ fontFamily: F.m, fontSize: 29, fontWeight: 700, letterSpacing: "0.06em", color: C.bone, marginTop: 10 }}>{c.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* area count */}
      <div className="absolute" style={{ left: 44, bottom: 190, opacity: E.quadOut(p(L, 0.5, 0.9)) }}>
        <CountBig t={t} start={L + 0.45} value={2200} size={140} />
        <div style={{ fontFamily: F.m, fontSize: 21, letterSpacing: "0.36em", color: C.ash, marginTop: 12 }}>
          SQ.FT · DELIVERED
        </div>
      </div>

      <CaseBar code="CASE" name="GODREJ AQUA" shot="SHT 01/07" />
    </div>
  );
}

/* ================================================================= */
/*  02 — BRIEFING                                                    */
/* ================================================================= */
function SceneBriefing({ t }: { t: number }) {
  const L = t - 4.6154;
  const bodyK = E.expoOut(p(L, 0.45, 1.4));
  const words = ["PRECISION", "CRAFT", "DELIVERY"];
  return (
    <div className="absolute inset-0" style={{ background: C.coal }}>
      <DotGrid opacity={0.3} spacing={30} />
      <GhostBig text="002" t={t} x={780} y={300} size={500} opacity={0.1} />
      <HudCorners inset={64} size={56} />

      <div className="absolute" style={{ left: 84, top: 190 }}>
        <div style={{ fontFamily: F.m, fontSize: 21, letterSpacing: "0.44em", color: C.ember, opacity: E.quadOut(p(L, 0.05, 0.4)) }}>
          02 · THE BRIEF
        </div>
      </div>

      <div className="absolute" style={{ left: 84, right: 120, top: 300 }}>
        <div style={{ fontFamily: F.s, fontStyle: "italic", fontSize: 40, color: C.fog, lineHeight: 1.55, opacity: bodyK }}>
          The Godrej Aqua 4BHK on OMR began with a simple brief — pair{" "}
          <span style={{ borderBottom: `3px solid ${C.ember}`, color: C.bone, fontStyle: "normal", fontFamily: F.g, fontWeight: 600 }}>
            architectural precision
          </span>{" "}
          with the easy confidence of contemporary living. Timberlane's studio mapped nine months of design,
          fabrication and on-site craft into a single, coherent shell.
        </div>
      </div>

      {/* keywords — pop in on beat */}
      {words.map((w, i) => {
        const start = 9.6 + i * 1.0;
        const k = E.backOut(p(L, start, start + 0.45));
        return (
          <div
            key={w}
            className="absolute"
            style={{
              left: 84, top: 860 + i * 200,
              opacity: k,
              transform: `translateY(${(1 - k) * 40}px) scale(${lerp(0.6, 1, k)})`,
            }}
          >
            <div style={{ fontFamily: F.d, fontSize: 132, color: i === 1 ? C.ember : C.bone, letterSpacing: "0.02em", lineHeight: 1, textShadow: "0 18px 50px rgba(0,0,0,.55)" }}>
              {w}
            </div>
            <div style={{ marginTop: 10, height: 5, background: i === 1 ? C.bone : C.ember, width: `${lerp(0, 190 - i * 40, E.quintInOut(p(L, start + 0.15, start + 0.7)))}px` }} />
          </div>
        );
      })}

      <div
        className="absolute"
        style={{
          left: 84, bottom: 200, fontFamily: F.m, fontSize: 22, letterSpacing: "0.3em", color: C.steel,
          opacity: E.quadOut(p(L, 0.8, 1.3)),
        }}
      >
        4 BEDROOMS · LOUNGE · ATELIER · 03 BALCONIES
      </div>

      <CaseBar code="CASE" name="GODREJ AQUA" shot="SHT 02/07" />
    </div>
  );
}

/* ================================================================= */
/*  03 — PLAN + SPECS                                                */
/* ================================================================= */
function ScenePlanSpecs({ t }: { t: number }) {
  const L = t - 6.9231;
  const rows = [
    { no: "01", name: "LIVING + KITCHEN", note: "OPEN PLAN · 5.4M MAIN AXIS" },
    { no: "02", name: "BED 01 — MASTER", note: "SOUTH-WEST · ENSUITE · BALCONY" },
    { no: "03", name: "BED 02 — SECONDARY", note: "SHARED BATH · WORKSTATION" },
    { no: "04", name: "ATELIER", note: "READING LOFT · STORAGE WALL" },
    { no: "05", name: "SERVICES", note: "LAUNDRY · HVAC · ACCESS CORE" },
  ];
  return (
    <div className="absolute inset-0" style={{ background: C.ink }}>
      <DotGrid opacity={0.25} />
      <GhostBig text="2200" t={t} x={-60} y={1450} size={420} opacity={0.1} />

      <div className="absolute" style={{ left: 84, top: 150 }}>
        <div style={{ fontFamily: F.m, fontSize: 21, letterSpacing: "0.44em", color: C.ember, opacity: E.quadOut(p(L, 0.05, 0.4)) }}>
          03 · PLAN + ZONES
        </div>
      </div>

      {/* plan on a light-table chip */}
      <div
        style={{
          position: "absolute", left: 84, top: 280, width: 520, height: 700,
          background: C.coal, border: `2px solid ${C.slate}`,
          boxShadow: "0 30px 70px rgba(0,0,0,.55)",
          opacity: E.backOut(p(L, 0.15, 0.75)),
          transform: `translateY(${(1 - E.backOut(p(L, 0.15, 0.75))) * 60}px)`,
        }}
      >
        <div style={{ padding: "22px 28px 0", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontFamily: F.m, fontSize: 18, letterSpacing: "0.32em", color: C.steel }}>DWG · PLAN 2F</span>
          <span style={{ fontFamily: F.d, fontSize: 40, color: C.ember }}>G.03</span>
        </div>
        <div style={{ position: "relative", width: 520, height: 610 }}>
          <MiniPlan t={t} start={L + 0.1} x={0} y={0} w={520} h={610} />
        </div>
      </div>

      {/* scan line across the plan */}
      <Scanner t={t} start={L + 0.2} dur={1.6} y1={280} y2={980} />

      <div className="absolute" style={{ left: 624, right: 84, top: 300 }}>
        {rows.map((r, i) => (
          <SpecRow key={r.no} t={t} start={L + 0.45 + i * 0.16} no={r.no} name={r.name} note={r.note} />
        ))}
      </div>

      <div
        className="absolute"
        style={{
          left: 84, bottom: 190, fontFamily: F.m, fontSize: 21, letterSpacing: "0.3em", color: C.steel,
          opacity: E.quadOut(p(L, 1.2, 1.6)),
        }}
      >
        5 ZONES · 13 ROOMS · 04 WET · 02 WARDROBE CLOSETS
      </div>

      <CaseBar code="CASE" name="GODREJ AQUA" shot="SHT 03/07" />
    </div>
  );
}

/* ================================================================= */
/*  04 — MATERIAL BOARD                                              */
/* ================================================================= */
const MATS = [
  { img: IMG.rustic, name: "WHITE OAK", pct: 34, note: "FLOORS + VENEERS", code: "MAT-01" },
  { img: IMG.contemporary, name: "LIMESTONE", pct: 26, note: "SLABS + SINKS", code: "MAT-02" },
  { img: IMG.loungeCurve, name: "BOUCLE", pct: 24, note: "SOFAS + RUGS", code: "MAT-03" },
  { img: IMG.bedroom, name: "BRASS", pct: 16, note: "HARDWARE + LIGHTING", code: "MAT-04" },
];

function SceneMaterials({ t }: { t: number }) {
  const L = t - 9.2308;
  const cellK = (i: number) => E.backOut(p(L, 0.2 + i * 0.14, 0.6 + i * 0.14));
  return (
    <div className="absolute inset-0" style={{ background: C.coal }}>
      <GhostBig text="CRAFT" t={t} x={-180} y={-60} size={520} opacity={0.11} />

      <div className="absolute" style={{ left: 84, top: 150 }}>
        <div style={{ fontFamily: F.m, fontSize: 21, letterSpacing: "0.44em", color: C.ember, opacity: E.quadOut(p(L, 0.05, 0.4)) }}>
          04 · MATERIAL BOARD
        </div>
        <div
          style={{
            marginTop: 18, fontFamily: F.d, fontSize: 138, color: C.bone,
            opacity: E.quadOut(p(L, 0.15, 0.6)),
            transform: `translateY(${(1 - E.heavyOut(p(L, 0.15, 0.75))) * 50}px)`,
          }}
        >
          4 FINISHES
        </div>
      </div>

      <div className="absolute" style={{ left: 84, right: 84, top: 460 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {MATS.map((m, i) => (
            <div
              key={m.code}
              style={{
                background: C.graphite, border: `1.5px solid ${C.slate}`, overflow: "hidden",
                opacity: cellK(i), transform: `scale(${lerp(0.88, 1, cellK(i))}) rotate(${(i % 2 ? 1 : -1) * (1 - cellK(i)) * 1.4}deg)`,
              }}
            >
              <div style={{ position: "relative", height: 320, overflow: "hidden" }}>
                <img
                  src={m.img}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", filter: "saturate(.9) contrast(1.06) brightness(.8)", transform: `scale(${lerp(1.08, 1, cellK(i))})` }}
                />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,transparent,rgba(9,11,14,.55))" }} />
                <span style={{ position: "absolute", left: 18, top: 14, fontFamily: F.m, fontSize: 17, letterSpacing: "0.28em", color: C.fog }}>{m.code}</span>
              </div>
              <div style={{ padding: "20px 22px 24px" }}>
                <div style={{ fontFamily: F.d, fontSize: 42, color: C.bone, lineHeight: 1.02 }}>{m.name}</div>
                <div style={{ fontFamily: F.m, fontSize: 18, letterSpacing: "0.2em", color: C.ash, marginTop: 6 }}>{m.note}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16 }}>
                  <div style={{ width: 110 }}>
                    <MiniBar t={t} start={L + 0.35 + i * 0.14} target={m.pct * 3} color={i === 1 ? C.gold : C.ember} h={8} />
                  </div>
                  <span className="tnum" style={{ fontFamily: F.m, fontSize: 21, fontWeight: 700, color: C.bone }}>
                    {counter(L, 0.35 + i * 0.14, 1.3 + i * 0.14, m.pct, E.expoOut)}
                    <span style={{ color: C.ember }}>%</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className="absolute"
        style={{
          left: 84, bottom: 190, fontFamily: F.m, fontSize: 21, letterSpacing: "0.3em", color: C.steel,
          opacity: E.quadOut(p(L, 1.0, 1.4)),
        }}
      >
        100% SAMPLED · 02 MOCK-UPS · 0 COMPROMISES
      </div>

      <CaseBar code="CASE" name="GODREJ AQUA" shot="SHT 04/07" />
    </div>
  );
}

/* ================================================================= */
/*  05 — TRANSFORM                                                   */
/* ================================================================= */
function SceneTransform({ t }: { t: number }) {
  const L = t - 11.5385;
  return (
    <div className="absolute inset-0" style={{ background: C.ink }}>
      <img
        src={bp.modern}
        alt=""
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
          filter: "saturate(.18) contrast(1.1) brightness(.55)",
        }}
      />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(9,11,14,.3),rgba(9,11,14,.35) 60%,rgba(9,11,14,.7))" }} />
      <AfterWipe src={bp.warm} t={t} start={L + 0.25} dur={1.4} />

      <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg,rgba(9,11,14,.55),transparent 35%,rgba(9,11,14,.55))" }} />
      <GhostBig text="+42%" t={t} x={680} y={70} size={380} opacity={0.1} />

      <div className="absolute" style={{ left: 84, top: 150 }}>
        <div style={{ fontFamily: F.m, fontSize: 21, letterSpacing: "0.44em", color: C.ember, opacity: E.quadOut(p(L, 0.05, 0.4)) }}>
          05 · BEFORE / AFTER
        </div>
      </div>

      <div
        className="absolute"
        style={{
          left: 84, top: 560, opacity: E.quadOut(p(L, 0.2, 0.8)),
          transform: `translateY(${(1 - E.heavyOut(p(L, 0.2, 0.9))) * 40}px)`,
        }}
      >
        <div style={{ fontFamily: F.d, fontSize: 155, color: C.bone, textShadow: "0 22px 60px rgba(0,0,0,.7)" }}>
          TRANSFORMED
        </div>
        <div style={{ marginTop: 8, fontFamily: F.s, fontStyle: "italic", fontSize: 86, color: C.fog, textShadow: "0 16px 44px rgba(0,0,0,.7)" }}>
          — not decorated.
        </div>
      </div>

      {/* filter slider hint */}
      <div
        className="absolute"
        style={{
          left: 0, right: 0, top: 1450, textAlign: "center",
          opacity: E.quadOut(p(L, 0.5, 1.0)),
          transform: `translateY(${Math.sin(t * 2.4) * 8}px)`,
        }}
      >
        <div style={{ display: "inline-block", background: "rgba(15,18,22,.84)", border: `1.5px solid ${C.slate}`, padding: "16px 26px", fontFamily: F.m, fontSize: 21, letterSpacing: "0.3em", color: C.fog }}>
          THE DIFFERENCE IS IN THE DETAIL
        </div>
      </div>

      <div className="absolute" style={{ left: 84, bottom: 190, right: 84 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: F.m, fontSize: 20, letterSpacing: "0.26em", color: C.ash }}>
          <span>▢ CONCEPT 0%</span>
          <span style={{ color: C.ember }}>◼ DELIVERED 100%</span>
        </div>
      </div>

      <CaseBar code="CASE" name="GODREJ AQUA" shot="SHT 05/07" />
    </div>
  );
}

/* ================================================================= */
/*  06 — TESTIMONIAL                                                 */
/* ================================================================= */
function SceneTestimonial({ t }: { t: number }) {
  const L = t - 13.8462;
  const line1 = E.expoOut(p(L, 0.35, 1.1));
  const line2 = E.expoOut(p(L, 0.55, 1.35));
  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ background: C.coal }}>
      <DotGrid opacity={0.3} />
      <HudCorners inset={64} size={56} />
      <GhostBig text="“" t={t} x={60} y={-40} size={560} opacity={0.14} />

      <div className="absolute" style={{ left: 84, right: 84, top: 560 }}>
        {/* big mark */}
        <div
          style={{
            display: "inline-block", background: C.ember, color: C.ink,
            fontFamily: F.d, fontSize: 90, padding: "18px 28px 10px", lineHeight: 1,
            marginBottom: 44, opacity: E.quadOut(p(L, 0.05, 0.4)),
            transform: `rotate(-2deg) scale(${lerp(0.7, 1, E.backOut(p(L, 0.05, 0.55)))})`,
          }}
        >
          “
        </div>

        {/* quote lines — line-by-line */}
        <div style={{ maxWidth: 920 }}>
          <div style={{ fontFamily: F.s, fontStyle: "italic", fontSize: 62, color: C.bone, lineHeight: 1.4, opacity: line1 }}>
            Timberlane didn't just design our home —
          </div>
          <div style={{ fontFamily: F.s, fontStyle: "italic", fontSize: 62, color: C.bone, lineHeight: 1.4, marginTop: 6, opacity: line2 }}>
            they translated <span style={{ borderBottom: `4px solid ${C.ember}`, color: C.ember }}>who we are</span> into space.
          </div>
        </div>

        {/* stars */}
        <div style={{ display: "flex", gap: 14, marginTop: 54 }}>
          {Array.from({ length: 5 }, (_, i) => {
            const sk = E.backOut(p(L, 0.9 + i * 0.14, 1.35 + i * 0.14));
            return (
              <svg key={i} width={52} height={52} viewBox="0 0 24 24" style={{ transform: `scale(${Math.max(0.001, sk)})` }}>
                <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z"
                  fill={C.ember} stroke={C.ink} strokeWidth={1.2} strokeLinejoin="round" />
              </svg>
            );
          })}
          <span style={{ marginLeft: 22, fontFamily: F.d, fontSize: 64, color: C.bone, alignSelf: "center", opacity: line2 }}>5.0</span>
        </div>

        {/* attribution */}
        <div style={{ marginTop: 44, opacity: E.quadOut(p(L, 1.1, 1.5)) }}>
          <div style={{ fontFamily: F.m, fontSize: 26, fontWeight: 700, letterSpacing: "0.24em", color: C.fog }}>AARAV SINHA</div>
          <div style={{ fontFamily: F.m, fontSize: 21, letterSpacing: "0.3em", color: C.steel, marginTop: 10 }}>4BHK RESIDENCE · OMR, BENGALURU</div>
        </div>
      </div>

      {/* verdict stamp */}
      <div
        className="absolute"
        style={{
          right: 84, bottom: 180, width: 220, height: 220, border: `4px solid ${C.ember}`, color: C.ember,
          display: "grid", placeItems: "center", fontFamily: F.d, fontSize: 44, letterSpacing: "0.06em",
          transform: `scale(${Math.max(0.001, E.backOut(p(L, 1.5, 2.1)))}) rotate(-8deg)`,
          opacity: p(L, 1.5, 1.58) > 0 ? 1 : 0,
          borderRadius: 999,
        }}
      >
        DELIVERED
      </div>

      <CaseBar code="CASE" name="GODREJ AQUA" shot="SHT 06/07" />
    </div>
  );
}

/* ================================================================= */
/*  07 — CASE CLOSED                                                 */
/* ================================================================= */
function SceneClose({ t }: { t: number }) {
  const L = t - 16.1538;
  const out = E.quadIn(p(L, 3.4, 3.95));
  const ctaK = E.backOut(p(L, 0.95, 1.45));
  return (
    <div className="absolute inset-0" style={{ background: C.coal, opacity: 1 - out }}>
      {/* reversed scanner — file folds closed */}
      <Scanner t={t} start={L + 0.1} dur={1.1} y1={1160} y2={760} />
      <DotGrid opacity={0.3} />
      <GhostBig text="0043" t={t} x={-140} y={-60} size={600} opacity={0.09} />
      <HudCorners inset={64} size={60} />

      <div className="absolute inset-0 flex flex-col items-center" style={{ paddingTop: 430 }}>
        <div style={{ opacity: E.quadOut(p(L, 0.25, 0.6)), transform: `translateY(${(1 - E.backOut(p(L, 0.25, 0.8))) * 40}px)` }}>
          <LogoMark t={t} start={16.25} size={150} color={C.ember} bar={C.bone} />
        </div>

        <div
          style={{
            marginTop: 54, fontFamily: F.d, fontSize: 142, color: C.bone, letterSpacing: "0.05em", lineHeight: 0.94,
            opacity: E.quadOut(p(L, 0.45, 0.95)),
            transform: `translateY(${(1 - E.heavyOut(p(L, 0.45, 1.05))) * 60}px)`,
          }}
        >
          TIMBERLANE
        </div>

        <div
          style={{
            marginTop: 80, fontFamily: F.d, fontSize: 130, color: "transparent",
            WebkitTextStroke: `3px ${C.bone}`,
            opacity: E.quadOut(p(L, 0.55, 0.95)),
            transform: `translateY(${(1 - E.heavyOut(p(L, 0.55, 1.1))) * 60}px)`,
            textShadow: "0 16px 44px rgba(0,0,0,.5)",
          }}
        >
          CASE CLOSED
        </div>

        <div
          style={{
            marginTop: 56, fontFamily: F.s, fontStyle: "italic", fontSize: 47, color: C.fog,
            opacity: E.quadOut(p(L, 0.85, 1.35)),
          }}
        >
          precision in every detail
        </div>

        {/* CTA */}
        <div
          style={{
            marginTop: 72, position: "relative",
            transform: `scale(${Math.max(0.001, ctaK)}) rotate(${L > 1.45 ? Math.sin((L - 1.45) * 7) * 2 : 0}deg)`,
            opacity: p(L, 0.95, 1.03) > 0 ? 1 : 0,
          }}
        >
          {ctaK > 0.001 && (
            <>
              <div
                style={{
                  background: C.ember, color: C.ink,
                  fontFamily: F.g, fontWeight: 800, fontSize: 34, letterSpacing: "0.05em",
                  padding: "26px 58px", borderRadius: 999, border: `4px solid ${C.ink}`,
                  boxShadow: `8px 8px 0 ${C.ink}`,
                  whiteSpace: "nowrap",
                }}
              >
                BOOK A FREE CONSULT
              </div>
              <div
                style={{
                  position: "absolute", right: -34, top: -36, width: 110, height: 110,
                  background: C.gold, border: `4px solid ${C.ink}`, borderRadius: 999,
                  display: "grid", placeItems: "center", fontFamily: F.d, fontSize: 22, color: C.ink,
                  transform: `rotate(10deg) scale(${E.backOut(p(L, 1.25, 1.7))})`,
                }}
              >
                FREE!
              </div>
            </>
          )}
        </div>

        {/* contact */}
        <div
          className="tnum"
          style={{
            marginTop: 86, fontFamily: F.d, fontSize: 56, color: C.bone, letterSpacing: "0.03em",
            opacity: p(L, 1.35, 1.43) > 0 ? 1 : 0,
            transform: `translateY(${(1 - E.backOut(p(L, 1.35, 1.8))) * 70}px)`,
          }}
        >
          timberlane.co.in
        </div>
        <div
          className="tnum"
          style={{
            marginTop: 18, fontFamily: F.m, fontSize: 30, letterSpacing: "0.24em", color: C.ash,
            opacity: p(L, 1.5, 1.58) > 0 ? 1 : 0,
            transform: `translateY(${(1 - E.backOut(p(L, 1.5, 2.0))) * 70}px)`,
          }}
        >
          +91 88846 51111
        </div>

        <div
          className="absolute"
          style={{
            bottom: 130, left: 0, right: 0, textAlign: "center",
            fontFamily: F.m, fontSize: 20, letterSpacing: "0.3em", color: C.steel,
            opacity: E.quadOut(p(L, 1.7, 2.2)),
          }}
        >
          PROJECT 0043 · GODREJ AQUA · SHEET 07/07
        </div>
      </div>
    </div>
  );
}
