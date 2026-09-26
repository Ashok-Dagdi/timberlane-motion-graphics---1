/* ===================================================================
   audio3.ts — "POP / 96" funk-pop score.
   C major, 96 BPM, 6 bars = 15.000 s exactly — one bar per pop card.
   Punchy drums, funk bass, Rhodes offbeat chops, portamento lead,
   vinyl crackle bed. Scheduled against the picture clock (scrub-safe).
   =================================================================== */

const BPM = 96;
const BEAT = 60 / BPM; // 0.625
const BAR = BEAT * 4; // 2.5

const N: Record<string, number> = {
  G1: 49, A1: 55, B1: 61.74,
  C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98, A2: 110, B2: 123.47,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196, A3: 220, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.26, G5: 783.99, A5: 880, C6: 1046.5,
};

type Ch = { root: number; fifth: number; oct: number; third: number; ep: number[] };
const CH: Record<string, Ch> = {
  C:  { root: N.C2, fifth: N.G2, oct: N.C3, third: N.E2, ep: [N.C4, N.E4, N.G4] },
  G:  { root: N.G2, fifth: N.D3, oct: N.G3, third: N.B2, ep: [N.B3, N.D4, N.G4] },
  Am: { root: N.A2, fifth: N.E3, oct: N.A3, third: N.C3, ep: [N.A3, N.C4, N.E4] },
  F:  { root: N.F2, fifth: N.C3, oct: N.F3, third: N.A2, ep: [N.F3, N.A3, N.C4] },
};

/** I – V – vi – IV – V – I */
const PROG = ["C", "G", "Am", "F", "G", "C"] as const;
/** walk-up note at the end of each bar, into the next root */
const WALK = [N.D3, N.E3, N.C3, N.D3, N.B2, N.G2];

/** deterministic 0..1 */
const srand = (seed: number) => {
  let x = (seed * 2654435761) >>> 0;
  x ^= x >> 15; x = (x * 2246822519) >>> 0;
  x ^= x >> 13;
  return (x >>> 0) / 4294967296;
};

export class Score {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private lim!: DynamicsCompressorNode;
  private revIn!: GainNode;
  private dlyIn!: GainNode;
  private noise!: AudioBuffer;
  private active: AudioScheduledSourceNode[] = [];
  analyser!: AnalyserNode;
  private cursor = 0;
  private events: { t: number; run: (w: number) => void }[] = [];
  private timer: number | null = null;
  private anchorCtx = 0;
  private anchorComp = 0;
  private rate = 1;
  running = false;
  private _muted = false;
  private _vol = 0.9;

  private init() {
    if (this.ctx) return;
    const AC: typeof AudioContext =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    this.ctx = ctx;

    this.lim = ctx.createDynamicsCompressor();
    this.lim.threshold.value = -9;
    this.lim.knee.value = 8;
    this.lim.ratio.value = 10;
    this.lim.attack.value = 0.003;
    this.lim.release.value = 0.16;
    this.master = ctx.createGain();
    this.master.gain.value = this._muted ? 0 : this._vol;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.7;
    this.master.connect(this.lim);
    this.lim.connect(this.analyser);
    this.lim.connect(ctx.destination);

    // short room reverb (pop, not hall)
    const conv = ctx.createConvolver();
    conv.buffer = this.makeIR(1.5, 2.7);
    const revWet = ctx.createGain();
    revWet.gain.value = 0.55;
    this.revIn = ctx.createGain();
    this.revIn.gain.value = 1;
    const revHP = ctx.createBiquadFilter();
    revHP.type = "highpass";
    revHP.frequency.value = 300;
    this.revIn.connect(revHP);
    revHP.connect(conv);
    conv.connect(revWet);
    revWet.connect(this.master);

    // slapback delay
    const dly = ctx.createDelay(1);
    dly.delayTime.value = BEAT * 0.5;
    const fb = ctx.createGain();
    fb.gain.value = 0.24;
    const dlyLP = ctx.createBiquadFilter();
    dlyLP.type = "lowpass";
    dlyLP.frequency.value = 3200;
    this.dlyIn = ctx.createGain();
    this.dlyIn.connect(dly);
    dly.connect(dlyLP);
    dlyLP.connect(fb);
    fb.connect(dly);
    const dlyWet = ctx.createGain();
    dlyWet.gain.value = 0.2;
    dlyLP.connect(dlyWet);
    dlyWet.connect(this.master);

    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    this.noise = buf;

    this.events = this.arrange();
  }

  private makeIR(dur: number, decay: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        const x = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - x, decay) * (1 - Math.exp(-i / 500));
      }
    }
    return buf;
  }

  private track<T extends AudioScheduledSourceNode>(n: T, stopAt: number) {
    this.active.push(n);
    n.onended = () => {
      const i = this.active.indexOf(n);
      if (i >= 0) this.active.splice(i, 1);
    };
    try {
      n.stop(stopAt);
    } catch {
      /* noop */
    }
    return n;
  }

  private nz() {
    const s = this.ctx!.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    return s;
  }

  private env(g: GainNode, t: number, a: number, d: number, peak: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  /* ---------------- drums ---------------- */

  private kick(t: number, vel = 1) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(165, t);
    o.frequency.exponentialRampToValueAtTime(52, t + 0.06);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.24);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(1.0 * vel, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    this.track(o, t + 0.42);

    const n = this.nz();
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2200;
    const ng = ctx.createGain();
    this.env(ng, t, 0.001, 0.018, 0.2 * vel);
    n.connect(hp);
    hp.connect(ng);
    ng.connect(this.master);
    n.start(t);
    this.track(n, t + 0.07);
  }

  private snare(t: number, vel = 1) {
    const ctx = this.ctx!;
    // body
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(196, t);
    o.frequency.exponentialRampToValueAtTime(118, t + 0.09);
    const g = ctx.createGain();
    this.env(g, t, 0.001, 0.11, 0.5 * vel);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    this.track(o, t + 0.18);
    // snap
    const n = this.nz();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1900;
    bp.Q.value = 1;
    const ng = ctx.createGain();
    this.env(ng, t, 0.001, 0.085, 0.34 * vel);
    n.connect(bp);
    bp.connect(ng);
    ng.connect(this.master);
    const rs = ctx.createGain();
    rs.gain.value = 0.3;
    ng.connect(rs);
    rs.connect(this.revIn);
    n.start(t);
    this.track(n, t + 0.15);
  }

  private clap(t: number, vel = 1) {
    const ctx = this.ctx!;
    const mk = (off: number, dec: number, amp: number, f: number) => {
      const n = this.nz();
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = f;
      bp.Q.value = 1.2;
      const g = ctx.createGain();
      this.env(g, t + off, 0.001, dec, amp * vel);
      n.connect(bp);
      bp.connect(g);
      g.connect(this.master);
      const rs = ctx.createGain();
      rs.gain.value = 0.4;
      g.connect(rs);
      rs.connect(this.revIn);
      n.start(t + off);
      this.track(n, t + off + dec + 0.05);
    };
    mk(0, 0.018, 0.42, 1900);
    mk(0.009, 0.018, 0.38, 2400);
    mk(0.02, 0.026, 0.34, 1700);
    mk(0.03, 0.15, 0.3, 1400);
  }

  private hat(t: number, open = false, vel = 1) {
    const ctx = this.ctx!;
    const n = this.nz();
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = open ? 6200 : 8400;
    const g = ctx.createGain();
    this.env(g, t, 0.001, open ? 0.14 : 0.03, (open ? 0.1 : 0.115) * vel);
    n.connect(hp);
    hp.connect(g);
    g.connect(this.master);
    n.start(t);
    this.track(n, t + (open ? 0.22 : 0.08));
  }

  private shaker(t: number, vel = 1) {
    const ctx = this.ctx!;
    const n = this.nz();
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7200;
    const g = ctx.createGain();
    this.env(g, t, 0.001, 0.034, 0.085 * vel);
    n.connect(hp);
    hp.connect(g);
    g.connect(this.master);
    n.start(t);
    this.track(n, t + 0.08);
  }

  private crash(t: number, vel = 1) {
    const ctx = this.ctx!;
    const n = this.nz();
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 4800;
    const g = ctx.createGain();
    this.env(g, t, 0.002, 1.1, 0.26 * vel);
    n.connect(hp);
    hp.connect(g);
    g.connect(this.master);
    const rs = ctx.createGain();
    rs.gain.value = 0.55;
    g.connect(rs);
    rs.connect(this.revIn);
    n.start(t);
    this.track(n, t + 1.3);
  }

  /* ---------------- bass / keys / lead ---------------- */

  /** funk bass: saw + sub square through a snapping lowpass */
  private bass(t: number, f: number, dur: number, vel = 1) {
    const ctx = this.ctx!;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 8;
    lp.frequency.setValueAtTime(2500, t);
    lp.frequency.exponentialRampToValueAtTime(320, t + Math.min(dur, 0.2));
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.48 * vel, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const o1 = ctx.createOscillator();
    o1.type = "sawtooth";
    o1.frequency.value = f;
    const o2 = ctx.createOscillator();
    o2.type = "square";
    o2.frequency.value = f / 2;
    const g2 = ctx.createGain();
    g2.gain.value = 0.45;
    o1.connect(lp);
    o2.connect(g2);
    g2.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    o1.start(t);
    o2.start(t);
    this.track(o1, t + dur + 0.08);
    this.track(o2, t + dur + 0.08);
  }

  /** Rhodes-ish chord: bell partials + tremolo */
  private ep(t: number, freqs: number[], vel = 1, dur = 0.34) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.value = 1;
    const trem = ctx.createOscillator();
    trem.type = "sine";
    trem.frequency.value = 4.6;
    const tg = ctx.createGain();
    tg.gain.value = 0.16;
    trem.connect(tg);
    tg.connect(g.gain);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(0.15 * vel, t + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.55);
    env.connect(g);
    g.connect(this.master);
    const ds = ctx.createGain();
    ds.gain.value = 0.22;
    g.connect(ds);
    ds.connect(this.dlyIn);
    const rs = ctx.createGain();
    rs.gain.value = 0.5;
    g.connect(rs);
    rs.connect(this.revIn);
    freqs.forEach((f) => {
      for (const [mult, amp, type] of [
        [1, 0.5, "sine"],
        [2, 0.15, "sine"],
        [3.98, 0.05, "triangle"],
      ] as const) {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = f * mult;
        const og = ctx.createGain();
        og.gain.value = amp;
        o.connect(og);
        og.connect(env);
        o.start(t);
        this.track(o, t + dur + 0.8);
      }
    });
    trem.start(t);
    this.track(trem, t + dur + 0.9);
  }

  /** bright square lead with portamento slide + vibrato */
  private lead(t: number, f: number, dur: number, prev: number, vel = 1) {
    const ctx = this.ctx!;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 2;
    lp.frequency.value = 2700;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.13 * vel, t + 0.012);
    g.gain.setValueAtTime(0.11 * vel, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.16);
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.setValueAtTime(Math.max(30, prev), t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.055);
    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.value = f / 2;
    const sg = ctx.createGain();
    sg.gain.value = 0.35;
    const vib = ctx.createOscillator();
    vib.type = "sine";
    vib.frequency.value = 6.1;
    const vg = ctx.createGain();
    vg.gain.setValueAtTime(0, t);
    vg.gain.linearRampToValueAtTime(f * 0.005, t + 0.16);
    vib.connect(vg);
    vg.connect(o.frequency);
    o.connect(lp);
    sub.connect(sg);
    sg.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    const ds = ctx.createGain();
    ds.gain.value = 0.3;
    g.connect(ds);
    ds.connect(this.dlyIn);
    const rs = ctx.createGain();
    rs.gain.value = 0.35;
    g.connect(rs);
    rs.connect(this.revIn);
    o.start(t);
    sub.start(t);
    vib.start(t);
    this.track(o, t + dur + 0.3);
    this.track(sub, t + dur + 0.3);
    this.track(vib, t + dur + 0.3);
  }

  /* ---------------- beds & accents ---------------- */

  /** vinyl crackle + hiss bed */
  private vinyl(t: number, dur: number) {
    const ctx = this.ctx!;
    const n = this.nz();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 4200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.011, t + 0.8);
    g.gain.setValueAtTime(0.011, t + dur - 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    n.start(t);
    this.track(n, t + dur + 0.1);
    // deterministic pops
    const count = Math.floor(dur * 9);
    for (let i = 0; i < count; i++) {
      const pt = t + (i + srand(i * 7 + 1)) / 9;
      if (pt >= t + dur) break;
      const pn = this.nz();
      const php = ctx.createBiquadFilter();
      php.type = "highpass";
      php.frequency.value = 2800 + srand(i * 13 + 5) * 3000;
      const pg = ctx.createGain();
      const amp = 0.015 + srand(i * 29 + 3) * 0.05;
      this.env(pg, pt, 0.001, 0.006 + srand(i * 17 + 9) * 0.014, amp);
      pn.connect(php);
      php.connect(pg);
      pg.connect(this.master);
      pn.start(pt);
      this.track(pn, pt + 0.06);
    }
  }

  private riser(t: number, dur: number, vel = 1) {
    const ctx = this.ctx!;
    const n = this.nz();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 2.2;
    bp.frequency.setValueAtTime(400, t);
    bp.frequency.exponentialRampToValueAtTime(9500, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.28 * vel, t + dur * 0.95);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
    n.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    n.start(t);
    this.track(n, t + dur + 0.2);
  }

  /** boom + crash hit for bar accents */
  private impact(t: number, vel = 1) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 0.8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.85 * vel, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    this.track(o, t + 1.3);
    this.crash(t, 0.55 * vel);
  }

  private shimmer(t: number, dur: number, vel = 1) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.05 * vel, t + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const rs = ctx.createGain();
    rs.gain.value = 1.1;
    g.connect(rs);
    rs.connect(this.revIn);
    [N.C6, N.E5, N.G5].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.value = 0.55 / (i + 1);
      o.connect(og);
      og.connect(g);
      o.start(t);
      this.track(o, t + dur + 0.2);
    });
  }

  /* ---------------- arrangement ---------------- */
  private arrange() {
    const ev: { t: number; run: (w: number) => void }[] = [];
    const at = (t: number, run: (w: number) => void) => ev.push({ t, run });

    at(0, (w) => this.vinyl(w, 15));

    // groove: bars 0–4
    for (let b = 0; b <= 4; b++) {
      const t0 = b * BAR;
      const c = CH[PROG[b]];
      const walk = WALK[b];

      at(t0, (w) => this.kick(w, 1));
      at(t0 + 1.25, (w) => this.kick(w, 0.95));
      if (b >= 2) at(t0 + 1.875, (w) => this.kick(w, 0.85));

      at(t0 + 0.625, (w) => this.snare(w, 0.9));
      at(t0 + 1.875, (w) => this.snare(w, 0.95));
      if (b >= 1) {
        at(t0 + 0.625, (w) => this.clap(w, 0.7));
        at(t0 + 1.875, (w) => this.clap(w, 0.75));
      }

      for (let k = 0; k < 8; k++) {
        const tt = t0 + k * 0.3125;
        const open = b >= 2 && k % 2 === 1;
        at(tt, (w) => this.hat(w, open, k % 2 === 0 ? 0.9 : 0.6));
      }
      if (b >= 2) {
        for (let k = 0; k < 16; k++) {
          const tt = t0 + k * 0.15625;
          at(tt, (w) => this.shaker(w, k % 4 === 0 ? 1 : 0.55));
        }
      }

      // funk bass line
      const line: [number, number, number, number][] = [
        [0, c.root, 0.3, 1],
        [0.3125, c.root, 0.12, 0.65],
        [0.625, c.fifth, 0.14, 0.85],
        [0.9375, c.oct, 0.12, 0.8],
        [1.25, c.root, 0.3, 1],
        [1.5625, c.third, 0.12, 0.7],
        [1.875, c.fifth, 0.14, 0.85],
        [2.1875, walk, 0.2, 0.9],
      ];
      line.forEach(([o, f, d, v]) => at(t0 + o, (w) => this.bass(w, f, d, v)));

      // Rhodes offbeat chops + downbeat chord on select bars
      [0.3125, 0.9375, 1.5625, 2.1875].forEach((o) =>
        at(t0 + o, (w) => this.ep(w, c.ep, 0.75, 0.3))
      );
      if (b === 0 || b === 1 || b === 4) at(t0, (w) => this.ep(w, c.ep, 0.7, 2.1));
    }

    // lead hook — bars 1–4 (G Am F G), pentatonic call
    type LN = [number, number, number, number];
    const hook: LN[] = [
      [2.8125, N.E5, 0.18, 0.8], [3.125, N.G5, 0.18, 0.85], [3.4375, N.A5, 0.25, 0.9],
      [3.75, N.G5, 0.18, 0.8], [4.0625, N.E5, 0.3, 0.85],
      [5.3125, N.D5, 0.18, 0.8], [5.625, N.E5, 0.18, 0.85], [5.9375, N.G5, 0.25, 0.9],
      [6.25, N.E5, 0.18, 0.8], [6.5625, N.D5, 0.3, 0.85],
      [7.8125, N.C5, 0.18, 0.8], [8.125, N.D5, 0.18, 0.85], [8.4375, N.E5, 0.35, 0.9],
      [9.0625, N.D5, 0.18, 0.8], [9.375, N.C5, 0.3, 0.85],
      [10.3125, N.E5, 0.18, 0.85], [10.625, N.G5, 0.18, 0.9],
      [10.9375, N.A5, 0.25, 0.95], [11.25, N.C6, 0.55, 1],
    ];
    const lastByBar = new Map<number, number>();
    hook.forEach(([tt, f, d, v]) => {
      const bar = Math.floor(tt / BAR);
      const prev = lastByBar.get(bar) ?? f;
      lastByBar.set(bar, f);
      at(tt, (w) => this.lead(w, f, d, prev, v));
    });

    // final bar (12.5–15): break groove, then the big hit at 14.375
    const c5 = CH.C;
    at(12.5, (w) => this.kick(w, 1));
    at(13.125, (w) => this.snare(w, 0.95));
    at(13.125, (w) => this.clap(w, 0.8));
    at(13.75, (w) => this.kick(w, 0.95));
    at(13.75, (w) => this.ep(w, c5.ep, 1.05, 0.5));
    at(12.5, (w) => this.bass(w, c5.root, 0.62, 1));
    at(13.75, (w) => this.bass(w, c5.fifth, 0.34, 0.9));
    for (let k = 0; k <= 4; k++) at(12.5 + k * 0.3125, (w) => this.hat(w, false, 0.85));
    for (let k = 0; k < 12; k++) at(12.5 + k * 0.15625, (w) => this.shaker(w, k % 4 === 0 ? 1 : 0.5));
    at(12.8125, (w) => this.ep(w, c5.ep, 0.8, 0.3));
    at(13.4375, (w) => this.ep(w, c5.ep, 0.8, 0.3));

    at(14.375, (w) => this.impact(w, 0.95));
    at(14.375, (w) => this.kick(w, 1.05));
    at(14.375, (w) => this.snare(w, 1));
    at(14.375, (w) => this.ep(w, [...c5.ep, N.C5], 1.2, 1.6));
    at(14.375, (w) => this.lead(w, N.C6, 1.3, N.G5, 1));
    at(14.375, (w) => this.shimmer(w, 2.8, 1));

    // bar accents
    at(2.5, (w) => this.impact(w, 0.26));
    at(3.75, (w) => this.riser(w, 1.25, 0.65));
    at(5.0, (w) => this.impact(w, 0.4));
    at(7.5, (w) => this.impact(w, 0.26));
    at(8.6, (w) => this.riser(w, 1.4, 0.95));
    at(10.0, (w) => this.impact(w, 0.95));
    at(12.1, (w) => this.riser(w, 0.4, 0.5));
    at(12.5, (w) => this.impact(w, 0.5));

    return ev.sort((a, b) => a.t - b.t);
  }

  /* ---------------- transport ---------------- */
  async start(compTime: number, rate = 1) {
    this.init();
    const ctx = this.ctx!;
    if (ctx.state === "suspended") await ctx.resume();
    this.rate = rate;
    this.anchorCtx = ctx.currentTime + 0.08;
    this.anchorComp = compTime;
    this.cursor = this.findIdx(compTime);
    this.running = true;
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setTargetAtTime(this._muted ? 0 : this._vol, ctx.currentTime, 0.02);
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = window.setInterval(() => this.tick(), 25);
    this.tick();
  }

  private findIdx(t: number) {
    let lo = 0;
    let hi = this.events.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.events[mid].t < t - 0.0005) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  private tick() {
    if (!this.running || !this.ctx) return;
    const horizon = this.ctx.currentTime + 0.22;
    while (this.cursor < this.events.length) {
      const e = this.events[this.cursor];
      const when = this.anchorCtx + (e.t - this.anchorComp) / this.rate;
      if (when > horizon) break;
      if (when >= this.ctx.currentTime - 0.02) {
        try {
          e.run(Math.max(when, this.ctx.currentTime + 0.001));
        } catch {
          /* voice failed, keep going */
        }
      }
      this.cursor++;
    }
  }

  resync(compTime: number, rate = 1) {
    if (!this.ctx || !this.running) return;
    this.rate = rate;
    this.anchorCtx = this.ctx.currentTime + 0.05;
    this.anchorComp = compTime;
    this.cursor = this.findIdx(compTime);
  }

  stop() {
    this.running = false;
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(0.0001, now, 0.015);
    const kill = [...this.active];
    this.active.length = 0;
    window.setTimeout(() => {
      kill.forEach((n) => {
        try {
          n.stop();
        } catch {
          /* already stopped */
        }
        try {
          n.disconnect();
        } catch {
          /* noop */
        }
      });
    }, 80);
  }

  setMuted(m: boolean) {
    this._muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0.0001 : this._vol, this.ctx.currentTime, 0.02);
  }

  setVolume(v: number) {
    this._vol = v;
    if (this.ctx && !this._muted) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }

  spectrum(out: number[]) {
    if (!this.analyser) {
      for (let i = 0; i < out.length; i++) out[i] *= 0.9;
      return out;
    }
    const n = this.analyser.frequencyBinCount;
    const data = new Uint8Array(n);
    this.analyser.getByteFrequencyData(data);
    const bands = out.length;
    for (let i = 0; i < bands; i++) {
      const a = Math.floor(Math.pow(i / bands, 1.9) * n);
      const b = Math.max(a + 1, Math.floor(Math.pow((i + 1) / bands, 1.9) * n));
      let m = 0;
      for (let j = a; j < b && j < n; j++) m = Math.max(m, data[j]);
      out[i] = Math.max(out[i] * 0.82, (m / 255) * (0.55 + 0.7 * (i / bands)));
    }
    return out;
  }
}

export const score3 = new Score();
export const MUSIC = { bpm: 96, beat: BEAT, bar: BAR, key: "C major", title: "POP / 96" };
