/* ==================================================================
   engine-core.js — TIMBERLANE MOTION LAYERS · core runtime
   ------------------------------------------------------------------
   A scene is plain JSON: a canvas composition described entirely as a
   function of time `t` (seconds). Nothing here reads wall-clock time,
   Math.random or DOM state, which is what makes the same scene

     · scrubbable in the studio preview
     · recordable frame-by-frame to video
     · editable (every layer is a box you can drag)
     · serialisable — the JSON *is* the animation

   Written as a classic script that hangs off `globalThis.TLM` on
   purpose: the exact text of this file is concatenated into the
   single-file HTML export, so no module syntax is allowed here.
   Same goes for engine-draw.js / engine-schema.js / music.js / editor.js.
   ================================================================== */
(function (global) {
  "use strict";
  var TLM = (global.TLM = global.TLM || {});
  TLM.VERSION = "1.0";

  /* ---------------- math + misc ---------------- */
  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }
  function lerp(a, b, p) {
    return a + (b - a) * p;
  }
  function norm(v, a, b) {
    return b === a ? 0 : clamp((v - a) / (b - a), 0, 1);
  }
  function smooth(p) {
    return p * p * (3 - 2 * p);
  }
  function round(n, f) {
    var m = Math.pow(10, f || 0);
    return Math.round(n * m) / m;
  }
  /* deterministic hash noise — scrub-stable, no Math.random anywhere */
  function hash(i) {
    var x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }
  function hash2(i, j) {
    var x = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
    return x - Math.floor(x);
  }
  function prand(seed) {
    var s = (seed | 0) || 1;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }
  function deg(d) {
    return (d * Math.PI) / 180;
  }

  /* ---------------- easing ---------------- */
  var EASE = {
    linear: function (p) { return p; },
    quadOut: function (p) { return 1 - (1 - p) * (1 - p); },
    quadIn: function (p) { return p * p; },
    cubicOut: function (p) { return 1 - Math.pow(1 - p, 3); },
    cubicIn: function (p) { return p * p * p; },
    quartOut: function (p) { return 1 - Math.pow(1 - p, 4); },
    quintOut: function (p) { return 1 - Math.pow(1 - p, 5); },
    expoOut: function (p) { return p >= 1 ? 1 : 1 - Math.pow(2, -10 * p); },
    expoIn: function (p) { return p <= 0 ? 0 : Math.pow(2, 10 * p - 10); },
    sineOut: function (p) { return Math.sin((p * Math.PI) / 2); },
    sineInOut: function (p) { return 0.5 - 0.5 * Math.cos(Math.PI * p); },
    powerOut: function (p) { return 1 - Math.pow(1 - p, 2.4); },
    backOut: function (p) { var c = 1.9; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); },
    backIn: function (p) { var c = 1.9; return p * p * ((c + 1) * p - c); },
    elasticOut: function (p) {
      if (p <= 0 || p >= 1) return p;
      var c = (2 * Math.PI) / 3;
      return Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * c) + 1;
    },
    bounceOut: function (p) {
      var n1 = 7.5625, d1 = 2.75;
      if (p < 1 / d1) return n1 * p * p;
      if (p < 2 / d1) return n1 * (p -= 1.5 / d1) * p + 0.75;
      if (p < 2.5 / d1) return n1 * (p -= 2.25 / d1) * p + 0.9375;
      return n1 * (p -= 2.625 / d1) * p + 0.984375;
    },
    /* settled ramp: quick start, long feather — the "designer" default */
    swift: function (p) { return 1 - Math.pow(1 - p, 3.6) * (1 - 0.12 * Math.cos(Math.PI * p)); },
    snap: function (p) { return p < 0.55 ? Math.pow(p / 0.55, 0.45) * 1.04 - 0.04 * (1 - p) : 1; },
  };
  function ease(name, p) {
    var f = EASE[name] || EASE.swift;
    return f(clamp(p, 0, 1));
  }
  EASE.__names = Object.keys(EASE);
  TLM.EASE = EASE;
  TLM.ease = ease;

  /* ---------------- colour ---------------- */
  var NAMED = {
    transparent: [0, 0, 0, 0],
    white: [255, 255, 255, 1],
    black: [0, 0, 0, 1],
  };
  function parseColor(c) {
    if (!c) return [0, 0, 0, 1];
    if (c[0] === "#") {
      var h = c.slice(1);
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      var n = parseInt(h.slice(0, 6), 16);
      var a = h.length > 6 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
    }
    var m = String(c).match(/rgba?\(([^)]+)\)/);
    if (m) {
      var p = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number);
      return [p[0] | 0, p[1] | 0, p[2] | 0, p.length > 3 ? p[3] : 1];
    }
    return NAMED[String(c).toLowerCase()] || [240, 240, 240, 1];
  }
  function rgba(c, a) {
    var v = parseColor(c);
    return "rgba(" + v[0] + "," + v[1] + "," + v[2] + "," + round((a === undefined ? v[3] : a), 4) + ")";
  }
  function toHex(c) {
    var v = parseColor(c);
    return "#" + [v[0], v[1], v[2]].map(function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
  }
  function mix(a, b, p) {
    var x = parseColor(a), y = parseColor(b);
    return "rgb(" + [0, 1, 2].map(function (i) { return Math.round(lerp(x[i], y[i], p)); }).join(",") + ")";
  }
  function shade(c, amt) {
    return amt < 0 ? mix(c, "#000000", -amt) : mix(c, "#ffffff", amt);
  }
  function lum(c) {
    var v = parseColor(c);
    return (0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]) / 255;
  }
  TLM.color = { parse: parseColor, rgba: rgba, mix: mix, shade: shade, hex: toHex, lum: lum };

  /* ---------------- small canvas helpers ---------------- */
  function rr(ctx, x, y, w, h, r) {
    var rad = Math.max(0, Math.min(typeof r === "number" ? r : 0, Math.min(Math.abs(w), Math.abs(h)) / 2));
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, rad); return; }
    if (rad <= 0.01) { ctx.rect(x, y, w, h); return; }
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    ctx.lineTo(x + rad, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
    ctx.lineTo(x, y + rad);
    ctx.quadraticCurveTo(x, y, x + rad, y);
    ctx.closePath();
  }
  function blob(ctx, cx, cy, r, wob, seed, t) {
    /* organic superellipse used for organic masks/swatches */
    var n = 46;
    ctx.beginPath();
    for (var i = 0; i <= n; i++) {
      var a = (i / n) * Math.PI * 2;
      var k = 1 + wob * 0.12 * Math.sin(a * 3 + (t || 0) * 0.7 + seed * 6.1) + wob * 0.07 * Math.sin(a * 5 - (t || 0) * 0.5);
      var x = cx + Math.cos(a) * r * k, y = cy + Math.sin(a) * r * k * 1.02;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  }
  TLM.g = { rr: rr, blob: blob, clamp: clamp, lerp: lerp, norm: norm, smooth: smooth, hash: hash, hash2: hash2, prand: prand, deg: deg, round: round };

  /* ---------------- asset pool (images / video / svg paths) ---------------- */
  function AssetPool(scene, opts) {
    opts = opts || {};
    this.items = {};
    this.CreateImage = opts.createImage || (global.Image ? function () { return new global.Image(); } : null);
    this.CreateVideo = opts.createVideo || (global.document && global.document.createElement ? function () { return global.document.createElement("video"); } : null);
    this.list = [];
    var assets = (scene && scene.assets) || {};
    for (var id in assets) this.add(id, assets[id]);
  }
  AssetPool.prototype.add = function (id, src) {
    if (!src) return;
    if (this.items[id]) return this.items[id];
    /* `logo:timberlane?tint=%23fff` — rebuild the brand lockup as an SVG image
       asset from the path registry (one copy of the geometry, any colour) */
    if (/^logo:/i.test(src) && TLM.LOGOS) {
      var q = src.split("?");
      var L = TLM.LOGOS[q[0].replace(/^logo:/i, "")];
      var tint = null, bg = null;
      (q[1] || "").split("&").forEach(function (kv) {
        var p = kv.split("=");
        if (p[0] === "tint") tint = decodeURIComponent(p[1] || "");
        if (p[0] === "bg") bg = decodeURIComponent(p[1] || "");
      });
      if (L && L.svg) {
        var uri = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(L.svg(tint && tint !== "auto" ? tint : null, bg));
        src = uri;
      }
    }
    var isVideo = /\.mp4(\?|$)/i.test(src) || /\.webm(\?|$)/i.test(src);
    var rec = { id: id, src: src, kind: isVideo ? "video" : "image", el: null, w: 0, h: 0, ok: false, tried: false, fallbackTried: false };
    this.items[id] = rec;
    this.list.push(rec);
    return rec;
  };
  /* hand a pool an element the page already has (editor image drops,
     inline base64 in an exported file, a locally-baked plate) */
  AssetPool.prototype.set = function (id, el, src) {
    var rec = this.items[id] || this.add(id, src || "local:" + id);
    rec.el = el;
    rec.ok = true;
    rec.tried = true;
    rec.failed = false;
    rec.src = src || rec.src;
    rec.w = (el && (el.naturalWidth || el.videoWidth || el.width)) || 1;
    rec.h = (el && (el.naturalHeight || el.videoHeight || el.height)) || 1;
    if (el && el.duration) rec.kind = "video";
    return rec;
  };
  AssetPool.prototype.load = function (rec) {
    var self = this;
    if (rec.tried) return;
    rec.tried = true;
    if (rec.kind === "video") {
      if (!this.CreateVideo) { rec.failed = true; return; }
      var v = this.CreateVideo();
      try { v.crossOrigin = "anonymous"; } catch (e) { /* noop */ }
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.preload = "auto";
      v.onloadeddata = function () { rec.ok = true; rec.el = v; rec.w = v.videoWidth || 1080; rec.h = v.videoHeight || 1920; };
      v.onerror = function () { rec.failed = true; };
      v.src = rec.src;
      try { v.play && v.play().catch(function () { /* autoplay blocked — still seekable */ }); } catch (e) { /* noop */ }
      return;
    }
    if (!this.CreateImage) {
      /* headless: caller is expected to supply createImage */
      rec.failed = true;
      return;
    }
    var img = this.CreateImage();
    try { img.crossOrigin = "anonymous"; } catch (e) { /* noop */ }
    img.onload = function () {
      rec.ok = true; rec.el = img; rec.w = img.naturalWidth || img.width || 1; rec.h = img.naturalHeight || img.height || 1;
    };
    img.onerror = function () {
      /* Pexels (or any remote plate) unreachable → try the local stand-in */
      if (!rec.fallbackTried && rec.fallbackSrc) {
        rec.fallbackTried = true;
        rec.tried = false;
        rec.src = rec.fallbackSrc;
        self.load(rec);
      } else {
        rec.failed = true;
      }
    };
    img.src = rec.src;
  };
  AssetPool.prototype.get = function (id, fallbackId) {
    var rec = this.items[id] || (fallbackId && this.items[fallbackId]);
    if (!rec) return null;
    if (!rec.tried) this.load(rec);
    return rec.ok ? rec : null;
  };
  AssetPool.prototype.preload = function () {
    var self = this;
    this.list.forEach(function (r) { self.load(r); });
    return new Promise(function (res) {
      var n = 0;
      var iv = setInterval(function () {
        n++;
        var done = self.list.every(function (r) { return r.ok || r.failed || n > 60; });
        if (done) { clearInterval(iv); res(self.stats()); }
      }, 120);
    });
  };
  AssetPool.prototype.stats = function () {
    var ok = 0;
    this.list.forEach(function (r) { if (r.ok) ok++; });
    return { total: this.list.length, ok: ok, failed: this.list.filter(function (r) { return r.failed; }).map(function (r) { return r.id; }) };
  };
  TLM.AssetPool = AssetPool;

  /* ---------------- fonts ---------------- */
  function fontFamily(scene, key) {
    var f = (scene && scene.fonts) || {};
    return (
      f[key] ||
      {
        display: "'Anton', 'Arial Narrow', Impact, sans-serif",
        grotesk: "'Archivo', system-ui, 'Helvetica Neue', Arial, sans-serif",
        mono: "'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace",
        serif: "'Playfair Display', Georgia, serif",
      }[key] ||
      "system-ui, sans-serif"
    );
  }
  function fontString(props, scene) {
    var fam = fontFamily(scene, props.font || "grotesk");
    var w = props.weight === undefined ? 600 : props.weight;
    var style = props.italic ? "italic " : "";
    return style + (typeof w === "string" ? w : w) + " " + (props.size || 40) + "px " + fam;
  }
  TLM.fontString = fontString;
  TLM.fontFamily = fontFamily;

  /* ---------------- text layout (word boxes → reveal + hit-testing) ----------------
     `**word**` inside the string marks a highlight (uses props.accent).
     Manual per-letter advance so `tracking` behaves identically everywhere
     (ctx.letterSpacing is not in the baseline Canvas2D spec).
  ------------------------------------------------------------------ */
  function measureLetters(ctx, s, tracking) {
    var out = [];
    var w = 0;
    for (var i = 0; i < s.length; i++) {
      var cw = ctx.measureText(s[i]).width + tracking;
      out.push(cw);
      w += cw;
    }
    return { adv: out, w: w - tracking * (s.length ? 1 : 0) };
  }
  /* words + `**highlight**` spans, across spaces — "**LIVE IN.**" marks both
     words, "**A**nd" marks only the first; markers never reach the pixels */
  function tokenize(str) {
    var out = [], cur = "", hi = false;
    for (var i = 0; i < str.length; i++) {
      var c = str.charAt(i);
      if (c === "*" && str.charAt(i + 1) === "*") {
        if (cur) { out.push({ s: cur, hi: hi }); cur = ""; }
        hi = !hi;
        i++;
        continue;
      }
      if (/\s/.test(c)) {
        if (cur) { out.push({ s: cur, hi: hi }); cur = ""; }
        continue;
      }
      cur += c;
    }
    if (cur) out.push({ s: cur, hi: hi });
    return out;
  }
  TLM.tokenize = tokenize;

  function layoutText(ctx, opts) {
    var tracking = opts.tracking || 0;
    ctx.font = fontString(opts, opts.__scene);
    var raw = String(opts.text === undefined ? "" : opts.text);
    if (opts.upper === true) raw = raw.toUpperCase();
    var paras = raw.split(/\r?\n/);
    var maxW = opts.maxWidth || 1e9;
    var lines = [];
    for (var p = 0; p < paras.length; p++) {
      var toks = tokenize(paras[p]);
      if (!toks.length) { lines.push({ words: [], w: 0 }); continue; }
      var cur = { words: [], w: 0 };
      var spaceW = ctx.measureText(" ").width + tracking;
      toks.forEach(function (tk) {
        var m = measureLetters(ctx, tk.s, tracking);
        var add = (cur.words.length ? spaceW : 0) + m.w;
        if (cur.words.length && cur.w + add > maxW) {
          lines.push(cur);
          cur = { words: [], w: 0 };
          add = m.w;
        }
        cur.words.push({ s: tk.s, hi: tk.hi, w: m.w, adv: m.adv });
        cur.w += add;
      });
      lines.push(cur);
    }
    var size = opts.size || 40;
    var leading = (opts.leading || 1.05) * size;
    var widest = 0;
    lines.forEach(function (l) { widest = Math.max(widest, l.w); });
    /* position words inside each line */
    lines.forEach(function (l) {
      var x = opts.align === "left" ? 0 : opts.align === "right" ? opts.w - l.w : (opts.w - l.w) / 2;
      l.x = x;
      l.words.forEach(function (wd) {
        wd.x = x;
        x += wd.w + spaceW;
      });
    });
    return { lines: lines, height: lines.length * leading, leading: leading, w: widest, spaceW: spaceW, size: size };
  }
  TLM.layoutText = layoutText;

  /* ---------------- per-layer time state ---------------- */
  function layerOut(l) {
    return l.out !== undefined ? l.out : (l.in || 0) + (l.dur === undefined ? 4 : l.dur);
  }
  TLM.layerOut = layerOut;

  var FULL = TLM.FULLBLEED = { bg: 1, grain: 1, vignette: 1, particles: 1, grid: 1, sweep: 1, ticker: 1, frame: 1 };
  function layerState(l, t, scene) {
    var din = l.in || 0, dout = layerOut(l);
    var vis = t >= din && t <= dout && !l.hidden;
    var dur = Math.max(0.001, dout - din);
    var local = t - din;
    var A = l.anim || {};
    var enterDur = Math.min(A.dur === undefined ? 0.55 : A.dur, dur * 0.85);
    var exitDur = Math.min(A.exitDur === undefined ? (A.dur === undefined ? 0.45 : A.dur) : A.exitDur, dur * 0.7);
    var ep = ease(A.ease || "swift", clamp(local / Math.max(0.0001, enterDur), 0, 1));
    var xp = ease(A.exitEase || "quadOut", clamp((dout - t) / Math.max(0.0001, exitDur), 0, 1));
    var prog = clamp(local / dur, 0, 1);
    var T = l.t || {};
    var st = {
      visible: vis,
      on: clamp(local, -999, dur),
      enter: ep,
      exit: xp,
      prog: prog,
      /* "settle" — how far past the entrance we are, for micro-motion */
      settle: clamp(local / 1.6, 0, 1),
      alpha: (T.opacity === undefined ? 1 : T.opacity) * ep * xp,
      x: T.x || 0,
      y: T.y || 0,
      w: T.w === undefined ? (FULL[l.type] ? (scene && scene.meta ? scene.meta.width : 1080) : 400) : T.w,
      h: T.h === undefined ? (FULL[l.type] ? (scene && scene.meta ? scene.meta.height : 1920) : 120) : T.h,
      parallax:
        l.parallax !== undefined
          ? l.parallax
          : l.type === "photo" || l.type === "video"
          ? 0.35
          : l.type === "text" || l.type === "counter"
          ? 1
          : 0.12,
      rot: T.rot || 0,
      scale: T.scale === undefined ? 1 : T.scale,
      ax: T.anchorX === undefined ? 0.5 : T.anchorX,
      ay: T.anchorY === undefined ? 0.5 : T.anchorY,
      z: T.z === undefined ? 0 : T.z,
    };
    if (!vis) return st;

    /* keyframed transform channels (optional, any of x,y,scale,rot,opacity,w,h) */
    var keys = l.keys;
    if (keys && keys.length) {
      for (var k = 0; k < keys.length; k++) {
        var K = keys[k], K1 = keys[k + 1];
        if (!K1 || t < K.t) {
          if (k === 0) { /* before first key */ }
          break;
        }
        var kp = ease(K.ease || A.ease || "swift", norm(t, K.t, K1.t));
        for (var ch in K1) {
          if (ch === "t" || ch === "ease") continue;
          if (typeof K1[ch] === "number" && typeof K[ch] === "number") st[ch] = lerp(K[ch], K1[ch], kp);
        }
        break;
      }
    }

    /* entrance / exit transforms + continuous motion */
    var d = A.dist === undefined ? 64 : A.dist;
    var s0 = A.scaleFrom === undefined ? 1.12 : A.scaleFrom;
    var enter = A.enter || "fade", exit = A.exit || "fade";
    function applyEnter(which, p, dir) {
      var q = dir === "exit" ? 1 - p : 1 - p; // 0 = landed, 1 = far away
      if (which === "none") return;
      if (which === "fade") return;
      if (which === "up") st.y += d * q * (dir === "exit" ? -1 : 1);
      else if (which === "down") st.y += d * q * (dir === "exit" ? -1 : 1) * -1;
      else if (which === "left") st.x += d * q * (dir === "exit" ? -1 : 1);
      else if (which === "right") st.x += d * q * (dir === "exit" ? -1 : 1) * -1;
      else if (which === "scale" || which === "zoomIn") st.scale *= lerp(1, which === "zoomIn" ? 1.4 : s0, q);
      else if (which === "zoomOut") st.scale *= lerp(1, 0.82, q);
      else if (which === "rot" || which === "spinIn") st.rot += lerp(0, A.rotFrom === undefined ? -14 : A.rotFrom, q);
      else if (which === "blur" || which === "rise") { st.y += (which === "blur" ? 14 : 34) * q; st.scale *= lerp(1, 1.03, q); }
      /* wipe/pop/words/shuffle/clipX handled inside the layer painter via st.enterName */
    }
    applyEnter(enter, ep, "enter");
    applyEnter(exit, xp, "exit");
    st.enterName = enter;
    st.exitName = exit;
    st.enterRaw = clamp(local / Math.max(0.0001, enterDur), 0, 1);
    st.exitRaw = clamp((dout - t) / Math.max(0.0001, exitDur), 0, 1);

    /* continuous motion */
    if (A.float) st.y += Math.sin(t * (A.floatSpeed || 1.1) + (A.seed || 1) * 3.3) * A.float;
    if (A.drift) { st.x += Math.sin(t * (A.driftSpeed || 0.6) + 1.7) * A.drift; st.y += Math.cos(t * (A.driftSpeed || 0.6) * 0.8) * A.drift * 0.5; }
    if (A.pulse) st.scale *= 1 + Math.sin(t * (A.pulseSpeed || 2.2) + 0.6) * A.pulse;
    if (A.breathe) st.scale *= 1 + A.breathe * smooth(clamp(prog, 0, 1)) * 1;
    if (A.spin) st.rot += A.spin * (t - din) * 360;
    if (A.shake) {
      var amp = A.shake * Math.exp(-clamp(local / (A.shakeDecay || 0.5), 0, 6));
      st.x += (hash(Math.floor(t * 60) * 3 + 1) - 0.5) * amp;
      st.y += (hash(Math.floor(t * 60) * 3 + 2) - 0.5) * amp;
    }
    if (A.skew) st.skew = A.skew;
    if (A.blur) st.blur = A.blur * (1 - ep) + (A.blurAfter ? A.blurAfter * (1 - Math.min(1, Math.max(0, (local - enterDur) / 0.4))) : 0);
    return st;
  }
  TLM.layerState = layerState;

  /* ---------------- camera ---------------- */
  function cameraState(scene, t) {
    var C = scene.camera || {};
    var out = { x: 0, y: 0, zoom: 1, rot: 0 };
    var keys = C.keys;
    if (keys && keys.length) {
      var a = null, b = null;
      for (var i = 0; i < keys.length; i++) {
        if (t >= keys[i].t) { a = keys[i]; b = keys[i + 1] || a; }
        else if (!a) { a = keys[i]; b = keys[i]; }
      }
      if (a && b && b !== a) {
        var p = ease(b.ease || a.ease || "sineInOut", norm(t, a.t, b.t));
        out.x = lerp(a.x || 0, b.x || 0, p);
        out.y = lerp(a.y || 0, b.y || 0, p);
        out.zoom = lerp(a.zoom === undefined ? 1 : a.zoom, b.zoom === undefined ? 1 : b.zoom, p);
        out.rot = lerp(a.rot || 0, b.rot || 0, p);
      } else if (a) {
        out.x = a.x || 0; out.y = a.y || 0; out.zoom = a.zoom === undefined ? 1 : a.zoom; out.rot = a.rot || 0;
      }
    }
    if (C.beat && scene.music && scene.music.bpm) {
      var beat = 60 / (scene.music.bpm || 120);
      var bp = (t % beat) / beat;
      var punch = Math.exp(-bp * 9) * (C.beat.amount || 0.012);
      out.zoom *= 1 + punch * (C.beat.every === 2 ? (Math.floor(t / beat) % 2 === 0 ? 1 : 0.3) : 1);
    }
    if (C.drift) {
      out.x += Math.sin(t * 0.35) * C.drift;
      out.y += Math.cos(t * 0.28) * C.drift * 0.7;
    }
    if (C.handheld) {
      out.x += (hash(Math.floor(t * 24)) - 0.5) * C.handheld;
      out.y += (hash(Math.floor(t * 24) + 99) - 0.5) * C.handheld;
      out.rot += (hash(Math.floor(t * 24) + 7) - 0.5) * C.handheld * 0.02;
    }
    return out;
  }
  TLM.cameraState = cameraState;

  /* ---------------- transform: comp space placement for a layer ---------------- */
  function applyTransform(ctx, st, scene, cam) {
    var cx = st.x, cy = st.y;
    if (cam) {
      /* parallax: layers with parallax p move against the camera by p */
      var pl = st.parallax === undefined ? 1 : st.parallax;
      cx += cam.x * pl;
      cy += cam.y * pl;
    }
    ctx.translate(cx, cy);
    if (st.rot) ctx.rotate(deg(st.rot));
    if (st.skew) ctx.transform(1, 0, Math.tan(deg(st.skew)), 1, 0, 0);
    if (st.scale !== 1) ctx.scale(st.scale, st.scale);
    ctx.translate(-st.w * st.ax, -st.h * st.ay);
  }
  TLM.applyTransform = applyTransform;
  TLM.place = applyTransform;

  /* ---------------- box of a layer in comp space (for editor hit-testing) ---------------- */
  function layerBox(l, t, scene) {
    var st = layerState(l, t, scene);
    var cam = scene && scene.camera ? cameraState(scene, t) : { x: 0, y: 0 };
    var pw = scene && scene.meta ? scene.meta.width : 1080;
    var ph = scene && scene.meta ? scene.meta.height : 1920;
    /* replicate the placement maths: anchor → top-left, camera parallax */
    var cx = st.x + cam.x * (st.parallax === undefined ? 1 : st.parallax);
    var cy = st.y + cam.y * (st.parallax === undefined ? 1 : st.parallax);
    var bw = st.w, bh = st.h;
    if (FULL[l.type] && (!l.t || l.t.w === undefined)) { bw = pw; bh = ph; cx = pw / 2; cy = ph / 2; }
    return { x: cx - bw * st.ax, y: cy - bh * st.ay, w: bw, h: bh, rot: st.rot, scale: st.scale, cx: cx, cy: cy, ax: st.ax, ay: st.ay, state: st };
  }
  TLM.layerBox = layerBox;

  function hitTest(scene, t, px, py, ctx) {
    var hit = null;
    for (var i = scene.layers.length - 1; i >= 0; i--) {
      var l = scene.layers[i];
      if (l.hidden || l.locked) continue;
      if (t < (l.in || 0) || t > layerOut(l)) continue;
      if (l.type === "bg" || l.type === "grain" || l.type === "vignette") continue;
      var b = layerBox(l, t, scene);
      /* undo rotation + scale about centre for the point */
      var qx = px - b.cx, qy = py - b.cy;
      if (b.rot) {
        var a = -deg(b.rot), cs = Math.cos(a), sn = Math.sin(a);
        var nx = qx * cs - qy * sn, ny = qx * sn + qy * cs;
        qx = nx; qy = ny;
      }
      var s = b.scale || 1;
      qx /= s; qy /= s;
      var x0 = -b.w * b.ax, x1 = b.w * (1 - b.ax);
      var y0 = -b.h * b.ay, y1 = b.h * (1 - b.ay);
      var pad = (l.type === "text" ? 10 : 6);
      if (qx >= x0 - pad && qx <= x1 + pad && qy >= y0 - pad && qy <= y1 + pad) { hit = l.id; break; }
    }
    return hit;
  }
  TLM.hitTest = hitTest;

  /* ---------------- the frame renderer ---------------- */
  function renderFrame(ctx, scene, t, opts) {
    opts = opts || {};
    var W = scene.meta.width, H = scene.meta.height;
    var draw = TLM.draw || {};
    ctx.save();
    ctx.__scale = opts.scale || 1;
    ctx.setTransform(opts.scale || 1, 0, 0, opts.scale || 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = "high";
    /* base wash so exported frames never flash white */
    ctx.fillStyle = (scene.meta && scene.meta.base) || "#0b0c0e";
    ctx.fillRect(0, 0, W, H);

    var cam = cameraState(scene, t);
    var list = scene.layers;
    for (var i = 0; i < list.length; i++) {
      var l = list[i];
      if (l.hidden) continue;
      if (t < (l.in || 0) || t > layerOut(l)) continue;
      if (opts.only && opts.only.indexOf(l.id) === -1) continue;
      if (opts.skip && opts.skip.indexOf(l.id) !== -1) continue;
      var st = layerState(l, t, scene);
      if (st.alpha <= 0.002) continue;
      st.parallax = l.parallax === undefined ? (l.type === "photo" || l.type === "video" ? 0.35 : l.type === "text" ? 1 : 0.12) : l.parallax;
      var fn = draw[l.type];
      ctx.save();
      try {
        if (fn) fn(ctx, scene, l, st, t, opts);
        else unknownLayer(ctx, l, st);
      } catch (err) {
        /* one bad layer must never kill the frame */
        if (opts.debug) console.warn("layer", l.type, l.id, err && err.message);
      }
      ctx.restore();
    }
    ctx.restore();
    if (opts.overlay) overlayGuides(ctx, scene, t, opts);
    return scene;
  }
  function unknownLayer(ctx, l, st) {
    ctx.globalAlpha = st.alpha * 0.35;
    ctx.fillStyle = "#c45a0f";
    ctx.font = "700 26px monospace";
    ctx.fillText("? " + l.type, st.x - 60, st.y);
  }
  function overlayGuides(ctx, scene, t, opts) {
    var W = scene.meta.width, H = scene.meta.height;
    ctx.save();
    ctx.setTransform(opts.scale || 1, 0, 0, opts.scale || 1, 0, 0);
    ctx.globalAlpha = 1;
    if (opts.guides) {
      ctx.strokeStyle = "rgba(255,255,255,.16)";
      ctx.lineWidth = 1;
      for (var k = 1; k < 3; k++) {
        ctx.beginPath(); ctx.moveTo((W * k) / 3, 0); ctx.lineTo((W * k) / 3, H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, (H * k) / 3); ctx.lineTo(W, (H * k) / 3); ctx.stroke();
      }
      ctx.strokeStyle = "rgba(196,90,15,.5)";
      ctx.setLineDash([10, 8]);
      ctx.strokeRect(W * 0.055, H * 0.055, W * 0.89, H * 0.89);
      ctx.setLineDash([]);
    }
    if (opts.burnIn) {
      ctx.fillStyle = "rgba(8,8,10,.72)";
      ctx.fillRect(0, 0, W, 54);
      ctx.fillStyle = "#ff8a4c";
      ctx.font = "700 22px monospace";
      var f = Math.floor((t % 1) * (scene.meta.fps || 30));
      ctx.fillText("t " + t.toFixed(2) + ":" + ("0" + f).slice(-2) + "  ·  " + (scene.layers.length) + " LAYERS  ·  " + (scene.music ? scene.music.title : "NO SCORE"), 18, 35);
    }
    ctx.restore();
  }
  TLM.render = renderFrame;
  TLM.util = { clamp: clamp, lerp: lerp, norm: norm, smooth: smooth, hash: hash, hash2: hash2, prand: prand, deg: deg, round: round, rr: rr, blob: blob };

  /* ---------------- scene utilities (used by editor + docs) ---------------- */
  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }
  /* unique id inside `scene`; callable as uid(), uid("txt") or uid(scene,"txt") */
  function uid(scene, prefix) {
    if (typeof scene === "string") {
      prefix = scene;
      scene = null;
    }
    var list = (scene && scene.layers) || [];
    var n = 1;
    prefix = prefix || "l";
    while (list.some(function (l) { return l.id === prefix + n; })) n++;
    return prefix + n;
  }
  function normalize(scene) {
    if (!scene.meta) scene.meta = {};
    scene.meta.width = scene.meta.width || 1080;
    scene.meta.height = scene.meta.height || 1920;
    scene.meta.fps = scene.meta.fps || 30;
    scene.meta.duration = scene.meta.duration || 30;
    scene.layers = scene.layers || [];
    scene.assets = scene.assets || {};
    scene.layers.forEach(function (l, i) {
      l.id = l.id || "l" + (i + 1);
      l.name = l.name || l.type + " " + (i + 1);
      l.in = l.in || 0;
      if (l.dur === undefined && l.out === undefined) l.dur = 4;
      if (l.out !== undefined) l.dur = l.out - l.in;
      l.t = l.t || {};
      l.props = l.props || {};
      l.anim = l.anim || {};
    });
    return scene;
  }
  TLM.clone = clone;
  TLM.uid = uid;
  /* timecode — "MM:SS:FF" for the reel chrome and the editor readout */
  TLM.fmtTC = function (t, fps, style) {
    fps = fps || 30;
    var neg = t < 0;
    t = Math.abs(t || 0);
    var total = Math.floor(t * fps + 0.0005);
    var ff = total % fps;
    var ss = Math.floor(total / fps) % 60;
    var mm = Math.floor(total / fps / 60);
    var z = function (x) { return (x < 10 ? "0" : "") + x; };
    if (style === "sec") return z(Math.floor(t)) + "." + z(Math.floor((t % 1) * 100));
    if (style === "frames") return String(total);
    return (neg ? "-" : "") + z(mm) + ":" + z(ss) + ":" + z(ff);
  };
  TLM.normalize = normalize;
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : this);
