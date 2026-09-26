/* ===================================================================
   audio2.ts — "AMBER / 66" cinematic ambient score
   D minor, 66 BPM, 33 beats ≈ 30.000 s. Sparse piano + slow strings.
   Inspired by Nils Frahm / Ólafur Arnalds / Max Richter.
   =================================================================== */

const BPM = 66;
const BEAT = 60 / BPM; // 0.909 s
const BAR = BEAT * 4; // 3.636 s

const N: Record<string, number> = {
  D1: 36.71, F1: 43.65, G1: 49, A1: 55, C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98, A2: 110,
  Bb2: 116.54, C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196, A3: 220, Bb3: 233.08,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, Bb4: 466.16, C5: 523.25,
  D5: 587.33, E5: 659.26, F5: 698.46, G5: 783.99, A5: 880, C6: 1046.5, D6: 1174.66,
};

type Ch = { root: number; pad: number[]; piano: number[] };
const CH: Record<string, Ch> = {
  Dm:  { root: N.D2, pad: [N.D3, N.F3, N.A3], piano: [N.D5, N.F5, N.A5, N.C5] },
  Bb:  { root: N.Bb2, pad: [N.Bb3, N.D4, N.F4], piano: [N.D5, N.F5, N.Bb4, N.A5] },
  F:   { root: N.F2, pad: [N.F3, N.A3, N.C4], piano: [N.C5, N.E5, N.A5, N.G5] },
  C:   { root: N.C2, pad: [N.G3, N.C4, N.E4], piano: [N.E5, N.G5, N.C5, N.G5] },
  Am:  { root: N.A2, pad: [N.A3, N.C4, N.E4], piano: [N.E5, N.A5, N.C5, N.A4] },
  Gm:  { root: N.G2, pad: [N.G3, N.Bb3, N.D4], piano: [N.D5, N.G5, N.Bb4, N.F5] },
};

/** 8 bars = 29.09s; final bar extends to 30s with a hold */
const PROG: string[] = ["Dm", "Dm", "Bb", "F", "C", "Am", "Gm", "Dm"];

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
    const AC: typeof AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    this.ctx = ctx;

    this.lim = ctx.createDynamicsCompressor();
    this.lim.threshold.value = -10;
    this.lim.ratio.value = 12;
    this.lim.attack.value = 0.004;
    this.lim.release.value = 0.25;
    this.master = ctx.createGain();
    this.master.gain.value = this._muted ? 0 : this._vol;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.8;
    this.master.connect(this.lim);
    this.lim.connect(this.analyser);
    this.lim.connect(ctx.destination);

    // LUSH hall reverb
    const conv = ctx.createConvolver();
    conv.buffer = this.makeIR(4.2, 2.1);
    const revWet = ctx.createGain();
    revWet.gain.value = 1.0;
    this.revIn = ctx.createGain();
    this.revIn.gain.value = 1.0;
    const revLP = ctx.createBiquadFilter();
    revLP.type = "lowpass";
    revLP.frequency.value = 5800;
    this.revIn.connect(revLP);
    revLP.connect(conv);
    conv.connect(revWet);
    revWet.connect(this.master);

    // Long dotted-8th delay feeding the reverb
    const dly = ctx.createDelay(2);
    dly.delayTime.value = BEAT * 0.75;
    const fb = ctx.createGain();
    fb.gain.value = 0.42;
    const dlyLP = ctx.createBiquadFilter();
    dlyLP.type = "lowpass";
    dlyLP.frequency.value = 1800;
    this.dlyIn = ctx.createGain();
    this.dlyIn.connect(dly);
    dly.connect(dlyLP);
    dlyLP.connect(fb);
    fb.connect(dly);
    const dlyWet = ctx.createGain();
    dlyWet.gain.value = 0.34;
    dlyLP.connect(dlyWet);
    dlyWet.connect(this.master);
    dlyWet.connect(this.revIn);

    // noise buffer
    const len = ctx.sampleRate * 3;
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
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - x, decay) * (1 - Math.exp(-i / 1800));
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
    try { n.stop(stopAt); } catch { /* noop */ }
    return n;
  }

  private nz() {
    const s = this.ctx!.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    return s;
  }

  /* ---------- voices ---------- */

  /** Felt piano: soft attack, two detuned oscillators, filtered, heavy reverb */
  private piano(t: number, f: number, vel = 1, dur = 2.8) {
    const ctx = this.ctx!;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 0.8;
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.linearRampToValueAtTime(2600, t + 0.03);
    lp.frequency.exponentialRampToValueAtTime(900, t + Math.min(dur * 0.7, 1.2));

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.22 * vel, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.16 * vel, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.6);

    lp.connect(g);
    g.connect(this.master);

    // reverb + delay sends
    const rs = ctx.createGain();
    rs.gain.value = 0.95;
    g.connect(rs);
    rs.connect(this.revIn);
    const ds = ctx.createGain();
    ds.gain.value = 0.28;
    g.connect(ds);
    ds.connect(this.dlyIn);

    // Two detuned triangle+sine pairs per partial (felt piano warmth)
    for (const [mult, amp, det] of [
      [1, 0.36, -3], [1, 0.3, 4],
      [2, 0.14, -5], [2, 0.1, 6],
      [3, 0.06, 0],
    ] as const) {
      const o1 = ctx.createOscillator();
      o1.type = mult === 1 ? "sine" : "triangle";
      o1.frequency.value = f * mult * Math.pow(2, det / 1200);
      const og = ctx.createGain();
      og.gain.value = amp;
      o1.connect(og);
      og.connect(lp);
      o1.start(t);
      this.track(o1, t + dur + 1.0);
    }

    // Hammer thump (noise burst)
    const n = this.nz();
    const hp = ctx.createBiquadFilter();
    hp.type = "bandpass";
    hp.frequency.value = 160;
    hp.Q.value = 1.2;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.linearRampToValueAtTime(0.05 * vel, t + 0.002);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    n.connect(hp);
    hp.connect(ng);
    ng.connect(this.master);
    n.start(t);
    this.track(n, t + 0.14);
  }

  /** Slow string section (sawtooth chorus, filter swell) */
  private strings(t: number, freqs: number[], dur: number, vel = 1) {
    const ctx = this.ctx!;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 0.9;
    lp.frequency.setValueAtTime(420, t);
    lp.frequency.linearRampToValueAtTime(2400, t + Math.min(dur * 0.5, 3));
    lp.frequency.linearRampToValueAtTime(900, t + dur);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.09 * vel, t + Math.min(1.4, dur * 0.5));
    g.gain.setValueAtTime(0.09 * vel, t + dur * 0.75);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.2);

    lp.connect(g);
    g.connect(this.master);
    const rs = ctx.createGain();
    rs.gain.value = 0.95;
    g.connect(rs);
    rs.connect(this.revIn);

    freqs.forEach((f, fi) => {
      for (const det of [-9, -3, 3, 9]) {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = f * Math.pow(2, det / 1200);
        const og = ctx.createGain();
        og.gain.value = 0.18 / (1 + fi * 0.4);
        // slow vibrato per voice
        const v = ctx.createOscillator();
        v.type = "sine";
        v.frequency.value = 4.2 + Math.random() * 0.8;
        const vg = ctx.createGain();
        vg.gain.value = f * 0.004;
        v.connect(vg);
        vg.connect(o.frequency);
        o.connect(og);
        og.connect(lp);
        o.start(t);
        v.start(t);
        this.track(o, t + dur + 1.5);
        this.track(v, t + dur + 1.5);
      }
    });
  }

  /** Sub bass swell — enters bar 3 */
  private sub(t: number, f: number, dur: number, vel = 1) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.22 * vel, t + 1.2);
    g.gain.setValueAtTime(0.22 * vel, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.4);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 240;
    o.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    const rs = ctx.createGain();
    rs.gain.value = 0.35;
    g.connect(rs);
    rs.connect(this.revIn);
    o.start(t);
    this.track(o, t + dur + 1.8);
  }

  /** Breathy room tone — continuous air throughout */
  private roomTone(t: number, dur: number) {
    const ctx = this.ctx!;
    const n = this.nz();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 420;
    bp.Q.value = 0.4;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1100;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.025, t + 1.5);
    g.gain.setValueAtTime(0.025, t + dur - 1.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(bp);
    bp.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    n.start(t);
    this.track(n, t + dur + 0.1);
  }

  /** High shimmer — airy bell chord at peak */
  private shimmer(t: number, dur: number, vel = 1) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.04 * vel, t + 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const rs = ctx.createGain();
    rs.gain.value = 1.1;
    g.connect(rs);
    rs.connect(this.revIn);
    [N.A5, N.D6, N.F5].forEach((f, i) => {
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

  /* ---------- arrangement ---------- */
  private arrange() {
    const ev: { t: number; run: (w: number) => void }[] = [];
    const at = (t: number, run: (w: number) => void) => ev.push({ t, run });

    // room tone
    at(0, (w) => this.roomTone(w, 30));

    // PIANO MELODY — sparse, one phrase per bar
    type Note = [number, number, number, number]; // t, f, vel, dur
    const melody: Note[] = [
      // bar 0 (0.0s) — Dm
      [0.0, N.D4, 0.75, 3.6],
      [1.82, N.A4, 0.55, 2.2],
      // bar 1 (3.6s)
      [3.64, N.F4, 0.8, 3.0],
      [5.45, N.C5, 0.6, 2.2],
      // bar 2 (7.3s) — Bb (strings enter)
      [7.27, N.Bb4, 0.85, 3.4],
      [9.09, N.D5, 0.65, 2.4],
      [10.91, N.F5, 0.55, 1.8],
      // bar 3 (10.9s) — F
      [10.91, N.F5, 0.85, 3.2],
      [12.73, N.C5, 0.6, 2.0],
      [14.55, N.A4, 0.55, 2.2],
      // bar 4 (14.5s) — C
      [14.55, N.C5, 0.85, 3.2],
      [16.36, N.E5, 0.65, 2.0],
      [18.18, N.G5, 0.55, 2.2],
      // bar 5 (18.2s) — Am
      [18.18, N.A5, 0.85, 3.4],
      [20.00, N.E5, 0.65, 2.0],
      [21.82, N.C5, 0.55, 2.2],
      // bar 6 (21.8s) — Gm (peak, shimmer)
      [21.82, N.D5, 0.9, 3.4],
      [23.64, N.G5, 0.7, 2.2],
      [25.45, N.Bb4, 0.6, 2.4],
      // bar 7 (25.5s) — Dm resolve
      [25.45, N.A5, 0.95, 4.2],
      [27.27, N.D5, 0.7, 2.4],
      [29.09, N.D6, 0.6, 3.0],
    ];
    melody.forEach(([t, f, v, d]) => at(t, (w) => this.piano(w, f, v, d)));

    // CHORD PROGRESSION
    PROG.forEach((name, bar) => {
      const c = CH[name];
      const t0 = bar * BAR;
      const vel = bar < 2 ? 0.5 : bar < 4 ? 0.75 : bar < 6 ? 1.0 : bar === 6 ? 1.15 : 0.9;
      at(t0, (w) => this.strings(w, c.pad, BAR * 0.96, vel));
      if (bar >= 2) at(t0, (w) => this.sub(w, c.root, BAR * 0.96, bar >= 6 ? 0.9 : 0.7));
    });

    // SHIMMER at peak (bar 6)
    at(21.82, (w) => this.shimmer(w, 3.4, 1.05));

    // FINAL HOLD CHORD (bar 7)
    at(25.45, (w) => this.strings(w, [N.D3, N.A3, N.D4, N.F4], 4.6, 1.05));
    at(25.45, (w) => this.sub(w, N.D1, 4.6, 0.9));

    return ev.sort((a, b) => a.t - b.t);
  }

  /* ---------- transport ---------- */
  async start(compTime: number, rate = 1) {
    this.init();
    const ctx = this.ctx!;
    if (ctx.state === "suspended") await ctx.resume();
    this.rate = rate;
    this.anchorCtx = ctx.currentTime + 0.12;
    this.anchorComp = compTime;
    this.cursor = this.findIdx(compTime);
    this.running = true;
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setTargetAtTime(this._muted ? 0 : this._vol, ctx.currentTime, 0.04);
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = window.setInterval(() => this.tick(), 28);
    this.tick();
  }

  private findIdx(t: number) {
    let lo = 0, hi = this.events.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.events[mid].t < t - 0.001) lo = mid + 1; else hi = mid;
    }
    return lo;
  }

  private tick() {
    if (!this.running || !this.ctx) return;
    const horizon = this.ctx.currentTime + 0.25;
    while (this.cursor < this.events.length) {
      const e = this.events[this.cursor];
      const when = this.anchorCtx + (e.t - this.anchorComp) / this.rate;
      if (when > horizon) break;
      if (when >= this.ctx.currentTime - 0.02) {
        try { e.run(Math.max(when, this.ctx.currentTime + 0.002)); } catch { /* noop */ }
      }
      this.cursor++;
    }
  }

  resync(compTime: number, rate = 1) {
    if (!this.ctx || !this.running) return;
    this.rate = rate;
    this.anchorCtx = this.ctx.currentTime + 0.06;
    this.anchorComp = compTime;
    this.cursor = this.findIdx(compTime);
  }

  stop() {
    this.running = false;
    if (this.timer !== null) { clearInterval(this.timer); this.timer = null; }
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(0.0001, now, 0.02);
    const kill = [...this.active];
    this.active.length = 0;
    window.setTimeout(() => {
      kill.forEach((n) => { try { n.stop(); } catch { /* */ } try { n.disconnect(); } catch { /* */ } });
    }, 120);
  }

  setMuted(m: boolean) {
    this._muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0.0001 : this._vol, this.ctx.currentTime, 0.04);
  }
  setVolume(v: number) {
    this._vol = v;
    if (this.ctx && !this._muted) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.04);
  }

  spectrum(out: number[]) {
    if (!this.analyser) { for (let i = 0; i < out.length; i++) out[i] *= 0.9; return out; }
    const n = this.analyser.frequencyBinCount;
    const data = new Uint8Array(n);
    this.analyser.getByteFrequencyData(data);
    const bands = out.length;
    for (let i = 0; i < bands; i++) {
      const a = Math.floor(Math.pow(i / bands, 2.1) * n);
      const b = Math.max(a + 1, Math.floor(Math.pow((i + 1) / bands, 2.1) * n));
      let m = 0;
      for (let j = a; j < b && j < n; j++) m = Math.max(m, data[j]);
      out[i] = Math.max(out[i] * 0.88, (m / 255) * (0.55 + 0.8 * (i / bands)));
    }
    return out;
  }
}

export const score2 = new Score();
export const MUSIC = { bpm: 66, beat: 60 / 66, key: "D minor", title: "AMBER / 66" };
