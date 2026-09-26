export const W = 1080;
export const H = 1920;
export const DURATION = 20;
export const BAR = 2.5; // 96 BPM
export const BEAT = 0.625;

export const C = {
  ink: "#0a0a0c",
  coal: "#101114",
  graphite: "#18191d",
  slate: "#24262b",
  steel: "#3d4148",
  ash: "#8b9097",
  fog: "#cdd0d4",
  bone: "#f2f0ec",
  ember: "#ff5a1f",
  emberDeep: "#cf3f0a",
  oak: "#c8955f",
  stone: "#e6e3de",
  brass: "#c9a24a",
} as const;

export const F = {
  d: "Anton, 'Arial Narrow', sans-serif",
  g: "Archivo, system-ui, sans-serif",
  m: "'JetBrains Mono', ui-monospace, monospace",
  s: "'Playfair Display', Georgia, serif",
} as const;

export type Shot = { id: string; in: number; out: number; code: string; name: string; note: string };

export const SHOTS: Shot[] = [
  { id: "m1", in: 0, out: 2.5, code: "01", name: "THE FINISH", note: "Hero plate · three-word slam" },
  { id: "m2", in: 2.5, out: 5, code: "02", name: "THE LAYERS", note: "Exploded panel · 5 labelled layers" },
  { id: "m3", in: 5, out: 7.5, code: "03", name: "OAK", note: "Macro grain · spec sheet · wipe up" },
  { id: "m4", in: 7.5, out: 10, code: "04", name: "STONE", note: "Macro veining · spec sheet · wipe left" },
  { id: "m5", in: 10, out: 12.5, code: "05", name: "BRASS", note: "Hardware macro · spec sheet · wipe right" },
  { id: "m6", in: 12.5, out: 15, code: "06", name: "THE WORKSHOP", note: "±10 → ±1 MM · 7-step QC ticks" },
  { id: "m7", in: 15, out: 17.5, code: "07", name: "THE SITE", note: "Gantt build · playhead · stamp" },
  { id: "m8", in: 17.5, out: 20, code: "08", name: "MATERIAL TRUTH", note: "Ember lockup · CTA · contact" },
];

export const shotAt = (t: number) => SHOTS.find((s) => t >= s.in && t < s.out) ?? SHOTS[SHOTS.length - 1];

const px = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1080&h=1920`;

export const IMG7 = {
  oak: px(6757411),
  stone: px(4709481),
  brass: px(5825555),
  workshop: px(7492882),
  craftsman: px(7492580),
} as const;
