/* ==================================================================
   scene-timberlane.js — the 30 s reel, as data
   ------------------------------------------------------------------
   This file IS the sample scene: one plain JSON object (no functions,
   no classes) that happens to be 50 layers long. `TLM.SCENES.timberlane`
   is what the editor opens, what the offline renderer bakes, and what
   "Download JSON" / "Import JSON" round-trips.

   Reading order = paint order, exactly like a layer stack.
   Blocks are cut on the bar grid of music.js (120 BPM ⇒ 1 bar = 2 s),
   so every scene change is also a drum hit.
   ================================================================== */
(function (global) {
  "use strict";
  var TLM = (global.TLM = global.TLM || {});

  /* --- plates: the stock library from the repo (Pexels CDN) ---------- */
  function px(id, w, h) {
    return (
      "https://images.pexels.com/photos/" + id + "/pexels-photo-" + id +
      ".jpeg?auto=compress&cs=tinysrgb&fit=crop&w=" + (w || 1080) + "&h=" + (h || 1920)
    );
  }
  var ASSETS = {
    hero: px(31949939),
    lounge: px(38874193),
    kitchen: px(38310800),
    bedroom: px(37468270),
    wardrobe: px(38697208),
    luxe: px(34538315),
    contemporary: px(7722158),
    leather: px(5942741),
    armchair: px(13490219),
    rustic: px(30767894),
    kitchen2: px(6436783),
    dining: px(10117728),
    /* the brand lockup, rebuilt as an SVG image from the same path data the
       `path` layers use — any colour, no duplicate asset */
    markWhite: "logo:timberlane?tint=%23f1efec&bg=none",
    roll: "https://videos.pexels.com/video-files/34835401/14765990_1080_1920_30fps.mp4",
  };

  var INK = "#f4f1ea";
  var ORANGE = "#c45a0f";
  var EMBER = "#ff6a1a";
  var ASH = "#9aa0a8";

  function ly(id, type, name, at, dur, t, props, anim, extra) {
    var l = {
      id: id, type: type, name: name || type, in: at, dur: dur,
      t: t || {}, anim: anim || {}, props: props || {},
    };
    if (extra) for (var k in extra) l[k] = extra[k];
    return l;
  }
  /* headline text shorthand — the reel's type system lives here */
  function head(id, name, at, dur, y, text, size, opts, anim) {
    var p = Object.assign(
      { text: text, font: "display", size: size, tracking: -3, leading: 0.92, align: "left", color: INK, accent: EMBER, reveal: "wordsUp", revealDur: 0.55, revealDist: 180, stagger: 0.075, revealEase: "expoOut" },
      opts || {},
    );
    return ly(id, "text", name, at, dur, { x: 540, y: y, w: 880, h: Math.round(size * 3.2) }, p, anim || { enter: "maskUp", exit: "fade", dur: 0.45, ease: "expoOut", exitDur: 0.28 });
  }

  var LAYERS = [
    /* ── 0 · the bed everything sits on ───────────────────────────── */
    ly("bg_base", "bg", "base wash", 0, 30, {}, {
      mode: "linear", angle: 148, colors: ["#0b0c0e", "#1c2024", "#0e1013"], drift: 9,
      pools: [{ x: 0.18, y: 0.1, r: 0.75, c: ORANGE, a: 0.15, spin: 0.02 }, { x: 0.86, y: 0.72, r: 0.6, c: "#3a4450", a: 0.18, spin: -0.015 }],
    }, { enter: "none", exit: "none" }),
    ly("fx_dust", "particles", "dust", 0, 30, {}, {
      count: 62, shape: "glow", color: "#ffd9b8", color2: ORANGE, alpha: 0.34, size: 3.2, speed: 0.42, life: 26, rise: true, sway: 0.35, swayAmp: 26, flicker: true, blend: "screen",
    }, { enter: "none", exit: "none" }),
    ly("fx_sweep", "sweep", "light sweep", 0.4, 29.6, {}, {
      color: "#ffd9b8", alpha: 0.075, width: 0.3, angle: 14, period: 4, blend: "screen", ease: "sineInOut",
    }, { enter: "none", exit: "none" }),
    ly("fx_vig", "vignette", "vignette", 0, 30, {}, {
      color: "#000000", alpha: 0.55, r: 0.84, cy: 0.48, feather: 0.62, topGlow: ORANGE, topGlowAlpha: 0.1,
    }, { enter: "none", exit: "none" }),
    ly("fx_grain", "grain", "film grain", 0, 30, {}, {
      alpha: 0.062, tile: 220, contrast: 0.62, blend: "overlay", flicker: true,
    }, { enter: "none", exit: "none" }),
    ly("ui_frame", "frame", "reel chrome", 0.15, 29.85, {}, {
      margin: 46, len: 62, w: 3, color: INK, alpha: 0.34, label: "REEL 08 · TIMBERLANE", right: "9:16 · 30.0s", tc: true, labelSize: 21, labelColor: ASH, dur: 0.7,
    }, { enter: "none", exit: "none" }),
    ly("ui_progress", "progress", "timeline", 0, 30, { x: 540, y: 1876, w: 900, h: 26 }, {
      barH: 4, color: EMBER, grad: [ORANGE, EMBER], track: "#ffffff", trackAlpha: 0.12,
      marks: [2.6, 6.2, 10.4, 14, 18, 21.6, 25, 27.55], markColor: INK, markW: 2, head: true, headColor: EMBER, headR: 5,
    }, { enter: "none", exit: "none" }),

    /* ── 1 · cold open 0.0 – 2.6 — three plate flashes on the beat ── */
    ly("co_p1", "photo", "flash · kitchen", 0, 1.02, { x: 540, y: 960, w: 1080, h: 1920 }, {
      src: "kitchen", dim: 0.2, scrim: true, scrimAlpha: 0.5, tint: ORANGE, tintAlpha: 0.16, tintBlend: "soft-light",
      kb: { from: { z: 1.22, x: -26, y: 18 }, to: { z: 1.02, x: 20, y: -14 }, ease: "linear" }, chroma: 0.02,
    }, { enter: "wipeR", exit: "wipeL", dur: 0.26, ease: "expoOut", exitDur: 0.2 }),
    ly("co_l1", "text", "label 01", 0.06, 0.9, { x: 540, y: 1704, w: 880, h: 44 }, {
      text: "MODULAR KITCHEN — 01", font: "mono", size: 26, weight: 500, tracking: 16, align: "left", color: INK, accent: EMBER, reveal: "wordsLeft", revealDur: 0.3, stagger: 0.02, ul: ORANGE, ulW: 3, ulDelay: 0.16, ulDur: 0.3,
    }, { enter: "fade", exit: "fade", dur: 0.14, exitDur: 0.12 }),
    ly("co_p2", "photo", "flash · bedroom", 0.95, 1.02, { x: 540, y: 960, w: 1080, h: 1920 }, {
      src: "bedroom", dim: 0.22, scrim: true, scrimAlpha: 0.5, tint: "#5a6b7c", tintAlpha: 0.2, tintBlend: "soft-light",
      kb: { from: { z: 1.02, x: 18, y: -12 }, to: { z: 1.24, x: -22, y: 16 }, ease: "linear" }, chroma: 0.02,
    }, { enter: "wipeL", exit: "wipeR", dur: 0.26, ease: "expoOut", exitDur: 0.2 }),
    ly("co_l2", "text", "label 02", 1.01, 0.9, { x: 540, y: 1704, w: 880, h: 44 }, {
      text: "WALK-IN WARDROBE — 02", font: "mono", size: 26, weight: 500, tracking: 16, align: "right", color: INK, reveal: "wordsLeft", revealDur: 0.3, stagger: 0.02,
    }, { enter: "fade", exit: "fade", dur: 0.14, exitDur: 0.12 }),
    ly("co_p3", "photo", "flash · living", 1.9, 0.86, { x: 540, y: 960, w: 1080, h: 1920 }, {
      src: "luxe", dim: 0.18, scrim: true, scrimAlpha: 0.44, tint: ORANGE, tintAlpha: 0.2,
      kb: { from: { z: 1.3, x: 0, y: -30 }, to: { z: 1.05, x: 0, y: 26 }, ease: "linear" },
    }, { enter: "wipeU", exit: "wipeD", dur: 0.24, ease: "expoOut", exitDur: 0.22 }),
    ly("co_l3", "text", "label 03", 1.96, 0.74, { x: 540, y: 1704, w: 880, h: 44 }, {
      text: "LIVING, LIT BY HAND — 03", font: "mono", size: 26, tracking: 16, align: "left", color: INK,
    }, { enter: "fade", exit: "fade", dur: 0.14, exitDur: 0.12 }),
    ly("co_ticker", "ticker", "top band", 0, 2.72, { x: 540, y: 158, w: 1080, h: 66 }, {
      text: "INTERIOR ARCHITECTURE", font: "grotesk", size: 30, weight: 800, tracking: 22, color: "#140a03", speed: 240, dir: "left", sep: "  ✦  ", band: ORANGE, bandAlpha: 1,
    }, { enter: "down", exit: "up", dur: 0.34, ease: "expoOut", exitDur: 0.24, dist: 90 }),
    ly("co_counter", "counter", "shot index", 0, 2.62, { x: 540, y: 1560, w: 520, h: 130 }, {
      from: 1, to: 4, pad: 2, size: 96, font: "display", color: INK, align: "right", tick: true, tickColor: EMBER, ease: "quadIn", label: "", glow: 0,
    }, { enter: "fade", exit: "fade", dur: 0.2, exitDur: 0.16 }),
    ly("co_grid", "grid", "blueprint", 0, 2.7, { x: 540, y: 960 }, {
      cell: 90, color: "#8ea0b0", alpha: 0.07, w: 1, speed: 26,
    }, { enter: "fade", exit: "fade", dur: 0.4, exitDur: 0.3 }),
    ly("cut_1", "shape", "flash", 2.56, 0.18, { x: 540, y: 960, w: 1160, h: 2000 }, {
      shape: "rect", fill: "#fff3e4", fillAlpha: 0.5,
    }, { enter: "fade", exit: "fade", dur: 0.04, ease: "linear", exitDur: 0.14 }, { blend: "screen" }),

    /* ── 2 · title card 2.6 – 6.2 — the lockup assembles itself ───── */
    ly("tc_card", "bg", "card wash", 2.55, 3.75, {}, {
      mode: "radial", cx: 0.5, cy: 0.42, r: 0.95, colors: ["#191d21", "#0a0b0c", "#0a0b0c"], drift: 6,
      pools: [{ x: 0.5, y: 0.4, r: 0.5, c: ORANGE, a: 0.16, spin: 0.03 }],
    }, { enter: "fade", exit: "fade", dur: 0.34, exitDur: 0.3 }),
    ly("tc_grid", "grid", "card grid", 2.6, 3.7, { x: 540, y: 960 }, {
      cell: 108, color: "#7f93a6", alpha: 0.1, w: 1, speed: 16,
    }, { enter: "fade", exit: "fade", dur: 0.5, exitDur: 0.4 }),
    /* the lockup builds itself: emblem line-draws, the little room inside it
       fills in, then the letters wipe on one by one — all four layers share
       one box and `fit:"viewBox"` so the parts stay in register */
    ly("tc_mark", "path", "emblem", 2.62, 3.6, { x: 540, y: 800, w: 860, h: 260 }, {
      logo: "timberlane", group: "mark", fit: "viewBox", drawOn: true, drawOnDur: 1.3, drawEase: "cubicOut",
      strokeColor: EMBER, strokeW: 3, fillReveal: true, fillDur: 0.75, stagger: 0.02, tint: "#e9e5dd", keepBrand: false,
    }, { enter: "none", exit: "fade", dur: 0, exitDur: 0.3 }),
    ly("tc_furn", "path", "the room", 3.44, 2.78, { x: 540, y: 800, w: 860, h: 260 }, {
      logo: "timberlane", group: "furn", fit: "viewBox", drawOn: true, drawOnDur: 0.8, strokeColor: INK, strokeW: 1.6,
      fillReveal: true, fillDur: 0.5, tint: "#e9e5dd",
    }, { enter: "none", exit: "fade", dur: 0, exitDur: 0.3 }),
    ly("tc_word", "path", "wordmark", 3.9, 2.32, { x: 540, y: 800, w: 860, h: 260 }, {
      logo: "timberlane", group: "word", fit: "viewBox", clipReveal: true, clipDur: 0.95, clipEase: "expoOut",
      stagger: 0.045, partDur: 0.5, tint: INK, keepBrand: true,
    }, { enter: "none", exit: "fade", dur: 0, exitDur: 0.3 }),
    ly("tc_rule", "shape", "rule", 4.42, 1.75, { x: 540, y: 962, w: 800, h: 2 }, {
      shape: "line", strokeW: 2, fill: EMBER, fillAlpha: 0.85, grow: true, growDur: 0.9, growEase: "expoOut", glow: 14, glowColor: ORANGE,
    }, { enter: "none", exit: "fade", dur: 0, exitDur: 0.25 }),
    ly("tc_tag", "text", "tagline", 4.6, 1.6, { x: 540, y: 1024, w: 900, h: 40 }, {
      text: "PRECISION IN EVERY DETAIL", font: "grotesk", size: 30, weight: 700, tracking: 26, align: "center", color: INK, accent: EMBER, reveal: "wordsUp", revealDur: 0.42, stagger: 0.035,
    }, { enter: "fade", exit: "fade", dur: 0.3, ease: "swift", exitDur: 0.22 }),
    ly("tc_kick", "text", "kicker", 4.9, 1.3, { x: 540, y: 1096, w: 980, h: 36 }, {
      text: "EST. 2014 · BENGALURU · TURNKEY INTERIORS", font: "mono", size: 21, tracking: 10, align: "center", color: ASH, reveal: "wordsLeft", revealDur: 0.35, stagger: 0.02,
    }, { enter: "fade", exit: "fade", dur: 0.3, exitDur: 0.2 }),
    ly("cut_2", "shape", "flash", 6.14, 0.16, { x: 540, y: 960, w: 1160, h: 2000 }, {
      shape: "rect", fill: "#ffd9b8", fillAlpha: 0.34,
    }, { enter: "fade", exit: "fade", dur: 0.04, exitDur: 0.12 }, { blend: "screen" }),

    /* ── 3 · hero statement 6.2 – 10.4 ───────────────────────────── */
    ly("hero_plate", "photo", "hero plate", 6.16, 4.34, { x: 540, y: 960, w: 1080, h: 1920 }, {
      src: "hero", dim: 0.46, dimColor: "#0a0b0c", scrim: true, scrimAlpha: 0.86, tint: ORANGE, tintAlpha: 0.2, tintBlend: "soft-light",
      kb: { from: { z: 1.2, x: -24, y: 26 }, to: { z: 1.0, x: 22, y: -22 }, ease: "sineInOut" }, chroma: 0.015,
    }, { enter: "wipeU", exit: "wipeD", dur: 0.8, ease: "expoOut", exitDur: 0.4 }),
    head("hero_head", "headline", 6.5, 3.9, 1130, "WE BUILD THE\nROOMS YOU\n**LIVE IN.**", 168, { leading: 0.88, reveal: "wordsUp", revealDist: 210, stagger: 0.085 }, { enter: "none", exit: "fade", dur: 0, exitDur: 0.3 }),
    ly("hero_ul", "shape", "rule", 7.3, 3.05, { x: 540, y: 1428, w: 330, h: 4 }, {
      shape: "rect", fill: EMBER, radius: 2, grow: true, growDur: 0.85, growEase: "expoOut", glow: 12, glowColor: ORANGE,
    }, { enter: "none", exit: "fade", dur: 0, exitDur: 0.25 }),
    ly("hero_sub", "text", "sub", 7.5, 2.9, { x: 540, y: 1516, w: 860, h: 120 }, {
      text: "Design, build and handover under one contract — one team, one date, one bill.",
      font: "grotesk", size: 36, weight: 500, leading: 1.28, align: "left", color: "#d5d9de", reveal: "lines", revealDur: 0.5, stagger: 0.09,
    }, { enter: "fade", exit: "fade", dur: 0.4, ease: "swift", exitDur: 0.28 }),
    ly("hero_tag", "text", "corner tag", 8.2, 2.2, { x: 540, y: 260, w: 880, h: 34 }, {
      text: "01 / 06 — THE STUDIO", font: "mono", size: 22, tracking: 14, align: "left", color: ASH, reveal: "wordsLeft",
    }, { enter: "fade", exit: "fade", dur: 0.25, exitDur: 0.2 }),
    ly("cut_3", "shape", "flash", 10.34, 0.16, { x: 540, y: 960, w: 1160, h: 2000 }, {
      shape: "rect", fill: "#fff3e4", fillAlpha: 0.4,
    }, { enter: "fade", exit: "fade", dur: 0.04, exitDur: 0.12 }, { blend: "screen" }),

    /* ── 4 · materials 10.4 – 14.0 — a 3×3 grid popping on the beat ─ */
    ly("mat_bg", "bg", "materials wash", 10.3, 3.8, {}, {
      mode: "radial", cx: 0.3, cy: 0.15, r: 1.1, colors: ["#211d19", "#101215"], drift: 14,
      pools: [{ x: 0.8, y: 0.85, r: 0.55, c: ORANGE, a: 0.14 }],
    }, { enter: "fade", exit: "fade", dur: 0.3, exitDur: 0.26 }),
    head("mat_head", "materials head", 10.46, 3.5, 372, "MATERIALS\n& FINISHES", 116, { reveal: "lines", stagger: 0.11, align: "left" }, { enter: "none", exit: "fade", dur: 0, exitDur: 0.24 }),
    ly("mat_sub", "text", "materials sub", 10.95, 3.0, { x: 540, y: 566, w: 880, h: 40 }, {
      text: "28 FINISHES, SAMPLED IN YOUR OWN LIGHT", font: "mono", size: 22, tracking: 8, align: "left", color: ASH, reveal: "wordsLeft", stagger: 0.022,
    }, { enter: "fade", exit: "fade", dur: 0.35, exitDur: 0.2 }),
    ly("mat_grid", "swatch", "swatch grid", 11.0, 3.05, { x: 540, y: 1090, w: 900, h: 900 }, {
      cols: 3, gap: 18, radius: 12, stagger: 0.075, itemDur: 0.62, ease: "backOut", labelSize: 22, labelColor: "#181a1d", subColor: "rgba(24,26,29,.62)", upper: true,
      tint: ORANGE, tintAlpha: 0.04, rotFrom: 7,
      items: [
        { label: "OAK", sub: "18 MM SOLID", color: "#c8955f" },
        { label: "WALNUT", sub: "OIL FINISH", color: "#6b4a33" },
        { label: "BOUCLÉ", sub: "IVORY", color: "#e6e0d6" },
        { label: "STONE", sub: "HONED", color: "#c9c6bf" },
        { label: "BRASS", sub: "BRUSHED", color: "#a9803f" },
        { label: "LINEN", sub: "NATURAL", color: "#c3b7a6" },
        { label: "TERRAZZO", sub: "CAST", color: "#b6afa3" },
        { label: "SMOKE", sub: "GLASS", color: "#4c525a" },
        { label: "LEATHER", sub: "TANNED", color: "#7c4a2e" },
      ],
    }, { enter: "none", exit: "scale", exitDur: 0.34, ease: "swift" }),
    ly("mat_note", "text", "materials note", 12.7, 1.35, { x: 540, y: 1638, w: 880, h: 40 }, {
      text: "EVERY TILE IS IN THE CARTRIDGE — 4 WEEKS TO ORDER", font: "mono", size: 20, tracking: 8, align: "right", color: EMBER, reveal: "wordsLeft",
    }, { enter: "fade", exit: "fade", dur: 0.3, exitDur: 0.2 }),

    /* ── 5 · numbers 14.0 – 18.0 — counters, bars, blueprint ─────── */
    ly("num_bg", "bg", "numbers wash", 13.94, 4.2, {}, {
      mode: "linear", angle: 22, colors: ["#0d0f11", "#181c21", "#0c0e10"], drift: 5,
    }, { enter: "fade", exit: "fade", dur: 0.3, exitDur: 0.26 }),
    ly("num_grid", "grid", "numbers grid", 13.98, 4.16, { x: 540, y: 960 }, {
      cell: 62, color: "#7f93a6", alpha: 0.14, w: 1, speed: 22,
    }, { enter: "fade", exit: "fade", dur: 0.4, exitDur: 0.3 }),
    head("num_head", "numbers head", 14.1, 3.95, 392, "THE NUMBERS\nBEHIND THE\n**FINISH.**", 112, { leading: 0.9, reveal: "wordsUp", align: "left", stagger: 0.07 }, { enter: "none", exit: "fade", dur: 0, exitDur: 0.24 }),
    ly("num_c1", "counter", "homes", 14.5, 3.5, { x: 540, y: 790, w: 880, h: 190 }, {
      from: 0, to: 520, suffix: "+", size: 132, font: "display", weight: 400, color: INK, align: "left",
      label: "HOMES DELIVERED", labelSize: 24, labelColor: EMBER, ease: "expoOut", tail: 0.5, bar: true, barColor: ORANGE, barTrack: "rgba(255,255,255,.12)", barH: 4,
    }, { enter: "rise", exit: "fade", dur: 0.5, ease: "expoOut", exitDur: 0.25 }),
    ly("num_c2", "counter", "years", 14.86, 3.14, { x: 540, y: 982, w: 880, h: 190 }, {
      from: 0, to: 11, suffix: " YRS", size: 132, font: "display", color: INK, align: "left",
      label: "BUILDING IN BENGALURU", labelSize: 24, labelColor: ASH, ease: "expoOut", tail: 0.5, bar: true, barColor: "#5f666e", barH: 4,
    }, { enter: "rise", exit: "fade", dur: 0.5, ease: "expoOut", exitDur: 0.25 }),
    ly("num_c3", "counter", "ontime", 15.22, 2.78, { x: 540, y: 1174, w: 880, h: 190 }, {
      from: 0, to: 98, suffix: "%", size: 132, font: "display", color: EMBER, align: "left",
      label: "ON-TIME HANDOVER", labelSize: 24, labelColor: INK, ease: "expoOut", tail: 0.5, bar: true, barColor: EMBER, barH: 4,
    }, { enter: "rise", exit: "fade", dur: 0.5, ease: "expoOut", exitDur: 0.25 }),
    ly("num_stars", "stars", "rating", 15.75, 2.25, { x: 176, y: 1354, w: 300, h: 44 }, {
      value: 4.9, size: 34, gap: 10, color: "#ffb066", emptyColor: "rgba(255,255,255,.18)", stagger: 0.06, dur: 0.42,
    }, { enter: "scale", exit: "fade", dur: 0.4, ease: "backOut", exitDur: 0.2 }),
    ly("num_rev", "text", "reviews", 15.95, 2.05, { x: 610, y: 1354, w: 560, h: 40 }, {
      text: "4.9 / 5 AVERAGE · 214 VERIFIED REVIEWS", font: "mono", size: 22, tracking: 6, align: "left", color: ASH, reveal: "wordsLeft",
    }, { enter: "fade", exit: "fade", dur: 0.3, exitDur: 0.2 }),
    ly("num_bars", "bars", "spectrum", 14.4, 3.6, { x: 540, y: 1616, w: 880, h: 90 }, {
      count: 42, gap: 7, min: 5, radius: 3, amp: 1.05, grad: [EMBER, "#39404a"], beat: true, beatAmt: 0.5, origin: "bottom", mirror: false,
    }, { enter: "fade", exit: "fade", dur: 0.35, exitDur: 0.3 }),
    ly("num_sweep", "sweep", "numbers sweep", 15.0, 2.6, {}, {
      color: "#ffe7cc", alpha: 0.14, width: 0.24, angle: 12, once: true, delay: 0.15, dur: 1.5, blend: "screen", ease: "quintOut",
    }, { enter: "none", exit: "none" }),
    ly("cut_4", "shape", "flash", 17.94, 0.16, { x: 540, y: 960, w: 1160, h: 2000 }, {
      shape: "rect", fill: "#fff3e4", fillAlpha: 0.38,
    }, { enter: "fade", exit: "fade", dur: 0.04, exitDur: 0.12 }, { blend: "screen" }),

    /* ── 6 · selected work 18.0 – 21.6 — four portrait plates ─────── */
    ly("pr_bg", "bg", "work wash", 17.9, 3.95, {}, {
      mode: "linear", angle: 338, colors: ["#14171a", "#2a2521", "#0f1113"], drift: 12,
      pools: [{ x: 0.78, y: 0.24, r: 0.62, c: ORANGE, a: 0.12 }],
    }, { enter: "fade", exit: "fade", dur: 0.3, exitDur: 0.26 }),
    /* a line-mask wipe up, then each line staggers in — the reveal the block
       wants, expressed in channels the engine actually implements */
    head("pr_head", "work head", 18.06, 3.6, 336, "SELECTED\nWORK", 128, { align: "left", reveal: "lines", stagger: 0.12 }, { enter: "maskUp", exit: "fade", dur: 0.55, exitDur: 0.22 }),
    ly("pr_strip", "strip", "projects", 18.32, 3.32, { x: 540, y: 1030, w: 984, h: 1180 }, {
      gap: 14, radius: 8, stagger: 0.13, itemDur: 0.6, dim: 0.16, ease: "expoOut", rise: 90,
      labelFont: "mono", labelSize: 20, labelColor: INK, clip: "none", scrim: true, scrimAlpha: 0.6,
      items: [
        { src: "lounge", label: "LIVING" },
        { src: "kitchen2", label: "KITCHEN" },
        { src: "wardrobe", label: "WARDROBE" },
        { src: "rustic", label: "DECK" },
      ],
    }, { enter: "none", exit: "left", exitDur: 0.34, dist: 120 }),
    ly("pr_foot", "text", "work foot", 19.5, 2.15, { x: 540, y: 1698, w: 900, h: 44 }, {
      text: "142 PROJECTS · 9 CITIES · ONE STUDIO", font: "mono", size: 22, tracking: 8, align: "center", color: EMBER, reveal: "wordsUp", stagger: 0.03,
    }, { enter: "fade", exit: "fade", dur: 0.35, exitDur: 0.22 }),
    ly("pr_sweep", "sweep", "glass pass", 18.9, 2.2, {}, {
      color: "#fff0dd", alpha: 0.1, width: 0.2, angle: 8, once: true, delay: 0.4, dur: 1.3, blend: "screen",
    }, { enter: "none", exit: "none" }),

    /* ── 7 · testimonial 21.6 – 25.0 — the quiet beat ─────────────── */
    ly("ts_bg", "bg", "quiet wash", 21.5, 3.7, {}, {
      mode: "radial", cx: 0.62, cy: 0.3, r: 1.05, colors: ["#1b1d21", "#0c0d0f"], drift: 4,
    }, { enter: "fade", exit: "fade", dur: 0.4, exitDur: 0.3 }),
    ly("ts_plate", "photo", "client home", 21.68, 3.5, { x: 760, y: 616, w: 520, h: 620 }, {
      src: "contemporary", clip: "blob", dim: 0.1, tint: ORANGE, tintAlpha: 0.14, radius: 0,
      kb: { from: { z: 1.14, x: 14, y: 10 }, to: { z: 1.0, x: -12, y: -8 }, ease: "sineInOut" },
    }, { enter: "zoomIn", exit: "circle", dur: 0.9, ease: "expoOut", exitDur: 0.34 }),
    ly("ts_quote", "text", "quote", 22.15, 3.05, { x: 540, y: 1152, w: 820, h: 320 }, {
      text: "They drew it, then they built it — on the day they said.",
      font: "serif", size: 52, italic: true, leading: 1.16, align: "left", color: "#efece6", accent: EMBER, reveal: "rise", revealDur: 0.62, stagger: 0.1, revealDist: 40,
    }, { enter: "maskUp", exit: "fade", dur: 0.5, ease: "expoOut", exitDur: 0.3 }),
    ly("ts_attr", "text", "attribution", 22.85, 2.35, { x: 540, y: 1358, w: 820, h: 40 }, {
      text: "ANANYA R. — INDIRECTO PARK, BENGALURU", font: "mono", size: 21, tracking: 8, align: "left", color: EMBER, reveal: "wordsLeft", stagger: 0.025,
    }, { enter: "fade", exit: "fade", dur: 0.35, exitDur: 0.2 }),
    ly("ts_gauge", "gauge", "rating dial", 23.1, 2.1, { x: 176, y: 1490, w: 150, h: 150 }, {
      strokeW: 8, color: EMBER, from: 130, sweep: 280, dur: 1.15, ease: "expoOut", delay: 0.1, trackColor: "#ffffff", trackAlpha: 0.12,
      center: true, centerSize: 34, centerFont: "display", centerColor: INK, centerTo: 4.9, centerDecimals: 1, centerSuffix: "/5", dot: true, dotColor: "#ffe0bd",
    }, { enter: "scale", exit: "fade", dur: 0.45, ease: "backOut", exitDur: 0.2 }),
    ly("ts_note", "text", "dial label", 23.55, 1.65, { x: 660, y: 1490, w: 700, h: 70 }, {
      text: "AVERAGE CLIENT SCORE\nACROSS 214 HANDOVERS", font: "mono", size: 20, tracking: 8, leading: 1.5, align: "left", color: ASH, reveal: "lines", stagger: 0.06,
    }, { enter: "fade", exit: "fade", dur: 0.3, exitDur: 0.2 }),

    /* ── 8 · lockup finale 25.0 – 27.55 ───────────────────────────── */
    ly("lo_bg", "bg", "finale wash", 24.9, 2.85, {}, {
      mode: "radial", cx: 0.5, cy: 0.45, r: 1.0, colors: ["#1a1e22", "#08090a"], drift: 8,
      pools: [{ x: 0.5, y: 0.46, r: 0.44, c: ORANGE, a: 0.2, spin: 0.04 }],
    }, { enter: "fade", exit: "fade", dur: 0.34, exitDur: 0.3 }),
    ly("lo_lock", "path", "full lockup", 25.0, 2.6, { x: 540, y: 892, w: 700, h: 212 }, {
      logo: "timberlane", group: "all", fit: "inside", clipReveal: true, clipDur: 0.85, stagger: 0.03, tint: "auto", keepBrand: true,
    }, { enter: "scale", exit: "fade", dur: 0.55, ease: "backOut", exitDur: 0.26 }),
    ly("lo_rule", "shape", "rule", 25.42, 2.1, { x: 540, y: 1030, w: 700, h: 2 }, {
      shape: "line", strokeW: 2, fill: EMBER, fillAlpha: 0.7, grow: true, growDur: 0.8, growEase: "expoOut",
    }, { enter: "none", exit: "fade", dur: 0, exitDur: 0.2 }),
    ly("lo_tag", "text", "tagline", 25.6, 1.95, { x: 540, y: 1096, w: 820, h: 46 }, {
      text: "PRECISION IN EVERY DETAIL", font: "grotesk", size: 28, weight: 700, tracking: 12, align: "center", color: INK, reveal: "wordsUp", revealDur: 0.4,
    }, { enter: "fade", exit: "fade", dur: 0.3, exitDur: 0.2 }),
    ly("lo_sweep", "sweep", "specular", 25.35, 2.2, {}, {
      color: "#ffe7cc", alpha: 0.2, width: 0.22, angle: 22, once: true, delay: 0.25, dur: 1.5, blend: "screen", ease: "quintOut",
    }, { enter: "none", exit: "none" }),
    ly("cut_5", "shape", "flash", 27.5, 0.16, { x: 540, y: 960, w: 1160, h: 2000 }, {
      shape: "rect", fill: "#ffffff", fillAlpha: 0.3,
    }, { enter: "fade", exit: "fade", dur: 0.03, exitDur: 0.13 }, { blend: "screen" }),

    /* ── 9 · call to action 27.55 – 30 — the orange card ──────────── */
    ly("cta_bg", "bg", "orange card", 27.5, 2.6, {}, {
      mode: "linear", angle: 158, colors: [ORANGE, "#e2762c", "#a44a11"], drift: 16,
    }, { enter: "maskUp", exit: "none", dur: 0.6, ease: "expoOut" }),
    ly("cta_grain", "grain", "card grain", 27.55, 2.55, {}, {
      alpha: 0.05, contrast: 0.5, blend: "overlay",
    }, { enter: "none", exit: "none" }),
    head("cta_head", "CTA", 27.9, 2.2, 700, "LET'S\n**BUILD.**", 196, { align: "left", leading: 0.86, color: "#16181c", accent: "#0f1012", reveal: "wordsUp", revealDist: 220, stagger: 0.1, revealEase: "expoOut" }, { enter: "none", exit: "none", dur: 0 }),
    ly("cta_mark", "path", "emblem", 28.15, 1.95, { x: 196, y: 1122, w: 104, h: 104 }, {
      logo: "timberlane", group: "mark", fit: "inside", tint: "#16181c", keepBrand: false, clipReveal: true, clipDur: 0.7,
    }, { enter: "none", exit: "none" }),
    ly("cta_url", "text", "url", 28.3, 1.8, { x: 540, y: 1268, w: 880, h: 90 }, {
      text: "timberlane.co.in", font: "display", size: 84, tracking: 0, align: "left", color: "#16181c", reveal: "pop", revealDur: 0.45,
    }, { enter: "fade", exit: "none", dur: 0.25 }),
    ly("cta_phone", "text", "phone", 28.5, 1.6, { x: 540, y: 1356, w: 880, h: 40 }, {
      text: "+91 88846 51111 · MON–SAT 10–7", font: "mono", size: 24, tracking: 6, align: "left", color: "#3a1c07", reveal: "wordsLeft",
    }, { enter: "fade", exit: "none", dur: 0.25 }),
    ly("cta_btn", "shape", "button", 28.72, 1.38, { x: 350, y: 1484, w: 500, h: 82 }, {
      shape: "pill", fill: "#16181c", radius: 41,
    }, { enter: "scale", exit: "none", dur: 0.5, ease: "backOut", scaleFrom: 0.7 }),
    ly("cta_btnTxt", "text", "button label", 28.82, 1.28, { x: 350, y: 1484, w: 500, h: 40 }, {
      text: "BOOK A DESIGN CALL  →", font: "mono", size: 24, weight: 600, tracking: 10, align: "center", color: "#f6f3ee",
    }, { enter: "fade", exit: "none", dur: 0.3 }),
    ly("cta_bars", "bars", "outro spectrum", 29.0, 1.1, { x: 540, y: 1660, w: 620, h: 52 }, {
      count: 26, gap: 8, min: 4, radius: 2, color: "#16181c", amp: 0.72, beat: true, beatAmt: 0.4, origin: "bottom",
    }, { enter: "fade", exit: "none", dur: 0.25 }),
    ly("cta_note", "text", "fine print", 29.25, 0.85, { x: 540, y: 1748, w: 940, h: 34 }, {
      text: "YELAHANKA NEW TOWN · BENGALURU 560064", font: "mono", size: 18, tracking: 6, align: "center", color: "rgba(22,24,28,.62)",
    }, { enter: "fade", exit: "none", dur: 0.3 }),
  ];

  var SCENE = {
    name: "timberlane-30s",
    title: "TIMBERLANE — “PRESTIGE” 30 s vertical spot",
    client: "Timberlane Interiors · timberlane.co.in",
    fps: 30,
    meta: { width: 1080, height: 1920, duration: 30, base: "#08090a", title: "Timberlane — 30s" },
    theme: {
      ink: INK, orange: ORANGE, ember: EMBER, ash: ASH, grey: "#373B42",
      fonts: { display: "Anton", grotesk: "Archivo", mono: "JetBrains Mono", serif: "Playfair Display" },
    },
    music: { bpm: 120, key: "A minor", title: "Warm Concrete", bar: 2 },
    /* the camera is a 5th layer: a slow push with a beat-snap on the cuts */
    camera: {
      keys: [
        { t: 0, x: 0, y: 0, zoom: 1.05 },
        { t: 2.6, x: 0, y: -8, zoom: 1.0, ease: "expoOut" },
        { t: 6.2, x: 12, y: 6, zoom: 1.045, ease: "swift" },
        { t: 10.4, x: -10, y: -4, zoom: 1.0, ease: "expoOut" },
        { t: 14.0, x: 0, y: 10, zoom: 1.03, ease: "swift" },
        { t: 18.0, x: -14, y: 0, zoom: 1.0, ease: "expoOut" },
        { t: 21.6, x: 8, y: -6, zoom: 1.02, ease: "swift" },
        { t: 25.0, x: 0, y: 0, zoom: 1.0, ease: "expoOut" },
        { t: 27.55, x: 0, y: 4, zoom: 1.035, ease: "expoOut" },
        { t: 30, x: 0, y: 0, zoom: 1.0, ease: "sineInOut" },
      ],
      beat: { amount: 0.008, every: 1 },
      drift: 5,
      handheld: 2.2,
    },
    beats: [0, 2.6, 6.2, 10.4, 14, 18, 21.6, 25, 27.55],
    assets: ASSETS,
    layers: LAYERS,
  };

  TLM.SCENES = TLM.SCENES || {};
  TLM.SCENES.timberlane = SCENE;
  if (typeof module !== "undefined" && module.exports) module.exports = SCENE;
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : this);
