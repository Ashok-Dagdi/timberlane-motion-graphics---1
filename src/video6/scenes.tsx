import { CHAPTERS, C, F, HERO, PHO } from "./timeline";
import { E, clamp, lerp, p } from "../video/anim";
import { IMG } from "../video/assets";
import { LogoMark } from "../video/fx";

const draw = (k: number) => ({ strokeDasharray: 1, strokeDashoffset: 1 - clamp(k), pathLength: 1 });

export function StoryComposition({ t }: { t: number }) {
  const breathe = 1 + Math.sin(t * 0.7) * 0.004;
  return (
    <div style={{ position: "relative", width: 1080, height: 1920, background: C.ink, overflow: "hidden", contain: "strict" }}>
      <div className="absolute inset-0" style={{ transform: `scale(${breathe})` }}>
        {t < 3 && <ChKeys t={t} />}
        {t >= 3 && t < 6 && <ChEmpty t={t} />}
        {t >= 6 && t < 9 && <ChCall t={t} />}
        {t >= 9 && t < 12 && <ChListen t={t} />}
        {t >= 12 && t < 15 && <ChDrew t={t} />}
        {t >= 15 && t < 18 && <ChBuilt t={t} />}
        {t >= 18 && t < 21 && <ChHome t={t} />}
        {t >= 21 && <ChLine t={t} />}
      </div>
      <Spine t={t} />
      <Caption t={t} />
      {CHAPTERS.slice(1).map((c) => (
        <PageTurn key={c.id} t={t} at={c.in} />
      ))}
      <Grain t={t} />
    </div>
  );
}

function Grain({ t }: { t: number }) {
  const g = Math.floor(t * 12) % 5;
  return (
    <>
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(90% 70% at 50% 42%, transparent 40%, rgba(0,0,0,.55) 100%)" }} />
      <div className="pointer-events-none absolute grain mix-blend-overlay" style={{ inset: -200, opacity: 0.28, transform: `translate(${g * 30}px, ${g * 18}px)` }} />
    </>
  );
}

function PageTurn({ t, at }: { t: number; at: number }) {
  const k = p(t, at, at + 0.42);
  if (k <= 0.001 || k >= 1) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0" style={{ top: lerp(1920, -80, E.quintInOut(k)), height: 220, background: `linear-gradient(180deg, transparent, ${C.paper} 30%, ${C.paper})`, opacity: 0.92 }} />
  );
}

function Spine({ t }: { t: number }) {
  const idx = Math.min(7, Math.floor(t / 3));
  return (
    <div className="pointer-events-none absolute" style={{ left: 36, top: 150, bottom: 250, width: 36 }}>
      <div style={{ position: "absolute", left: 16, top: 8, bottom: 8, width: 2, background: "rgba(243,239,232,.18)" }} />
      <div style={{ position: "absolute", left: 16, top: 8, width: 2, height: `${(idx / 7) * 100}%`, background: C.ember }} />
      {CHAPTERS.map((c, i) => (
        <div key={c.id} style={{ position: "absolute", left: 8, top: `${(i / 7) * 100}%`, width: 18, height: 18, marginTop: -9, borderRadius: 99, background: i <= idx ? C.ember : C.ink, border: `2px solid ${i <= idx ? C.ember : "rgba(243,239,232,.35)"}` }} />
      ))}
    </div>
  );
}

function Caption({ t }: { t: number }) {
  const ch = CHAPTERS.find((c) => t >= c.in && t < c.out) ?? CHAPTERS[7];
  const local = t - ch.in;
  const n = Math.floor(clamp(local / 1.5) * ch.line.length);
  const caret = Math.sin(t * 10) > 0 ? 1 : 0.2;
  return (
    <div className="absolute" style={{ left: 96, right: 48, bottom: 78 }}>
      <div style={{ fontFamily: F.m, fontSize: 18, letterSpacing: "0.32em", color: C.ember, marginBottom: 12 }}>
        {ch.no}  ·  {ch.name}
      </div>
      <div style={{ fontFamily: F.s, fontStyle: "italic", fontSize: 36, lineHeight: 1.25, color: C.bone, minHeight: 96, textShadow: "0 8px 24px rgba(0,0,0,.65)" }}>
        {ch.line.slice(0, n)}
        <span style={{ color: C.ember, opacity: caret }}>▍</span>
      </div>
      <div style={{ marginTop: 16, height: 3, background: "rgba(243,239,232,.15)" }}>
        <div style={{ width: `${clamp(local / 3) * 100}%`, height: "100%", background: C.ember }} />
      </div>
    </div>
  );
}

function Plate({ src, dim = 0.55, grey = false, t, drift = 20 }: { src: string; dim?: number; grey?: boolean; t: number; drift?: number }) {
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      style={{
        position: "absolute", inset: "-6%", width: "112%", height: "112%", objectFit: "cover",
        transform: `scale(${1.04 + t * 0.008}) translateY(${Math.sin(t * 0.4) * drift}px)`,
        filter: grey ? `saturate(.15) contrast(1.05) brightness(${dim})` : `saturate(.9) contrast(1.05) brightness(${dim})`,
      }}
    />
  );
}

function Shade() {
  return <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(16,14,12,.55) 0%, rgba(16,14,12,.15) 38%, rgba(16,14,12,.82) 100%)" }} />;
}

function ChKeys({ t }: { t: number }) {
  const k = E.expoOut(p(t, 0.15, 0.9));
  return (
    <div className="absolute inset-0">
      <Plate src={PHO.keys} t={t} dim={0.62} />
      <Shade />
      <div className="absolute" style={{ left: 108, top: 210, right: 56 }}>
        <div style={{ fontFamily: F.m, fontSize: 20, letterSpacing: "0.42em", color: C.gold, opacity: E.quadOut(p(t, 0.1, 0.5)) }}>
          A SHORT STORY
        </div>
        <div style={{ marginTop: 28, fontFamily: F.d, fontSize: 168, color: C.bone, letterSpacing: "0.02em", lineHeight: 0.9, opacity: k, transform: `translateY(${(1 - k) * 40}px)`, textShadow: "0 18px 40px rgba(0,0,0,.55)" }}>
          RAMESH
        </div>
        <div style={{ marginTop: 18, fontFamily: F.s, fontStyle: "italic", fontSize: 64, color: C.fog, opacity: E.quadOut(p(t, 0.55, 1.2)) }}>
          bought a 3BHK.
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 36, flexWrap: "wrap" }}>
          {[HERO.city, HERO.family, "NEW KEYS"].map((tag, i) => (
            <span key={tag} style={{ fontFamily: F.m, fontSize: 18, letterSpacing: "0.16em", color: C.ink, background: i === 2 ? C.ember : C.paper, padding: "10px 16px", borderRadius: 999, opacity: E.backOut(p(t, 0.9 + i * 0.12, 1.35 + i * 0.12)) }}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChEmpty({ t }: { t: number }) {
  const L = t - 3;
  return (
    <div className="absolute inset-0">
      <Plate src={PHO.empty} t={L} dim={0.5} grey />
      <Shade />
      <div className="absolute" style={{ left: 108, top: 240, right: 56 }}>
        <div style={{ fontFamily: F.d, fontSize: 132, color: C.bone, lineHeight: 0.92, opacity: E.quadOut(p(L, 0.1, 0.6)) }}>
          FOUR<br />WALLS.
        </div>
        <div style={{ marginTop: 20, fontFamily: F.s, fontStyle: "italic", fontSize: 52, color: C.fog, opacity: E.quadOut(p(L, 0.4, 1)) }}>
          zero plan.
        </div>
        <div style={{ marginTop: 48, display: "flex", gap: 28 }}>
          <Stat n="3" label="BHK" delay={0.6} L={L} />
          <Stat n="0" label="DECISIONS" delay={0.85} L={L} accent />
          <Stat n="4" label="WAITING" delay={1.05} L={L} />
        </div>
      </div>
    </div>
  );
}

function Stat({ n, label, delay, L, accent = false }: { n: string; label: string; delay: number; L: number; accent?: boolean }) {
  const k = E.backOut(p(L, delay, delay + 0.45));
  return (
    <div style={{ opacity: k, transform: `translateY(${(1 - k) * 24}px)` }}>
      <div style={{ fontFamily: F.d, fontSize: 92, color: accent ? C.ember : C.bone, lineHeight: 1 }}>{n}</div>
      <div style={{ fontFamily: F.m, fontSize: 16, letterSpacing: "0.2em", color: C.ash, marginTop: 6 }}>{label}</div>
    </div>
  );
}

function ChCall({ t }: { t: number }) {
  const L = t - 6;
  return (
    <div className="absolute inset-0" style={{ background: C.coal }}>
      <div className="absolute" style={{ left: 540, top: 430 }}>
        {[0, 1, 2].map((i) => {
          const cyc = ((L * 0.7 + i * 0.33) % 1);
          return (
            <div key={i} style={{ position: "absolute", width: 280, height: 280, marginLeft: -140, marginTop: -140, borderRadius: 999, border: `3px solid ${C.ember}`, transform: `scale(${0.4 + cyc * 1.8})`, opacity: (1 - cyc) * 0.7 }} />
          );
        })}
        <div style={{ position: "absolute", width: 120, height: 120, marginLeft: -60, marginTop: -60, borderRadius: 999, background: C.ember, display: "grid", placeItems: "center", boxShadow: "0 0 40px rgba(255,90,31,.55)" }}>
          <svg width="46" height="46" viewBox="0 0 24 24" fill="#100e0c"><path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11 11 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 7a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11 11 0 0 0 .57 3.6 1 1 0 0 1-.25 1z" /></svg>
        </div>
      </div>
      <div className="absolute" style={{ left: 108, top: 760, right: 56 }}>
        <div style={{ fontFamily: F.m, fontSize: 20, letterSpacing: "0.4em", color: C.ember, opacity: E.quadOut(p(L, 0.1, 0.45)) }}>03 · THE CALL</div>
        <div style={{ marginTop: 16, fontFamily: F.d, fontSize: 120, color: C.bone, lineHeight: 0.92, opacity: E.quadOut(p(L, 0.2, 0.7)) }}>ONE CALL.</div>
        <div style={{ marginTop: 22, fontFamily: F.s, fontStyle: "italic", fontSize: 42, color: C.fog, maxWidth: 760, opacity: E.quadOut(p(L, 0.55, 1.15)) }}>
          Not a catalogue. A conversation.
        </div>
        <div style={{ marginTop: 36, fontFamily: F.d, fontSize: 54, color: C.ember, letterSpacing: "0.04em", opacity: E.quadOut(p(L, 0.9, 1.4)) }}>
          +91 88846 51111
        </div>
      </div>
    </div>
  );
}

const BRIEF = [
  ["A quiet study", "for the late nights"],
  ["A Sunday kitchen", "big enough for his mother’s recipes"],
  ["Warm wood", "nothing that feels like a showroom"],
  ["Room to grow", "three beds, one family"],
];

function ChListen({ t }: { t: number }) {
  const L = t - 9;
  const card = E.expoOut(p(L, 0.05, 0.45));
  return (
    <div className="absolute inset-0" style={{ background: C.coal }}>
      <div style={{ position: "absolute", left: 100, right: 52, top: 200, bottom: 340, background: C.paper, borderRadius: 8, transform: `translateY(${(1 - card) * 40}px)`, opacity: card, boxShadow: "0 30px 80px rgba(0,0,0,.45)", padding: "48px 48px 36px" }}>
        <div style={{ fontFamily: F.m, fontSize: 18, letterSpacing: "0.36em", color: C.emberDeep }}>HIS BRIEF · WRITTEN BACK</div>
        <div style={{ marginTop: 10, fontFamily: F.d, fontSize: 78, color: C.ink, lineHeight: 0.95 }}>THEY LISTENED.</div>
        <div style={{ marginTop: 28 }}>
          {BRIEF.map((row, i) => {
            const k = E.quadOut(p(L, 0.45 + i * 0.28, 0.9 + i * 0.28));
            return (
              <div key={row[0]} style={{ display: "flex", gap: 18, alignItems: "flex-start", padding: "16px 0", borderTop: "1px solid rgba(16,14,12,.12)", opacity: k, transform: `translateX(${(1 - k) * 24}px)` }}>
                <span style={{ width: 28, height: 28, borderRadius: 99, background: C.ember, color: C.ink, fontFamily: F.d, fontSize: 16, display: "grid", placeItems: "center", flex: "none", marginTop: 4 }}>{i + 1}</span>
                <div>
                  <div style={{ fontFamily: F.g, fontWeight: 700, fontSize: 32, color: C.ink }}>{row[0]}</div>
                  <div style={{ fontFamily: F.s, fontStyle: "italic", fontSize: 24, color: C.steel, marginTop: 2 }}>{row[1]}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ChDrew({ t }: { t: number }) {
  const L = t - 12;
  const mats = [
    { img: IMG.rustic, name: "WHITE OAK" },
    { img: IMG.loungeCurve, name: "LINEN" },
    { img: IMG.diningLight, name: "2700K" },
  ];
  return (
    <div className="absolute inset-0" style={{ background: C.ink }}>
      <div className="absolute" style={{ left: 108, top: 190 }}>
        <div style={{ fontFamily: F.m, fontSize: 18, letterSpacing: "0.36em", color: C.ember }}>05 · THE DRAWING</div>
        <div style={{ marginTop: 12, fontFamily: F.d, fontSize: 92, color: C.bone, lineHeight: 0.92, opacity: E.quadOut(p(L, 0.1, 0.55)) }}>
          THEN THEY<br />DREW IT.
        </div>
      </div>
      <svg viewBox="0 0 640 460" style={{ position: "absolute", left: 120, top: 520, width: 640, height: 460 }} fill="none">
        <rect x="20" y="20" width="600" height="420" stroke={C.bone} strokeWidth="6" {...draw(E.expoOut(p(L, 0.2, 0.9)))} />
        <line x1="20" y1="200" x2="280" y2="200" stroke={C.fog} strokeWidth="4" {...draw(E.expoOut(p(L, 0.55, 1.1)))} />
        <line x1="360" y1="200" x2="620" y2="200" stroke={C.fog} strokeWidth="4" {...draw(E.expoOut(p(L, 0.65, 1.2)))} />
        <rect x="60" y="250" width="180" height="70" rx="8" stroke={C.ember} strokeWidth="4" {...draw(E.expoOut(p(L, 0.9, 1.45)))} />
        <text x="40" y="70" fill={C.ash} style={{ fontFamily: F.m, fontSize: 22, letterSpacing: "0.18em" }} opacity={p(L, 1.1, 1.4)}>LIVING</text>
        <text x="380" y="70" fill={C.ash} style={{ fontFamily: F.m, fontSize: 22, letterSpacing: "0.18em" }} opacity={p(L, 1.2, 1.5)}>STUDY</text>
        <text x="70" y="300" fill={C.ember} style={{ fontFamily: F.m, fontSize: 20, letterSpacing: "0.14em" }} opacity={p(L, 1.3, 1.6)}>KITCHEN</text>
      </svg>
      <div className="absolute" style={{ left: 108, right: 56, top: 1040, display: "flex", gap: 16 }}>
        {mats.map((m, i) => {
          const k = E.backOut(p(L, 1.15 + i * 0.15, 1.6 + i * 0.15));
          return (
            <div key={m.name} style={{ flex: 1, opacity: k, transform: `translateY(${(1 - k) * 20}px)` }}>
              <img src={m.img} alt="" style={{ width: "100%", height: 150, objectFit: "cover", filter: "saturate(.85) brightness(.85)" }} />
              <div style={{ marginTop: 8, fontFamily: F.m, fontSize: 16, letterSpacing: "0.16em", color: C.fog }}>{m.name}</div>
            </div>
          );
        })}
      </div>
      <div className="absolute" style={{ left: 108, top: 1280, fontFamily: F.m, fontSize: 22, letterSpacing: "0.28em", color: C.gold, opacity: E.quadOut(p(L, 1.5, 1.9)) }}>
        12 WEEKS · ON PAPER FIRST
      </div>
    </div>
  );
}

function ChBuilt({ t }: { t: number }) {
  const L = t - 15;
  const weeks = Math.min(12, Math.floor(E.expoOut(p(L, 0.3, 2.2)) * 12));
  return (
    <div className="absolute inset-0">
      <Plate src={IMG.kitchen} t={L} dim={0.48} />
      <Shade />
      <div className="absolute" style={{ left: 108, top: 200, right: 56 }}>
        <div style={{ fontFamily: F.d, fontSize: 108, color: C.bone, lineHeight: 0.92, textShadow: "0 16px 40px rgba(0,0,0,.6)", opacity: E.quadOut(p(L, 0.1, 0.55)) }}>
          AND THEY<br />BUILT IT.
        </div>
        <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, maxWidth: 720 }}>
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} style={{ height: 64, border: `2px solid ${i < weeks ? C.ember : "rgba(243,239,232,.3)"}`, background: i < weeks ? C.ember : "transparent", color: i < weeks ? C.ink : C.fog, fontFamily: F.m, fontSize: 16, display: "grid", placeItems: "center" }}>
              {String(i + 1).padStart(2, "0")}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 22, fontFamily: F.m, fontSize: 22, letterSpacing: "0.24em", color: C.gold }}>
          WEEK {String(Math.max(1, weeks)).padStart(2, "0")}  /  12
        </div>
      </div>
    </div>
  );
}

function ChHome({ t }: { t: number }) {
  const L = t - 18;
  const rooms = ["LIVING", "KITCHEN", "STUDY", "3 BEDS"];
  return (
    <div className="absolute inset-0">
      <Plate src={IMG.luxeLiving} t={L} dim={0.72} drift={8} />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(16,14,12,.35), rgba(16,14,12,.05) 40%, rgba(16,14,12,.72))" }} />
      <div className="absolute" style={{ left: 108, top: 280, right: 56 }}>
        <div style={{ fontFamily: F.s, fontStyle: "italic", fontSize: 48, color: C.gold, opacity: E.quadOut(p(L, 0.1, 0.5)) }}>and then —</div>
        <div style={{ marginTop: 8, fontFamily: F.d, fontSize: 128, color: C.bone, lineHeight: 0.9, textShadow: "0 18px 40px rgba(0,0,0,.55)", opacity: E.quadOut(p(L, 0.25, 0.8)) }}>
          HE CAME<br />HOME.
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 36, flexWrap: "wrap" }}>
          {rooms.map((r, i) => (
            <span key={r} style={{ fontFamily: F.m, fontSize: 20, letterSpacing: "0.16em", padding: "12px 18px", background: C.paper, color: C.ink, opacity: E.backOut(p(L, 0.8 + i * 0.12, 1.25 + i * 0.12)), transform: `translateY(${(1 - E.backOut(p(L, 0.8 + i * 0.12, 1.25 + i * 0.12))) * 16}px)` }}>
              {r}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChLine({ t }: { t: number }) {
  const L = t - 21;
  const out = E.quadIn(p(L, 2.45, 2.95));
  return (
    <div className="absolute inset-0" style={{ background: C.coal, opacity: 1 - out }}>
      <div className="absolute" style={{ left: 108, right: 64, top: 240 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, opacity: E.quadOut(p(L, 0.1, 0.45)) }}>
          <div style={{ width: 72, height: 72, borderRadius: 99, background: C.ember, color: C.ink, fontFamily: F.d, fontSize: 36, display: "grid", placeItems: "center" }}>R</div>
          <div>
            <div style={{ fontFamily: F.d, fontSize: 36, color: C.bone, letterSpacing: "0.06em" }}>RAMESH</div>
            <div style={{ fontFamily: F.m, fontSize: 16, letterSpacing: "0.22em", color: C.ash }}>3BHK · BENGALURU</div>
          </div>
        </div>
        <div style={{ marginTop: 48, fontFamily: F.s, fontStyle: "italic", fontSize: 58, lineHeight: 1.2, color: C.bone, opacity: E.quadOut(p(L, 0.3, 1)) }}>
          “They didn’t decorate a flat.
        </div>
        <div style={{ fontFamily: F.s, fontStyle: "italic", fontSize: 58, lineHeight: 1.2, color: C.ember, opacity: E.quadOut(p(L, 0.55, 1.2)) }}>
          They built our life into it.”
        </div>
        <div style={{ marginTop: 56, opacity: E.quadOut(p(L, 0.9, 1.3)) }}>
          <LogoMark t={t} start={21.9} size={92} color={C.ember} bar={C.bone} />
        </div>
        <div style={{ marginTop: 28, fontFamily: F.d, fontSize: 64, color: C.bone, letterSpacing: "0.04em", opacity: E.quadOut(p(L, 1.05, 1.45)) }}>
          TIMBERLANE
        </div>
        <div style={{ marginTop: 10, fontFamily: F.m, fontSize: 26, letterSpacing: "0.18em", color: C.gold, opacity: E.quadOut(p(L, 1.25, 1.6)) }}>
          timberlane.co.in
        </div>
        <div style={{ marginTop: 28, display: "inline-block", background: C.ember, color: C.ink, fontFamily: F.g, fontWeight: 800, fontSize: 26, letterSpacing: "0.08em", padding: "16px 28px", opacity: E.backOut(p(L, 1.45, 1.9)) }}>
          BOOK A CONVERSATION
        </div>
      </div>
    </div>
  );
}
