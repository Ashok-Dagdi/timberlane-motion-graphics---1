import { C, F, CREDITS } from "./timeline";
import { E, clamp, lerp, p, wander } from "../video/anim";
import { IMG } from "../video/assets";
import { Anamorphic, CinFade, CinPlate, Credits, Dust, LightLeak, ScopeFrame, Letterbox } from "./fx";
import { LogoMark } from "../video/fx";

const BRAND = {
  name: "TIMBERLANE",
  url: "timberlane.co.in",
  phone: "+91 88846 51111",
  city: "BENGALURU",
  tagline: "Precision In Every Detail",
} as const;

export function CinematicComposition({ t }: { t: number }) {
  /* gentle camera breathe */
  const breathe = 1 + Math.sin(t * 0.35) * 0.0035;
  const wx = wander(t, 1, 0.08) * 6;
  const wy = wander(t, 2, 0.06) * 4;

  return (
    <ScopeFrame>
      <div
        className="absolute inset-0"
        style={{ transform: `translate3d(${wx}px,${wy}px,0) scale(${breathe})`, willChange: "transform" }}
      >
        {/* ---- SCENE 1 : OVERTURE (0–5) ---- */}
        {t < 5 && <SceneOverture t={t} />}
        {/* ---- SCENE 2 : LIVING (5–12) ---- */}
        {t >= 5 && t < 12 && <SceneLiving t={t} />}
        {/* ---- SCENE 3 : KITCHEN (12–19) ---- */}
        {t >= 12 && t < 19 && <SceneKitchen t={t} />}
        {/* ---- SCENE 4 : BEDROOM (19–25) ---- */}
        {t >= 19 && t < 25 && <SceneBedroom t={t} />}
        {/* ---- SCENE 5 : CODA (25–30) ---- */}
        {t >= 25 && <SceneCoda t={t} />}

        {/* crossfades between scenes */}
        <CinFade t={t} a={0} b={1.6} c={29.2} d={30} />
        {/* light leaks at transitions */}
        <LightLeak t={t} start={4.6} dur={1.8} dir={1} hue={22} />
        <LightLeak t={t} start={11.4} dur={1.6} dir={-1} hue={34} />
        <LightLeak t={t} start={18.2} dur={2.0} dir={1} hue={16} />
        <LightLeak t={t} start={24.3} dur={1.8} dir={-1} hue={28} />
      </div>

      <Letterbox t={t} height={110} />

      {/* persistent scope chrome */}
      <div
        className="absolute left-[36px] top-[14px] font-mono2 text-[9px] tracking-[0.32em]"
        style={{ color: "#5a5f66" }}
      >
        2.37 : 1 · SCOPE
      </div>
      <div
        className="absolute right-[36px] top-[14px] font-mono2 text-[9px] tracking-[0.32em]"
        style={{ color: "#5a5f66" }}
      >
        1920 × 810
      </div>
    </ScopeFrame>
  );
}

/* ================================================================= */
/*  SCENE 1 — OVERTURE                                               */
/* ================================================================= */
function SceneOverture({ t }: { t: number }) {
  const fadeIn = E.quadOut(clamp((t - 0.8) / 1.6));
  const fadeOut = E.quadIn(clamp((t - 4.2) / 0.8));
  const op = fadeIn * (1 - fadeOut);
  return (
    <div className="absolute inset-0" style={{ background: C.ink }}>
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: "radial-gradient(40% 30% at 50% 50%, rgba(230,192,136,.28), transparent 70%)",
        }}
      />
      <Dust t={t} count={55} />

      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ opacity: op }}
      >
        <div
          style={{
            fontFamily: F.m, fontSize: 12, letterSpacing: "0.6em", color: "#8b9097",
            marginBottom: 40,
            opacity: E.quadOut(p(t, 1.1, 1.8)),
          }}
        >
          A MOTION STUDY
        </div>

        <div
          style={{
            fontFamily: F.s, fontStyle: "italic", fontSize: 34, color: "#c8ccd2",
            letterSpacing: "0.18em", marginBottom: 14,
            opacity: E.quadOut(p(t, 1.4, 2.2)),
          }}
        >
          the art of
        </div>

        <div
          style={{
            fontFamily: F.d, fontSize: 140, letterSpacing: "0.12em", color: "#f1efec",
            lineHeight: 0.92, textShadow: "0 0 80px rgba(230,192,136,.25)",
            opacity: E.quadOut(p(t, 1.7, 2.6)),
            transform: `translateY(${(1 - E.quadOut(p(t, 1.7, 2.6))) * 20}px)`,
          }}
        >
          SLOW SPACES
        </div>

        <div
          style={{
            marginTop: 28, width: 200, height: 1, background: "#3a3e45",
            transform: `scaleX(${E.quintInOut(p(t, 2.2, 3.1))})`,
          }}
        />

        <div
          style={{
            marginTop: 24, fontFamily: F.g, fontWeight: 300, fontSize: 18,
            letterSpacing: "0.4em", color: "#8b9097",
            opacity: E.quadOut(p(t, 2.6, 3.4)),
          }}
        >
          TIMBERLANE · {BRAND.city}
        </div>
      </div>
    </div>
  );
}

/* ================================================================= */
/*  SCENE 2 — LIVING                                                 */
/* ================================================================= */
function SceneLiving({ t }: { t: number }) {
  const L = t - 5; // 0 → 7
  const fadeIn = E.quadOut(clamp(L / 1.6));
  const fadeOut = E.quadIn(clamp((L - 5.8) / 1.2));
  const op = fadeIn * (1 - fadeOut);
  return (
    <div className="absolute inset-0" style={{ opacity: op }}>
      <CinPlate
        src={IMG.livingHero}
        t={L}
        from={1.02}
        to={1.18}
        dur={8}
        x={wander(L, 3, 0.1) * 8}
        y={wander(L, 4, 0.08) * 6}
      />
      <Anamorphic t={L} x={0.72} y={0.48} intensity={lerp(0, 1, E.quadOut(clamp((L - 0.4) / 1.4))) * (1 - fadeOut * 0.6)} />
      <Dust t={L} count={36} />

      <div
        className="absolute"
        style={{ left: 86, bottom: 160, opacity: E.quadOut(p(L, 1.6, 2.8)) }}
      >
        <div style={{ fontFamily: F.s, fontStyle: "italic", fontSize: 46, color: "#f1efec", letterSpacing: "0.08em" }}>
          spaces that
        </div>
        <div style={{ fontFamily: F.d, fontSize: 96, color: "#f1efec", letterSpacing: "0.14em", lineHeight: 0.94, marginTop: 6 }}>
          BREATHE.
        </div>
      </div>

      <Credits
        items={[CREDITS[0], CREDITS[2]]}
        t={t}
        start={6.2}
        style={{ position: "absolute", left: 86, top: 140, opacity: E.quadOut(p(L, 1.2, 2.2)) * (1 - fadeOut) }}
      />
    </div>
  );
}

/* ================================================================= */
/*  SCENE 3 — KITCHEN                                                */
/* ================================================================= */
function SceneKitchen({ t }: { t: number }) {
  const L = t - 12;
  const fadeIn = E.quadOut(clamp(L / 1.6));
  const fadeOut = E.quadIn(clamp((L - 5.6) / 1.4));
  const op = fadeIn * (1 - fadeOut);
  return (
    <div className="absolute inset-0" style={{ opacity: op }}>
      <CinPlate
        src={IMG.diningLight}
        t={L}
        from={1.08}
        to={1.24}
        dur={8}
        x={wander(L, 5, 0.12) * 10}
        y={wander(L, 6, 0.09) * 6}
      />
      <Anamorphic t={L} x={0.28} y={0.42} intensity={lerp(0, 0.9, E.quadOut(clamp((L - 0.6) / 1.6))) * (1 - fadeOut * 0.5)} />
      <Dust t={L} count={32} />

      <div
        className="absolute"
        style={{ right: 86, top: 160, opacity: E.quadOut(p(L, 1.4, 2.6)) }}
      >
        <div style={{ fontFamily: F.s, fontStyle: "italic", fontSize: 44, color: "#f1efec", letterSpacing: "0.08em", textAlign: "right" }}>
          every detail
        </div>
        <div style={{ fontFamily: F.d, fontSize: 92, color: "#f1efec", letterSpacing: "0.14em", lineHeight: 0.94, textAlign: "right", marginTop: 4 }}>
          CONSIDERED.
        </div>
      </div>

      <Credits
        items={[CREDITS[1], CREDITS[3]]}
        t={t}
        start={13.1}
        style={{ position: "absolute", right: 86, bottom: 150, opacity: E.quadOut(p(L, 1.0, 2.0)) * (1 - fadeOut) }}
      />
    </div>
  );
}

/* ================================================================= */
/*  SCENE 4 — BEDROOM                                                */
/* ================================================================= */
function SceneBedroom({ t }: { t: number }) {
  const L = t - 19;
  const fadeIn = E.quadOut(clamp(L / 1.8));
  const fadeOut = E.quadIn(clamp((L - 4.8) / 1.2));
  const op = fadeIn * (1 - fadeOut);
  return (
    <div className="absolute inset-0" style={{ opacity: op }}>
      <CinPlate
        src={IMG.bedroom}
        t={L}
        from={1.04}
        to={1.18}
        dur={8}
        x={wander(L, 7, 0.09) * 8}
        y={wander(L, 8, 0.07) * 5}
      />
      {/* extra warm overlay for golden hour feel */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(70% 55% at 40% 55%, rgba(255,170,90,.18), transparent 70%)", mixBlendMode: "screen" }}
      />
      <Anamorphic t={L} x={0.18} y={0.55} intensity={lerp(0, 0.75, E.quadOut(clamp((L - 0.5) / 1.6)))} />
      <Dust t={L} count={44} />

      <div
        className="absolute"
        style={{ left: 86, bottom: 160, opacity: E.quadOut(p(L, 1.2, 2.5)) }}
      >
        <div style={{ fontFamily: F.s, fontStyle: "italic", fontSize: 46, color: "#f1efec", letterSpacing: "0.08em" }}>
          a home that feels
        </div>
        <div style={{ fontFamily: F.d, fontSize: 96, color: "#f1efec", letterSpacing: "0.14em", lineHeight: 0.94, marginTop: 6 }}>
          LIKE YOU.
        </div>
      </div>

      <Credits
        items={[CREDITS[4], CREDITS[5]]}
        t={t}
        start={20.2}
        style={{ position: "absolute", left: 86, top: 140, opacity: E.quadOut(p(L, 1.0, 2.0)) * (1 - fadeOut) }}
      />
    </div>
  );
}

/* ================================================================= */
/*  SCENE 5 — CODA                                                   */
/* ================================================================= */
function SceneCoda({ t }: { t: number }) {
  const L = t - 25; // 0 → 5
  const fadeIn = E.quadOut(clamp((L - 0.2) / 1.4));
  const fadeOut = E.quadIn(clamp((L - 3.8) / 1.2));
  const op = fadeIn * (1 - fadeOut);
  const settle = lerp(1.04, 1, E.expoOut(clamp(L / 1.2)));

  return (
    <div className="absolute inset-0" style={{ background: C.ink }}>
      {/* subtle warm halo */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(60% 55% at 50% 50%, rgba(230,192,136,.14), transparent 70%)", opacity: op }}
      />
      <Dust t={L} count={30} />

      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ opacity: op, transform: `scale(${settle})` }}
      >
        <LogoMark t={t} start={25.2} size={150} color="#e6c088" bar="#f1efec" />

        <div
          style={{
            marginTop: 54, fontFamily: F.d, fontSize: 156, color: "#f1efec",
            letterSpacing: "0.08em", lineHeight: 0.92,
            textShadow: "0 0 60px rgba(230,192,136,.3)",
            opacity: E.quadOut(p(L, 0.6, 1.4)),
          }}
        >
          TIMBERLANE
        </div>

        <div
          style={{
            marginTop: 24, fontFamily: F.m, fontSize: 22, letterSpacing: "0.56em",
            color: "#8b9097", paddingLeft: "0.56em",
            opacity: E.quadOut(p(L, 1.0, 1.8)),
          }}
        >
          INTERIORS · {BRAND.city}
        </div>

        <div
          style={{
            marginTop: 44, width: 260, height: 1, background: "#3a3e45",
            transform: `scaleX(${E.quintInOut(p(L, 1.2, 2.0))})`,
          }}
        />

        <div
          style={{
            marginTop: 30, fontFamily: F.s, fontStyle: "italic", fontSize: 42,
            color: "#e6c088", letterSpacing: "0.06em",
            opacity: E.quadOut(p(L, 1.5, 2.2)),
            transform: `translateY(${(1 - E.quadOut(p(L, 1.5, 2.2))) * 16}px)`,
          }}
        >
          {BRAND.tagline.toLowerCase()}.
        </div>

        <div
          style={{
            marginTop: 60, fontFamily: F.m, fontSize: 26, letterSpacing: "0.08em",
            color: "#f1efec",
            opacity: E.quadOut(p(L, 2.0, 2.7)),
          }}
        >
          {BRAND.url}
        </div>

        <div
          style={{
            marginTop: 14, fontFamily: F.m, fontSize: 20, letterSpacing: "0.22em",
            color: "#8b9097",
            opacity: E.quadOut(p(L, 2.3, 3.0)),
          }}
        >
          {BRAND.phone}
        </div>
      </div>
    </div>
  );
}
