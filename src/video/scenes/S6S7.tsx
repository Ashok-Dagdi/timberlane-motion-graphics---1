import { useEffect, useRef, useState } from "react";
import { C, F } from "../timeline";
import { E, clamp, lerp, p, tw, wander } from "../anim";
import { Brackets, LogoMark, Plate, Reveal, WipeLine } from "../fx";
import { BRAND, IMG, VID } from "../assets";

/* ---------- video plate locked to the composition clock ---------- */
function VideoPlate({
  src, t, playing, dur, fallback, scaleFrom = 1.2, scaleTo = 1.04, sceneDur = 3,
}: {
  src: string; t: number; playing: boolean; dur: number; fallback: string;
  scaleFrom?: number; scaleTo?: number; sceneDur?: number;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [ok, setOk] = useState(false);
  const s = lerp(scaleFrom, scaleTo, E.quadOut(clamp(t / sceneDur)));

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const target = clamp(t, 0, dur - 0.08);
    if (Math.abs(v.currentTime - target) > 0.3) {
      try {
        v.currentTime = target;
      } catch {
        /* seek unavailable yet */
      }
    }
    if (playing && v.paused) void v.play().catch(() => undefined);
    if (!playing && !v.paused) v.pause();
  });

  return (
    <div className="absolute inset-0 overflow-hidden">
      <Plate src={fallback} t={t} from={scaleFrom} to={scaleTo} dur={sceneDur} grade="warm" />
      <video
        ref={ref}
        src={src}
        muted
        playsInline
        preload="auto"
        onCanPlay={() => setOk(true)}
        style={{
          position: "absolute", inset: "-4%", width: "108%", height: "108%", objectFit: "cover",
          transform: `scale(${s})`, opacity: ok ? 1 : 0, transition: "opacity .35s linear",
          filter: "saturate(.82) contrast(1.1) brightness(.8)",
        }}
      />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(8,8,10,.6),rgba(8,8,10,.12) 38%,rgba(8,8,10,.82))" }} />
      <div className="absolute inset-0 mix-blend-overlay" style={{ background: "radial-gradient(70% 45% at 50% 34%,rgba(255,122,47,.32),transparent 72%)" }} />
    </div>
  );
}

/* ================================================================= */
/*  06 · SIGNATURE  (13.0 → 16.0)                                     */
/* ================================================================= */
const LINES = [
  { txt: "PRECISION", color: C.bone },
  { txt: "IN EVERY", color: C.bone },
  { txt: "DETAIL.", color: C.ember },
];

export function SceneSignature({ t, playing }: { t: number; playing: boolean }) {
  const L = t - 13; // 0 → 3
  const circle = E.quintInOut(p(L, 2.35, 3.0)); // ember iris into the end card

  return (
    <div className="vframe" style={{ background: C.ink }}>
      <div style={{ position: "absolute", inset: 0, transform: `translateY(${wander(L, 9, 0.25) * 10}px)` }}>
        <VideoPlate
          src={VID.sunlitFloor}
          fallback={IMG.rustic}
          t={L}
          dur={5}
          playing={playing}
          sceneDur={3}
          scaleFrom={1.18}
          scaleTo={1.02}
        />
      </div>

      <div className="absolute" style={{ left: 66, right: 66, top: 700 }}>
        <div
          style={{
            fontFamily: F.m, fontSize: 21, letterSpacing: "0.46em", color: C.ember, marginBottom: 58,
            opacity: E.quadOut(p(L, 0.05, 0.35)),
          }}
        >
          <Reveal text="OUR PROMISE" t={t} start={13.05} step={0.018} dur={0.4} from={140} />
        </div>

        {LINES.map((l, i) => (
          <WipeLine key={i} t={t} start={13.15 + i * 0.3} dur={0.55}>
            <div
              style={{
                fontFamily: F.d, fontSize: 176, color: l.color, lineHeight: 0.94,
                textShadow: "0 18px 60px rgba(0,0,0,.55)",
              }}
            >
              {l.txt}
            </div>
          </WipeLine>
        ))}

        <div
          style={{
            marginTop: 46, height: 3, background: C.ember, transformOrigin: "left",
            transform: `scaleX(${E.quintInOut(p(L, 1.15, 1.75))})`, boxShadow: `0 0 24px ${C.ember}`,
          }}
        />
        <div
          style={{
            marginTop: 26, fontFamily: F.s, fontStyle: "italic", fontSize: 44, color: C.fog,
            opacity: E.quadOut(p(L, 1.35, 1.75)), transform: `translateY(${tw(L, 1.35, 1.9, 22, 0)}px)`,
          }}
        >
          from first sketch to final switchplate
        </div>
      </div>

      <Brackets t={t} start={13.9} inset={40} size={64} color={C.bone} w={2} />

      <div
        style={{
          position: "absolute", top: 120, left: 66, right: 66, display: "flex", justifyContent: "space-between",
          fontFamily: F.m, fontSize: 20, letterSpacing: "0.24em", color: C.fog,
          opacity: E.quadOut(p(L, 0.5, 0.9)),
        }}
      >
        <span>TIMBERLANE INTERIORS</span>
        <span style={{ color: C.ember }}>EST. 2017</span>
      </div>

      {/* ember iris that carries into the end card */}
      {circle > 0.0005 && (
        <div
          style={{
            position: "absolute", left: "50%", top: "52%", width: 2600, height: 2600,
            marginLeft: -1300, marginTop: -1300, borderRadius: 9999, background: C.ember,
            transform: `scale(${circle})`,
          }}
        />
      )}
    </div>
  );
}

/* ================================================================= */
/*  07 · END CARD  (16.0 → 20.0)                                      */
/* ================================================================= */
const CHIPS = ["MODULAR KITCHENS", "WARDROBES", "FULL HOME INTERIORS", "TV & CROCKERY UNITS", "VANITY & MIRRORS"];

export function SceneEndCard({ t }: { t: number }) {
  const L = t - 16; // 0 → 4
  const wipe = lerp(-70, 220, E.quintInOut(p(L, 0.52, 1.18)));
  const settle = lerp(1.1, 1, E.expoOut(clamp(L / 0.8)));
  const breathe = 1 + Math.sin(Math.max(0, L - 1.4) * 1.5) * 0.004;
  const url = BRAND.url;
  const typed = url.slice(0, Math.floor(E.linear(p(L, 1.95, 2.5)) * url.length));
  const shine = ((L - 1.6) % 1.6) / 1.6;

  return (
    <div className="vframe" style={{ background: C.coal }}>
      {/* ghost plate */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.24, filter: "blur(3px)" }}>
        <Plate src={IMG.contemporary} t={L} from={1.16} to={1.04} dur={4} grade="warm" />
      </div>
      <div className="absolute inset-0" style={{ background: "rgba(8,8,10,.4)" }} />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)",
          backgroundSize: "68px 68px",
        }}
      />
      <div className="absolute inset-0" style={{ background: "radial-gradient(75% 50% at 50% 40%,rgba(255,90,31,.16),transparent 72%)" }} />

      {/* ---- dark card content ---- */}
      <div
        className="absolute inset-0 flex flex-col items-center"
        style={{ paddingTop: 300, transform: `scale(${breathe})` }}
      >
        <div style={{ opacity: E.quadOut(p(L, 0.72, 1.0)), transform: `translateY(${tw(L, 0.72, 1.2, 30, 0)}px)` }}>
          <LogoMark t={t} start={16.7} size={150} color={C.ember} bar={C.bone} />
        </div>

        <div style={{ marginTop: 52, fontFamily: F.d, fontSize: 162, color: C.bone, letterSpacing: 4, lineHeight: 0.9 }}>
          <Reveal text={BRAND.name} t={t} start={16.82} step={0.026} dur={0.66} />
        </div>

        <div
          style={{
            marginTop: 26, display: "flex", alignItems: "center", gap: 20,
            opacity: E.quadOut(p(L, 1.15, 1.45)),
          }}
        >
          <span style={{ width: 54, height: 2, background: C.ember }} />
          <span style={{ fontFamily: F.m, fontSize: 24, letterSpacing: "0.42em", color: C.fog }}>
            INTERIORS · {BRAND.city}
          </span>
          <span style={{ width: 54, height: 2, background: C.ember }} />
        </div>

        <div
          style={{
            marginTop: 34, fontFamily: F.s, fontStyle: "italic", fontSize: 48, color: C.amber,
            opacity: E.quadOut(p(L, 1.32, 1.7)), transform: `translateY(${tw(L, 1.32, 1.85, 22, 0)}px)`,
          }}
        >
          {BRAND.tagline}.
        </div>

        {/* CTA */}
        <div
          style={{
            marginTop: 86, position: "relative", overflow: "hidden",
            padding: "30px 62px", background: C.ember, borderRadius: 999,
            transform: `scale(${E.backOut(p(L, 1.58, 2.15))})`,
            boxShadow: `0 22px 70px rgba(255,90,31,.42)`,
          }}
        >
          <span style={{ fontFamily: F.g, fontWeight: 800, fontSize: 36, letterSpacing: "0.1em", color: C.ink }}>
            BOOK A FREE CONSULT
          </span>
          {L > 1.9 && (
            <span
              style={{
                position: "absolute", top: 0, bottom: 0, width: 150,
                left: `${shine * 150 - 25}%`, transform: "skewX(-20deg)",
                background: "linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent)",
              }}
            />
          )}
        </div>

        <div
          style={{
            marginTop: 52, fontFamily: F.m, fontSize: 46, letterSpacing: "0.06em", color: C.bone,
            opacity: E.quadOut(p(L, 1.9, 2.1)),
          }}
        >
          {typed}
          <span style={{ opacity: Math.sin(L * 14) > 0 ? 1 : 0.15, color: C.ember }}>_</span>
        </div>

        <div
          style={{
            marginTop: 20, fontFamily: F.m, fontSize: 30, letterSpacing: "0.24em", color: C.ash,
            opacity: E.quadOut(p(L, 2.35, 2.65)), transform: `translateY(${tw(L, 2.35, 2.8, 16, 0)}px)`,
          }}
        >
          {BRAND.phone}
        </div>

        {/* trust badges */}
        <div style={{ marginTop: 74, display: "flex", gap: 18 }}>
          {[
            ["200+", "HOMES"],
            ["08", "YEARS"],
            ["14", "DESIGNERS"],
          ].map(([n, l], i) => {
            const k = E.backOut(p(L, 2.5 + i * 0.1, 2.5 + i * 0.1 + 0.45));
            return (
              <div
                key={l}
                style={{
                  width: 200, padding: "22px 0", textAlign: "center",
                  border: `1px solid ${C.steel}`, borderTop: `3px solid ${C.ember}`,
                  background: "rgba(8,8,10,.55)",
                  transform: `translateY(${(1 - k) * 40}px)`, opacity: Math.max(0, Math.min(1, k)),
                }}
              >
                <div className="tnum" style={{ fontFamily: F.d, fontSize: 56, color: C.bone, lineHeight: 1 }}>{n}</div>
                <div style={{ marginTop: 8, fontFamily: F.m, fontSize: 17, letterSpacing: "0.26em", color: C.ash }}>{l}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* bottom chip ticker */}
      <div
        className="absolute"
        style={{
          left: 0, right: 0, bottom: 92, overflow: "hidden",
          opacity: E.quadOut(p(L, 2.55, 2.9)),
          maskImage: "linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)",
          WebkitMaskImage: "linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)",
        }}
      >
        <div style={{ display: "flex", gap: 22, whiteSpace: "nowrap", transform: `translateX(${-((L - 2.55) * 120) % 1400}px)` }}>
          {[...CHIPS, ...CHIPS, ...CHIPS].map((c, i) => (
            <span
              key={i}
              style={{
                fontFamily: F.m, fontSize: 21, letterSpacing: "0.2em", color: i % 2 ? C.ember : C.fog,
                border: `1px solid ${i % 2 ? C.ember : C.steel}`, padding: "13px 24px", borderRadius: 999,
              }}
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      <Brackets t={t} start={17.9} inset={38} size={62} color={C.ember} w={2} />

      {/* ---- ember stamp panel that wipes away ---- */}
      <div
        className="absolute inset-0"
        style={{
          background: C.ember,
          clipPath: `polygon(-30% ${wipe}%, 130% ${wipe - 52}%, 130% 260%, -30% 260%)`,
          WebkitClipPath: `polygon(-30% ${wipe}%, 130% ${wipe - 52}%, 130% 260%, -30% 260%)`,
        }}
      >
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ transform: `scale(${settle})` }}
        >
          <LogoMark t={t} start={16.02} size={230} color={C.ink} bar={C.ink} />
          <div
            style={{
              marginTop: 54, fontFamily: F.d, fontSize: 130, color: C.ink, letterSpacing: 5,
              opacity: E.quadOut(p(L, 0.22, 0.45)),
            }}
          >
            TIMBERLANE
          </div>
          <div
            style={{
              marginTop: 18, fontFamily: F.m, fontSize: 24, letterSpacing: "0.5em", color: "rgba(8,8,10,.62)",
              opacity: E.quadOut(p(L, 0.3, 0.5)),
            }}
          >
            INTERIORS
          </div>
        </div>
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(60% 40% at 50% 45%,rgba(255,255,255,.22),transparent 70%)" }}
        />
      </div>
    </div>
  );
}
