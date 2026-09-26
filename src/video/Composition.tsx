import { C, F, H, IMPACTS, W, shotAt } from "./timeline";
import { E, clamp, fmt, hit, p, shake, wander } from "./anim";
import { Flash, PostFX, Shutter } from "./fx";
import { SceneHook, SceneIgnition } from "./scenes/S1S2";
import { SceneMethod, SceneTransform, SceneTriptych } from "./scenes/S3S4S5";
import { SceneEndCard, SceneSignature } from "./scenes/S6S7";

export function Composition({
  t,
  playing,
  grain = true,
  guides = false,
  burnIn = false,
}: {
  t: number;
  playing: boolean;
  grain?: boolean;
  guides?: boolean;
  burnIn?: boolean;
}) {
  /* ---- virtual camera : impact kicks + gentle handheld ---- */
  let sx = wander(t, 1, 0.34) * 4;
  let sy = wander(t, 2, 0.29) * 4;
  let sr = wander(t, 3, 0.22) * 0.12;
  let sc = 1;
  IMPACTS.forEach((im, i) => {
    const a = shake(t, im, 0.3, 11 + i * 1.7);
    sx += a * 10;
    sy += a * 7;
    sr += a * 0.22;
    sc += hit(t, im, 0.42, E.expoOut) * 0.014;
  });

  const shot = shotAt(t);

  return (
    <div
      style={{
        position: "relative",
        width: W,
        height: H,
        background: C.ink,
        overflow: "hidden",
        contain: "strict",
      }}
    >
      <div
        className="absolute inset-0"
        style={{ transform: `translate3d(${sx}px,${sy}px,0) rotate(${sr}deg) scale(${sc})`, willChange: "transform" }}
      >
        {t < 2 && <SceneIgnition t={t} />}
        {t >= 2 && t < 6 && <SceneHook t={t} />}
        {t >= 6 && t < 8 && <SceneTriptych t={t} />}
        {t >= 8 && t < 10 && <SceneTransform t={t} />}
        {t >= 10 && t < 13 && <SceneMethod t={t} />}
        {t >= 13 && t < 16 && <SceneSignature t={t} playing={playing} />}
        {t >= 16 && <SceneEndCard t={t} />}
      </div>

      {/* ---- transitions ---- */}
      <Shutter t={t} start={1.6} dur={0.52} bars={5} />
      <Flash t={t} at={0.02} dur={0.34} color={C.ember} max={0.85} />
      <Flash t={t} at={2.0} dur={0.2} color="#ffffff" max={0.72} />
      <Flash t={t} at={6.0} dur={0.14} color="#ffffff" max={0.42} />
      <Flash t={t} at={8.0} dur={0.14} color={C.ember} max={0.5} />
      <Flash t={t} at={10.0} dur={0.14} color="#ffffff" max={0.38} />
      <Flash t={t} at={13.0} dur={0.16} color={C.ember} max={0.45} />
      <Flash t={t} at={19.0} dur={0.22} color="#ffffff" max={0.3} />

      {/* shockwave rings on the big hits */}
      {[0.02, 2, 16].map((im) => {
        const k = p(t, im, im + 0.7);
        if (k <= 0.001 || k >= 1) return null;
        const s = E.expoOut(k);
        return (
          <div
            key={im}
            className="absolute pointer-events-none"
            style={{
              left: "50%", top: "50%", width: 400, height: 400, marginLeft: -200, marginTop: -200,
              borderRadius: 9999, border: `3px solid ${C.ember}`,
              transform: `scale(${0.2 + s * 5})`, opacity: (1 - k) * 0.55,
            }}
          />
        );
      })}

      <PostFX t={t} grain={grain} />

      {/* ---- optional production overlays ---- */}
      {guides && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute" style={{ inset: "5%", border: `1px dashed rgba(255,90,31,.55)` }} />
          <div className="absolute" style={{ inset: "10%", border: `1px dashed rgba(255,255,255,.28)` }} />
          <div className="absolute" style={{ left: "50%", top: 0, bottom: 0, width: 1, background: "rgba(255,255,255,.2)" }} />
          <div className="absolute" style={{ top: "50%", left: 0, right: 0, height: 1, background: "rgba(255,255,255,.2)" }} />
          <div
            className="absolute"
            style={{ left: 0, right: 0, top: 0, height: "14.5%", background: "rgba(255,90,31,.10)", borderBottom: "1px dashed rgba(255,90,31,.4)" }}
          />
          <div
            className="absolute"
            style={{ left: 0, right: 0, bottom: 0, height: "17%", background: "rgba(255,90,31,.10)", borderTop: "1px dashed rgba(255,90,31,.4)" }}
          />
          <div style={{ position: "absolute", top: 18, left: 20, fontFamily: F.m, fontSize: 22, color: "rgba(255,90,31,.85)", letterSpacing: "0.2em" }}>
            UI SAFE
          </div>
        </div>
      )}

      {burnIn && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: 22, left: 22, right: 22, display: "flex", justifyContent: "space-between",
            fontFamily: F.m, fontSize: 24, color: "rgba(241,239,236,.9)", letterSpacing: "0.12em",
            textShadow: "0 2px 8px rgba(0,0,0,.8)",
          }}
        >
          <span style={{ background: "rgba(8,8,10,.6)", padding: "6px 12px" }}>
            {fmt(clamp(t, 0, 20))} <span style={{ color: C.ember }}>·</span> {shot.code} {shot.name}
          </span>
          <span style={{ background: "rgba(8,8,10,.6)", padding: "6px 12px", color: C.ember }}>1080×1920 · 9:16</span>
        </div>
      )}
    </div>
  );
}
