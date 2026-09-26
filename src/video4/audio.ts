/* ===================================================================
   audio4.ts — "DRAFT / 108"  precise clockwork electronica.
   E minor, 108 BPM, 9 bars = 20.000 s.
   FM mallets, clock ticks, pencil-scratch foley, wooden thunks on every
   furniture drop, ducked 8th-note pulse bass, stamp impact.
   =================================================================== */
import { BAR, BEAT, DROPS, STAMP_AT, b } from "./timeline";

const N: Record<string, number> = {
  E1: 41.2, G1: 49, A1: 55, B1: 61.74, C2: 65.41, D2: 73.42, E2: 82.41, G2: 98, A2: 110, B2: 123.47,
  C3: 130.81, D3: 146.83, E3: 164.81, Fs3: 185, G3: 196, A3: 220, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, Fs4: 369.99, G4: 392, A4: 440, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.26, Fs5: 739.99, G5: 783.99, A5: 880, B5: 987.77, E6: 1318.5,
};

type Ch = { bass: number; pad: number[]; arp: number[] };
const CH: Record<string, Ch> = {
  Em: { bass: N.E2, pad: [N.E3, N.G3, N.B3], arp: [N.E5, N.B4, N.G5, N.B4] },
  C:  { bass: N.C2, pad: [N.C3, N.E3, N.G3], arp: [N.E5, N.C5, N.G5, N.C5] },
  G:  { bass: N.G2, pad: [N.D3, N.G3, N.B3], arp: [N.D5, N.B4, N.G5, N.B4] },
  D:  { bass: N.D2, pad: [N.D3, N.Fs3, N.A3], arp: [N.Fs5, N.D5, N.A5, N.D5] },
};
const PROG = ["Em", "Em", "C", "G", "D", "Em", "C", "D", "Em"] as const;

const srand = (s: number) => {
  const x = Math.sin(s * 91.345 + 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

export class Score {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private duck!: GainNode;
  private lim!: DynamicsCompressorNode;
  private revIn!: GainNode;
  private dlyL!: GainNode;
  private noise!: AudioBuffer;
  private active: AudioScheduledSourceNode[] = [];
  analyser!: AnalyserNode;
  private events: { t: number; run: (w: number) => void }[] = [];
  private cursor = 0;
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
    this.lim.knee.value = 6;
    this.lim.ratio.value = 12;
    this.lim.attack.value = 0.003;
    this.lim.release.value = 0.2;
    this.master = ctx.createGain();
    this.master.gain.value = this._muted ? 0 : this._vol;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.72;
    this.master.connect(this.lim);
    this.lim.connect(this.analyser);
    this.lim.connect(ctx.destination);

    this.duck = ctx.createGain();
    this.duck.connect(this.master);

    // reverb
    const conv = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 2.2);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    conv.buffer = ir;
    this.revIn = ctx.createGain();
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 280;
    const wet = ctx.createGain();
    wet.gain.value = 0.7;
    this.revIn.connect(hp);
    hp.connect(conv);
    conv.connect(wet);
    wet.connect(this.master);

    // ping-pong delay (dotted 8th)
    const merger = ctx.createChannelMerger(2);
    const dL = ctx.createDelay(1);
    const dR = ctx.createDelay(1);
    dL.delayTime.value = BEAT * 0.75;
    dR.delayTime.value = BEAT * 0.75;
    const fbL = ctx.createGain();
    const fbR = ctx.createGain();
    fbL.gain.value = 0.38;
    fbR.gain.value = 0.38;
    this.dlyL = ctx.createGain();
    this.dlyL.connect(dL);
    dL.connect(fbL);
    fbL.connect(dR);
    dR.connect(fbR);
    fbR.connect(dL);
    dL.connect(merger, 0, 0);
    dR.connect(merger, 0, 1);
    const dlp = ctx.createBiquadFilter();
    dlp.type = "lowpass";
    dlp.frequency.value = 3000;
    const dw = ctx.createGain();
    dw.gain.value = 0.3;
    merger.connect(dlp);
    dlp.connect(dw);
    dw.connect(this.master);

    const nlen = ctx.sampleRate * 2;
    const nb = ctx.createBuffer(1, nlen, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nlen; i++) nd[i] = Math.random() * 2 - 1;
    this.noise = nb;

    this.events = this.arrange();
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
  private send(g: AudioNode, rev = 0, dly = 0) {
    const ctx = this.ctx!;
    if (rev) {
      const r = ctx.createGain();
      r.gain.value = rev;
      g.connect(r);
      r.connect(this.revIn);
    }
    if (dly) {
      const d = ctx.createGain();
      d.gain.value = dly;
      g.connect(d);
      d.connect(this.dlyL);
    }
  }

  /* ---------------- voices ---------------- */

  /** clock tick — the metronome of the drafting table */
  private tick(t: number, accent = false) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = accent ? 2600 : 3400;
    const g = ctx.createGain();
    this.env(g, t, 0.0008, accent ? 0.03 : 0.018, accent ? 0.16 : 0.08);
    o.connect(g);
    g.connect(this.master);
    this.send(g, 0.15);
    o.start(t);
    this.track(o, t + 0.06);
  }

  /** FM mallet (kalimba / marimba) */
  private mallet(t: number, f: number, vel = 1, dur = 0.7) {
    const ctx = this.ctx!;
    const car = ctx.createOscillator();
    car.type = "sine";
    car.frequency.value = f;
    const mod = ctx.createOscillator();
    mod.type = "sine";
    mod.frequency.value = f * 3.5;
    const mg = ctx.createGain();
    mg.gain.setValueAtTime(f * 2.4, t);
    mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 0.12);
    mod.connect(mg);
    mg.connect(car.frequency);
    const g = ctx.createGain();
    this.env(g, t, 0.002, dur, 0.17 * vel);
    car.connect(g);
    g.connect(this.duck);
    this.send(g, 0.35, 0.32);
    car.start(t);
    mod.start(t);
    this.track(car, t + dur + 0.1);
    this.track(mod, t + dur + 0.1);
  }

  /** pencil on paper — shaped bandpassed noise with grain */
  private pencil(t: number, dur: number, vel = 1) {
    const ctx = this.ctx!;
    const n = this.nz();
    n.playbackRate.value = 0.8 + srand(t * 10) * 0.3;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 3800;
    bp.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    // stroke-by-stroke amplitude pattern
    const strokes = Math.max(2, Math.floor(dur / 0.14));
    for (let i = 0; i < strokes; i++) {
      const st = t + (i / strokes) * dur;
      const a = (0.04 + srand(i + t) * 0.05) * vel;
      g.gain.linearRampToValueAtTime(a, st + 0.02);
      g.gain.linearRampToValueAtTime(a * 0.25, st + dur / strokes - 0.01);
    }
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
    n.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    n.start(t);
    this.track(n, t + dur + 0.1);
  }

  /** wooden thunk for furniture landing */
  private thunk(t: number, pitch = 1, vel = 1) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(220 * pitch, t);
    o.frequency.exponentialRampToValueAtTime(70 * pitch, t + 0.12);
    const g = ctx.createGain();
    this.env(g, t, 0.002, 0.2, 0.55 * vel);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    this.track(o, t + 0.26);
    // wood click
    const n = this.nz();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1400 * pitch;
    bp.Q.value = 4;
    const ng = ctx.createGain();
    this.env(ng, t, 0.001, 0.04, 0.28 * vel);
    n.connect(bp);
    bp.connect(ng);
    ng.connect(this.master);
    this.send(ng, 0.3);
    n.start(t);
    this.track(n, t + 0.08);
  }

  private kick(t: number, vel = 1) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.07);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.3);
    const g = ctx.createGain();
    this.env(g, t, 0.003, 0.38, 0.95 * vel);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    this.track(o, t + 0.45);
    const d = this.duck.gain;
    d.setValueAtTime(1, t);
    d.linearRampToValueAtTime(0.35, t + 0.02);
    d.setTargetAtTime(1, t + 0.05, 0.09);
  }

  private rim(t: number, vel = 1) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = 820;
    const g = ctx.createGain();
    this.env(g, t, 0.001, 0.035, 0.22 * vel);
    o.connect(g);
    g.connect(this.master);
    this.send(g, 0.25, 0.2);
    o.start(t);
    this.track(o, t + 0.08);
  }

  private clap(t: number, vel = 1) {
    const ctx = this.ctx!;
    [0, 0.01, 0.022].forEach((off, i) => {
      const n = this.nz();
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1600 + i * 300;
      bp.Q.value = 1.1;
      const g = ctx.createGain();
      this.env(g, t + off, 0.001, i === 2 ? 0.14 : 0.02, 0.36 * vel);
      n.connect(bp);
      bp.connect(g);
      g.connect(this.master);
      this.send(g, 0.35);
      n.start(t + off);
      this.track(n, t + off + 0.2);
    });
  }

  private hat(t: number, open = false, vel = 1) {
    const ctx = this.ctx!;
    const n = this.nz();
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = open ? 6500 : 8500;
    const g = ctx.createGain();
    this.env(g, t, 0.001, open ? 0.15 : 0.03, (open ? 0.09 : 0.1) * vel);
    n.connect(hp);
    hp.connect(g);
    g.connect(this.master);
    n.start(t);
    this.track(n, t + 0.22);
  }

  private bass(t: number, f: number, dur: number, vel = 1) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const o2 = ctx.createOscillator();
    o2.type = "sawtooth";
    o2.frequency.value = f;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.exponentialRampToValueAtTime(200, t + dur);
    const g2 = ctx.createGain();
    g2.gain.value = 0.22;
    const g = ctx.createGain();
    this.env(g, t, 0.006, dur, 0.45 * vel);
    o.connect(g);
    o2.connect(g2);
    g2.connect(lp);
    lp.connect(g);
    g.connect(this.duck);
    o.start(t);
    o2.start(t);
    this.track(o, t + dur + 0.05);
    this.track(o2, t + dur + 0.05);
  }

  private pad(t: number, freqs: number[], dur: number, vel = 1) {
    const ctx = this.ctx!;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(600, t);
    lp.frequency.linearRampToValueAtTime(1600, t + dur * 0.6);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.1 * vel, t + 0.5);
    g.gain.setValueAtTime(0.1 * vel, t + dur * 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.6);
    lp.connect(g);
    g.connect(this.duck);
    this.send(g, 0.6);
    freqs.forEach((f) => {
      for (const det of [-8, 8]) {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = f * Math.pow(2, det / 1200);
        const og = ctx.createGain();
        og.gain.value = 0.25;
        o.connect(og);
        og.connect(lp);
        o.start(t);
        this.track(o, t + dur + 0.8);
      }
    });
  }

  private riser(t: number, dur: number, vel = 1) {
    const ctx = this.ctx!;
    const n = this.nz();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 2.5;
    bp.frequency.setValueAtTime(350, t);
    bp.frequency.exponentialRampToValueAtTime(9000, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.28 * vel, t + dur * 0.95);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.1);
    n.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    n.start(t);
    this.track(n, t + dur + 0.2);
  }

  /** scanner sweep for the render pass */
  private scan(t: number, dur: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(1400, t + dur);
    const lp = ctx.createBiquadFilter();
    lp.type = "bandpass";
    lp.Q.value = 6;
    lp.frequency.setValueAtTime(300, t);
    lp.frequency.exponentialRampToValueAtTime(4000, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.06, t + 0.1);
    g.gain.setValueAtTime(0.06, t + dur - 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    this.send(g, 0.3);
    o.start(t);
    this.track(o, t + dur + 0.05);
  }

  private impact(t: number, vel = 1) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(28, t + 0.9);
    const g = ctx.createGain();
    this.env(g, t, 0.006, 1.3, 0.95 * vel);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    this.track(o, t + 1.4);
    const n = this.nz();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(6000, t);
    lp.frequency.exponentialRampToValueAtTime(400, t + 0.9);
    const ng = ctx.createGain();
    this.env(ng, t, 0.002, 0.9, 0.3 * vel);
    n.connect(lp);
    lp.connect(ng);
    ng.connect(this.master);
    this.send(ng, 0.7);
    n.start(t);
    this.track(n, t + 1.1);
  }

  /** rubber stamp: thud + paper slap */
  private stamp(t: number) {
    this.impact(t, 1.1);
    this.thunk(t, 0.6, 1.2);
    const ctx = this.ctx!;
    const n = this.nz();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 900;
    bp.Q.value = 0.8;
    const g = ctx.createGain();
    this.env(g, t, 0.001, 0.09, 0.5);
    n.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    this.send(g, 0.5);
    n.start(t);
    this.track(n, t + 0.14);
  }

  private shimmer(t: number, dur: number) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    this.send(g, 1.1);
    g.connect(this.master);
    [N.E6, N.B5, N.G5].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.value = 0.5 / (i + 1);
      o.connect(og);
      og.connect(g);
      o.start(t);
      this.track(o, t + dur + 0.1);
    });
  }

  /* ---------------- arrangement ---------------- */
  private arrange() {
    const ev: { t: number; run: (w: number) => void }[] = [];
    const at = (t: number, run: (w: number) => void) => ev.push({ t, run });
    const E8 = BEAT / 2;
    const S16 = BEAT / 4;

    // clock ticks throughout (quarter notes; 8ths in bars 1–6)
    for (let i = 0; i * E8 < 19.9; i++) {
      const t = i * E8;
      const bar = Math.floor(t / BAR);
      const onBeat = i % 2 === 0;
      if (!onBeat && (bar < 1 || bar >= 7)) continue;
      if (t >= STAMP_AT - BEAT && t < STAMP_AT) continue; // breath before the stamp
      at(t, (w) => this.tick(w, i % 8 === 0));
    }

    // pads, one per bar
    PROG.forEach((name, i) => {
      const vel = i === 0 ? 0.6 : i >= 5 && i <= 6 ? 1.15 : i === 7 ? 0.8 : 1;
      at(b(i), (w) => this.pad(w, CH[name].pad, BAR * 0.98, vel));
    });

    // bar 0: pencil gesture + intro mallet
    at(0.05, (w) => this.pencil(w, 1.6, 0.8));
    [0, 0.5, 1, 1.5].forEach((beatOff, i) =>
      at(BEAT * (2 + beatOff), (w) => this.mallet(w, CH.Em.arp[i], 0.5 + i * 0.12))
    );
    at(b(1) - BEAT, (w) => this.riser(w, BEAT, 0.5));

    // plan (bars 1–2): pencil strokes as walls draw, mallet arps, rim clicks
    at(b(1) + 0.08, (w) => this.pencil(w, 0.8, 1));
    at(b(1) + 0.7, (w) => this.pencil(w, 0.8, 0.9));
    at(b(1) + 1.3, (w) => this.pencil(w, 0.6, 0.8));
    for (let bar = 1; bar <= 2; bar++) {
      const c = CH[PROG[bar]];
      for (let i = 0; i < 8; i++) at(b(bar) + i * E8, (w) => this.mallet(w, c.arp[i % 4], i % 2 ? 0.6 : 0.9, 0.5));
      [BEAT * 1, BEAT * 3, BEAT * 3.5].forEach((o) => at(b(bar) + o, (w) => this.rim(w, 0.8)));
      at(b(bar), (w) => this.bass(w, c.bass, BEAT * 1.6, 0.7));
      at(b(bar) + BEAT * 2, (w) => this.bass(w, c.bass, BEAT * 1.6, 0.7));
    }
    at(b(3) - BEAT * 1.2, (w) => this.riser(w, BEAT * 1.2, 0.7));

    // build (bars 3–4): kick enters, pulse bass, thunks on drops
    for (let bar = 3; bar <= 6; bar++) {
      const c = CH[PROG[bar]];
      const full = bar >= 5;
      for (let k = 0; k < 4; k++) at(b(bar) + k * BEAT, (w) => this.kick(w, k === 0 ? 1 : 0.9));
      [BEAT, BEAT * 3].forEach((o) => at(b(bar) + o, (w) => this.clap(w, full ? 0.95 : 0.7)));
      for (let i = 0; i < 8; i++) {
        const t = b(bar) + i * E8;
        at(t, (w) => this.bass(w, i % 4 === 3 ? c.bass * 2 : c.bass, E8 * 0.85, i % 2 ? 0.75 : 1));
        at(t, (w) => this.hat(w, full && i % 2 === 1, i % 2 ? 0.9 : 0.55));
      }
      if (full) {
        for (let i = 0; i < 16; i++) if (i % 4 === 3) at(b(bar) + i * S16, (w) => this.hat(w, false, 0.45));
      }
      // arps continue, brighter in the drop
      for (let i = 0; i < 8; i++) {
        const oct = full && i % 4 === 2 ? 2 : 1;
        at(b(bar) + i * E8, (w) => this.mallet(w, c.arp[i % 4] * oct, full ? 0.85 : 0.6, 0.45));
      }
    }
    const thunkPitch: Record<string, number> = {
      rug: 0.8, sofa: 0.7, table: 1, lamp: 1.35, shelf: 1.15, plant: 1.25, art: 1.5, pendant: 1.7, chair: 0.95,
    };
    Object.entries(DROPS).forEach(([k, t]) => at(t, (w) => this.thunk(w, thunkPitch[k] ?? 1, 0.9)));

    // render (bars 5–6): scan sweeps + lead motif
    at(b(5), (w) => this.impact(w, 0.8));
    at(b(5) + 0.05, (w) => this.scan(w, 1.3));
    at(b(6), (w) => this.impact(w, 0.5));
    at(b(6) + 0.05, (w) => this.scan(w, 1.3));
    const lead: [number, number, number][] = [
      [0, N.B5, 0.5], [1.5, N.G5, 0.3], [2, N.A5, 0.3], [2.5, N.B5, 0.6], [3.5, N.E6, 0.6],
      [4, N.B5, 0.5], [5.5, N.A5, 0.3], [6, N.G5, 0.3], [6.5, N.Fs5, 0.6], [7.5, N.D5, 0.5],
    ];
    lead.forEach(([beat, f, d]) => at(b(5) + beat * BEAT, (w) => this.mallet(w, f, 1.1, d + 0.4)));
    at(b(7) - BEAT * 2, (w) => this.riser(w, BEAT * 2, 0.9));

    // title block (bar 7): breakdown — bass drone, ticks, pencil signature
    at(b(7), (w) => this.impact(w, 0.6));
    at(b(7), (w) => this.bass(w, CH.D.bass, BAR * 0.9, 0.6));
    at(b(7) + 0.4, (w) => this.pencil(w, 1.1, 0.9));
    for (let i = 0; i < 4; i++) at(b(7) + i * BEAT, (w) => this.mallet(w, CH.D.arp[i], 0.55, 0.6));
    at(STAMP_AT - BEAT * 1.5, (w) => this.riser(w, BEAT * 1.5, 1));

    // stamp + outro
    at(STAMP_AT, (w) => this.stamp(w));
    at(STAMP_AT, (w) => this.kick(w, 1.1));
    at(STAMP_AT, (w) => this.bass(w, N.E1 * 2, 1.8, 1));
    at(STAMP_AT, (w) => this.shimmer(w, 2.2));
    [N.E4, N.G4, N.B4, N.E5].forEach((f, i) =>
      at(STAMP_AT + i * S16, (w) => this.mallet(w, f, 0.9, 1.4))
    );

    return ev.sort((a, z) => a.t - z.t);
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
    this.timer = window.setInterval(() => this.tick_(), 25);
    this.tick_();
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
  private tick_() {
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
          /* keep going */
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
          /* */
        }
        try {
          n.disconnect();
        } catch {
          /* */
        }
      });
    }, 80);
  }
  setMuted(m: boolean) {
    this._muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0.0001 : this._vol, this.ctx.currentTime, 0.02);
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
      const z = Math.max(a + 1, Math.floor(Math.pow((i + 1) / bands, 1.9) * n));
      let m = 0;
      for (let j = a; j < z && j < n; j++) m = Math.max(m, data[j]);
      out[i] = Math.max(out[i] * 0.82, (m / 255) * (0.55 + 0.7 * (i / bands)));
    }
    return out;
  }
}

export const score4 = new Score();
export const MUSIC = { bpm: 108, key: "E minor", title: "DRAFT / 108" };
