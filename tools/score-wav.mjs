/* ==================================================================
   score-wav.mjs — bounce "Warm Concrete" to a WAV, with no browser
   ------------------------------------------------------------------
   The app plays the score live through WebAudio (src/layers/music.js).
   A master file needs printed audio, and there is no WebAudio in node —
   so this renders the *same chart* by taking music.js's own event list
   and re-implementing its eleven voices as plain DSP.

   How it stays honest: the events are not copied. music.js is loaded and
   `S.voices` is replaced with the versions below, so every note, every
   amplitude, every kick position and every riser still comes from the one
   arrangement function the player uses. Change the reel's music and the
   master follows it.

     node tools/score-wav.mjs                       → render-out/timberlane-layers.wav
     node tools/score-wav.mjs --out /tmp/x.wav --table
   ================================================================== */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf("--" + k);
  return i === -1 ? d : argv[i + 1];
};
const FLAG = (k) => argv.includes("--" + k);
const SR = parseInt(arg("rate", "48000"), 10);
const DUR = parseFloat(arg("dur", "30")); /* the film's runtime, not the chart's */
const OUT = path.resolve(ROOT, arg("out", "render-out/timberlane-layers.wav"));

/* ── load the score the way the browser does: classic script on a global ── */
const src = fs.readFileSync(path.join(ROOT, "src/layers/music.js"), "utf8");
vm.runInThisContext(src, { filename: "src/layers/music.js" });
const S = globalThis.TLM.music;
if (!S || !S.events.length) {
  console.error("music.js did not build its arrangement");
  process.exit(1);
}

/* ── buffers ───────────────────────────────────────────────────── */
const N = Math.round((DUR + 3) * SR);
const dryL = new Float32Array(N),
  dryR = new Float32Array(N);
const revL = new Float32Array(N),
  revR = new Float32Array(N);
const dlyL = new Float32Array(N),
  dlyR = new Float32Array(N);
const pump = new Float32Array(N).fill(1);
const KICKS = [];

/* the deterministic LCG from music.js — same noise, same character */
let seed = 20260108;
const rnd = () => (((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1);
const noiseCache = new Map();
function noise(chunks) {
  const key = chunks;
  if (!noiseCache.has(key)) {
    const a = new Float32Array(chunks * SR);
    for (let i = 0; i < a.length; i++) a[i] = rnd();
    noiseCache.set(key, a);
  }
  const buf = noiseCache.get(key);
  return buf;
}
const off = (secs) => Math.round(secs * SR);
const at = (secs) => Math.max(0, Math.min(N - 1, Math.round(secs * SR)));

/* ── tiny DSP kit ──────────────────────────────────────────────── */
/* RBJ biquad — one instance per voice, fresh state, no allocations per sample */
function biquad(type, f0, Q, gainDb) {
  const w0 = (2 * Math.PI * Math.min(f0, SR * 0.45)) / SR;
  const alpha = Math.sin(w0) / (Q || 0.7071);
  const cw = Math.cos(w0);
  let b0, b1, b2, a0, a1, a2;
  if (type === "lp") {
    b0 = b2 = (1 - cw) / 2;
    b1 = 1 - cw;
    a0 = 1 + alpha;
    a1 = -2 * cw;
    a2 = 1 - alpha;
  } else if (type === "hp") {
    b0 = b2 = (1 + cw) / 2;
    b1 = -(1 + cw);
    a0 = 1 + alpha;
    a1 = -2 * cw;
    a2 = 1 - alpha;
  } else if (type === "bp") {
    b0 = alpha;
    b1 = 0;
    b2 = -alpha;
    a0 = 1 + alpha;
    a1 = -2 * cw;
    a2 = 1 - alpha;
  } else if (type === "peak") {
    const A = Math.pow(10, (gainDb || 0) / 40);
    b0 = 1 + alpha * A;
    b1 = -2 * cw;
    b2 = 1 - alpha * A;
    a0 = 1 + alpha / A;
    a1 = -2 * cw;
    a2 = 1 - alpha / A;
  } else {
    /* highshelf */
    const A = Math.pow(10, (gainDb || 0) / 40);
    b0 = A * (A + 1 + (A - 1) * cw + 2 * Math.sqrt(A) * alpha);
    b1 = -2 * A * (A - 1 + (A + 1) * cw);
    b2 = A * (A + 1 + (A - 1) * cw - 2 * Math.sqrt(A) * alpha);
    a0 = A + 1 - (A - 1) * cw + 2 * Math.sqrt(A) * alpha;
    a1 = 2 * (A - 1 - (A + 1) * cw);
    a2 = A + 1 - (A - 1) * cw - 2 * Math.sqrt(A) * alpha;
  }
  b0 /= a0;
  b1 /= a0;
  b2 /= a0;
  a1 /= a0;
  a2 /= a0;
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  return (x) => {
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    return y;
  };
}
/* a filter whose cutoff moves: rebuild coefficients every BLOCK samples */
const VF_BLOCK = 64;
function varyingFilter(make, freqAt, Q) {
  let f = make(freqAt(0)),
    i = 0;
  return (x, n) => {
    if (i % VF_BLOCK === 0) f = make(freqAt(n), Q);
    i++;
    return f(x);
  };
}
/* envelope: keyframes of [seconds, value, "lin"|"exp"], evaluated by index */
function envelope(keys) {
  const pts = keys.map(([t, v, m]) => [off(t), Math.max(1e-5, v), m || "lin"]);
  let seg = 0;
  return (n) => {
    while (seg < pts.length - 2 && n >= pts[seg + 1][0]) seg++;
    const [t0, v0, m0] = pts[seg];
    const [t1, v1] = pts[seg + 1];
    const k = Math.max(0, Math.min(1, (n - t0) / Math.max(1, t1 - t0)));
    if (m0 === "exp") return v0 * Math.pow(v1 / v0, k);
    return v0 + (v1 - v0) * k;
  };
}
/* frequency glide, exponential, like AudioParam.exponentialRampToValueAtTime */
function glide(f0, f1, t0, t1) {
  const s0 = off(t0),
    s1 = Math.max(s0 + 1, off(t1));
  return (n) => (n <= s0 ? f0 : n >= s1 ? f1 : f0 * Math.pow(f1 / f0, (n - s0) / (s1 - s0)));
}
function osc(type) {
  let ph = 0;
  const saw = (p) => 2 * (p - Math.floor(p + 0.5));
  const tri = (p) => 4 * Math.abs(saw(p)) - 1;
  return (f, n) => {
    ph += f / SR;
    const p = ph - Math.floor(ph);
    if (type === "sine") return Math.sin(2 * Math.PI * p);
    if (type === "saw") return saw(p);
    if (type === "tri") return tri(p);
    return p < 0.5 ? 1 : -1;
  };
}
/* write one note: gen(n) → sample, optional per-channel pan and bus sends */
function voice(startSec, lenSec, gen, opts) {
  const o = opts || {};
  const s = at(startSec);
  const e = Math.min(N, s + off(lenSec) + 8);
  const pan = o.pan || 0;
  const gl = Math.sqrt(0.5 * (1 - pan)),
    gr = Math.sqrt(0.5 * (1 + pan));
  const rev = o.rev || 0,
    dly = o.dly || 0;
  for (let n = s; n < e; n++) {
    const x = gen(n - s, n);
    if (!Number.isFinite(x)) continue;
    dryL[n] += x * gl;
    dryR[n] += x * gr;
    if (rev) {
      revL[n] += x * rev * 0.7;
      revR[n] += x * rev * 0.3;
    }
    if (dly) {
      dlyL[n] += x * dly;
      dlyR[n] += x * dly * 0.72;
    }
  }
}

/* ── the eleven voices, ported from S.voices ───────────────────── */
const V = {
  pad(when, freqs, dur, amp) {
    const env = envelope([
      [0, 1e-4, "lin"],
      [0.5, amp, "lin"],
      [Math.max(0.6, dur - 0.9), amp, "exp"],
      [dur + 0.3, 1e-5],
    ]);
    const n = freqs.length;
    const parts = freqs.map((f, i) => ({
      o: osc(i % 2 ? "saw" : "tri"),
      f: f * Math.pow(2, ((i - 1.5) * 7) / 1200),
      pan: (i / Math.max(1, n - 1) - 0.5) * 1.2,
    }));
    parts.forEach((p) => {
      const filt = varyingFilter((f) => biquad("lp", f, 0.7), (k) => 780 + 360 * Math.sin(2 * Math.PI * 0.09 * (k / SR)));
      voice(
        when,
        dur + 0.5,
        (k) => filt(p.o(p.f, k)) * 0.16 * env(k) * 0.85,
        { pan: p.pan, rev: 0.65 },
      );
    });
  },
  sub(when, f, dur, amp) {
    const fg = glide(f * 1.02, f, 0, 0.09);
    const lp = biquad("lp", 190, 0.7071);
    const env = envelope([
      [0, 1e-4, "lin"],
      [0.03, amp, "lin"],
      [Math.max(0.05, dur - 0.25), amp, "exp"],
      [dur, 1e-5],
    ]);
    const o1 = osc("sine"),
      o2 = osc("tri");
    voice(when, dur + 0.1, (k, n) => lp(o1(fg(k), n) + 0.22 * o2(fg(k), n)) * env(k));
  },
  pluck(when, f, dur, amp, bright) {
    const env = envelope([
      [0, 1e-4, "lin"],
      [0.004, amp],
      [dur * 0.5, amp * 0.22, "exp"],
      [dur * 0.5 + dur * 0.6, 1e-5, "exp"],
    ]);
    const fg = varyingFilter(
      (fr) => biquad("lp", fr, 6),
      (k, n) => {
        const t = k / SR;
        const a = (bright || 2600) + f * 2,
          b = Math.max(240, f * 1.6);
        return t > dur * 0.9 ? b : a * Math.pow(b / a, t / (dur * 0.9));
      },
    );
    const o1 = osc("saw"),
      o2 = osc("square");
    voice(when, dur * 1.4 + 0.15, (k, n) => fg(o1(f, n) + 0.1 * o2(f * 2.002, n)) * env(k), { dly: 0.34 });
  },
  bass(when, f, dur, amp) {
    const env = envelope([
      [0, 1e-4, "lin"],
      [0.008, amp],
      [dur * 0.55, amp * 0.5, "exp"],
      [dur * 0.55 + dur * 0.5, 1e-5, "exp"],
    ]);
    const fg = varyingFilter((fr) => biquad("lp", fr, 4), (k) => {
      const t = k / SR;
      return t < dur * 0.35 ? 160 + ((560 - 160) * t) / (dur * 0.35) : Math.max(200, 560 - (360 * (t - dur * 0.35)) / (dur * 0.65));
    });
    const o1 = osc("saw"),
      o2 = osc("sine");
    voice(when, dur + 0.05, (k, n) => fg(o1(f, n) + 0.5 * o2(f / 2, n)) * env(k));
  },
  kick(when, amp, soft) {
    const f0 = soft ? 120 : 165,
      f1 = soft ? 40 : 46,
      len = soft ? 0.3 : 0.24;
    const fg = glide(f0, f1, 0, 0.11);
    const env = envelope([
      [0, 1e-4, "lin"],
      [0.004, amp, "lin"],
      [len, 1e-5, "exp"],
    ]);
    const o = osc("sine");
    voice(when, len + 0.1, (k, n) => o(fg(k), n) * env(k));
    const nz = noise(1),
      n0 = Math.floor(Math.abs(rnd()) * 0.5 * SR),
      hp = biquad("hp", 1400, 0.7071);
    const ce = envelope([
      [0, amp * 0.32, "lin"],
      [0.03, 1e-5, "exp"],
    ]);
    voice(when, 0.06, (k) => hp(nz[(n0 + k) % nz.length]) * ce(k));
    KICKS.push(when);
  },
  clap(when, amp) {
    for (let i = 0; i < 3; i++) {
      const nz = noise(1),
        n0 = Math.floor(Math.abs(rnd()) * 0.6 * SR);
      const bp = biquad("bp", 1500 + i * 380, 1.1);
      const len = 0.13 - i * 0.02;
      const env = envelope([
        [0, 1e-4, "lin"],
        [0.002, amp * (1 - i * 0.22), "lin"],
        [len, 1e-5, "exp"],
      ]);
      voice(when + i * 0.011, len + 0.07, (k) => bp(nz[(n0 + k) % nz.length]) * env(k), { rev: 0.3, pan: i === 1 ? 0.18 : -0.12 });
    }
  },
  hat(when, amp, open) {
    const len = open ? 0.2 : 0.045;
    const nz = noise(1),
      n0 = Math.floor(Math.abs(rnd()) * 0.7 * SR);
    const hp = biquad("hp", 7200, 0.7071),
      bp = biquad("bp", 10500, 0.6);
    const env = envelope([
      [0, 1e-4, "lin"],
      [0.002, amp, "lin"],
      [len, 1e-5, "exp"],
    ]);
    voice(when, len + 0.05, (k) => bp(hp(nz[(n0 + k) % nz.length])) * env(k), { pan: 0.25 });
  },
  rim(when, amp) {
    const bp = biquad("bp", 2000, 3.5);
    const o = osc("square");
    const env = envelope([
      [0, amp, "lin"],
      [0.05, 1e-5, "exp"],
    ]);
    voice(when, 0.08, (k, n) => bp(o(430, n)) * env(k), { pan: -0.3 });
  },
  riser(when, dur, amp) {
    const nz = noise(2);
    const base = Math.floor(Math.abs(rnd()) * 0.05 * SR);
    const fg = varyingFilter((fr) => biquad("bp", fr, 1.4), (k) => {
      const t = k / SR;
      return t > dur ? 7800 : 320 * Math.pow(7800 / 320, Math.max(0, t) / dur);
    });
    const env = envelope([
      [0, 1e-4, "exp"],
      [dur * 0.92, amp, "exp"],
      [dur + 0.06, 1e-5, "exp"],
    ]);
    voice(when, dur + 0.4, (k) => fg(nz[(base + k) % nz.length]) * env(k), { rev: 0.5 });
  },
  impact(when, amp) {
    V.kick(when, amp * 1.1, false);
    const nz = noise(2),
      n0 = Math.floor(Math.abs(rnd()) * 0.4 * SR);
    const hp = biquad("hp", 3600, 0.7071);
    const env = envelope([
      [0, 1e-4, "lin"],
      [0.005, amp * 0.3, "lin"],
      [1.15, 1e-5, "exp"],
    ]);
    voice(when, 1.3, (k) => hp(nz[(n0 + k) % nz.length]) * env(k), { rev: 0.7 });
    const o = osc("sine");
    const fg = glide(70, 38, 0, 0.6);
    const e2 = envelope([
      [0, amp * 0.5, "lin"],
      [0.75, 1e-5, "exp"],
    ]);
    voice(when, 0.8, (k, n) => o(fg(k), n) * e2(k));
  },
  swell(when, dur, amp) {
    const nz = noise(2),
      base = Math.floor(Math.abs(rnd()) * 0.5 * SR);
    const bp = biquad("bp", 2400, 0.5);
    const env = envelope([
      [0, 1e-4, "lin"],
      [dur * 0.7, amp, "lin"],
      [dur, 1e-5, "exp"],
    ]);
    voice(when, dur + 0.4, (k) => bp(nz[(base + k) % nz.length]) * env(k), { rev: 0.6 });
  },
};

/* ── the mix ───────────────────────────────────────────────────────
   The arrangement comes from music.js; these are the fader positions on
   the way out. The chart writes amplitudes for a WebAudio bus where the
   pad and the pluck run through a real convolver and a bright shelf, so an
   honest offline bounce needs a touch more midrange and a lot less mud. */
const MIX = { kick: 1, sub: 0.62, bass: 0.86, pad: 1.55, pluck: 1.8, clap: 1.4, hat: 1.7, rim: 1.35, riser: 1.25, impact: 0.92, swell: 1.35 };
Object.keys(V).forEach((k) => {
  const fn = V[k],
    g = MIX[k] === undefined ? 1 : MIX[k];
  V[k] = function () {
    const args = Array.prototype.slice.call(arguments);
    args[args.length - 1] = args[args.length - 1] * g; /* amp is always last */
    return fn.apply(null, args);
  };
});

/* the one hook the arrangement uses that we cannot honour: sidechain dip */
S.pump = { gain: { setValueAtTime() {}, cancelScheduledValues() {} } };
S.dry = { connect() {}, disconnect() {} };
S.revIn = { connect() {}, disconnect() {} };
S.dlyIn = { connect() {}, disconnect() {} };
S.noise = null;
S.init = () => null;
Object.keys(V).forEach((k) => {
  if (S.voices[k]) S.voices[k] = V[k];
});

/* ── play the chart into the buffers ───────────────────────────── */
S.events.forEach((e) => {
  if (e.t > DUR + 2.4) return;
  try {
    e.run(e.t);
  } catch (err) {
    console.error("event at " + e.t + " failed: " + err.message);
  }
});
/* pump curve: each kick ducks the beds by 58 % and recovers over 300 ms */
KICKS.forEach((k) => {
  const s = at(k),
    n = off(0.32);
  for (let i = 0; i < n && s + i < N; i++) {
    const t = i / SR;
    const g = t < 0.028 ? 1 - 0.58 * (t / 0.028) : t < 0.14 ? 0.42 + 0.48 * ((t - 0.028) / 0.112) : 0.9 + 0.1 * ((t - 0.14) / 0.18);
    const idx = s + i;
    const w = Math.min(1, Math.max(0, g));
    pump[idx] = Math.min(pump[idx], w);
  }
});

/* ── delay + reverb sends, then the master chain ───────────────── */
/* one feedback comb with damping, ping-ponged between the ears */
function feedbackDelay(L, R, time, fb, damp) {
  const d = off(time);
  const oL = new Float32Array(N),
    oR = new Float32Array(N);
  const bL = new Float32Array(N),
    bR = new Float32Array(N);
  let pL = 0,
    pR = 0;
  for (let i = 0; i < N; i++) {
    const xL = L[i] + (i >= d ? bL[i - d] * fb : 0);
    const xR = R[i] + (i >= d ? bR[i - d] * fb * 0.9 : 0);
    pL = xL * damp + pL * (1 - damp);
    pR = xR * damp + pR * (1 - damp);
    bL[i] = pL;
    bR[i] = pR;
    oL[i] = i >= d ? bR[i - d] * 0.9 : 0;
    oR[i] = i >= d ? bL[i - d] : 0;
  }
  return [oL, oR];
}
/* Schroeder plate: four damped combs into two allpasses */
function schroeder(input, predelay, mix) {
  const out = new Float32Array(N);
  const pd = off(predelay);
  const combs = [
    [1557, 0.81],
    [1617, 0.8],
    [1491, 0.83],
    [1422, 0.79],
  ].map(([d, g]) => ({ d, g, buf: new Float32Array(d), i: 0, lp: 0 }));
  const ap = [
    [225, 0.5],
    [556, 0.5],
  ].map(([d, g]) => ({ d, g, buf: new Float32Array(d), i: 0 }));
  for (let n = 0; n < N; n++) {
    let s = n > pd ? input[n - pd] : 0;
    let sum = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.lp = y * 0.84 + c.lp * 0.16; /* a plate, not a cave */
      c.buf[c.i] = s + c.lp * c.g;
      c.i = (c.i + 1) % c.d;
      sum += y;
    }
    sum /= combs.length;
    for (const a of ap) {
      const prev = a.buf[a.i];
      const v = sum + a.g * prev;
      sum = -a.g * v + prev;
      a.buf[a.i] = v;
      a.i = (a.i + 1) % a.d;
    }
    out[n] = sum * mix;
  }
  return out;
}
const [dl, dr] = feedbackDelay(dlyL, dlyR, 0.375, 0.36, 0.72);
const rl = schroeder(revL, 0.018, 0.85);
const rr = schroeder(revR, 0.027, 0.85);

const tone = biquad("shelf", 5200, 0.7071, 1.8);
const tone2 = biquad("shelf", 5200, 0.7071, 1.8);
const mud = biquad("peak", 128, 1.1, -3.2); /* take the box out of the low mids */
const mud2 = biquad("peak", 128, 1.1, -3.2);
const pres = biquad("peak", 1650, 0.9, 4.6); /* and let the hook through */
const pres2 = biquad("peak", 1650, 0.9, 4.6);
const mixL = new Float32Array(N),
  mixR = new Float32Array(N);
/* buses → tone → sidechain dip. Kept *linear* here on purpose: the balance
   between the intro and the drop has to come from the arrangement, not from
   a limiter eating it, so the level move happens once, after, as a gain. */
let pre = 0;
for (let n = 0; n < N; n++) {
  const p = pump[n];
  let l = pres(mud(dryL[n] + dl[n] * 0.85 + rl[n] * 1.1) * p);
  let r = pres2(mud2(dryR[n] + dr[n] * 0.85 + rr[n] * 1.1) * p);
  mixL[n] = l;
  mixR[n] = r;
  pre = Math.max(pre, Math.abs(l), Math.abs(r));
}
const mg = 0.62 / (pre || 1); /* headroom: the loudest hit lands mid-scale */
for (let n = 0; n < N; n++) {
  let l = mixL[n] * mg * 0.85;
  let r = mixR[n] * mg * 0.85;
  /* and only then the 2-bus: -13 dB / 3.1:1, softened into a tanh knee */
  const thr = 0.68;
  if (l > thr) l = thr + (l - thr) / (1 + 2.1 * (l - thr));
  else if (l < -thr) l = -thr + (l + thr) / (1 - 2.1 * (l + thr));
  if (r > thr) r = thr + (r - thr) / (1 + 2.1 * (r - thr));
  else if (r < -thr) r = -thr + (r + thr) / (1 - 2.1 * (r + thr));
  mixL[n] = l;
  mixR[n] = r;
}
/* fades: 20 ms in, and a tail that lands with the CTA rather than on it */
const FI = off(0.02), /* fade in/out, in samples */
  FS = at(DUR - 0.9),
  FE = at(DUR);
for (let n = 0; n < N; n++) {
  let g = 1;
  if (n < FI) g = n / FI;
  if (n > FS) g = Math.max(0, 1 - (n - FS) / Math.max(1, FE - FS));
  if (n > FE) g = 0;
  mixL[n] *= g;
  mixR[n] *= g;
}
let peak = 0;
for (let n = 0; n < N; n++) peak = Math.max(peak, Math.abs(mixL[n]), Math.abs(mixR[n]));
const norm = peak > 0 ? 0.985 / peak : 1;
for (let n = 0; n < N; n++) {
  mixL[n] *= norm;
  mixR[n] *= norm;
}
const total = at(DUR);
const data = Buffer.alloc(total * 2 * 2);
for (let n = 0; n < total; n++) {
  data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(mixL[n] * 32767))), n * 4);
  data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(mixR[n] * 32767))), n * 4 + 2);
}
const head = Buffer.alloc(44);
head.write("RIFF", 0);
head.writeUInt32LE(36 + data.length, 4);
head.write("WAVEfmt ", 8);
head.writeUInt32LE(16, 16);
head.writeUInt16LE(1, 20);
head.writeUInt16LE(2, 22);
head.writeUInt32LE(SR, 24);
head.writeUInt32LE(SR * 4, 28);
head.writeUInt16LE(4, 32);
head.writeUInt16LE(16, 34);
head.write("data", 36);
head.writeUInt32LE(data.length, 40);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, Buffer.concat([head, data]));

const rms = (a, b) => {
  let s = 0,
    c = 0;
  for (let n = a; n < b && n < total; n++) {
    s += mixL[n] * mixL[n] + mixR[n] * mixR[n];
    c += 2;
  }
  return 20 * Math.log10(Math.sqrt(s / Math.max(1, c)) || 1e-9);
};
if (FLAG("table")) {
  console.log("\nlevel over time (dBFS RMS)");
  for (let s = 0; s < DUR; s += 2) {
    const db = rms(at(s), at(s + 2));
    console.log(
      "  " +
        String(s).padStart(2, "0") +
        "–" +
        String(s + 2).padStart(2, "0") +
        "s  " +
        db.toFixed(1).padStart(6) +
        "  " +
        "▇".repeat(Math.max(0, Math.round((db + 45) / 1.4))),
    );
  }
}
console.log(
  "\n" +
    path.relative(ROOT, OUT) +
    " · " +
    (data.length / 1e6).toFixed(1) +
    " MB · " +
    (total / SR).toFixed(2) +
    "s · " +
    S.events.length +
    " events · peak " +
    (20 * Math.log10(peak * norm)).toFixed(1) +
    " dBFS · " +
    (rms(0, total)).toFixed(1) +
    " dBFS avg",
);
