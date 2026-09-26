export const W = 1080;
export const H = 1920;
export const DURATION = 20;
export const FPS = 30;

export const C = {
  ink: "#090b0e",
  coal: "#0e1216",
  graphite: "#151a20",
  slate: "#1f242b",
  steel: "#3c434c",
  ash: "#8d949d",
  fog: "#c6ccd2",
  bone: "#eef0f2",
  ember: "#ff5a1f",
  emberDeep: "#d63f08",
  emberGlow: "rgba(255,90,31,.5)",
  gold: "#ffb03a",
  dim: "rgba(198,204,210,.42)",
} as const;

export const F = {
  d: "Anton, 'Arial Narrow', sans-serif",
  g: "Archivo, system-ui, sans-serif",
  m: "'JetBrains Mono', ui-monospace, monospace",
  s: "'Playfair Display', Georgia, serif",
} as const;

export type Shot = { id: string; in: number; out: number; code: string; name: string; note: string };

/** cuts on 104 BPM bar lines (bar = 2.3077s) */
export const SHOTS: Shot[] = [
  { id: "c1", in: 0, out: 2.3077, code: "00", name: "FILE OPEN", note: "Scanner · dossier card · descriptor type" },
  { id: "c2", in: 2.3077, out: 4.6154, code: "01", name: "OVERVIEW", note: "Photo, 4 data cells, 2200 FT² count" },
  { id: "c3", in: 4.6154, out: 6.9231, code: "02", name: "BRIEFING", note: "Editorial intro · keywords kick in" },
  { id: "c4", in: 6.9231, out: 9.2308, code: "03", name: "PLAN + SPECS", note: "Plan on light-table, specs with HELIX" },
  { id: "c5", in: 9.2308, out: 11.5385, code: "04", name: "MATERIAL BOARD", note: "2×2 grid · percentages climb" },
  { id: "c6", in: 11.5385, out: 13.8462, code: "05", name: "TRANSFORM", note: "Before/after wipe · ± offsets" },
  { id: "c7", in: 13.8462, out: 16.1538, code: "06", name: "TESTIMONIAL", note: "Aarav Sinha · 5.0 · line-by-line reveal" },
  { id: "c8", in: 16.1538, out: 20, code: "07", name: "CASE CLOSED", note: "File close, CTA card, logo + contact" },
];

export const shotAt = (t: number) => SHOTS.find((s) => t >= s.in && t < s.out) ?? SHOTS[SHOTS.length - 1];

export const BEATS = [0, 2.3077, 4.6154, 6.9231, 9.2308, 11.5385, 13.8462, 16.1538];

export const PROJECT = {
  no: "0043",
  name: "GODREJ AQUA",
  sub: "4BHK RESIDENCE · OMR, BENGALURU",
  area: "2200 SQ.FT",
  timeline: "9 MONTHS · 2024 → 2025",
  palette: "EMBER · GRAPHITE · CONCRETE",
  team: "18 SPECIALISTS",
  rooms: "4 BEDS + LOUNGE + ATELIER",
  primary: "#FF5A1F",
} as const;
