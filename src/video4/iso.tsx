import { C, DROPS, F, b } from "./timeline";
import { E, clamp, p } from "../video/anim";

/* ------------------------------------------------------------------ */
/*  True isometric projection (30°)                                    */
/* ------------------------------------------------------------------ */
const S = 108;
const CX = 540;
const CY = 900;
const RW = 5; // room width  (x)
const RD = 5; // room depth  (y)
const RH = 3; // room height (z)

export const P = (x: number, y: number, z: number): [number, number] => [
  CX + (x - y) * 0.866 * S,
  CY + (x + y) * 0.5 * S - z * S,
];
const pts = (arr: [number, number, number][]) =>
  arr.map(([x, y, z]) => P(x, y, z).map((v) => v.toFixed(1)).join(",")).join(" ");

type BoxProps = {
  x: number; y: number; z: number; dx: number; dy: number; dz: number;
  top?: string; right?: string; left?: string; stroke?: string; sw?: number;
};

export function Box({ x, y, z, dx, dy, dz, top = "#2b3036", right = "#1d2125", left = "#24292e", stroke = C.ember, sw = 2 }: BoxProps) {
  const X = x + dx, Y = y + dy, Z = z + dz;
  return (
    <g strokeLinejoin="round" stroke={stroke} strokeWidth={sw}>
      <polygon points={pts([[X, y, z], [X, Y, z], [X, Y, Z], [X, y, Z]])} fill={right} />
      <polygon points={pts([[x, Y, z], [X, Y, z], [X, Y, Z], [x, Y, Z]])} fill={left} />
      <polygon points={pts([[x, y, Z], [X, y, Z], [X, Y, Z], [x, Y, Z]])} fill={top} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/*  Drop-in wrapper: falls from above, lands on the beat               */
/* ------------------------------------------------------------------ */
const FALL = 0.32;

function Drop({
  t, land, label, cx, cy, cz, r = 0.8, children,
}: {
  t: number; land: number; label: string; cx: number; cy: number; cz: number; r?: number;
  children: React.ReactNode;
}) {
  const k = p(t, land - FALL, land);
  if (k <= 0) return null;
  const dy = (1 - E.quadIn(k)) * -520;
  const since = t - land;
  // landing squash
  const sq = since > 0 ? 1 - Math.exp(-since * 18) * Math.cos(since * 40) * 0.06 : 1;
  const ring = p(t, land, land + 0.55);
  const labelOp = since < 0 ? 0 : since < 0.15 ? since / 0.15 : since > 1.0 ? Math.max(0, 1 - (since - 1.0) / 0.3) : 1;
  const [fx, fy] = P(cx, cy, 0);
  const [lx, ly] = P(cx, cy, cz);
  return (
    <g>
      {ring > 0 && ring < 1 && (
        <ellipse
          cx={fx} cy={fy}
          rx={r * S * 1.22 * (0.4 + E.expoOut(ring) * 1.2)}
          ry={r * S * 0.707 * (0.4 + E.expoOut(ring) * 1.2)}
          fill="none" stroke={C.ember} strokeWidth={3} opacity={(1 - ring) * 0.8}
        />
      )}
      <g
        transform={`translate(0 ${dy}) translate(${fx} ${fy}) scale(${1 / sq ** 0.5} ${sq}) translate(${-fx} ${-fy})`}
        opacity={Math.min(1, k * 3)}
      >
        {children}
      </g>
      {labelOp > 0 && (
        <g opacity={labelOp} transform={`translate(${lx} ${ly - 40 - (1 - labelOp) * 14})`}>
          <line x1={0} y1={0} x2={0} y2={34} stroke={C.ember} strokeWidth={2} />
          <rect x={-label.length * 6.3 - 14} y={-34} width={label.length * 12.6 + 28} height={34} rx={4} fill={C.ink} stroke={C.ember} strokeWidth={2} />
          <text x={0} y={-11} textAnchor="middle" fill={C.bone} style={{ fontFamily: F.m, fontSize: 18, fontWeight: 700, letterSpacing: "0.06em" }}>
            {label}
          </text>
        </g>
      )}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/*  The room                                                           */
/* ------------------------------------------------------------------ */
export function IsoRoom({ t }: { t: number }) {
  const L = t - b(3);
  const floorK = E.quintInOut(p(L, -0.28, 0.1));
  const h = RH * E.expoOut(p(L, 0.08, 0.8));
  const tiles = E.expoOut(p(L, 0.1, 0.7));
  const lightK = E.quadOut(p(L, 0.8, 1.3));
  const warm = E.quadOut(p(L, 3.2, 4.0));

  const winTop = Math.min(h, 2.5);
  const showWin = h > 0.95;

  return (
    <svg viewBox="0 0 1080 1920" width={1080} height={1920} className="absolute inset-0" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="win4" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.amber} stopOpacity={0.9} />
          <stop offset="1" stopColor={C.ember} stopOpacity={0.75} />
        </linearGradient>
        <radialGradient id="glow4" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={C.ember2} stopOpacity={0.55} />
          <stop offset="1" stopColor={C.ember2} stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* floor */}
      <polygon
        points={pts([[0, 0, 0], [RW, 0, 0], [RW, RD, 0], [0, RD, 0]])}
        fill="#181b1f" stroke={C.bone} strokeWidth={3}
        pathLength={1} strokeDasharray={1} strokeDashoffset={1 - floorK}
        fillOpacity={floorK}
      />
      {Array.from({ length: RW - 1 }, (_, i) => {
        const [x1, y1] = P(i + 1, 0, 0);
        const [x2, y2] = P(i + 1, RD * tiles, 0);
        return <line key={`tx${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.steel} strokeWidth={1.5} />;
      })}
      {Array.from({ length: RD - 1 }, (_, i) => {
        const [x1, y1] = P(0, i + 1, 0);
        const [x2, y2] = P(RW * tiles, i + 1, 0);
        return <line key={`ty${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.steel} strokeWidth={1.5} />;
      })}

      {/* walls */}
      {h > 0.01 && (
        <>
          <polygon points={pts([[0, 0, 0], [0, RD, 0], [0, RD, h], [0, 0, h]])} fill="#1e2226" stroke={C.bone} strokeWidth={3} strokeLinejoin="round" />
          <polygon points={pts([[0, 0, 0], [RW, 0, 0], [RW, 0, h], [0, 0, h]])} fill="#24292e" stroke={C.bone} strokeWidth={3} strokeLinejoin="round" />
          {/* skirting */}
          <polyline points={pts([[0, RD, 0.12], [0, 0, 0.12], [RW, 0, 0.12]])} fill="none" stroke={C.steel} strokeWidth={2} />
        </>
      )}

      {/* window + light spill */}
      {showWin && (
        <>
          <polygon points={pts([[2.7, 0, 0.95], [4.3, 0, 0.95], [4.3, 0, winTop], [2.7, 0, winTop]])} fill="url(#win4)" stroke={C.bone} strokeWidth={3} />
          <polyline points={pts([[3.5, 0, 0.95], [3.5, 0, winTop]])} stroke={C.ink} strokeWidth={3} fill="none" />
          <polyline points={pts([[2.7, 0, 1.75], [4.3, 0, 1.75]])} stroke={C.ink} strokeWidth={3} fill="none" />
          <polygon points={pts([[2.7, 0, 0], [4.3, 0, 0], [3.5, 2.8, 0], [1.9, 2.8, 0]])} fill={C.ember} opacity={0.14 * lightK} />
        </>
      )}

      {/* rug */}
      {(() => {
        const k = p(t, DROPS.rug - 0.3, DROPS.rug);
        if (k <= 0) return null;
        const s = E.backOut(k);
        const c = 2.9;
        const half = 1.3 * s;
        return (
          <polygon
            points={pts([[c - half, c - half, 0.01], [c + half, c - half, 0.01], [c + half, c + half, 0.01], [c - half, c + half, 0.01]])}
            fill={C.ember} fillOpacity={0.16} stroke={C.ember} strokeWidth={2.5} strokeDasharray="10 7"
          />
        );
      })()}

      {/* ---------- furniture, back to front ---------- */}
      <Drop t={t} land={DROPS.lamp} label="FLOOR LAMP" cx={0.5} cy={0.6} cz={2.0} r={0.4}>
        <Box x={0.46} y={0.56} z={0} dx={0.08} dy={0.08} dz={1.62} top={C.fog} right={C.steel} left={C.ash} sw={1.5} />
        <Box x={0.26} y={0.36} z={1.6} dx={0.48} dy={0.48} dz={0.38} top={C.amber} right={C.ember} left={C.ember2} />
        <circle cx={P(0.5, 0.6, 1.8)[0]} cy={P(0.5, 0.6, 1.8)[1]} r={120} fill="url(#glow4)" />
      </Drop>

      <Drop t={t} land={DROPS.shelf} label="WALL SHELF" cx={2.0} cy={0.18} cz={2.3} r={0.5}>
        <Box x={1.2} y={0} z={1.5} dx={1.6} dy={0.35} dz={0.08} />
        <Box x={1.2} y={0} z={2.1} dx={1.6} dy={0.35} dz={0.08} />
        <Box x={1.35} y={0.05} z={1.58} dx={0.12} dy={0.25} dz={0.36} top={C.ember} right={C.ember2} left={C.amber} sw={1.5} />
        <Box x={1.5} y={0.05} z={1.58} dx={0.12} dy={0.25} dz={0.3} top={C.fog} right={C.ash} left={C.fog} sw={1.5} />
        <Box x={2.3} y={0.08} z={2.18} dx={0.3} dy={0.2} dz={0.22} top={C.fog} right={C.steel} left={C.ash} sw={1.5} />
      </Drop>

      <Drop t={t} land={DROPS.art} label="ARTWORK" cx={0} cy={2.7} cz={2.5} r={0.5}>
        <polygon points={pts([[0.02, 2.0, 1.45], [0.02, 3.4, 1.45], [0.02, 3.4, 2.45], [0.02, 2.0, 2.45]])} fill={C.bone} stroke={C.ember} strokeWidth={3} />
        <polygon points={pts([[0.03, 2.2, 1.6], [0.03, 3.2, 1.6], [0.03, 3.2, 2.3], [0.03, 2.2, 2.3]])} fill={C.ember} />
        <polygon points={pts([[0.04, 2.2, 1.6], [0.04, 2.9, 1.6], [0.04, 2.55, 2.05]])} fill={C.ink} opacity={0.6} />
      </Drop>

      <Drop t={t} land={DROPS.sofa} label="SOFA · 2.6 M" cx={0.7} cy={2.6} cz={1.0} r={1.2}>
        <Box x={0.15} y={1.3} z={0} dx={1.05} dy={2.6} dz={0.42} />
        <Box x={0.15} y={1.3} z={0.42} dx={0.3} dy={2.6} dz={0.52} />
        <Box x={0.45} y={1.3} z={0.42} dx={0.75} dy={0.25} dz={0.22} />
        <Box x={0.45} y={3.65} z={0.42} dx={0.75} dy={0.25} dz={0.22} />
        <Box x={0.5} y={1.7} z={0.42} dx={0.6} dy={0.85} dz={0.12} top="#353b42" />
        <Box x={0.5} y={2.65} z={0.42} dx={0.6} dy={0.85} dz={0.12} top="#353b42" />
      </Drop>

      <Drop t={t} land={DROPS.chair} label="LOUNGE CHAIR" cx={4.05} cy={1.45} cz={1.0} r={0.6}>
        <Box x={3.6} y={1.0} z={0} dx={0.9} dy={0.9} dz={0.4} top={C.ember} right={C.ember2} left={C.amber} />
        <Box x={3.6} y={1.0} z={0.4} dx={0.9} dy={0.2} dz={0.5} top={C.ember} right={C.ember2} left={C.amber} />
      </Drop>

      <Drop t={t} land={DROPS.table} label="COFFEE TABLE" cx={3.0} cy={3.0} cz={0.55} r={0.7}>
        <Box x={2.6} y={2.6} z={0} dx={0.8} dy={0.8} dz={0.36} top="#2b3036" right="#1a1d21" left="#202428" />
        <Box x={2.45} y={2.45} z={0.36} dx={1.1} dy={1.1} dz={0.07} top={C.fog} right={C.ash} left={C.fog} />
        <Box x={2.8} y={2.75} z={0.43} dx={0.22} dy={0.22} dz={0.2} top={C.ember} right={C.ember2} left={C.amber} sw={1.5} />
      </Drop>

      <Drop t={t} land={DROPS.pendant} label="PENDANT · 2700K" cx={2.95} cy={2.95} cz={2.0} r={0.4}>
        <line
          x1={P(2.95, 2.95, 3.0)[0]} y1={P(2.95, 2.95, 3.0)[1]}
          x2={P(2.95, 2.95, 2.25)[0]} y2={P(2.95, 2.95, 2.25)[1]}
          stroke={C.fog} strokeWidth={2}
        />
        <Box x={2.75} y={2.75} z={2.0} dx={0.4} dy={0.4} dz={0.25} top={C.amber} right={C.ember} left={C.ember2} />
        <circle cx={P(2.95, 2.95, 1.9)[0]} cy={P(2.95, 2.95, 1.9)[1]} r={140} fill="url(#glow4)" />
      </Drop>

      <Drop t={t} land={DROPS.plant} label="PLANTER" cx={4.35} cy={4.15} cz={1.4} r={0.5}>
        <Box x={4.1} y={3.9} z={0} dx={0.5} dy={0.5} dz={0.45} top="#2b3036" right={C.steel} left={C.ash} />
        <ellipse cx={P(4.35, 4.15, 0.95)[0]} cy={P(4.35, 4.15, 0.95)[1]} rx={52} ry={62} fill="#2f3a33" stroke={C.ember} strokeWidth={2} />
        <ellipse cx={P(4.35, 4.15, 1.2)[0] - 16} cy={P(4.35, 4.15, 1.2)[1]} rx={30} ry={40} fill="#3b4a40" stroke={C.ember} strokeWidth={2} />
      </Drop>

      {/* dimensions */}
      {h > 0.3 && (() => {
        const [ax, ay] = P(0, RD, 0);
        const [bx, by] = P(0, RD, h);
        const off = -34;
        return (
          <g opacity={clamp(h / RH)}>
            <line x1={ax + off} y1={ay} x2={bx + off} y2={by} stroke={C.ash} strokeWidth={2} />
            <line x1={ax + off - 10} y1={ay} x2={ax + off + 10} y2={ay} stroke={C.ash} strokeWidth={2} />
            <line x1={bx + off - 10} y1={by} x2={bx + off + 10} y2={by} stroke={C.ash} strokeWidth={2} />
            <text x={ax + off - 16} y={(ay + by) / 2} textAnchor="end" fill={C.fog} style={{ fontFamily: F.m, fontSize: 20, fontWeight: 700 }}>
              {h.toFixed(2)} M
            </text>
          </g>
        );
      })()}
      {floorK > 0.9 && (() => {
        const [ax, ay] = P(0, RD + 0.45, 0);
        const [bx, by] = P(RW, RD + 0.45, 0);
        const [mx, my] = P(RW / 2, RD + 0.75, 0);
        const [cx2, cy2] = P(RW + 0.45, 0, 0);
        const [dx2, dy2] = P(RW + 0.45, RD, 0);
        const [nx, ny] = P(RW + 0.75, RD / 2, 0);
        return (
          <g stroke={C.ash} strokeWidth={2}>
            <line x1={ax} y1={ay} x2={bx} y2={by} />
            <line x1={cx2} y1={cy2} x2={dx2} y2={dy2} />
            <text x={mx} y={my} fill={C.fog} stroke="none" textAnchor="middle" transform={`rotate(30 ${mx} ${my})`} style={{ fontFamily: F.m, fontSize: 20, fontWeight: 700 }}>
              5.00 M
            </text>
            <text x={nx} y={ny} fill={C.fog} stroke="none" textAnchor="middle" transform={`rotate(-30 ${nx} ${ny})`} style={{ fontFamily: F.m, fontSize: 20, fontWeight: 700 }}>
              5.00 M
            </text>
          </g>
        );
      })()}

      {/* final "render warm-up" wash */}
      {warm > 0 && (
        <polygon
          points={pts([[0, 0, 0], [RW, 0, 0], [RW, RD, 0], [0, RD, 0]])}
          fill={C.ember} opacity={warm * 0.1}
        />
      )}
    </svg>
  );
}

export const DROP_COUNT = Object.keys(DROPS).length;
export const dropsLanded = (t: number) => Object.values(DROPS).filter((d) => t >= d).length;
