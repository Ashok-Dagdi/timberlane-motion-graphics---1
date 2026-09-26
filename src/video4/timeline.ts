export const W = 1080;
export const H = 1920;
export const DURATION = 20;
export const BPM = 108;
export const BEAT = 60 / BPM; // 0.5556
export const BAR = BEAT * 4; // 2.2222 — 9 bars = 20.000 s
export const b = (bars: number) => bars * BAR;

export const C = {
  bg: "#131517",
  sheet: "#1a1d21",
  grid: "#262a30",
  grid2: "#1f2327",
  steel: "#3a3e45",
  ash: "#8b9097",
  fog: "#c8ccd2",
  bone: "#f1efec",
  ember: "#ff5a1f",
  ember2: "#ff7a2f",
  amber: "#ffb07c",
  ink: "#08080a",
} as const;

export const F = {
  d: "Anton, 'Arial Narrow', sans-serif",
  g: "Archivo, system-ui, sans-serif",
  m: "'JetBrains Mono', ui-monospace, monospace",
  s: "'Playfair Display', Georgia, serif",
} as const;

export type Shot = { id: string; in: number; out: number; code: string; name: string; note: string };

export const SHOTS: Shot[] = [
  { id: "d1", in: 0, out: b(1), code: "01", name: "ORIGIN", note: "Grid draw · coordinates lock" },
  { id: "d2", in: b(1), out: b(3), code: "02", name: "FLOOR PLAN", note: "Self-drawing plan · dimensions" },
  { id: "d3", in: b(3), out: b(5), code: "03", name: "ISO BUILD", note: "3D tilt · walls rise · beat drops" },
  { id: "d4", in: b(5), out: b(7), code: "04", name: "RENDER", note: "Edge-detect sketch → photo scan" },
  { id: "d5", in: b(7), out: 20, code: "05", name: "TITLE BLOCK", note: "Drawing sheet · APPROVED stamp" },
];

export const shotAt = (t: number) => SHOTS.find((s) => t >= s.in && t < s.out) ?? SHOTS[SHOTS.length - 1];

/** furniture landing times (on the 8th-note grid) — shared by picture & score */
export const DROPS = {
  rug: b(3) + BEAT * 1.5,
  sofa: b(3) + BEAT * 2,
  table: b(3) + BEAT * 2.5,
  lamp: b(3) + BEAT * 3,
  shelf: b(3) + BEAT * 3.5,
  plant: b(4),
  art: b(4) + BEAT * 0.5,
  pendant: b(4) + BEAT * 1,
  chair: b(4) + BEAT * 1.5,
} as const;

export const STAMP_AT = b(8); // 17.78
export const IMPACTS = [0, b(1), b(3), b(5), b(6), b(7), STAMP_AT];
