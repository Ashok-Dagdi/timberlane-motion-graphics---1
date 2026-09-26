/* GRAIN / 96 — industrial percussion score for the MATERIAL TRUTH campaign.
   E minor, 96 BPM, 8 bars = 20.000s. Kick, metallic clank backbeat,
   hammer hits on every headline slam, saw-buzz sweeps into cuts,
   syncopated sub, detuned stabs, measuring ticks, stamp + ring-out. */

const BEAT = 0.625;
const BAR = 2.5;

const N = {
  E2: 82.41, C2: 65.41, G2: 98, D2: 73.42,
  C3: 130.81, D3: 146.83, E3: 164.81, Fs3: 185, G3: 196, A3: 220, B3: 246.94, D4: 293.66,
  E5: 659.26, G5: 783.99, B5: 987.77,
};

type Ch = { root: number; stab: number[] };
const CH: Record<string, Ch> = {
  Em: { root: N.E2, stab: [N.E3, N.G3, N.B3] },
  C: { root: N.C2, stab: [N.C3, N.E3, N.G3] },
  G: { root: N.G2, stab: [N.G3, N.B3, N.D4] },
  D: { root: N.D2, stab: [N.D3, N.Fs3, N.A3] },
};
const PROG = ["Em", "Em", "C", "G", "D", "Em", "C", "Em"];

export class Score {
  ctx: AudioContext | null = null;
  analyser!: AnalyserNode;
  private master!: GainNode;
  private duck!: GainNode;
  private revIn!: GainNode;
  private noise!: AudioBuffer;
  private active: AudioScheduledSourceNode[] = [];
  private events: { t: number; run: (w: number) => void }[] = [];
  private cursor = 0;
  private timer: number | null = null;
  private anchorCtx = 0;
  private anchorComp = 0;
  private rate = 1;
  private muted = false;
  private vol = 0.9;
  running = false;

  private init() {
    if (this.ctx) return;
    const AC: typeof AudioContext =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    this.ctx = ctx;
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -9;
    lim.ratio.value = 12;
    lim.attack.value = 0.003;
    lim.release.value = 0.16;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.vol;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.72;
    this.master.connect(lim);
    lim.connect(this.analyser);
    lim.connect(ctx.destination);

    this.duck = ctx.createGain();
    this.duck.connect(this.master);

    const conv = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 1.8);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    conv.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.5;
    this.revIn = ctx.createGain();
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 300;
    this.revIn.connect(hp);
    hp.connect(conv);
    conv.connect(wet);
    wet.connect(this.master);

    const nl = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, nl, ctx.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nl; i++) nd[i] = Math.random() * 2 - 1;

    this.events = this.arrange();
  }

  private track<T extends AudioScheduledSourceNode>(n: T, stopAt: number) {
    this.active.push(n);
    n.onended = () => {
      const i = this.active.indexOf(n);
      if (i >= 0) this.active.splice(i, 1);
    };
    try { n.stop(stopAt); } catch { /* noop */ }
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

  private send(node: AudioNode, amt: number) {
    const s = this.ctx!.createGain();
    s.gain.value = amt;
    node.connect(s);
    s.connect(this.revIn);
  }

  private kick(t: number, vel = 1) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.08);
    const g = ctx.createGain();
    this.env(g, t, 0.003, 0.4, 1.0 * vel);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    this.track(o, t + 0.5);
    const d = this.duck.gain;
    d.setValueAtTime(1, t);
    d.linearRampToValueAtTime(0.45, t + 0.02);
    d.setTargetAtTime(1, t + 0.05, 0.09);
  }

  /** metallic clank — inharmonic partials + snap */
  private clank(t: number, vel = 1) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    this.env(g, t, 0.001, 0.22, 0.13 * vel);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2400;
    bp.Q.value = 0.8;
    g.connect(bp);
    bp.connect(this.master);
    this.send(bp, 0.45);
    [540, 1490, 2916, 4822].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = "square";
      o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.value = 0.5 / (i + 1);
      o.connect(og);
      og.connect(g);
      o.start(t);
      this.track(o, t + 0.3);
    });
    const n = this.nz();
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1800;
    const ng = ctx.createGain();
    this.env(ng, t, 0.001, 0.09, 0.32 * vel);
    n.connect(hp);
    hp.connect(ng);
    ng.connect(this.master);
    this.send(ng, 0.3);
    n.start(t);
    this.track(n, t + 0.15);
  }

  /** hammer — wooden thud for headline slams */
  private hammer(t: number, vel = 1) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.1);
    const g = ctx.createGain();
    this.env(g, t, 0.001, 0.2, 0.75 * vel);
    o.connect(g);
    g.connect(this.master);
    this.send(g, 0.35);
    o.start(t);
    this.track(o, t + 0.3);
    const n = this.nz();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 900;
    bp.Q.value = 1.2;
    const ng = ctx.createGain();
    this.env(ng, t, 0.001, 0.06, 0.5 * vel);
    n.connect(bp);
    bp.connect(ng);
    ng.connect(this.master);
    n.start(t);
    this.track(n, t + 0.1);
  }

  private hat(t: number, vel = 1) {
    const ctx = this.ctx!;
    const n = this.nz();
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 8200;
    const g = ctx.createGain();
    this.env(g, t, 0.001, 0.03, 0.1 * vel);
    n.connect(hp);
    hp.connect(g);
    g.connect(this.master);
    n.start(t);
    this.track(n, t + 0.06);
  }

  /** measuring tick */
  private tick(t: number, f = 2600, vel = 1) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const g = ctx.createGain();
    this.env(g, t, 0.001, 0.035, 0.08 * vel);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    this.track(o, t + 0.06);
  }

  /** circular-saw buzz sweep into a cut */
  private saw(t: number, dur: number, vel = 1) {
    const ctx = this.ctx!;
    const n = this.nz();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 6;
    bp.frequency.setValueAtTime(700, t);
    bp.frequency.exponentialRampToValueAtTime(5200, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22 * vel, t + dur * 0.92);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
    const trem = ctx.createOscillator();
    trem.frequency.value = 34;
    const tg = ctx.createGain();
    tg.gain.value = 0.5;
    const am = ctx.createGain();
    am.gain.value = 0.5;
    trem.connect(tg);
    tg.connect(am.gain);
    n.connect(bp);
    bp.connect(am);
    am.connect(g);
    g.connect(this.master);
    n.start(t);
    trem.start(t);
    this.track(n, t + dur + 0.1);
    this.track(trem, t + dur + 0.1);
  }

  private sub(t: number, f: number, dur: number, vel = 1) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = f;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 6;
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.exponentialRampToValueAtTime(180, t + Math.min(dur, 0.18));
    const g = ctx.createGain();
    this.env(g, t, 0.006, dur, 0.42 * vel);
    o.connect(lp);
    lp.connect(g);
    g.connect(this.duck);
    o.start(t);
    this.track(o, t + dur + 0.05);
  }

  private stab(t: number, freqs: number[], dur = 0.3, vel = 1) {
    const ctx = this.ctx!;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 3;
    lp.frequency.setValueAtTime(3600, t);
    lp.frequency.exponentialRampToValueAtTime(700, t + dur);
    const g = ctx.createGain();
    this.env(g, t, 0.005, dur, 0.16 * vel);
    lp.connect(g);
    g.connect(this.duck);
    this.send(g, 0.35);
    freqs.forEach((f) => {
      for (const det of [-10, 10]) {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = f * Math.pow(2, det / 1200);
        o.connect(lp);
        o.start(t);
        this.track(o, t + dur + 0.2);
      }
    });
  }

  private impact(t: number, vel = 1) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(28, t + 1);
    const g = ctx.createGain();
    this.env(g, t, 0.008, 1.2, 0.85 * vel);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    this.track(o, t + 1.4);
    const n = this.nz();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(6000, t);
    lp.frequency.exponentialRampToValueAtTime(400, t + 0.8);
    const ng = ctx.createGain();
    this.env(ng, t, 0.002, 0.8, 0.22 * vel);
    n.connect(lp);
    lp.connect(ng);
    ng.connect(this.master);
    this.send(ng, 0.6);
    n.start(t);
    this.track(n, t + 1);
  }

  private bell(t: number, f: number, vel = 1) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    this.env(g, t, 0.002, 1.8, 0.07 * vel);
    g.connect(this.master);
    this.send(g, 1);
    [1, 2.76, 5.4].forEach((m, i) => {
      const o = ctx.createOscillator();
      o.frequency.value = f * m;
      const og = ctx.createGain();
      og.gain.value = 1 / (i + 1.5);
      o.connect(og);
      og.connect(g);
      o.start(t);
      this.track(o, t + 2);
    });
  }

  private arrange() {
    const ev: { t: number; run: (w: number) => void }[] = [];
    const at = (t: number, run: (w: number) => void) => ev.push({ t, run });

    // bar 0 — headline slams
    at(0, (w) => this.impact(w, 0.7));
    [0.1, 0.1 + BEAT, 0.1 + BEAT * 2].forEach((t, i) => at(t, (w) => this.hammer(w, 0.8 + i * 0.12)));
    at(0, (w) => this.stab(w, CH.Em.stab, 1.2, 0.6));
    at(0.1 + BEAT * 2, (w) => this.kick(w, 0.9));
    at(1.9, (w) => this.saw(w, 0.6, 0.9));

    // bars 1–6 groove
    for (let b = 1; b <= 6; b++) {
      const t0 = b * BAR;
      const c = CH[PROG[b]];
      for (let k = 0; k < 4; k++) at(t0 + k * BEAT, (w) => this.kick(w, k === 0 ? 1 : 0.9));
      at(t0 + BEAT, (w) => this.clank(w, 0.95));
      at(t0 + BEAT * 3, (w) => this.clank(w, 1));
      const div = b >= 2 ? BEAT / 4 : BEAT / 2;
      for (let x = t0; x < t0 + BAR - 0.001; x += div) {
        const off = Math.round((x - t0) / (BEAT / 4)) % 4;
        at(x, (w) => this.hat(w, off === 2 ? 1 : 0.55));
      }
      [0, 0.47, 0.94, 1.25, 1.72, 2.03].forEach((o, i) =>
        at(t0 + o, (w) => this.sub(w, i === 3 ? c.root * 1.5 : c.root, i === 0 || i === 3 ? 0.36 : 0.18, i === 0 ? 1 : 0.8))
      );
      at(t0, (w) => this.stab(w, c.stab, 0.34, 1));
      at(t0 + BEAT * 1.5, (w) => this.stab(w, c.stab, 0.2, 0.7));
      at(t0, (w) => this.impact(w, 0.35));
      if (b < 6) at(t0 + BAR - 0.55, (w) => this.saw(w, 0.55, 0.8));
    }

    // layers explode — ticks as each label lands
    [3.3, 3.4, 3.5, 3.6, 3.7].forEach((t, i) => at(t, (w) => this.tick(w, 1800 + i * 300, 0.9)));
    // workshop — tolerance tightening: accelerating measuring ticks
    for (let i = 0; i < 14; i++) {
      const t = 12.8 + 1.3 * (1 - Math.pow(1 - i / 14, 1.6));
      at(t, (w) => this.tick(w, 2000 + i * 120, 0.8));
    }
    // QC ticks
    for (let i = 0; i < 7; i++) at(12.5 + 0.6 + i * 0.17, (w) => this.tick(w, 3200, 1));
    // site stamp
    at(16.75, (w) => this.hammer(w, 1.2));
    at(16.75, (w) => this.impact(w, 0.8));

    // bar 7 — lockup
    const e0 = 7 * BAR;
    at(e0, (w) => this.impact(w, 1.05));
    at(e0, (w) => this.kick(w, 1.05));
    at(e0, (w) => this.stab(w, CH.Em.stab, 1.6, 1.2));
    at(e0, (w) => this.sub(w, N.E2, 1.6, 1));
    at(e0 + 0.25, (w) => this.hammer(w, 1));
    at(e0 + 0.25 + BEAT, (w) => this.hammer(w, 1.1));
    at(e0 + 0.25 + BEAT, (w) => this.clank(w, 0.9));
    at(e0 + 0.3, (w) => this.bell(w, N.E5, 0.9));
    at(e0 + 1.0, (w) => this.bell(w, N.G5, 0.8));
    at(e0 + 1.6, (w) => this.bell(w, N.B5, 0.8));

    return ev.sort((a, b) => a.t - b.t);
  }

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
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.vol, ctx.currentTime, 0.02);
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = window.setInterval(() => this.pump(), 25);
    this.pump();
  }

  private findIdx(t: number) {
    let lo = 0, hi = this.events.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.events[mid].t < t - 0.0005) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  private pump() {
    if (!this.running || !this.ctx) return;
    const horizon = this.ctx.currentTime + 0.22;
    while (this.cursor < this.events.length) {
      const e = this.events[this.cursor];
      const when = this.anchorCtx + (e.t - this.anchorComp) / this.rate;
      if (when > horizon) break;
      if (when >= this.ctx.currentTime - 0.02) {
        try { e.run(Math.max(when, this.ctx.currentTime + 0.001)); } catch { /* keep going */ }
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
    if (this.timer !== null) { clearInterval(this.timer); this.timer = null; }
    if (!this.ctx) return;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.015);
    const kill = [...this.active];
    this.active.length = 0;
    window.setTimeout(() => kill.forEach((n) => { try { n.stop(); } catch { /* */ } }), 80);
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0.0001 : this.vol, this.ctx.currentTime, 0.02);
  }

  spectrum(out: number[]) {
    if (!this.analyser) { for (let i = 0; i < out.length; i++) out[i] *= 0.9; return out; }
    const bins = this.analyser.frequencyBinCount;
    const data = new Uint8Array(bins);
    this.analyser.getByteFrequencyData(data);
    for (let i = 0; i < out.length; i++) {
      const a = Math.floor(Math.pow(i / out.length, 1.9) * bins);
      const b = Math.max(a + 1, Math.floor(Math.pow((i + 1) / out.length, 1.9) * bins));
      let m = 0;
      for (let j = a; j < b && j < bins; j++) m = Math.max(m, data[j]);
      out[i] = Math.max(out[i] * 0.82, (m / 255) * (0.6 + 0.6 * (i / out.length)));
    }
    return out;
  }
}

export const score7 = new Score();
export const MUSIC = { bpm: 96, key: "E minor", title: "GRAIN / 96" };
