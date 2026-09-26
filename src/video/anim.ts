/* ------------------------------------------------------------------
   anim.ts — tiny expression library for the composition.
   Everything is time-driven (seconds), fully scrubbable & deterministic.
   ------------------------------------------------------------------ */

export const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** normalised progress of `t` inside [a,b], clamped 0..1 */
export const p = (t: number, a: number, b: number) => (b === a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a)));

export type Easing = (x: number) => number;

export const E = {
  linear: (x: number) => x,
  quadIn: (x: number) => x * x,
  quadOut: (x: number) => 1 - (1 - x) * (1 - x),
  quadInOut: (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
  cubicIn: (x: number) => x * x * x,
  cubicOut: (x: number) => 1 - Math.pow(1 - x, 3),
  cubicInOut: (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  quartOut: (x: number) => 1 - Math.pow(1 - x, 4),
  quintOut: (x: number) => 1 - Math.pow(1 - x, 5),
  quintInOut: (x: number) => (x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2),
  expoOut: (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  expoIn: (x: number) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
  expoInOut: (x: number) =>
    x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2,
  circOut: (x: number) => Math.sqrt(1 - Math.pow(x - 1, 2)),
  circInOut: (x: number) =>
    x < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * x, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * x + 2, 2)) + 1) / 2,
  // c3 = c1 + 1 so that f(0) === 0 and f(1) === 1
  backOut: (x: number) => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2),
  backIn: (x: number) => 2.70158 * x * x * x - 1.70158 * x * x,
  elasticOut: (x: number) =>
    x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
  /** heavy, weighted "After Effects" ease — great for big type */
  heavyOut: (x: number) => 1 - Math.pow(1 - x, 4.6),
} satisfies Record<string, Easing>;

/** tween: value of `from -> to` as t crosses [a,b] with easing */
export const tw = (t: number, a: number, b: number, from: number, to: number, e: Easing = E.expoOut) =>
  lerp(from, to, e(p(t, a, b)));

/** critically-ish damped spring settle, 0 -> 1 with overshoot */
export const springOut = (x: number, freq = 9, damp = 5.5) =>
  x >= 1 ? 1 : 1 - Math.exp(-damp * x) * Math.cos(freq * x);

/** decaying impulse, 1 at `at`, 0 after `dur` */
export const hit = (t: number, at: number, dur = 0.35, e: Easing = E.expoOut) =>
  t < at ? 0 : 1 - e(p(t, at, at + dur));

/** decaying oscillation (shake / wobble) */
export const shake = (t: number, at: number, dur: number, freq: number) => {
  if (t < at || t > at + dur) return 0;
  const k = 1 - p(t, at, at + dur);
  return Math.sin((t - at) * freq * Math.PI * 2) * k * k;
};

/** looping 0..1 */
export const loop = (t: number, dur: number) => ((t % dur) + dur) % dur / dur;

/** deterministic pseudo random */
export const rnd = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** value noise over time (smooth wander) */
export const wander = (t: number, seed = 0, speed = 1) => {
  const x = t * speed + seed * 13.37;
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(rnd(i + seed) * 2 - 1, rnd(i + 1 + seed) * 2 - 1, u);
};

export const px = (n: number) => `${n}px`;

/** build a clip-path inset string */
export const inset = (top: number, right: number, bottom: number, left: number, radius = 0) =>
  `inset(${top}% ${right}% ${bottom}% ${left}%${radius ? ` round ${radius}px` : ""})`;

/** stagger helper: local progress for item i */
export const stag = (t: number, start: number, dur: number, i: number, step: number) =>
  p(t, start + i * step, start + i * step + dur);

/** counts up with easing and formats */
export const counter = (t: number, a: number, b: number, to: number, e: Easing = E.expoOut) =>
  Math.round(lerp(0, to, e(p(t, a, b))));

export const fmt = (s: number) => {
  const cs = Math.floor((s % 1) * 100);
  const sec = Math.floor(s % 60);
  return `00:${String(sec).padStart(2, "0")}:${String(cs).padStart(2, "0")}`;
};
