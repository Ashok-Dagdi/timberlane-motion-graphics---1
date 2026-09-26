/* ------------------------------------------------------------------
   audio.ts — "EMBER / 120" original score, synthesised in the browser.
   Cinematic house-trailer hybrid: 120 BPM, A-minor, 10 bars = 20.000s.
   Everything is scheduled against the composition clock so the picture
   and the music stay frame-locked while scrubbing.
   ------------------------------------------------------------------ */

const BEAT = 0.5; // 120 BPM
const BAR = BEAT * 4;

// --- note table (A minor) -----------------------------------------
const N = {
  A1: 55, C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98,
  A2: 110, C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196,
  A3: 220, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392,
  A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.26, F5: 698.46, G5: 783.99,
  A5: 880, C6: 1046.5, E6: 1318.5,
};

type Chord = { root: number; sub: number; pad: number[]; arp: number[] };

const CH: Record<string, Chord> = {
  Am: { root: N.A2, sub: N.A1, pad: [N.A3, N.C4, N.E4], arp: [N.A4, N.C5, N.E5, N.C5] },
  F:  { root: N.F2, sub: N.F2 / 2, pad: [N.F3, N.A3, N.C4], arp: [N.F4, N.A4, N.C5, N.A4] },
  C:  { root: N.C2, sub: N.C2 / 2, pad: [N.G3, N.C4, N.E4], arp: [N.G4, N.C5, N.E5, N.C5] },
  G:  { root: N.G2, sub: N.G2 / 2, pad: [N.G3, N.B3, N.D4], arp: [N.G4, N.B4, N.D5, N.B4] },
};

/** one chord per bar, 10 bars */
const PROG = ["Am", "Am", "F", "C", "G", "Am", "F", "C", "G", "Am"] as const;

export type ScoreEvent = { t: number; run: (when: number) => void };

export class Score {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private limiter!: DynamicsCompressorNode;
  private drumBus!: GainNode;
  private duckBus!: GainNode;
  private revIn!: GainNode;
  private dlyIn!: GainNode;
  private noise!: AudioBuffer;
  analyser!: AnalyserNode;

  private events: ScoreEvent[] = [];
  private cursor = 0;
  private timer: number | null = null;
  private active: AudioScheduledSourceNode[] = [];
  private anchorCtx = 0; // ctx time matching anchorComp
  private anchorComp = 0;
  private rate = 1;
  private _muted = false;
  private _vol = 0.85;
  running = false;

  /* ---------------- graph ---------------- */
  private init() {
    if (this.ctx) return;
    const AC: typeof AudioContext =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    this.ctx = ctx;

    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -8;
    this.limiter.knee.value = 6;
    this.limiter.ratio.value = 12;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.18;

    this.master = ctx.createGain();
    this.master.gain.value = this._muted ? 0 : this._vol;

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.72;

    this.master.connect(this.limiter);
    this.limiter.connect(this.analyser);
    this.limiter.connect(ctx.destination);

    this.duckBus = ctx.createGain();
    this.duckBus.gain.value = 1;
    this.duckBus.connect(this.master);

    this.drumBus = ctx.createGain();
    this.drumBus.gain.value = 1;
    this.drumBus.connect(this.master);

    // plate reverb
    const conv = ctx.createConvolver();
    conv.buffer = this.makeIR(2.6, 2.4);
    const revWet = ctx.createGain();
    revWet.gain.value = 0.9;
    this.revIn = ctx.createGain();
    this.revIn.gain.value = 1;
    const revHP = ctx.createBiquadFilter();
    revHP.type = "highpass";
    revHP.frequency.value = 260;
    this.revIn.connect(revHP);
    revHP.connect(conv);
    conv.connect(revWet);
    revWet.connect(this.master);

    // dotted-8th delay
    const dly = ctx.createDelay(1);
    dly.delayTime.value = BEAT * 0.75;
    const fb = ctx.createGain();
    fb.gain.value = 0.34;
    const dlyLP = ctx.createBiquadFilter();
    dlyLP.type = "lowpass";
    dlyLP.frequency.value = 2400;
    this.dlyIn = ctx.createGain();
    this.dlyIn.connect(dly);
    dly.connect(dlyLP);
    dlyLP.connect(fb);
    fb.connect(dly);
    const dlyWet = ctx.createGain();
    dlyWet.gain.value = 0.42;
    dlyLP.connect(dlyWet);
    dlyWet.connect(this.master);
    dlyWet.connect(this.revIn);

    // noise source buffer
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
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - x, decay) * (1 - Math.exp(-i / 400));
      }
    }
    return buf;
  }

  /* ---------------- voices ---------------- */
  private track<T extends AudioScheduledSourceNode>(n: T, stopAt: number) {
    n.start === undefined ? null : null;
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

  private kick(t: number, vel = 1) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "sine";
    const g = ctx.createGain();
    o.frequency.setValueAtTime(175, t);
    o.frequency.exponentialRampToValueAtTime(52, t + 0.075);
    o.frequency.exponentialRampToValueAtTime(41, t + 0.3);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(1.05 * vel, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.44);
    o.connect(g);
    g.connect(this.drumBus);
    o.start(t);
    this.track(o, t + 0.5);

    const n = this.nz();
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1800;
    const ng = ctx.createGain();
    this.env(ng, t, 0.001, 0.02, 0.22 * vel);
    n.connect(hp);
    hp.connect(ng);
    ng.connect(this.drumBus);
    n.start(t);
    this.track(n, t + 0.08);

    // sidechain duck
    const d = this.duckBus.gain;
    d.setValueAtTime(1, t);
    d.linearRampToValueAtTime(0.42, t + 0.022);
    d.setTargetAtTime(1, t + 0.05, 0.085);
  }

  private clap(t: number, vel = 1) {
    const ctx = this.ctx!;
    const mk = (off: number, dec: number, amp: number, f: number, q: number) => {
      const n = this.nz();
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = f;
      bp.Q.value = q;
      const g = ctx.createGain();
      this.env(g, t + off, 0.001, dec, amp * vel);
      n.connect(bp);
      bp.connect(g);
      g.connect(this.drumBus);
      const sd = ctx.createGain();
      sd.gain.value = 0.35;
      g.connect(sd);
      sd.connect(this.revIn);
      n.start(t + off);
      this.track(n, t + off + dec + 0.05);
    };
    mk(0, 0.02, 0.5, 1700, 1.1);
    mk(0.009, 0.02, 0.44, 2100, 1.1);
    mk(0.02, 0.028, 0.4, 1500, 1.0);
    mk(0.03, 0.17, 0.34, 1250, 0.7);
  }

  private hat(t: number, open = false, vel = 1) {
    const ctx = this.ctx!;
    const n = this.nz();
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = open ? 6400 : 8200;
    const g = ctx.createGain();
    const dec = open ? 0.16 : 0.032;
    this.env(g, t, 0.001, dec, (open ? 0.11 : 0.125) * vel);
    n.connect(hp);
    hp.connect(g);
    g.connect(this.drumBus);
    n.start(t);
    this.track(n, t + dec + 0.05);
  }

  private snare(t: number, vel = 1) {
    const ctx = this.ctx!;
    const n = this.nz();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2400;
    bp.Q.value = 0.8;
    const g = ctx.createGain();
    this.env(g, t, 0.001, 0.09, 0.4 * vel);
    n.connect(bp);
    bp.connect(g);
    g.connect(this.drumBus);
    n.start(t);
    this.track(n, t + 0.16);
  }

  private sub(t: number, f: number, dur: number, vel = 1) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(f * 1.5, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.035);
    const o2 = ctx.createOscillator();
    o2.type = "triangle";
    o2.frequency.value = f * 2;
    const g2 = ctx.createGain();
    g2.gain.value = 0.16;
    const g = ctx.createGain();
    this.env(g, t, 0.008, dur, 0.62 * vel);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 340;
    o.connect(g);
    o2.connect(g2);
    g2.connect(g);
    g.connect(lp);
    lp.connect(this.duckBus);
    o.start(t);
    o2.start(t);
    this.track(o, t + dur + 0.1);
    this.track(o2, t + dur + 0.1);
  }

  private pluck(t: number, f: number, vel = 1) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 6;
    lp.frequency.setValueAtTime(5600, t);
    lp.frequency.exponentialRampToValueAtTime(820, t + 0.22);
    this.env(g, t, 0.003, 0.3, 0.2 * vel);
    const a = ctx.createOscillator();
    a.type = "triangle";
    a.frequency.value = f;
    const b = ctx.createOscillator();
    b.type = "sawtooth";
    b.frequency.value = f * 1.004;
    const bg = ctx.createGain();
    bg.gain.value = 0.42;
    a.connect(g);
    b.connect(bg);
    bg.connect(g);
    g.connect(lp);
    lp.connect(this.duckBus);
    const ds = ctx.createGain();
    ds.gain.value = 0.3;
    lp.connect(ds);
    ds.connect(this.dlyIn);
    const rs = ctx.createGain();
    rs.gain.value = 0.22;
    lp.connect(rs);
    rs.connect(this.revIn);
    a.start(t);
    b.start(t);
    this.track(a, t + 0.45);
    this.track(b, t + 0.45);
  }

  private pad(t: number, freqs: number[], dur: number, vel = 1) {
    const ctx = this.ctx!;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(700, t);
    lp.frequency.linearRampToValueAtTime(1500, t + dur * 0.6);
    lp.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.14 * vel, t + Math.min(0.55, dur * 0.35));
    g.gain.setValueAtTime(0.14 * vel, t + dur * 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.7);
    lp.connect(g);
    g.connect(this.duckBus);
    const rs = ctx.createGain();
    rs.gain.value = 0.55;
    g.connect(rs);
    rs.connect(this.revIn);
    freqs.forEach((f, i) => {
      for (const det of [-7, 6]) {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = f * Math.pow(2, det / 1200);
        const og = ctx.createGain();
        og.gain.value = 0.3 / (1 + i * 0.25);
        o.connect(og);
        og.connect(lp);
        o.start(t);
        this.track(o, t + dur + 0.9);
      }
    });
  }

  private stab(t: number, freqs: number[], dur = 0.26, vel = 1) {
    const ctx = this.ctx!;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 3;
    lp.frequency.setValueAtTime(4200, t);
    lp.frequency.exponentialRampToValueAtTime(900, t + dur);
    const g = ctx.createGain();
    this.env(g, t, 0.006, dur, 0.2 * vel);
    lp.connect(g);
    g.connect(this.duckBus);
    const rs = ctx.createGain();
    rs.gain.value = 0.3;
    g.connect(rs);
    rs.connect(this.revIn);
    freqs.forEach((f) => {
      for (const det of [-9, 9]) {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = f * Math.pow(2, det / 1200);
        const og = ctx.createGain();
        og.gain.value = 0.3;
        o.connect(og);
        og.connect(lp);
        o.start(t);
        this.track(o, t + dur + 0.2);
      }
    });
  }

  private lead(t: number, f: number, dur: number, vel = 1) {
    const ctx = this.ctx!;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 5;
    lp.frequency.setValueAtTime(1100, t);
    lp.frequency.linearRampToValueAtTime(3600, t + 0.08);
    lp.frequency.exponentialRampToValueAtTime(1300, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.19 * vel, t + 0.015);
    g.gain.setValueAtTime(0.16 * vel, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.14);
    lp.connect(g);
    g.connect(this.duckBus);
    const ds = ctx.createGain();
    ds.gain.value = 0.34;
    g.connect(ds);
    ds.connect(this.dlyIn);
    const rs = ctx.createGain();
    rs.gain.value = 0.26;
    g.connect(rs);
    rs.connect(this.revIn);

    const vib = ctx.createOscillator();
    vib.frequency.value = 5.4;
    const vg = ctx.createGain();
    vg.gain.setValueAtTime(0, t);
    vg.gain.linearRampToValueAtTime(f * 0.006, t + 0.18);
    vib.connect(vg);
    vib.start(t);
    this.track(vib, t + dur + 0.2);

    for (const [type, det, amp] of [
      ["sawtooth", 0, 0.34],
      ["square", -8, 0.16],
      ["sawtooth", 9, 0.24],
    ] as const) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f * Math.pow(2, det / 1200);
      vg.connect(o.frequency);
      const og = ctx.createGain();
      og.gain.value = amp;
      o.connect(og);
      og.connect(lp);
      o.start(t);
      this.track(o, t + dur + 0.25);
    }
  }

  private riser(t: number, dur: number, vel = 1) {
    const ctx = this.ctx!;
    const n = this.nz();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 2.4;
    bp.frequency.setValueAtTime(320, t);
    bp.frequency.exponentialRampToValueAtTime(9000, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.3 * vel, t + dur * 0.95);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.14);
    n.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    const rs = ctx.createGain();
    rs.gain.value = 0.4;
    g.connect(rs);
    rs.connect(this.revIn);
    n.start(t);
    this.track(n, t + dur + 0.2);

    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(1500, t + dur);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.1 * vel, t + dur * 0.9);
    og.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.1);
    const olp = ctx.createBiquadFilter();
    olp.type = "lowpass";
    olp.frequency.value = 2600;
    o.connect(olp);
    olp.connect(og);
    og.connect(this.master);
    o.start(t);
    this.track(o, t + dur + 0.2);
  }

  private impact(t: number, vel = 1) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(28, t + 1.0);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(1.0 * vel, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    this.track(o, t + 1.7);

    const n = this.nz();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(7000, t);
    lp.frequency.exponentialRampToValueAtTime(500, t + 1.1);
    const ng = ctx.createGain();
    this.env(ng, t, 0.002, 1.0, 0.3 * vel);
    n.connect(lp);
    lp.connect(ng);
    ng.connect(this.master);
    const rs = ctx.createGain();
    rs.gain.value = 0.7;
    ng.connect(rs);
    rs.connect(this.revIn);
    n.start(t);
    this.track(n, t + 1.3);
  }

  private whoosh(t: number, dur = 0.45, vel = 1) {
    const ctx = this.ctx!;
    const n = this.nz();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(600, t);
    bp.frequency.exponentialRampToValueAtTime(5200, t + dur * 0.65);
    bp.frequency.exponentialRampToValueAtTime(700, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.2 * vel, t + dur * 0.62);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    n.connect(bp);
    bp.connect(g);
    if (pan) {
      pan.pan.setValueAtTime(-0.8, t);
      pan.pan.linearRampToValueAtTime(0.8, t + dur);
      g.connect(pan);
      pan.connect(this.master);
    } else g.connect(this.master);
    const rs = ctx.createGain();
    rs.gain.value = 0.35;
    g.connect(rs);
    rs.connect(this.revIn);
    n.start(t);
    this.track(n, t + dur + 0.1);
  }

  private shimmer(t: number, dur = 2.4) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.055, t + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(this.master);
    const rs = ctx.createGain();
    rs.gain.value = 0.9;
    g.connect(rs);
    rs.connect(this.revIn);
    [N.A5, N.C6, N.E6].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.value = 0.5 / (i + 1);
      o.connect(og);
      og.connect(g);
      o.start(t);
      this.track(o, t + dur + 0.2);
    });
  }

  /* ---------------- arrangement ---------------- */
  private arrange(): ScoreEvent[] {
    const ev: ScoreEvent[] = [];
    const at = (t: number, run: (w: number) => void) => ev.push({ t, run });
    const chordAt = (t: number) => CH[PROG[Math.min(9, Math.max(0, Math.floor(t / BAR)))]];

    // ---- pads: one per bar -----------------------------------------
    PROG.forEach((name, bar) => {
      const c = CH[name];
      at(bar * BAR, (w) => this.pad(w, c.pad, BAR, bar === 0 ? 0.8 : bar >= 8 ? 1.25 : 1));
    });

    // ---- bar 0 : intro build ---------------------------------------
    at(0.0, (w) => this.impact(w, 0.85));
    at(0.0, (w) => this.kick(w, 0.9));
    at(0.0, (w) => this.riser(w, 2.0, 0.85));
    at(1.0, (w) => this.kick(w, 0.8));
    [1.0, 1.25, 1.5, 1.75].forEach((t, i) => at(t, (w) => this.hat(w, false, 0.45 + i * 0.12)));
    [1.0, 1.125, 1.25, 1.375, 1.5, 1.625, 1.75, 1.875].forEach((t, i) =>
      at(t, (w) => this.pluck(w, CH.Am.arp[i % 4] * (i > 3 ? 2 : 1), 0.45 + i * 0.05))
    );
    // accelerating snare fill into the drop
    [1.5, 1.625, 1.75, 1.8125, 1.875, 1.9375].forEach((t, i) =>
      at(t, (w) => this.snare(w, 0.35 + i * 0.12))
    );

    // ---- main groove : 2.0 -> 19.0 ---------------------------------
    at(2.0, (w) => this.impact(w, 1));

    for (let b = 1; b <= 9; b++) {
      const t0 = b * BAR;
      const c = CH[PROG[b]];
      const last = b === 9;

      // kick (four on the floor); drop the last two beats for the tail
      for (let k = 0; k < 4; k++) {
        const t = t0 + k * BEAT;
        if (t >= 19.0) break;
        // one-beat suspension right before the end-card impact
        if (t >= 15.5 && t < 16.0) continue;
        at(t, (w) => this.kick(w, k === 0 ? 1 : 0.92));
      }

      // claps on 2 & 4
      [BEAT, BEAT * 3].forEach((o) => {
        const t = t0 + o;
        if (t >= 19.0 || (t >= 15.5 && t < 16.0)) return;
        at(t, (w) => this.clap(w, 0.9));
      });

      // hats — 8ths, 16ths in the busier bars
      const div = b === 4 || b === 6 || b === 8 ? 0.125 : 0.25;
      for (let t = t0; t < t0 + BAR - 0.001; t += div) {
        if (t >= 19.2) break;
        const off = Math.round((t - t0) / 0.125) % 4;
        at(t, (w) => this.hat(w, off === 2 && div === 0.25, off === 0 ? 0.85 : 0.5));
      }

      // bass — syncopated
      if (!last) {
        [0, 0.75, 1.25, 1.5].forEach((o, i) =>
          at(t0 + o, (w) => this.sub(w, c.sub, i === 0 ? 0.42 : 0.2, i === 0 ? 1 : 0.8))
        );
      } else {
        at(t0, (w) => this.sub(w, c.sub, 1.3, 1));
      }

      // chord stab on the downbeat
      at(t0, (w) => this.stab(w, c.pad.map((f) => f * 2), 0.3, b >= 8 ? 1.15 : 0.9));

      // arpeggio 8ths
      if (b >= 2 && b <= 8) {
        for (let i = 0; i < 8; i++) {
          const t = t0 + i * 0.25;
          if (t >= 19.0 || (t >= 15.5 && t < 16.0)) continue;
          at(t, (w) => this.pluck(w, chordAt(t).arp[i % 4] * (i % 4 === 3 ? 0.5 : 1), i % 2 ? 0.6 : 0.95));
        }
      }
    }

    // ---- lead motif : enters at bar 4 (8.0s) -----------------------
    type Nt = [number, number, number]; // start, freq, dur
    const motif: Nt[] = [
      [8.0, N.E5, 0.45], [8.5, N.D5, 0.22], [8.75, N.C5, 0.7], [9.5, N.B4, 0.45],
      [10.0, N.C5, 0.45], [10.5, N.E5, 0.22], [10.75, N.A5, 0.9], [11.75, N.G5, 0.22],
      [12.0, N.E5, 0.45], [12.5, N.D5, 0.22], [12.75, N.C5, 0.7], [13.5, N.D5, 0.45],
      [14.0, N.E5, 0.9], [15.0, N.G5, 0.45],
      [16.0, N.A5, 0.9], [17.0, N.G5, 0.45], [17.5, N.E5, 0.45],
      [18.0, N.C5, 0.45], [18.5, N.D5, 0.45], [19.0, N.A4, 1.6],
    ];
    motif.forEach(([t, f, d]) => at(t, (w) => this.lead(w, f, d, t >= 16 ? 1.1 : 0.9)));

    // ---- edit accents : one per cut --------------------------------
    [6.0, 8.0, 10.0, 13.0].forEach((t) => {
      at(t - 0.32, (w) => this.whoosh(w, 0.4, 0.9));
      at(t, (w) => this.impact(w, 0.5));
    });
    at(15.5, (w) => this.riser(w, 0.5, 1.05));
    [15.5, 15.625, 15.75, 15.8125, 15.875, 15.9375].forEach((t, i) =>
      at(t, (w) => this.snare(w, 0.4 + i * 0.13))
    );
    at(16.0, (w) => this.impact(w, 1.15));
    at(16.0, (w) => this.whoosh(w, 0.6, 0.8));

    // ---- outro -----------------------------------------------------
    at(19.0, (w) => this.impact(w, 0.95));
    at(19.0, (w) => this.stab(w, CH.Am.pad.map((f) => f * 2), 1.4, 1.2));
    at(19.0, (w) => this.shimmer(w, 2.6));

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
    this.cursor = this.findIndex(compTime);
    this.running = true;
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setTargetAtTime(this._muted ? 0 : this._vol, ctx.currentTime, 0.02);
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = window.setInterval(() => this.tick(), 25);
    this.tick();
  }

  private findIndex(t: number) {
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
    const ctx = this.ctx;
    const horizon = ctx.currentTime + 0.22;
    while (this.cursor < this.events.length) {
      const e = this.events[this.cursor];
      const when = this.anchorCtx + (e.t - this.anchorComp) / this.rate;
      if (when > horizon) break;
      if (when >= ctx.currentTime - 0.02) {
        try {
          e.run(Math.max(when, ctx.currentTime + 0.001));
        } catch {
          /* voice failed, keep going */
        }
      }
      this.cursor++;
    }
  }

  /** hard re-sync (scrub / loop) */
  resync(compTime: number, rate = 1) {
    if (!this.ctx || !this.running) return;
    this.rate = rate;
    this.anchorCtx = this.ctx.currentTime + 0.05;
    this.anchorComp = compTime;
    this.cursor = this.findIndex(compTime);
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
    this.master.gain.setTargetAtTime(0.0001, now, 0.012);
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
    }, 70);
  }

  setMuted(m: boolean) {
    this._muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0.0001 : this._vol, this.ctx.currentTime, 0.02);
  }

  setVolume(v: number) {
    this._vol = v;
    if (this.ctx && !this._muted) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }

  /** 24-band spectrum 0..1 for the UI meter */
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

export const score = new Score();
export const MUSIC = { bpm: 120, beat: BEAT, bar: BAR, key: "A minor", title: "EMBER / 120" };
