/* ==================================================================
   music.js — "Warm Concrete", the 30 s score for the Timberlane reel
   ------------------------------------------------------------------
   Everything is synthesised in WebAudio (no sample files, nothing to
   license, nothing to download) at 120 BPM, and the arrangement is
   written to land on the reel's cuts: sections change on bar
   boundaries every 4 s, so every hit in `scene.beats` is also a hit
   in the music.

   It also satisfies the repo's offline-render contract (see
   src/render.tsx → __renderAudio): a plain object with
     ctx, master, events[{ t, run(when) }], init(), vol, muted
   so `node tools/render.mjs --only 08` bakes the same mix into the MP4
   without a realtime clock or a timer loop.
   ================================================================== */
(function (global) {
  "use strict";
  var TLM = (global.TLM = global.TLM || {});

  var BPM = 120;
  var B = 60 / BPM; /* 0.500 s per beat */
  var BAR = B * 4; /* 2.000 s per bar  */
  var BARS = 16; /* 32 s chart, film stops at 30  */
  var DUR = 30;

  var mtof = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };

  /* --- the chart: Am9 · Fmaj7 · Cmaj7 · G6, one chord per bar, 4× round --- */
  var CHORDS = [
    { root: 45, notes: [57, 60, 64, 71], name: "Am9" },
    { root: 41, notes: [53, 57, 60, 64], name: "Fmaj7" },
    { root: 48, notes: [52, 55, 60, 64], name: "Cmaj7" },
    { root: 43, notes: [55, 59, 62, 67], name: "G6" },
  ];

  /* --- section per bar: which instruments are up, how hard it plays ---- */
  function sec(bar) {
    var t = bar * BAR;
    if (t < 4) return { k: "intro", pad: 1, sub: 1, arp: 0.4, drums: 0, bass: 0, hat: 0, air: 0.5 };
    if (t < 8) return { k: "build", pad: 1, sub: 1, arp: 1, drums: 1, bass: 0.5, hat: 0.6, air: 0.7 };
    if (t < 12) return { k: "build2", pad: 1, sub: 1, arp: 1, drums: 1, bass: 0.8, hat: 0.8, air: 0.8, clap: 1 };
    if (t < 20) return { k: "groove", pad: 1, sub: 1, arp: 1, drums: 1, bass: 1, hat: 1, air: 1, clap: 1, ride: 0.5 };
    if (t < 24) return { k: "break", pad: 1, sub: 0.7, arp: 0.7, drums: 0.35, bass: 0, hat: 0.3, air: 0.9, filter: 1 };
    if (t < 28) return { k: "drop", pad: 1, sub: 1, arp: 1, drums: 1, bass: 1, hat: 1, air: 1.1, clap: 1, ride: 0.8 };
    return { k: "outro", pad: 1, sub: 0.8, arp: 0.35, drums: bar % 2 === 0 ? 0.3 : 0, bass: 0, hat: 0.2, air: 0.6 };
  }

  var HITS = [4, 8, 12, 16, 20, 24, 27.5, 30 - 0.5]; /* reel cuts */

  /* ---------------------------------------------------------------- */
  var S = {};
  S.bpm = BPM;
  S.duration = DUR;
  S.title = "Warm Concrete";
  S.key = "A minor";
  S.ctx = null;
  S.master = null;
  S.events = [];
  S.vol = 0.85;
  S._vol = 0.85;
  S.muted = false;
  S._muted = false;
  S.rate = 1;
  S._scoreT = 0;
  S._startedAt = 0;
  S.cursor = 0;
  S.playing = false;

  /* small deterministic noise, so the offline bounce is reproducible */
  var seed = 20260108;
  function rnd() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  S.init = function () {
    if (S.ctx) return S.ctx;
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return null;
    var ctx = (S.ctx = new AC());
    var now = 0;

    /* master chain: level → gentle 2-bus compression → analyser → out */
    var master = (S.master = ctx.createGain());
    master.gain.value = S.muted ? 0 : S.vol;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -13;
    comp.knee.value = 24;
    comp.ratio.value = 3.1;
    comp.attack.value = 0.006;
    comp.release.value = 0.17;
    var tone = ctx.createBiquadFilter();
    tone.type = "highshelf";
    tone.frequency.value = 5200;
    tone.gain.value = 1.8;
    var pump = (S.pump = ctx.createGain());
    pump.gain.value = 1;
    var an = (S.an = ctx.createAnalyser());
    an.fftSize = 1024;
    an.smoothingTimeConstant = 0.62;
    S.freq = new Uint8Array(an.frequencyBinCount);
    master.connect(tone);
    tone.connect(pump);
    pump.connect(comp);
    comp.connect(an);
    an.connect(ctx.destination);

    /* buses.
       Two interchangeable "generation" gains sit between the instrument buses
       and the master: on every scrub we mute the live one and flip to the
       other, so already-scheduled voices are cut rather than piling up on top
       of the re-scheduled ones. (Timers aren't needed, so the offline bounce
       — which never calls kill() — is unaffected.) */
    S._gen = [ctx.createGain(), ctx.createGain()];
    S._gen[0].gain.value = 1;
    S._gen[1].gain.value = 1;
    S._gen[0].connect(master);
    S._gen[1].connect(master);
    S._gi = 0;
    S.dry = ctx.createGain();
    S.dry.gain.value = 1;
    S.dry.connect(S._gen[0]);

    /* plate-ish reverb from a synthesised noise impulse */
    var conv = ctx.createConvolver();
    var sr = ctx.sampleRate;
    var ir = ctx.createBuffer(2, Math.floor(sr * 2.2), sr);
    for (var ch = 0; ch < 2; ch++) {
      var d = ir.getChannelData(ch);
      for (var i = 0; i < d.length; i++) {
        var x = i / d.length;
        d[i] = (rnd() * 2 - 1) * Math.pow(1 - x, 2.7) * (i < sr * 0.008 ? 0.2 : 1);
      }
    }
    conv.buffer = ir;
    var revIn = (S.revIn = ctx.createGain());
    var revLvl = ctx.createGain();
    revLvl.gain.value = 0.85;
    var revLp = ctx.createBiquadFilter();
    revLp.type = "lowpass";
    revLp.frequency.value = 4200;
    revIn.connect(revLp);
    revLp.connect(conv);
    conv.connect(revLvl);
    revLvl.connect(master);
    /* the reverb returns to the *live* generation bus and is heard through the
       pump, so the whole record breathes together */
    revLvl.disconnect();
    S.revTap = revLvl;
    revLvl.connect(S._gen[0]);

    /* dotted-8th feedback delay for the arpeggio */
    var dl = (S.dly = ctx.createDelay(2));
    dl.delayTime.value = B * 0.75;
    var dFb = ctx.createGain();
    dFb.gain.value = 0.34;
    var dLp = ctx.createBiquadFilter();
    dLp.type = "lowpass";
    dLp.frequency.value = 2600;
    var dOut = ctx.createGain();
    dOut.gain.value = 0.5;
    S.dlyIn = ctx.createGain();
    S.dlyIn.gain.value = 1;
    S.dlyIn.connect(dl);
    dl.connect(dLp);
    dLp.connect(dFb);
    dFb.connect(dl);
    dLp.connect(dOut);
    dOut.connect(S.dry);
    dOut.connect(revIn);

    var nb = (S.noise = ctx.createBuffer(1, Math.floor(sr * 2.4), sr));
    var nd = nb.getChannelData(0);
    for (var j = 0; j < nd.length; j++) nd[j] = rnd() * 2 - 1;

    if (!S.events.length) S.arrange();
    return ctx;
  };

  /* ---------- voices (every one takes an absolute `when`) ---------- */
  function env(g, when, a, d, s, rel, peak) {
    var p = g.gain;
    p.cancelScheduledValues(when);
    p.setValueAtTime(0.0001, when);
    p.linearRampToValueAtTime(peak, when + a);
    p.exponentialRampToValueAtTime(Math.max(0.0002, peak * s), when + a + d);
    p.exponentialRampToValueAtTime(0.0001, when + a + d + rel);
  }

  S.voices = {
    /* warm pad: 4 detuned saws → lowpass with a slow LFO, wide */
    pad: function (when, freqs, dur, amp) {
      var ctx = S.ctx;
      var out = ctx.createGain();
      out.gain.value = 0;
      var lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 780;
      lp.Q.value = 0.7;
      var lfo = ctx.createOscillator();
      var lfoA = ctx.createGain();
      lfo.frequency.value = 0.09;
      lfoA.gain.value = 360;
      lfo.connect(lfoA);
      lfoA.connect(lp.frequency);
      lfo.start(when);
      lfo.stop(when + dur + 1.4);
      freqs.forEach(function (f, i) {
        var o = ctx.createOscillator();
        o.type = i % 2 ? "sawtooth" : "triangle";
        o.frequency.value = f;
        o.detune.value = (i - 1.5) * 7;
        var pan = ctx.createStereoPanner();
        pan.pan.value = (i / (freqs.length - 1) - 0.5) * 1.2;
        var g = ctx.createGain();
        g.gain.value = 0.16;
        o.connect(g);
        g.connect(pan);
        pan.connect(lp);
        o.start(when);
        o.stop(when + dur + 1.2);
      });
      lp.connect(out);
      var a = 0.5, r = 0.9;
      out.gain.setValueAtTime(0.0001, when);
      out.gain.linearRampToValueAtTime(amp, when + a);
      out.gain.setValueAtTime(amp, when + dur - r);
      out.gain.exponentialRampToValueAtTime(0.0001, when + dur + 0.3);
      out.connect(S.dry);
      var rv = ctx.createGain();
      rv.gain.value = 0.65;
      out.connect(rv);
      rv.connect(S.revIn);
    },
    /* sub: sine + a hint of triangle, tuned to be felt more than heard */
    sub: function (when, f, dur, amp) {
      var ctx = S.ctx;
      var g = ctx.createGain();
      var o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(f * 1.02, when);
      o.frequency.exponentialRampToValueAtTime(f, when + 0.09);
      var o2 = ctx.createOscillator();
      o2.type = "triangle";
      o2.frequency.value = f;
      var g2 = ctx.createGain();
      g2.gain.value = 0.22;
      var lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 190;
      o.connect(g);
      o2.connect(g2);
      g2.connect(g);
      g.connect(lp);
      lp.connect(S.dry);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(amp, when + 0.03);
      g.gain.setValueAtTime(amp, when + dur - 0.25);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      o.start(when);
      o2.start(when);
      o.stop(when + dur + 0.1);
      o2.stop(when + dur + 0.1);
    },
    /* pluck: the melodic hook — saw through a closing filter, into delay */
    pluck: function (when, f, dur, amp, bright) {
      var ctx = S.ctx;
      var o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f;
      var o2 = ctx.createOscillator();
      o2.type = "square";
      o2.frequency.value = f * 2.002;
      var g2 = ctx.createGain();
      g2.gain.value = 0.1;
      var lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.Q.value = 6;
      lp.frequency.setValueAtTime((bright || 2600) + f * 2, when);
      lp.frequency.exponentialRampToValueAtTime(Math.max(240, f * 1.6), when + dur * 0.9);
      var g = ctx.createGain();
      o.connect(lp);
      o2.connect(g2);
      g2.connect(lp);
      lp.connect(g);
      g.connect(S.dry);
      var d = ctx.createGain();
      d.gain.value = 0.34;
      g.connect(d);
      d.connect(S.dlyIn);
      env(g, when, 0.004, dur * 0.5, 0.22, dur * 0.6, amp);
      o.start(when);
      o2.start(when);
      o.stop(when + dur * 1.4 + 0.1);
      o2.stop(when + dur * 1.4 + 0.1);
    },
    /* bass: short filtered saw stabs that lock with the kick */
    bass: function (when, f, dur, amp) {
      var ctx = S.ctx;
      var o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f;
      var sub = ctx.createOscillator();
      sub.type = "sine";
      sub.frequency.value = f / 2;
      var lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.Q.value = 4;
      lp.frequency.setValueAtTime(160, when);
      lp.frequency.linearRampToValueAtTime(560, when + dur * 0.35);
      lp.frequency.linearRampToValueAtTime(200, when + dur);
      var g = ctx.createGain();
      var gs = ctx.createGain();
      gs.gain.value = 0.5;
      o.connect(lp);
      sub.connect(gs);
      gs.connect(lp);
      lp.connect(g);
      g.connect(S.dry);
      env(g, when, 0.008, dur * 0.55, 0.5, dur * 0.5, amp);
      o.start(when);
      sub.start(when);
      o.stop(when + dur + 0.05);
      sub.stop(when + dur + 0.05);
    },
    kick: function (when, amp, soft) {
      var ctx = S.ctx;
      var o = ctx.createOscillator();
      o.type = "sine";
      var f0 = soft ? 120 : 165;
      o.frequency.setValueAtTime(f0, when);
      o.frequency.exponentialRampToValueAtTime(soft ? 40 : 46, when + 0.11);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(amp, when + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, when + (soft ? 0.3 : 0.24));
      o.connect(g);
      g.connect(S.dry);
      /* click transient */
      var cs = ctx.createBufferSource();
      cs.buffer = S.noise;
      var hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 1400;
      var cg = ctx.createGain();
      cg.gain.setValueAtTime(amp * 0.32, when);
      cg.gain.exponentialRampToValueAtTime(0.0001, when + 0.03);
      cs.connect(hp);
      hp.connect(cg);
      cg.connect(S.dry);
      cs.start(when, rnd() * 0.5);
      cs.stop(when + 0.06);
      o.start(when);
      o.stop(when + 0.4);
      /* sidechain dip on the whole record */
      var p = S.pump.gain;
      var base = S._pumpBase || 1;
      p.cancelScheduledValues(when);
      p.setValueAtTime(base, when);
      p.linearRampToValueAtTime(base * 0.42, when + 0.028);
      p.linearRampToValueAtTime(base * 0.9, when + 0.14);
      p.linearRampToValueAtTime(base, when + 0.3);
    },
    clap: function (when, amp) {
      var ctx = S.ctx;
      for (var i = 0; i < 3; i++) {
        var cs = ctx.createBufferSource();
        cs.buffer = S.noise;
        var bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 1500 + i * 380;
        bp.Q.value = 1.1;
        var g = ctx.createGain();
        var t = when + i * 0.011;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(amp * (1 - i * 0.22), t + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13 - i * 0.02);
        cs.connect(bp);
        bp.connect(g);
        g.connect(S.dry);
        var rv = ctx.createGain();
        rv.gain.value = 0.3;
        g.connect(rv);
        rv.connect(S.revIn);
        cs.start(t, rnd() * 0.6);
        cs.stop(t + 0.2);
      }
    },
    hat: function (when, amp, open) {
      var ctx = S.ctx;
      var cs = ctx.createBufferSource();
      cs.buffer = S.noise;
      var hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 7200;
      var bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 10500;
      bp.Q.value = 0.6;
      var g = ctx.createGain();
      var len = open ? 0.2 : 0.045;
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(amp, when + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, when + len);
      cs.connect(hp);
      hp.connect(bp);
      bp.connect(g);
      g.connect(S.dry);
      cs.start(when, rnd() * 0.7);
      cs.stop(when + len + 0.05);
    },
    rim: function (when, amp) {
      var ctx = S.ctx;
      var o = ctx.createOscillator();
      o.type = "square";
      o.frequency.value = 430;
      var bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 2000;
      bp.Q.value = 3.5;
      var g = ctx.createGain();
      g.gain.setValueAtTime(amp, when);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
      o.connect(bp);
      bp.connect(g);
      g.connect(S.dry);
      o.start(when);
      o.stop(when + 0.08);
    },
    /* riser: noise through a climbing bandpass + reverse-cymbal shape */
    riser: function (when, dur, amp) {
      var ctx = S.ctx;
      var cs = ctx.createBufferSource();
      cs.buffer = S.noise;
      cs.loop = true;
      var bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.Q.value = 1.4;
      bp.frequency.setValueAtTime(320, when);
      bp.frequency.exponentialRampToValueAtTime(7800, when + dur);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(amp, when + dur * 0.92);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur + 0.06);
      cs.connect(bp);
      bp.connect(g);
      g.connect(S.dry);
      var rv = ctx.createGain();
      rv.gain.value = 0.5;
      g.connect(rv);
      rv.connect(S.revIn);
      cs.start(when, 0.05);
      cs.stop(when + dur + 0.1);
    },
    /* impact: sub boom + a wide crash-ish noise wash */
    impact: function (when, amp) {
      S.voices.kick(when, amp * 1.1, false);
      var ctx = S.ctx;
      var cs = ctx.createBufferSource();
      cs.buffer = S.noise;
      var hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 3600;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(amp * 0.3, when + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 1.15);
      cs.connect(hp);
      hp.connect(g);
      g.connect(S.dry);
      var rv = ctx.createGain();
      rv.gain.value = 0.7;
      g.connect(rv);
      rv.connect(S.revIn);
      cs.start(when, rnd() * 0.4);
      cs.stop(when + 1.3);
      var o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(70, when);
      o.frequency.exponentialRampToValueAtTime(38, when + 0.6);
      var og = ctx.createGain();
      og.gain.setValueAtTime(amp * 0.5, when);
      og.gain.exponentialRampToValueAtTime(0.0001, when + 0.75);
      o.connect(og);
      og.connect(S.dry);
      o.start(when);
      o.stop(when + 0.8);
    },
    /* air swell: the "the room breathes" moment under the CTA */
    swell: function (when, dur, amp) {
      var ctx = S.ctx;
      var cs = ctx.createBufferSource();
      cs.buffer = S.noise;
      cs.loop = true;
      var bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 2400;
      bp.Q.value = 0.5;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(amp, when + dur * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      cs.connect(bp);
      bp.connect(g);
      g.connect(S.dry);
      var rv = ctx.createGain();
      rv.gain.value = 0.8;
      g.connect(rv);
      rv.connect(S.revIn);
      cs.start(when, 0.2);
      cs.stop(when + dur + 0.1);
    },
  };

  /* ---------------- the arrangement → S.events ---------------- */
  S.arrange = function () {
    var ev = [];
    var V = S.voices;
    var push = function (t, fn) {
      if (t > DUR + 1.6) return;
      ev.push({ t: t, run: fn });
    };
    for (var bi = 0; bi < BARS; bi++) (function (bar) {
      var s = sec(bar);
      var ch = CHORDS[bar % 4];
      var t0 = bar * BAR;
      var bright = s.k === "drop" ? 3400 : 2400;
      var padAmp = 0.2 * (s.pad || 0);
      if (padAmp > 0)
        push(t0, function (w, ch, dur, a) {
          return function (when) {
            V.pad(when, ch.notes.map(mtof), dur, a);
          };
        }(0, ch, BAR * (s.k === "outro" && bar >= 14 ? 2 : 1), padAmp));
      if (s.sub)
        push(t0, function (w, f, dur, a) {
          return function (when) {
            V.sub(when, f, dur, a);
          };
        }(0, mtof(ch.root), BAR * 0.94, 0.44 * s.sub));

      /* arpeggio: 8ths, contour up-up-down-up, +1 oct in the drop */
      if (s.arp) {
        var steps = 8;
        for (var i = 0; i < steps; i++) {
          var seq = [0, 1, 2, 3, 2, 1, 3, 2][i % 8];
          var oct = i >= 6 && s.k === "drop" ? 12 : 0;
          var f = mtof(ch.notes[seq] + 12 + oct);
          var tt = t0 + i * (BAR / steps);
          var amp = (i % 2 === 0 ? 0.2 : 0.13) * s.arp * (s.k === "drop" ? 1.15 : 1);
          push(tt, (function (f, amp, br) {
            return function (when) {
              V.pluck(when, f, 0.34, amp, br);
            };
          })(f, amp, bright));
        }
      }
      /* bass stabs: 1 & 2a & 3 & 4a with an octave lift on the last 8th */
      if (s.bass) {
        var pats = [0, 1.5, 2, 2.5, 3.5];
        pats.forEach(function (p, idx) {
          var tt = t0 + p * B;
          var f = mtof(ch.root + (idx === 4 ? 12 : 0)) * 2;
          var bamp = 0.3 * s.bass;
          push(tt, (function (f, a2) {
            return function (when) {
              V.bass(when, f, B * 0.42, a2);
            };
          })(f, bamp));
        });
      }
      /* drums */
      if (s.drums) {
        var hard = s.k === "groove" || s.k === "drop" || s.k === "build2";
        var kicks = hard ? [0, 1.75, 2.5] : [0, 2];
        var kamp = 0.62 * s.drums;
        kicks.forEach(function (p) {
          push(t0 + p * B, (function (soft) {
            return function (when) {
              V.kick(when, kamp, soft);
            };
          })(p === 1.75));
        });
        if (s.clap || s.k === "build")
          var camp = 0.3 * (s.clap || 0.7);
          [1, 3].forEach(function (p) {
            push(t0 + p * B, function (when) {
              V.clap(when, camp);
            });
          });
        if (s.hat)
          for (var h = 0; h < 8; h++) {
            var tt = t0 + h * (B / 2);
            var amp = (h % 2 === 0 ? 0.14 : 0.085) * s.hat;
            var isOpen = h === 7 && (s.k === "drop" || s.k === "groove");
            push(tt, (function (amp, open2) {
              return function (when) {
                V.hat(when, amp, open2);
              };
            })(amp, isOpen));
          }
        /* 16th rolls into every section change */
        if (bar % 4 === 3)
          for (var q = 0; q < 8; q++) {
            var tq = t0 + BAR - B + q * (B / 4);
            push(tq, (function (q) {
              return function (when) {
                V.rim(when, 0.1 + q * 0.02);
                V.hat(when, 0.05 + q * 0.012, false);
              };
            })(q));
          }
        var rampp = 0.05 * s.ride;
        if (s.ride)
          for (var rr = 0; rr < 4; rr++)
            push(t0 + rr * B, (function () {
              return function (when) {
                V.hat(when, rampp, true);
              };
            })());
      }
    })(bi)
    /* risers into the two big lifts, impacts on the reel's cuts */
    push(12 - 1.0, function (when) {
      V.riser(when, 1.0, 0.26);
    });
    push(24 - 1.4, function (when) {
      V.riser(when, 1.4, 0.32);
    });
    push(27.5 - 0.8, function (when) {
      V.riser(when, 0.8, 0.16);
    });
    HITS.forEach(function (t) {
      push(t, function (when) {
        V.impact(when, t === 24 ? 0.72 : 0.52);
      });
    });
    /* the close: one long Am(add9) that rings out under the CTA */
    push(28, function (when) {
      V.pad(when, [45, 57, 60, 64, 71].map(mtof), 3.4, 0.24);
      V.sub(when, mtof(45), 3.2, 0.36);
      V.swell(when, 2.6, 0.05);
    });
    push(30.0, function (when) {
      V.impact(when, 0.42);
    });
    ev.sort(function (a, b) {
      return a.t - b.t;
    });
    S.events = ev;
    return ev;
  };

  /* ---------------- realtime transport ---------------- */
  S.ready = {
    then: function (res) {
      try {
        S.init();
      } catch (e) {
        /* no WebAudio here — the picture still plays, silently */
      }
      res(S.ctx);
      return this;
    },
    catch: function () {
      return this;
    },
  };
  S.setVolume = function (v) {
    S.vol = v;
    if (S.master) S.master.gain.setTargetAtTime(S.muted ? 0 : v, S.ctx.currentTime, 0.05);
  };
  S.toggleMute = function () {
    S.muted = !S.muted;
    if (S.master) S.master.gain.setTargetAtTime(S.muted ? 0 : S.vol, S.ctx.currentTime, 0.02);
    return S.muted;
  };
  S.play = function () {
    try {
      S.init();
    } catch (e) {
      return;
    }
    if (!S.ctx) return;
    if (S.ctx.state === "suspended") S.ctx.resume();
    S.playing = true;
    S._startedAt = S.ctx.currentTime;
    S.kill();
    S.schedule(S._scoreT);
  };
  S.pause = function () {
    S.playing = false;
    S._scoreT = S.current();
    S.kill();
  };
  S.stop = function () {
    S.playing = false;
    S._scoreT = 0;
    S.cursor = 0;
    S.kill();
  };
  S.kill = function () {
    if (!S.ctx) return;
    var t = S.ctx.currentTime;
    var old = S._gen[S._gi];
    old.gain.cancelScheduledValues(t);
    old.gain.setValueAtTime(old.gain.value, t);
    old.gain.linearRampToValueAtTime(0.0001, t + 0.02);
    S._gi = (S._gi + 1) % 2;
    var g = S._gen[S._gi];
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(1, t);
    S.dry.disconnect();
    S.dry.connect(g);
    if (S.revTap) {
      S.revTap.disconnect();
      S.revTap.connect(g);
    }
    if (S.pump) S.pump.gain.setValueAtTime(1, t);
  };
  S.schedule = function (from) {
    if (!S.ctx) return;
    var t0 = S.ctx.currentTime + 0.02;
    var base = t0 - from;
    var ev = S.events;
    for (var i = 0; i < ev.length; i++) {
      var e = ev[i];
      if (e.t < from - 0.001) continue;
      if (e.t > DUR + 1.6) break;
      var when = base + e.t;
      try {
        e.run(Math.max(t0, when));
      } catch (err) {
        /* one voice failing must not stop the song */
      }
    }
  };
  /* scrub/jump: restart the score exactly at the comp time (rate = 1) */
  S.resync = function (compTime, rate) {
    S._scoreT = Math.max(0, compTime);
    S.rate = rate || 1;
    if (S.playing) {
      S.kill();
      S.schedule(S._scoreT);
    }
  };
  S.setRate = function (r2) {
    S.rate = r2;
  };
  S.current = function () {
    if (!S.ctx || !S.playing) return S._scoreT;
    return S._scoreT + (S.ctx.currentTime - S._startedAt);
  };
  /* analyser → normalised magnitudes for the `bars` layer */
  S.spectrum = function (out) {
    if (!S.an || !out) return out;
    S.an.getByteFrequencyData(S.freq);
    var n2 = out.length;
    var bins = S.freq.length;
    for (var i = 0; i < n2; i++) {
      var lo = Math.floor(Math.pow(i / n2, 1.75) * bins);
      var hi = Math.max(lo + 1, Math.floor(Math.pow((i + 1) / n2, 1.75) * bins));
      var m = 0;
      for (var j = lo; j < hi; j++) m = Math.max(m, S.freq[j]);
      /* tilt down a little so the highs don't dominate the strip */
      out[i] = (m / 255) * (1 - 0.32 * (i / n2));
    }
    return out;
  };
  S.energy = function () {
    if (!S.an) return 0;
    S.an.getByteFrequencyData(S.freq);
    var s2 = 0;
    for (var i = 0; i < 24; i++) s2 += S.freq[i];
    return s2 / (24 * 255);
  };
  /* beat helpers so UI + scene can share the grid */
  S.beat = function (t) {
    return t / B;
  };
  S.beatPulse = function (t, decay) {
    var x = (t / B) % 1;
    return Math.pow(1 - x, decay === undefined ? 3 : decay);
  };

  /* the chart is pure data — build it now so the timeline, the docs and this
     file's own tests can read it before anyone has clicked play */
  S.arrange();

  TLM.music = S;
  TLM.MUSIC = { bpm: BPM, key: S.key, title: S.title, duration: DUR };
  TLM.BEAT = B;
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : this);
