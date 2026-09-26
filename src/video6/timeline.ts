export const W = 1080;
export const H = 1920;
export const DURATION = 24;
export const FPS = 30;
export const BAR = 3; // 80 BPM · one chapter per bar

export const C = {
  ink: "#100e0c",
  coal: "#171411",
  paper: "#f4efe6",
  cream: "#fffaf3",
  bone: "#f3efe8",
  fog: "#d9d1c6",
  ash: "#8d8680",
  steel: "#4a453f",
  ember: "#ff5a1f",
  emberDeep: "#c2410c",
  gold: "#e0a15a",
} as const;

export const F = {
  d: "Anton, 'Arial Narrow', sans-serif",
  g: "Archivo, system-ui, sans-serif",
  m: "'JetBrains Mono', ui-monospace, monospace",
  s: "'Playfair Display', Georgia, serif",
} as const;

export type Chapter = {
  id: string;
  in: number;
  out: number;
  no: string;
  name: string;
  line: string;
  note: string;
};

export const CHAPTERS: Chapter[] = [
  { id: "s1", in: 0, out: 3, no: "01", name: "THE KEYS", line: "New keys. A new address. Four empty rooms.", note: "Ramesh collects the keys to a 3BHK" },
  { id: "s2", in: 3, out: 6, no: "02", name: "EMPTY", line: "No sofa. No light plan. Just echo.", note: "The rooms are quiet. Zero decisions." },
  { id: "s3", in: 6, out: 9, no: "03", name: "THE CALL", line: "He called the studio that starts by listening.", note: "One number. No catalogue." },
  { id: "s4", in: 9, out: 12, no: "04", name: "THEY LISTENED", line: "A study. A Sunday kitchen. Wood that feels like home.", note: "His brief, written back to him" },
  { id: "s5", in: 12, out: 15, no: "05", name: "THEY DREW IT", line: "A plan for the life he described — not a showroom.", note: "Plan, materials, twelve weeks" },
  { id: "s6", in: 15, out: 18, no: "06", name: "THEY BUILT IT", line: "Workshop joinery. On-site install. Week by week.", note: "The echo leaves the rooms" },
  { id: "s7", in: 18, out: 21, no: "07", name: "HE CAME HOME", line: "The flat he bought became the home he meant.", note: "Living, kitchen, study, three beds" },
  { id: "s8", in: 21, out: 24, no: "08", name: "HIS LINE", line: "If the rooms are still empty — start with a conversation.", note: "Ramesh, after — and the invite" },
];

export const chapterAt = (t: number) => CHAPTERS.find((c) => t >= c.in && t < c.out) ?? CHAPTERS[CHAPTERS.length - 1];

export const PHO = {
  keys: "https://images.pexels.com/photos/7599735/pexels-photo-7599735.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1920&w=1080",
  empty: "https://images.pexels.com/photos/20314948/pexels-photo-20314948.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1920&w=1080",
  emptyB: "https://images.pexels.com/photos/7209222/pexels-photo-7209222.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1920&w=1080",
} as const;

export const HERO = {
  name: "RAMESH",
  age: "34",
  city: "BENGALURU",
  home: "3BHK",
  family: "FAMILY OF FOUR",
} as const;
