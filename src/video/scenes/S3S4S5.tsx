import { C, F } from "../timeline";
import { E, clamp, counter, lerp, p, tw, wander } from "../anim";
import { Plate, Reveal, WipeLine } from "../fx";
import { IMG } from "../assets";

/* ================================================================= */
/*  03 · TRIPTYCH + COUNTERS  (6.0 → 8.0)                             */
/* ================================================================= */
/** editorial collage: one hero band + two half-width tiles */
const BANDS = [
  { src: IMG.livingHero, dir: -1, tag: "LIVING", x: 0, y: 0, w: 1080, h: 756, oy: -30 },
  { src: IMG.wardrobe, dir: 1, tag: "WARDROBES", x: 0, y: 764, w: 536, h: 358, oy: 0 },
  { src: IMG.kitchen2, dir: -1, tag: "KITCHEN", x: 544, y: 764, w: 536, h: 358, oy: -30 },
];

const STATS = [
  { v: 8, pad: 2, suffix: "", label: "YEARS REIMAGINING SPACES" },
  { v: 14, pad: 2, suffix: "", label: "IN-HOUSE DESIGNERS" },
  { v: 200, pad: 0, suffix: "+", label: "HOMES DELIVERED" },
];

export function SceneTriptych({ t }: { t: number }) {
  const L = t - 6;
  const exit = E.quintInOut(p(L, 1.8, 2.0));

  return (
    <div className="vframe" style={{ background: C.graphite }}>
      {/* --- sliding collage --- */}
      {BANDS.map((b, i) => {
        const k = E.heavyOut(p(L, i * 0.07, i * 0.07 + 0.7));
        const x = (1 - k) * 1240 * b.dir - exit * 260 * b.dir;
        return (
          <div
            key={i}
            style={{
              position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h,
              overflow: "hidden", transform: `translateX(${x}px)`,
            }}
          >
            <Plate
              src={b.src}
              t={L + i * 0.5}
              from={1.18}
              to={1.06}
              dur={3}
              y={wander(L, i * 7 + 1, 0.3) * 22 + b.oy}
              grade="warm"
            />
            <div
              style={{
                position: "absolute", left: 32, bottom: 24, fontFamily: F.m, fontSize: 20,
                letterSpacing: "0.34em", color: C.bone, opacity: k,
              }}
            >
              <span style={{ color: C.ember }}>0{i + 1}</span>&nbsp;&nbsp;{b.tag}
            </div>
            <div
              style={{
                position: "absolute", right: 32, top: 24, width: 54, height: 3,
                background: C.ember, transform: `scaleX(${k})`,
              }}
            />
          </div>
        );
      })}

      {/* --- stats slab --- */}
      <div
        className="absolute"
        style={{
          left: 0, right: 0, top: 1130, bottom: 0, background: C.coal,
          transform: `translateY(${(1 - E.heavyOut(p(L, 0.22, 0.92))) * 820 + exit * 340}px)`,
          borderTop: `4px solid ${C.ember}`,
        }}
      >
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(70% 90% at 80% 10%,rgba(255,90,31,.16),transparent 70%)" }}
        />
        <div className="absolute" style={{ left: 60, right: 60, top: 56 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 30 }}>
            <span style={{ fontFamily: F.m, fontSize: 21, letterSpacing: "0.44em", color: C.ember }}>THE NUMBERS</span>
            <span style={{ fontFamily: F.m, fontSize: 19, letterSpacing: "0.26em", color: C.ash }}>TIMBERLANE.CO.IN</span>
          </div>

          {STATS.map((s, i) => {
            const st = 0.5 + i * 0.22;
            const k = E.expoOut(p(L, st, st + 0.45));
            const n = counter(L, st, st + 0.7, s.v);
            return (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "center", gap: 30, marginBottom: 22,
                  opacity: k, transform: `translateX(${(1 - k) * -70}px)`,
                }}
              >
                <div
                  className="tnum"
                  style={{ fontFamily: F.d, fontSize: 118, color: C.bone, lineHeight: 1.12, width: 252 }}
                >
                  {s.pad ? String(n).padStart(s.pad, "0") : n}
                  <span style={{ color: C.ember }}>{s.suffix}</span>
                </div>
                <div style={{ flex: 1, paddingBottom: 8 }}>
                  <div
                    style={{ height: 2, background: C.steel, transformOrigin: "left", transform: `scaleX(${k})`, marginBottom: 14 }}
                  />
                  <div style={{ fontFamily: F.g, fontWeight: 700, fontSize: 30, letterSpacing: "0.18em", color: C.fog }}>
                    {s.label}
                  </div>
                </div>
              </div>
            );
          })}

          <div
            style={{
              marginTop: 40, display: "flex", alignItems: "center", gap: 22,
              opacity: E.quadOut(p(L, 1.25, 1.6)),
            }}
          >
            <span style={{ flex: 1, height: 1, background: C.steel }} />
            <span style={{ fontFamily: F.s, fontStyle: "italic", fontSize: 40, color: C.amber, whiteSpace: "nowrap" }}>
              trusted across Bengaluru
            </span>
            <span style={{ flex: 1, height: 1, background: C.steel }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================= */
/*  04 · BEFORE / AFTER TRANSFORM  (8.0 → 10.0)                       */
/* ================================================================= */
export function SceneTransform({ t }: { t: number }) {
  const L = t - 8;
  const x = lerp(5, 96, E.quintInOut(p(L, 0.08, 1.5))); // divider position %
  const beforeOp = clamp(1 - p(L, 1.0, 1.45));
  const afterOp = E.quadOut(p(L, 0.2, 0.6));

  return (
    <div className="vframe" style={{ background: C.ink }}>
      {/* BEFORE — blueprint grade */}
      <Plate src={IMG.leatherSofa} t={L} from={1.14} to={1.06} dur={2.4} grade="blueprint" />

      {/* AFTER — revealed left of the divider */}
      <div className="absolute inset-0" style={{ clipPath: `inset(0% ${100 - x}% 0% 0%)` }}>
        <Plate src={IMG.leatherSofa} t={L} from={1.14} to={1.06} dur={2.4} grade="warm" />
      </div>

      {/* legibility scrim */}
      <div
        className="absolute"
        style={{ left: 0, right: 0, bottom: 0, height: 900, background: "linear-gradient(180deg,transparent,rgba(8,8,10,.55) 42%,rgba(8,8,10,.94))" }}
      />

      {/* divider */}
      <div style={{ position: "absolute", top: 0, bottom: 0, left: `${x}%`, width: 5, background: C.ember, boxShadow: `0 0 40px 6px ${C.ember}` }}>
        <div
          style={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            width: 92, height: 92, borderRadius: 999, background: C.ember,
            display: "grid", placeItems: "center", color: C.ink, fontFamily: F.m, fontWeight: 700, fontSize: 30,
            boxShadow: `0 0 50px ${C.ember}`,
          }}
        >
          ⇄
        </div>
      </div>

      <div
        style={{
          position: "absolute", top: 150, right: 66, fontFamily: F.m, fontSize: 24,
          letterSpacing: "0.4em", color: C.ash, opacity: beforeOp,
        }}
      >
        BEFORE
      </div>
      <div
        style={{
          position: "absolute", top: 150, left: 66, fontFamily: F.m, fontSize: 24,
          letterSpacing: "0.4em", color: C.ember, opacity: afterOp,
        }}
      >
        AFTER
      </div>

      {/* measurement ticks — technical flavour */}
      <svg className="absolute inset-0" style={{ opacity: 0.5 }}>
        {Array.from({ length: 22 }, (_, i) => (
          <line
            key={i} x1={0} x2={i % 5 === 0 ? 34 : 18} y1={90 + i * 82} y2={90 + i * 82}
            stroke={C.steel} strokeWidth={2}
          />
        ))}
      </svg>

      <div className="absolute" style={{ left: 66, right: 66, bottom: 230 }}>
        <WipeLine t={t} start={8.85} dur={0.5}>
          <div style={{ fontFamily: F.d, fontSize: 122, color: C.bone, lineHeight: 0.98 }}>WE DON'T</div>
        </WipeLine>
        <WipeLine t={t} start={9.0} dur={0.5}>
          <div style={{ fontFamily: F.d, fontSize: 122, color: C.bone, lineHeight: 0.98 }}>DECORATE —</div>
        </WipeLine>
        <WipeLine t={t} start={9.18} dur={0.5}>
          <div style={{ fontFamily: F.d, fontSize: 146, color: C.ember, lineHeight: 0.98 }}>WE TRANSFORM.</div>
        </WipeLine>
      </div>

      <div
        style={{
          position: "absolute", bottom: 124, left: 66, right: 66, height: 2, background: C.steel,
          transformOrigin: "left", transform: `scaleX(${E.quintInOut(p(L, 1.3, 1.9))})`,
        }}
      />
    </div>
  );
}

/* ================================================================= */
/*  05 · THE METHOD  (10.0 → 13.0) — four steps, whip-panned          */
/* ================================================================= */
const STEPS = [
  { n: "01", title: "DISCOVERY", copy: "We listen first. Lifestyle, taste, vision.", img: IMG.armchair },
  { n: "02", title: "CONCEPT", copy: "Moodboards, layouts, material palettes.", img: IMG.diningLight },
  { n: "03", title: "REFINEMENT", copy: "Every finish, light and detail — together.", img: IMG.leatherSofa },
  { n: "04", title: "EXECUTION", copy: "Craftsmen, timelines, quality. Managed.", img: IMG.kitchen2 },
];

export function SceneMethod({ t }: { t: number }) {
  const L = t - 10; // 0 → 3
  const SD = 0.75;
  const idx = clamp(Math.floor(L / SD), 0, 3);
  const local = L - idx * SD;
  const inK = E.expoOut(clamp(local / 0.34));
  const outK = idx < 3 ? E.cubicIn(clamp((local - 0.56) / 0.19)) : 0;
  const dx = (1 - inK) * 1160 - outK * 1160;
  const skew = ((1 - inK) * -10 + outK * -10) * 0.9;
  const blur = Math.min(14, Math.abs((1 - inK) * 26 - outK * 26));
  const s = STEPS[idx];
  const prog = E.quintInOut(clamp((L - idx * SD) / SD)) * 0.25 + idx * 0.25;

  return (
    <div className="vframe" style={{ background: C.graphite }}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div className="absolute inset-0" style={{ opacity: 0.16, filter: "blur(2px)" }}>
        <Plate src={IMG.contemporary} t={L} from={1.2} to={1.06} dur={3} grade="mono" />
      </div>
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(60% 40% at 80% 20%, rgba(255,90,31,.20), transparent 70%)` }}
      />

      {/* persistent header */}
      <div className="absolute" style={{ left: 66, top: 120 }}>
        <div style={{ fontFamily: F.m, fontSize: 21, letterSpacing: "0.44em", color: C.ember, marginBottom: 16 }}>
          <Reveal text="THE TIMBERLANE METHOD" t={t} start={10.02} step={0.012} dur={0.4} from={130} />
        </div>
        <div style={{ fontFamily: F.g, fontWeight: 500, fontSize: 26, letterSpacing: "0.14em", color: C.ash }}>
          FOUR STEPS. ZERO GUESSWORK.
        </div>
      </div>

      {/* whip-panned card */}
      <div
        className="absolute inset-0"
        style={{ transform: `translateX(${dx}px) skewX(${skew}deg)`, filter: blur > 0.6 ? `blur(${blur * 0.35}px)` : undefined }}
      >
        <div
          style={{
            position: "absolute", left: -70, top: 336, fontFamily: F.d, fontSize: 520,
            lineHeight: 0.8, color: "transparent", WebkitTextStroke: `3px ${C.steel}`, opacity: 0.9,
          }}
        >
          {s.n}
        </div>

        <div
          style={{
            position: "absolute", right: 56, top: 356, width: 472, height: 700,
            overflow: "hidden", borderRadius: 4, border: `1px solid ${C.steel}`,
            boxShadow: "0 40px 90px rgba(0,0,0,.6)",
          }}
        >
          <Plate src={s.img} t={local + 0.2} from={1.24} to={1.08} dur={1.4} grade="warm" />
          <div style={{ position: "absolute", left: 0, bottom: 0, width: "100%", height: 5, background: C.ember }} />
        </div>

        <div className="absolute" style={{ left: 66, right: 66, top: 1240 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 18 }}>
            <div style={{ width: 56, height: 56, background: C.ember, display: "grid", placeItems: "center", fontFamily: F.m, fontWeight: 700, fontSize: 24, color: C.ink }}>
              {s.n}
            </div>
            <div style={{ flex: 1, height: 2, background: C.steel }} />
          </div>
          <div style={{ fontFamily: F.d, fontSize: 158, color: C.bone, lineHeight: 0.96 }}>{s.title}</div>
          <div style={{ marginTop: 22, fontFamily: F.g, fontWeight: 400, fontSize: 34, color: C.fog, letterSpacing: "0.01em" }}>
            {s.copy}
          </div>
        </div>
      </div>

      {/* whip flash bar */}
      {local < 0.2 && (
        <div
          style={{
            position: "absolute", top: 0, bottom: 0, width: 140,
            left: `${lerp(-14, 114, E.quadOut(clamp(local / 0.2))) }%`,
            background: `linear-gradient(90deg,transparent,${C.ember},transparent)`, opacity: 0.85,
          }}
        />
      )}

      {/* progress */}
      <div className="absolute" style={{ left: 66, right: 66, bottom: 140 }}>
        <div style={{ height: 6, background: C.slate }}>
          <div style={{ height: "100%", width: `${prog * 100}%`, background: C.ember, boxShadow: `0 0 20px ${C.ember}` }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, fontFamily: F.m, fontSize: 19, letterSpacing: "0.22em", color: C.ash }}>
          {STEPS.map((x, i) => (
            <span key={i} style={{ color: i <= idx ? C.ember : "#5f646b" }}>{x.n}</span>
          ))}
        </div>
      </div>

      <div
        style={{
          position: "absolute", right: 66, top: 120, fontFamily: F.m, fontSize: 20,
          letterSpacing: "0.22em", color: C.ash, opacity: 0.9,
        }}
      >
        {String(idx + 1)} / 4
      </div>
      <div
        style={{
          position: "absolute", left: 0, right: 0, top: 0, height: 4, background: C.ember,
          transformOrigin: "left", transform: `scaleX(${tw(L, 0, 3, 0, 1, E.linear)})`,
        }}
      />
    </div>
  );
}
