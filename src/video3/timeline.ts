export const W = 1080;
export const H = 1080;
export const DURATION = 15;
export const FPS = 30;

export const C = {
  paper: "#f6ead6",
  cream: "#fffdf7",
  ink: "#141311",
  graphite: "#2a2a2c",
  steel: "#3a3e45",
  ash: "#8b9097",
  fog: "#c8ccd2",
  ember: "#ff5a1f",
  emberDeep: "#d63f08",
  gold: "#ffb03a",
  mint: "#63d6b4",
} as const;

export const F = {
  d: "Anton, 'Arial Narrow', sans-serif",
  g: "Archivo, system-ui, sans-serif",
  m: "'JetBrains Mono', ui-monospace, monospace",
  s: "'Playfair Display', Georgia, serif",
} as const;

export type Shot = { id: string; in: number; out: number; name: string; note: string };

/** 6 bars of 96 BPM = 15.000 s — one pop card per bar */
export const SHOTS: Shot[] = [
  { id: "p1", in: 0, out: 2.5, name: "COVER", note: "Bouncing type · marquee ribbons" },
  { id: "p2", in: 2.5, out: 5, name: "FLIP CARDS", note: "Room picker · 3D flap cards" },
  { id: "p3", in: 5, out: 7.5, name: "NUMBER POPS", note: "Count-ups · starbursts" },
  { id: "p4", in: 7.5, out: 10, name: "BLIND WIPE", note: "Before / after venetian blinds" },
  { id: "p5", in: 10, out: 12.5, name: "CLIENT LOVE", note: "Quote carousel · tape & stars" },
  { id: "p6", in: 12.5, out: 15, name: "STAMP CARD", note: "Logo slams · confetti burst" },
];

export const shotAt = (t: number) => SHOTS.find((s) => t >= s.in && t < s.out) ?? SHOTS[SHOTS.length - 1];

/** every bar line gets a camera punch + flash */
export const BEATS = [0, 2.5, 5, 7.5, 10, 12.5];
