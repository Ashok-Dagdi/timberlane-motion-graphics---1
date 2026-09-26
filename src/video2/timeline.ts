import { BRAND } from "../video/assets";

export const W = 1920;
export const H = 810; // 2.37:1 scope
export const DURATION = 30;
export const FPS = 24;

export const C = {
  ink: "#050607",
  coal: "#0a0b0d",
  graphite: "#131518",
  slate: "#1f2226",
  steel: "#3a3e45",
  ash: "#8b9097",
  fog: "#c8ccd2",
  bone: "#f1efec",
  amber: "#ffb07c",
  ember: "#ff5a1f",
  gold: "#e6c088",
  cream: "#f7e9d2",
} as const;

export const F = {
  d: "Anton, 'Arial Narrow', sans-serif",
  g: "Archivo, system-ui, sans-serif",
  m: "'JetBrains Mono', ui-monospace, monospace",
  s: "'Playfair Display', Georgia, serif",
} as const;

export const CREDITS = [
  { k: "CLIENT", v: BRAND.name + " INTERIORS" },
  { k: "DIRECTION", v: "MOTION STUDIO" },
  { k: "LOCATION", v: BRAND.city + ", IN" },
  { k: "LENGTH", v: "00:30" },
  { k: "ASPECT", v: "2.37 : 1" },
  { k: "SCORE", v: "AMBER / 66" },
] as const;

export type Shot = { id: string; in: number; out: number; name: string; note: string };
export const SHOTS: Shot[] = [
  { id: "a1", in: 0, out: 5, name: "OVERTURE", note: "Fade from black · title card" },
  { id: "a2", in: 5, out: 12, name: "LIVING", note: "Slow dolly · ambient swell" },
  { id: "a3", in: 12, out: 19, name: "KITCHEN", note: "Push-in · piano motif" },
  { id: "a4", in: 19, out: 25, name: "BEDROOM", note: "Warm grade · resolve" },
  { id: "a5", in: 25, out: 30, name: "CODA", note: "Logo lockup · contact" },
];
export const shotAt = (t: number) => SHOTS.find((s) => t >= s.in && t < s.out) ?? SHOTS[SHOTS.length - 1];
