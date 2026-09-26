export const W = 1080;
export const H = 1920;
export const DURATION = 20;
export const FPS = 30;

export const C = {
  ink: "#08080a",
  coal: "#0e0f11",
  graphite: "#17191d",
  slate: "#23262b",
  steel: "#3a3e45",
  ash: "#8b9097",
  fog: "#c8ccd2",
  bone: "#f1efec",
  ember: "#ff5a1f",
  ember2: "#ff7a2f",
  ember3: "#ff3d00",
  amber: "#ffb07c",
} as const;

export const F = {
  d: "Anton, 'Arial Narrow', sans-serif",
  g: "Archivo, system-ui, sans-serif",
  m: "'JetBrains Mono', ui-monospace, monospace",
  s: "'Playfair Display', Georgia, serif",
} as const;

export type Shot = {
  id: string;
  in: number;
  out: number;
  code: string;
  name: string;
  note: string;
};

/** every cut lands on a beat of the 120 BPM grid */
export const SHOTS: Shot[] = [
  { id: "s1", in: 0, out: 2, code: "01", name: "IGNITION", note: "Logo build · grid draw · scanline fill" },
  { id: "s2", in: 2, out: 6, code: "02", name: "THE HOOK", note: "Kinetic type · slice transition" },
  { id: "s3", in: 6, out: 8, code: "03", name: "TRIPTYCH", note: "3-col parallax · counters" },
  { id: "s4", in: 8, out: 10, code: "04", name: "TRANSFORM", note: "Before / after wipe" },
  { id: "s5", in: 10, out: 13, code: "05", name: "THE METHOD", note: "4-step whip pan" },
  { id: "s6", in: 13, out: 16, code: "06", name: "SIGNATURE", note: "Masked line reveal · push-in" },
  { id: "s7", in: 16, out: 20, code: "07", name: "END CARD", note: "Logo lockup · CTA · contact" },
];

export const shotAt = (t: number) => SHOTS.find((s) => t >= s.in && t < s.out) ?? SHOTS[SHOTS.length - 1];

/** moments that kick the virtual camera */
export const IMPACTS = [0, 2, 4, 6, 8, 10, 13, 16, 19];
