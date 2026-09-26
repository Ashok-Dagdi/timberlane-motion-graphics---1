/* HOME / 80 — a short-film score. G major, 80 BPM, 8 bars = 24.000s.
   Felt piano, warm pad, soft chapter chimes, light pulse from bar 3. */

const BPM = 80;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

const N: Record<string, number> = {
  D2: 73.42, G2: 98, A2: 110, B2: 123.47, C3: 130.81, D3: 146.83, E3: 164.81,
  G3: 196, A3: 220, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23,
  G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.26, G5: 783.99, B5: 987.77,
};

type Ch = { root: number; pad: number[]; piano: number[] };
const CH: Record<string, Ch> = {
  G:  { root: N.G2, pad: [N.G3, N.B3, N.D4], piano: [N.D5, N.B4, N.G4, N.D4] },
  Em: { root: N.E3, pad: [N.E3, N.G3, N.B3], piano: [N.B4, N.G4, N.E4, N.B4] },
  C:  { root: N.C3, pad: [N.C4, N.E4, N.G4], piano: [N.G4, N.E5, N.C5, N.G4] },
  Am: { root: N.A2, pad: [N.A3, N.C4, N.E4], piano: [N.E5, N.C5, N.A4, N.E4] },
  D:  { root: N.D3, pad: [N.D3, N.F4, N.A3], piano: [N.A4, N.D5, N.F4, N.A4] },
};
const PROG = ["G", "Em", "C", "G", "Am", "D", "G", "G"];

export class Score {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private lim!: DynamicsCompressorNode;
  private revIn!: GainNode;
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
  private muted = false;
  private vol = 0.88;

  private init() {
    if (this.ctx) return;
    const AC: typeof AudioContext =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    this.ctx = ctx;
    this.lim = ctx.createDynamicsCompressor();
    this.lim.threshold.value = -12;
    this.lim.ratio.value = 8;
    this.lim.attack.value = 0.01;
    this.lim.release.value = 0.25;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.vol;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.82;
    this.master.connect(this.lim);
    this.lim.connect(this.analyser);
    this.lim.connect(ctx.destination);

    const conv = ctx.createConvolver();
    conv.buffer = this.makeIR(3.2, 2.2);
    const wet = ctx.createGain();
    wet.gain.value = 0.85;
    this.revIn = ctx.createGain();
    this.revIn.connect(conv);
    conv.connect(wet);
    wet.connect(this.master);

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
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
    }
    return buf;
  }

  private track<T extends AudioScheduledSourceNode>(node: T, stopAt: number) {
    this.active.push(node);
    node.onended = () => {
      const i = this.active.indexOf(node);
      if (i >= 0) this.active.splice(i, 1);
    };
    try { node.stop(stopAt); } catch { /* noop */ }
    return node;
  }

  private piano(t: number, f: number, vel = 0.7, dur = 2.4) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.2 * vel, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(this.master);
    const rs = ctx.createGain();
    rs.gain.value = 0.9;
    g.connect(rs);
    rs.connect(this.revIn);
    for (const [mult, amp, det] of [[1, 0.7, -4], [1, 0.5, 5], [2, 0.16, 2]] as const) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f * mult * Math.pow(2, det / 1200);
      const og = ctx.createGain();
      og.gain.value = amp;
      o.connect(og);
      og.connect(g);
      o.start(t);
      this.track(o, t + dur + 0.2);
    }
  }

  private pad(t: number, freqs: number[], dur: number, vel = 1) {
    const ctx = this.ctx!;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(500, t);
    lp.frequency.linearRampToValueAtTime(1400, t + dur * 0.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.07 * vel, t + 1.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.8);
    lp.connect(g);
    g.connect(this.master);
    const rs = ctx.createGain();
    rs.gain.value = 0.8;
    g.connect(rs);
    rs.connect(this.revIn);
    freqs.forEach((f) => {
      for (const det of [-7, 6]) {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = f * Math.pow(2, det / 1200);
        const og = ctx.createGain();
        og.gain.value = 0.18;
        o.connect(og);
        og.connect(lp);
        o.start(t);
        this.track(o, t + dur + 1);
      }
    });
  }

  private pulse(t: number, f: number, vel = 0.7) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.28 * vel, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    this.track(o, t + 0.7);
  }

  private chime(t: number, f: number, vel = 0.8) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.1 * vel, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    const rs = ctx.createGain();
    rs.gain.value = 1;
    g.connect(rs);
    rs.connect(this.revIn);
    [1, 2.01, 4].forEach((m, i) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f * m;
      const og = ctx.createGain();
      og.gain.value = 1 / (i + 1);
      o.connect(og);
      og.connect(g);
      o.start(t);
      this.track(o, t + 1.8);
    });
  }

  private hat(t: number, vel = 0.5) {
    const ctx = this.ctx!;
    const n = ctx.createBufferSource();
    n.buffer = this.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.05 * vel, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    n.connect(hp);
    hp.connect(g);
    g.connect(this.master);
    n.start(t);
    this.track(n, t + 0.08);
  }

  private arrange() {
    const ev: { t: number; run: (w: number) => void }[] = [];
    const at = (t: number, run: (w: number) => void) => ev.push({ t, run });
    PROG.forEach((name, bar) => {
      const c = CH[name];
      const t0 = bar * BAR;
      at(t0, (w) => this.pad(w, c.pad, BAR * 0.98, bar < 2 ? 0.55 : bar >= 6 ? 1.05 : 0.85));
      at(t0, (w) => this.chime(w, bar === 7 ? N.G5 : N.D5, bar === 6 ? 1 : 0.55));
      c.piano.forEach((f, i) => {
        if (i === 3 && bar % 2 === 0) return;
        at(t0 + i * 0.7, (w) => this.piano(w, f, 0.55 + (i === 0 ? 0.25 : 0), 2.2));
      });
      if (bar >= 2) {
        at(t0, (w) => this.pulse(w, c.root / 2, 0.85));
        at(t0 + BEAT * 2, (w) => this.pulse(w, c.root / 2, 0.55));
        at(t0 + BEAT, (w) => this.hat(w, 0.7));
        at(t0 + BEAT * 3, (w) => this.hat(w, 0.45));
      }
    });
    at(21, (w) => this.piano(w, N.G5, 0.9, 2.8));
    at(22.1, (w) => this.piano(w, N.B4, 0.6, 2.2));
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
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.vol, ctx.currentTime, 0.04);
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = window.setInterval(() => this.tick(), 30);
    this.tick();
  }

  private findIdx(t: number) {
    let lo = 0, hi = this.events.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.events[mid].t < t - 0.001) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  private tick() {
    if (!this.running || !this.ctx) return;
    const horizon = this.ctx.currentTime + 0.28;
    while (this.cursor < this.events.length) {
      const e = this.events[this.cursor];
      const when = this.anchorCtx + (e.t - this.anchorComp) / this.rate;
      if (when > horizon) break;
      if (when >= this.ctx.currentTime - 0.02) {
        try { e.run(Math.max(when, this.ctx.currentTime + 0.002)); } catch { /* keep going */ }
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
    this.master.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.02);
    const kill = [...this.active];
    this.active.length = 0;
    window.setTimeout(() => kill.forEach((n) => { try { n.stop(); } catch { /* */ } }), 90);
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0.0001 : this.vol, this.ctx.currentTime, 0.04);
  }

  spectrum(out: number[]) {
    if (!this.analyser) { for (let i = 0; i < out.length; i++) out[i] *= 0.9; return out; }
    const bins = this.analyser.frequencyBinCount;
    const data = new Uint8Array(bins);
    this.analyser.getByteFrequencyData(data);
    for (let i = 0; i < out.length; i++) {
      const a = Math.floor(Math.pow(i / out.length, 1.8) * bins);
      const b = Math.max(a + 1, Math.floor(Math.pow((i + 1) / out.length, 1.8) * bins));
      let m = 0;
      for (let j = a; j < b && j < bins; j++) m = Math.max(m, data[j]);
      out[i] = Math.max(out[i] * 0.86, m / 255);
    }
    return out;
  }
}

export const score6 = new Score();
export const MUSIC = { bpm: 80, key: "G major", title: "HOME / 80" };
