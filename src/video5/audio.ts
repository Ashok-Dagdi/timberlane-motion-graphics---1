/* ===================================================================
   audio5.ts — "DOSSIER / 104" — data-driven minimal score.
   A minor, 104 BPM, 7 bars (16.15s) + 3.85s cold = 20.000s.
   8th-note bass pulse, dry 16th ticks, warm Rhodes/EP chords,
   glass arp, short hall reverb, reverse swells, diamond sparkle tail.
   =================================================================== */

const BPM = 104;
const BEAT = 60 / BPM; // 0.5769
const BAR = BEAT * 4; // 2.3077

const N: Record<string, number> = {
  A1: 55, B1: 61.74, C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98, A2: 110,
  Bb2: 116.54, C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196, A3: 220, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.26, F5: 698.46, G5: 783.99, A5: 880, B5: 987.77,
  C6: 1046.5, D6: 1174.66, E6: 1318.51,
};

type Ch = { root: number; pad: number[]; ep: number[]; arp: number[] };
const CH: Record<string, Ch> = {
  Am: { root: N.A2, pad: [N.A3, N.C4, N.E4], ep: [N.A3, N.C4, N.E4], arp: [N.A5, N.E5, N.C6] },
  F: { root: N.F2, pad: [N.F3, N.A3, N.C4], ep: [N.F3, N.A3, N.C4], arp: [N.F5, N.C6, N.A5] },
  C: { root: N.C2, pad: [N.G3, N.C4, N.E4], ep: [N.C4, N.E4, N.G4], arp: [N.E5, N.G5, N.C6] },
  G: { root: N.G2, pad: [N.G3, N.B3, N.D4], ep: [N.G3, N.B3, N.D4], arp: [N.G5, N.D6, N.B5] },
  Em: { root: N.E2, pad: [N.G3, N.B3, N.E4], ep: [N.E3, N.G3, N.B3], arp: [N.B5, N.E5, N.G5] },
  A7: { root: N.A2, pad: [N.A3, N.C4, N.E4, N.G4], ep: [N.A3, N.C4, N.E4, N.G4], arp: [N.C6, N.G5, N.E6] },
  Dm: { root: N.D2, pad: [N.D3, N.F3, N.A3], ep: [N.D3, N.F3, N.A3], arp: [N.F5, N.A5, N.D6] },
};

/** 7 bars of A minor: Am – F – C – G – Em – F – G */
const PROG: (keyof typeof CH)[] = ["Am", "F", "C", "G", "Em", "F", "G"];

export class Score {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private lim!: DynamicsCompressorNode;
  private duck!: GainNode;
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
    this.lim.threshold.value = -10;
    this.lim.knee.value = 8;
    this.lim.ratio.value = 10;
    this.lim.attack.value = 0.003;
    this.lim.release.value = 0.18;
    this.master = ctx.createGain();
    this.master.gain.value = this._muted ? 0 : this._vol;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.75;
    this.master.connect(this.lim);
    this.lim.connect(this.analyser);
    this.lim.connect(ctx.destination);

    this.duck = ctx.createGain();
    this.duck.gain.value = 1;
    this.duck.connect(this.master);

    // short hall — tighter than piece 4, warmer than piece 1
    const conv = ctx.createConvolver();
    conv.buffer = this.makeIR(2.1, 2.6);
    const revWet = ctx.createGain();
    revWet.gain.value = 0.6;
    this.revIn = ctx.createGain();
    this.revIn.gain.value = 1;
    const revHP = ctx.createBiquadFilter();
    revHP.type = "highpass";
    revHP.frequency.value = 280;
    this.revIn.connect(revHP);
    revHP.connect(conv);
    conv.connect(revWet);
    revWet.connect(this.master);

    // echo
    const dly = ctx.createDelay(2);
    dly.delayTime.value = BEAT * 0.75;
    const fb = ctx.createGain();
    fb.gain.value = 0.34;
    const dlyLP = ctx.createBiquadFilter();
    dlyLP.type = "lowpass";
    dlyLP.frequency.value = 2600;
    this.dlyIn = ctx.createGain();
    this.dlyIn.connect(dly);
    dly.connect(dlyLP);
    dlyLP.connect(fb);
    fb.connect(dly);
    const dlyWet = ctx.createGain();
    dlyWet.gain.value = 0.28;
    dlyLP.connect(dlyWet);
    dlyWet.connect(this.master);
    dlyWet.connect(this.revIn);

    const len = ctx.sampleRate * 2.5;
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
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - x, decay) * (1 - Math.exp(-i / 700));
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
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.09);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.9 * vel, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    this.track(o, t + 0.5);

    const n = this.nz();
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1800;
    const ng = ctx.createGain();
    this.env(ng, t, 0.001, 0.028, 0.13 * vel);
    n.connect(hp);
    hp.connect(ng);
    ng.connect(this.master);
    n.start(t);
    this.track(n, t + 0.08);

    const d = this.duck.gain;
    d.setValueAtTime(1, t);
    d.linearRampToValueAtTime(0.55, t + 0.025);
    d.setTargetAtTime(1, t + 0.06, 0.085);
  }

  private tick(t: number, vel = 1) {
    const ctx = this.ctx!;
    const n = this.nz();
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 9200;
    const g = ctx.createGain();
    this.env(g, t, 0.001, 0.028, 0.085 * vel);
    n.connect(hp);
    hp.connect(g);
    g.connect(this.master);
    n.start(t);
    this.track(n, t + 0.07);
  }

  private snap(t: number, vel = 1) {
    const ctx = this.ctx!;
    // a dry high tick + body tick — data-snap for slide acts
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.value = 840;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1400;
    bp.Q.value = 2.6;
    const g = ctx.createGain();
    this.env(g, t, 0.001, 0.045, 0.14 * vel);
    o.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    o.start(t);
    this.track(o, t + 0.1);
  }

  /* ---------------- low end ---------------- */
  private sub(t: number, f: number, dur: number, vel = 1) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(f * 1.35, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.04);
    const o2 = ctx.createOscillator();
    o2.type = "triangle";
    o2.frequency.value = f * 2;
    const g2 = ctx.createGain();
    g2.gain.value = 0.15;
    const g = ctx.createGain();
    this.env(g, t, 0.012, dur, 0.44 * vel);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 280;
    o.connect(g);
    o2.connect(g2);
    g2.connect(g);
    g.connect(lp);
    lp.connect(this.duck);
    o.start(t);
    o2.start(t);
    this.track(o, t + dur + 0.1);
    this.track(o2, t + dur + 0.1);
  }

  /* ---------------- Rhodes / EP ---------------- */
  private ep(t: number, freqs: number[], vel = 1, dur = 0.4) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.value = 1;
    const trem = ctx.createOscillator();
    trem.type = "sine";
    trem.frequency.value = 4.8;
    const tg = ctx.createGain();
    tg.gain.value = 0.14;
    trem.connect(tg);
    tg.connect(g.gain);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(0.14 * vel, t + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.6);
    env.connect(g);
    g.connect(this.duck);
    const rs = ctx.createGain();
    rs.gain.value = 0.5;
    g.connect(rs);
    rs.connect(this.revIn);
    const ds = ctx.createGain();
    ds.gain.value = 0.18;
    g.connect(ds);
    ds.connect(this.dlyIn);
    freqs.forEach((f) => {
      for (const [mult, amp] of [[1, 0.5], [2, 0.14], [4, 0.05]] as const) {
        const o = ctx.createOscillator();
        o.type = mult === 1 ? "sine" : "triangle";
        o.frequency.value = f * mult;
        const og = ctx.createGain();
        og.gain.value = amp;
        o.connect(og);
        og.connect(env);
        o.start(t);
        this.track(o, t + dur + 0.9);
      }
    });
    trem.start(t);
    this.track(trem, t + dur + 1.0);
  }

  /* ---------------- glass arp ---------------- */
  private glass(t: number, f: number, vel = 1, dur = 1.3) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    this.env(g, t, 0.004, dur, 0.11 * vel);
    const o1 = ctx.createOscillator();
    o1.type = "sine";
    o1.frequency.value = f;
    const o2 = ctx.createOscillator();
    o2.type = "sine";
    o2.frequency.value = f * 2.003;
    const g2 = ctx.createGain();
    g2.gain.value = 0.18;
    const o3 = ctx.createOscillator();
    o3.type = "sine";
    o3.frequency.value = f * 0.5;
    const g3 = ctx.createGain();
    g3.gain.value = 0.26;
    o1.connect(g);
    o2.connect(g2);
    g2.connect(g);
    o3.connect(g3);
    g3.connect(g);
    g.connect(this.duck);
    const rs = ctx.createGain();
    rs.gain.value = 0.8;
    g.connect(rs);
    rs.connect(this.revIn);
    const ds = ctx.createGain();
    ds.gain.value = 0.45;
    g.connect(ds);
    ds.connect(this.dlyIn);
    o1.start(t);
    o2.start(t);
    o3.start(t);
    this.track(o1, t + dur + 0.3);
    this.track(o2, t + dur + 0.3);
    this.track(o3, t + dur + 0.3);
  }

  /* ---------------- pads ---------------- */
  private pad(t: number, freqs: number[], dur: number, vel = 1) {
    const ctx = this.ctx!;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(520, t);
    lp.frequency.linearRampToValueAtTime(1400, t + dur * 0.55);
    lp.frequency.linearRampToValueAtTime(700, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.085 * vel, t + Math.min(1.0, dur * 0.4));
    g.gain.setValueAtTime(0.085 * vel, t + dur * 0.82);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.0);
    lp.connect(g);
    g.connect(this.duck);
    const rs = ctx.createGain();
    rs.gain.value = 0.72;
    g.connect(rs);
    rs.connect(this.revIn);
    freqs.forEach((f, fi) => {
      for (const det of [-5, 6]) {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = f * Math.pow(2, det / 1200);
        const og = ctx.createGain();
        og.gain.value = 0.2 / (1 + fi * 0.42);
        o.connect(og);
        og.connect(lp);
        o.start(t);
        this.track(o, t + dur + 1.2);
      }
    });
  }

  /* ---------------- accents ---------------- */
  private swell(t: number, dur: number, vel = 1) {
    const ctx = this.ctx!;
    const n = this.nz();
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.setValueAtTime(3800, t);
    hp.frequency.exponentialRampToValueAtTime(7600, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.15 * vel, t + dur * 0.96);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.02);
    n.connect(hp);
    hp.connect(g);
    g.connect(this.master);
    const rs = ctx.createGain();
    rs.gain.value = 0.55;
    g.connect(rs);
    rs.connect(this.revIn);
    n.start(t);
    this.track(n, t + dur + 0.1);
  }

  private impact(t: number, vel = 1) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(108, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 0.9);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.78 * vel, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.15);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    this.track(o, t + 1.4);
    const n = this.nz();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(6200, t);
    lp.frequency.exponentialRampToValueAtTime(380, t + 0.8);
    const ng = ctx.createGain();
    this.env(ng, t, 0.002, 0.8, 0.2 * vel);
    n.connect(lp);
    lp.connect(ng);
    ng.connect(this.master);
    const rs = ctx.createGain();
    rs.gain.value = 0.5;
    ng.connect(rs);
    rs.connect(this.revIn);
    n.start(t);
    this.track(n, t + 1.0);
  }

  private glock(t: number, f: number, dur = 0.95, vel = 1) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    this.env(g, t, 0.002, dur, 0.09 * vel);
    for (const [mult, amp] of [[1, 1], [4.03, 0.15], [8.1, 0.04]] as const) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f * mult;
      const og = ctx.createGain();
      og.gain.value = amp;
      o.connect(og);
      og.connect(g);
      o.start(t);
      this.track(o, t + dur + 0.4);
    }
    g.connect(this.duck);
    const rs = ctx.createGain();
    rs.gain.value = 0.9;
    g.connect(rs);
    rs.connect(this.revIn);
  }

  private shimmer(t: number, dur: number, vel = 1) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.045 * vel, t + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const rs = ctx.createGain();
    rs.gain.value = 1;
    g.connect(rs);
    rs.connect(this.revIn);
    [N.E6, N.A5, N.C6].forEach((f, i) => {
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
    const chordAt = (t: number) => CH[PROG[Math.min(6, Math.max(0, Math.floor(t / BAR)))]];

    // pads — every 2 bars
    [0, 2, 4, 6].forEach((bar) => {
      const c = CH[PROG[bar]];
      at(bar * BAR, (w) => this.pad(w, c.pad, BAR * 2 - 0.2, bar === 0 ? 0.6 : bar >= 6 ? 1.05 : 0.95));
    });

    // kick — 4/4 for bars 1–6, sparse on 0 & 7
    at(0, (w) => this.kick(w, 0.92));
    at(BEAT * 2, (w) => this.kick(w, 0.6));
    for (let b = 1; b <= 6; b++) {
      const t0 = b * BAR;
      for (let k = 0; k < 4; k++) at(t0 + k * BEAT, (w) => this.kick(w, k % 2 === 0 ? 1 : 0.88));
    }
    at(7 * BAR, (w) => this.kick(w, 0.9));

    // ticks — 16ths from bar 1
    for (let b = 1; b <= 7; b++) {
      const t0 = b * BAR;
      for (let k = 0; k < 16; k++) {
        const tt = t0 + k * (BEAT / 4);
        at(tt, (w) => this.tick(w, k % 4 === 2 ? 1 : k % 4 === 0 ? 0.82 : 0.52));
      }
    }
    // snaps on slide changes (scene cues) — 2, 3, 4 incoming
    [2.3077, 6.9231, 9.2308, 11.5385, 16.1538].forEach((t) => at(t, (w) => this.snap(w, 0.95)));

    // sub — 8ths from bar 2
    for (let b = 2; b <= 6; b++) {
      const c = CH[PROG[b]];
      const t0 = b * BAR;
      for (let k = 0; k < 8; k++) {
        const tt = t0 + k * (BEAT / 2);
        const f = k % 4 === 2 ? c.root * 1.5 : c.root;
        at(tt, (w) => this.sub(w, f, (BEAT / 2) - 0.05, k % 2 === 0 ? 0.85 : 0.62));
      }
    }
    at(7 * BAR, (w) => this.sub(w, CH.G.root, 1.75, 1));

    // EP chords — on 1 and 3
    for (let b = 0; b <= 7; b++) {
      const c = CH[PROG[b]];
      const t0 = b * BAR;
      at(t0, (w) => this.ep(w, c.ep, b === 7 ? 1.15 : 0.95, BAR * (b === 7 ? 1.7 : 0.48)));
      if (b < 7) at(t0 + BEAT * 2, (w) => this.ep(w, c.ep, 0.75, 0.34));
    }

    // glass arp — sparse contour
    ([
      [0.0, 0], [1.0, 2], [1.9, 1],
      [3.1, 1], [3.9, 0], [4.7, 2],
      [5.8, 0], [6.6, 1], [7.3, 2], [8.1, 0],
      [8.9, 1], [9.7, 2], [10.5, 0], [11.3, 1], [12.1, 2],
      [13.0, 0], [13.7, 1], [14.5, 2], [15.3, 0],
      [16.15, 0], [16.8, 1], [17.5, 2],
    ] as [number, number][]).forEach(([t, i]) => at(t, (w) => this.glass(w, chordAt(t).arp[i % 3], i % 2 ? 0.65 : 0.9, 1.4)));

    // glock tail melody
    ([
      [16.15, N.C6], [16.75, N.E6], [17.35, N.A5], [18.3, N.G5], [19.2, N.C6],
    ] as [number, number][]).forEach(([t, f]) => at(t, (w) => this.glock(w, f, 1.2, 0.95)));

    // swells at cuts
    at(4.3, (w) => this.swell(w, 0.75, 0.8));
    at(10.6, (w) => this.swell(w, 0.8, 0.9));
    at(13.1, (w) => this.swell(w, 0.8, 0.95));
    at(18.4, (w) => this.swell(w, 0.7, 0.85));

    // impacts
    at(2.3077, (w) => this.impact(w, 0.5));
    at(4.6154, (w) => this.impact(w, 0.55));
    at(7.4, (w) => this.impact(w, 0.6));
    at(11.5385, (w) => this.impact(w, 0.7));
    at(13.8462, (w) => this.impact(w, 0.9));
    at(16.1538, (w) => this.impact(w, 1.0));

    // pen clicks (data feel) sprinkled
    [1.0, 3.2, 5.0, 7.8, 9.5, 11.0, 13.5, 15.5, 17.0, 18.0].forEach((t, i) =>
      at(t + (i % 2) * 0.07, (w) => this.snap(w, 0.4 + (i % 3) * 0.1))
    );

    at(16.1538, (w) => this.shimmer(w, 3.2, 1));

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
    this.timer = window.setInterval(() => this.tickFn(), 25);
    this.tickFn();
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

  private tickFn() {
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
      out[i] = Math.max(out[i] * 0.84, (m / 255) * (0.55 + 0.7 * (i / bands)));
    }
    return out;
  }
}

export const score5 = new Score();
export const MUSIC = { bpm: 104, beat: BEAT, bar: BAR, key: "A minor", title: "DOSSIER / 104" };
