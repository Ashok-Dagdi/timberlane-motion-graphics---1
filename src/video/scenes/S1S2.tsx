import type { ReactNode } from "react";
import { C, F } from "../timeline";
import { E, clamp, lerp, p, tw, wander, hit } from "../anim";
import { Brackets, DrawGrid, Plate, Reveal, WipeLine } from "../fx";
import { IMG } from "../assets";

/* ================================================================= */
/*  01 · IGNITION  (0.0 → 2.0)                                        */
/* ================================================================= */
export function SceneIgnition({ t }: { t: number }) {
  const push = tw(t, 0.15, 2.0, 1.0, 1.07, E.quadOut);
  const track = tw(t, 0.25, 1.35, 48, 3, E.expoOut);
  const sweep = E.quintInOut(p(t, 0.5, 1.05)); // scanline that fills the letters
  const barK = E.expoOut(p(t, 0.08, 0.7));

  const word = "TIMBERLANE";
  const wordStyle = {
    fontFamily: F.d,
    fontSize: 156,
    letterSpacing: `${track}px`,
    lineHeight: 0.9,
    whiteSpace: "nowrap" as const,
  };

  return (
    <div className="vframe" style={{ background: C.coal }}>
      <DrawGrid t={t} start={0.05} opacity={0.14} />

      {/* ember rules */}
      <div
        style={{
          position: "absolute", left: 46, right: 46, top: 300, height: 3,
          background: C.ember, transform: `scaleX(${barK})`, boxShadow: `0 0 26px ${C.ember}`,
        }}
      />
      <div
        style={{
          position: "absolute", left: 46, right: 46, bottom: 300, height: 3,
          background: C.ember, transform: `scaleX(${barK})`, boxShadow: `0 0 26px ${C.ember}`,
        }}
      />

      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ transform: `scale(${push})` }}
      >
        {/* top slug */}
        <div
          style={{
            fontFamily: F.m, fontSize: 21, letterSpacing: "0.5em", color: C.ash,
            marginBottom: 46, opacity: E.quadOut(p(t, 0.85, 1.25)),
            transform: `translateY(${tw(t, 0.85, 1.3, 16, 0)}px)`,
          }}
        >
          EST. 2017 — BENGALURU
        </div>

        {/* wordmark : outline layer + filled layer wiped by a scanline */}
        <div style={{ position: "relative" }}>
          <div style={{ ...wordStyle, color: "transparent", WebkitTextStroke: `2px ${C.steel}` }}>
            <Reveal text={word} t={t} start={0.22} step={0.026} dur={0.72} />
          </div>
          <div
            style={{
              ...wordStyle,
              position: "absolute", inset: 0, color: C.bone,
              clipPath: `inset(${(1 - sweep) * 100}% 0% 0% 0%)`,
            }}
          >
            <Reveal text={word} t={t} start={0.22} step={0.026} dur={0.72} />
          </div>
          {sweep > 0.002 && sweep < 0.998 && (
            <div
              style={{
                position: "absolute", left: -30, right: -30,
                top: `${(1 - sweep) * 100}%`, height: 4,
                background: C.ember, boxShadow: `0 0 30px 6px ${C.ember}`,
              }}
            />
          )}
        </div>

        {/* sub slug */}
        <div style={{ marginTop: 40, overflow: "hidden" }}>
          <div
            style={{
              fontFamily: F.g, fontWeight: 600, fontSize: 30, letterSpacing: "0.62em",
              color: C.ember, paddingLeft: "0.62em",
              transform: `translateY(${(1 - E.heavyOut(p(t, 1.0, 1.55))) * 110}%)`,
            }}
          >
            INTERIOR DESIGN
          </div>
        </div>

        <div
          style={{
            marginTop: 30, width: 260, height: 1, background: C.steel,
            transform: `scaleX(${E.expoOut(p(t, 1.2, 1.8))})`,
          }}
        />
        <div
          style={{
            marginTop: 26, fontFamily: F.s, fontStyle: "italic", fontSize: 38, color: C.fog,
            opacity: E.quadOut(p(t, 1.3, 1.75)),
            transform: `translateY(${tw(t, 1.3, 1.8, 18, 0)}px)`,
          }}
        >
          spaces that feel like you
        </div>
      </div>

      <Brackets t={t} start={1.05} inset={40} size={70} />

      <div
        style={{
          position: "absolute", top: 60, left: 50, fontFamily: F.m, fontSize: 19,
          letterSpacing: "0.22em", color: C.ash, opacity: E.quadOut(p(t, 1.15, 1.5)),
        }}
      >
        REEL / 001
      </div>
      <div
        style={{
          position: "absolute", top: 60, right: 50, fontFamily: F.m, fontSize: 19,
          letterSpacing: "0.22em", color: C.ember, opacity: E.quadOut(p(t, 1.15, 1.5)),
        }}
      >
        ● REC
      </div>
    </div>
  );
}

/* ================================================================= */
/*  Comb reveal — staircase clip wipe used for the slice transition   */
/* ================================================================= */
function Comb({ k, cols = 6, children }: { k: number; cols?: number; children: ReactNode }) {
  const hs = Array.from({ length: cols }, (_, i) =>
    E.quintInOut(clamp((k - i * 0.055) / (1 - (cols - 1) * 0.055)))
  );
  const poly = (sel: (i: number) => number, fromTop: boolean) => {
    const pts: string[] = [];
    const y = (v: number) => (fromTop ? v * 100 : 100 - v * 100);
    pts.push(`0% ${fromTop ? 0 : 100}%`);
    for (let i = 0; i < cols; i++) {
      const x0 = (i / cols) * 100;
      const x1 = ((i + 1) / cols) * 100;
      pts.push(`${x0}% ${y(sel(i))}%`);
      pts.push(`${x1}% ${y(sel(i))}%`);
    }
    pts.push(`100% ${fromTop ? 0 : 100}%`);
    return `polygon(${pts.join(",")})`;
  };
  const even = poly((i) => (i % 2 === 0 ? hs[i] : 0), true);
  const odd = poly((i) => (i % 2 === 1 ? hs[i] : 0), false);
  return (
    <>
      <div className="absolute inset-0" style={{ clipPath: even, WebkitClipPath: even }}>{children}</div>
      <div className="absolute inset-0" style={{ clipPath: odd, WebkitClipPath: odd }}>{children}</div>
      {k > 0.02 && k < 0.98 &&
        Array.from({ length: 6 }, (_, i) => {
          const h = hs[i];
          if (h <= 0.01 || h >= 0.99) return null;
          const top = i % 2 === 0 ? `${h * 100}%` : `${(1 - h) * 100}%`;
          return (
            <div
              key={i}
              style={{
                position: "absolute", left: `${(i / 6) * 100}%`, width: `${100 / 6}%`,
                top, height: 5, background: C.ember, boxShadow: `0 0 24px ${C.ember}`,
              }}
            />
          );
        })}
    </>
  );
}

/* ================================================================= */
/*  02 · THE HOOK  (2.0 → 6.0)                                        */
/* ================================================================= */
export function SceneHook({ t }: { t: number }) {
  const L = t - 2;
  const comb = p(L, 2.0, 2.62);

  return (
    <div className="vframe" style={{ background: C.ink }}>
      {/* ---------- PART A : kinetic type over the hero plate ---------- */}
      <div
        className="absolute inset-0"
        style={{ transform: `scale(${lerp(1, 1.05, E.quadOut(clamp(L / 2.2)))})` }}
      >
        <Plate src={IMG.loungeCurve} t={L} from={1.22} to={1.04} dur={2.4} y={wander(L, 2, 0.35) * 8} />

        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(90deg,rgba(8,8,10,.78),rgba(8,8,10,.34) 62%,rgba(8,8,10,.12))" }}
        />

        <div
          className="absolute"
          style={{ left: 66, right: 66, top: 640 }}
        >
          <div style={{ fontFamily: F.m, fontSize: 22, letterSpacing: "0.42em", color: C.amber, marginBottom: 40, textShadow: "0 2px 18px rgba(0,0,0,.9)", opacity: E.quadOut(p(L, 0.02, 0.3)) }}>
            <Reveal text="BENGALURU · SINCE 2017" t={t} start={2.02} step={0.014} dur={0.4} from={140} />
          </div>

          {/* line 1 */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 22, marginBottom: 6 }}>
            <div style={{ fontFamily: F.d, fontSize: 152, color: C.bone, lineHeight: 0.98 }}>
              <Reveal text="YOUR" t={t} start={2.06} step={0.03} dur={0.62} />
            </div>
            <div style={{ position: "relative", padding: "0 18px" }}>
              <div
                style={{
                  position: "absolute", inset: "6% -2px 12% -2px", background: C.ember,
                  transformOrigin: "left", transform: `scaleX(${E.quintInOut(p(L, 0.34, 0.82))})`,
                }}
              />
              <div style={{ position: "relative", fontFamily: F.d, fontSize: 152, color: C.ink, lineHeight: 0.98 }}>
                <Reveal text="SPACE" t={t} start={2.42} step={0.03} dur={0.6} />
              </div>
            </div>
          </div>

          {/* line 2 */}
          <div
            style={{
              fontFamily: F.d, fontSize: 152, lineHeight: 1.0, color: "transparent",
              WebkitTextStroke: `3px ${C.bone}`, marginBottom: 6,
            }}
          >
            <Reveal text="SHOULD FEEL" t={t} start={2.62} step={0.026} dur={0.6} />
          </div>

          {/* line 3 */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
            <div
              style={{
                fontFamily: F.s, fontStyle: "italic", fontSize: 138, color: C.fog, lineHeight: 1,
                opacity: E.quadOut(p(L, 0.92, 1.25)),
                transform: `translateX(${tw(L, 0.92, 1.4, -70, 0)}px)`,
              }}
            >
              like
            </div>
            <div style={{ fontFamily: F.d, fontSize: 168, color: C.ember, lineHeight: 0.96 }}>
              <Reveal text="YOU." t={t} start={3.06} step={0.04} dur={0.66} />
            </div>
          </div>

          <div
            style={{
              marginTop: 44, height: 3, background: C.ember,
              transformOrigin: "left", transform: `scaleX(${E.quintInOut(p(L, 1.35, 1.9))})`,
            }}
          />
        </div>

        {/* floating spec chip */}
        <div
          className="absolute"
          style={{
            right: 66, top: 260, textAlign: "right", fontFamily: F.m, fontSize: 20,
            letterSpacing: "0.2em", color: C.bone, textShadow: "0 2px 16px rgba(0,0,0,.95)",
            opacity: E.quadOut(p(L, 1.1, 1.45)),
            transform: `translateY(${tw(L, 1.1, 1.6, 26, 0)}px)`,
          }}
        >
          <div style={{ color: C.amber }}>PROJECT 043</div>
          <div style={{ marginTop: 8, color: C.fog }}>4BHK · WHITEFIELD</div>
        </div>
      </div>

      {/* ---------- PART B : slice transition into plate 2 ---------- */}
      {comb > 0 && (
        <Comb k={comb} cols={6}>
          <HookPartB L={L} t={t} />
        </Comb>
      )}
    </div>
  );
}

function HookPartB({ L, t }: { L: number; t: number }) {
  const b = Math.max(0, L - 2.0); // 0 → 2.0
  const spin = b * 52;
  return (
    <div className="absolute inset-0" style={{ background: C.ink }}>
      <Plate src={IMG.kitchen} t={b} from={1.2} to={1.02} dur={2.2} x={wander(b, 5, 0.3) * 10} />

      {/* left ember spine */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 58, background: C.ember, transform: `translateX(${tw(b, 0.55, 1.1, -70, 0)}px)` }}>
        <div
          style={{
            position: "absolute", left: "50%", top: "50%",
            transform: "translate(-50%,-50%) rotate(-90deg)", whiteSpace: "nowrap",
            fontFamily: F.m, fontSize: 20, letterSpacing: "0.5em", color: C.ink, fontWeight: 700,
          }}
        >
          TIMBERLANE INTERIORS
        </div>
      </div>

      {/* rotating seal */}
      <div
        style={{
          position: "absolute", right: 74, top: 210, width: 230, height: 230,
          opacity: E.quadOut(p(b, 0.5, 0.95)),
          transform: `scale(${lerp(0.6, 1, E.backOut(p(b, 0.5, 1.1)))}) rotate(${spin}deg)`,
        }}
      >
        <svg viewBox="0 0 200 200" width="230" height="230">
          <defs>
            <path id="ring" d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0" />
          </defs>
          <circle cx="100" cy="100" r="92" fill="none" stroke={C.ember} strokeWidth="2" opacity="0.7" />
          <text fill={C.bone} style={{ fontFamily: F.m, fontSize: 15, letterSpacing: "0.47em" }}>
            <textPath href="#ring" startOffset="1%">
              PRECISION IN EVERY DETAIL
            </textPath>
          </text>
        </svg>
        <div
          style={{
            position: "absolute", inset: 0, display: "grid", placeItems: "center",
            transform: `rotate(${-spin}deg)`,
          }}
        >
          <div style={{ width: 62, height: 62, borderRadius: 999, background: C.ember, boxShadow: `0 0 40px ${C.ember}` }} />
        </div>
      </div>

      {/* bottom headline */}
      <div className="absolute" style={{ left: 120, right: 66, bottom: 210 }}>
        <WipeLine t={t} start={4.7} dur={0.5}>
          <div style={{ fontFamily: F.d, fontSize: 138, color: C.bone, lineHeight: 0.96 }}>BESPOKE</div>
        </WipeLine>
        <WipeLine t={t} start={4.88} dur={0.5}>
          <div style={{ fontFamily: F.d, fontSize: 138, color: C.ember, lineHeight: 0.96 }}>BY DESIGN</div>
        </WipeLine>
        <div
          style={{
            marginTop: 28, fontFamily: F.m, fontSize: 22, letterSpacing: "0.3em", color: C.ash,
            opacity: E.quadOut(p(b, 1.35, 1.7)),
          }}
        >
          KITCHENS · WARDROBES · FULL HOMES
        </div>
      </div>

      {/* shutter blink accent */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: C.ember, opacity: hit(b, 0.0, 0.22) * 0.5, mixBlendMode: "overlay" }}
      />
    </div>
  );
}
