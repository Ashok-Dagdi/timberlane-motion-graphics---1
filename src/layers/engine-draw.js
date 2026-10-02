/* ==================================================================
   engine-draw.js — layer painters
   ------------------------------------------------------------------
   Each painter is TLM.draw[type](ctx, scene, layer, state, t, opts).
   Contract: the context arrives at the composition origin (no layer
   transform applied); the painter owns its transform, alpha, composite
   mode and clipping. Painters are pure functions of `t` — no Math.random,
   no Date.now, no DOM reads — so an exported frame at t=7.5 is pixel
   identical to the preview at t=7.5.
   ================================================================== */
(function (global) {
  "use strict";
  var TLM = (global.TLM = global.TLM || {});
  var U = TLM.util, C = TLM.color;
  var clamp = U.clamp, lerp = U.lerp, norm = U.norm, hash = U.hash, rr = U.rr, deg = U.deg;
  var draw = (TLM.draw = TLM.draw || {});
  var layoutCache = typeof WeakMap === "function" ? new WeakMap() : null;
  var noiseTiles = typeof WeakMap === "function" ? new WeakMap() : null;
  var _filter = null;
  function filterOK(ctx) {
    if (_filter === null) _filter = typeof ctx.filter === "string";
    return _filter;
  }
  function setBlur(ctx, v) {
    if (filterOK(ctx)) ctx.filter = v > 0.15 ? "blur(" + v.toFixed(2) + "px)" : "none";
  }
  function comp(ctx, mode) {
    if (mode && mode !== "source-over") {
      try { ctx.globalCompositeOperation = mode; } catch (e) { /* unsupported mode: keep source-over */ }
    }
  }
  function baseScale(ctx) { return ctx.__scale || 1; }

  /* place a layer: camera zoom/pan → layer transform → local (0,0) = top-left */
  function place(ctx, scene, l, st, t) {
    var cam = scene.camera ? TLM.cameraState(scene, t) : { x: 0, y: 0, zoom: 1, rot: 0 };
    var W = scene.meta.width, H = scene.meta.height;
    ctx.globalAlpha = clamp(st.alpha, 0, 1);
    if (l.blend) comp(ctx, l.blend);
    if (st.blur) setBlur(ctx, st.blur);
    ctx.translate(W / 2, H / 2);
    if (cam.zoom !== 1) ctx.scale(cam.zoom, cam.zoom);
    if (cam.rot) ctx.rotate(deg(cam.rot));
    ctx.translate(-W / 2, -H / 2);
    ctx.translate(st.x + cam.x * st.parallax, st.y + cam.y * st.parallax);
    if (st.rot) ctx.rotate(deg(st.rot));
    if (st.skew) ctx.transform(1, 0, Math.tan(deg(st.skew)), 1, 0, 0);
    if (st.scale !== 1) ctx.scale(st.scale, st.scale);
    ctx.translate(-st.w * st.ax, -st.h * st.ay);
  }

  /* clip-based reveals (wipe / circle / line-mask) */
  var CLIP_IN = ["wipeL", "wipeR", "wipeU", "wipeD", "circle", "maskUp", "lineMask"];
  function needsClip(st) {
    return CLIP_IN.indexOf(st.enterName) !== -1 && st.enterRaw < 0.999;
  }
  function clipReveal(ctx, w, h, st) {
    var rv = TLM.ease("expoOut", st.enterRaw);
    var n = st.enterName;
    var p = 60; // overshoot so strokes/blur outside the box still land
    ctx.beginPath();
    if (n === "wipeL") ctx.rect(-p, -p, (w + 2 * p) * rv, h + 2 * p);
    else if (n === "wipeR") ctx.rect(w + p - (w + 2 * p) * rv, -p, (w + 2 * p) * rv, h + 2 * p);
    else if (n === "wipeU" || n === "maskUp") ctx.rect(-p, h + p - (h + 2 * p) * rv, w + 2 * p, (h + 2 * p) * rv);
    else if (n === "lineMask") ctx.rect(-p, h + p - (h + 2 * p) * rv, w + 2 * p, (h + 2 * p) * rv);
    else if (n === "wipeD") ctx.rect(-p, -p, w + 2 * p, (h + 2 * p) * rv);
    else ctx.arc(w / 2, h / 2, Math.max(0.5, (Math.hypot(w, h) / 2) * rv), 0, 6.2832);
    ctx.clip();
  }

  /* ================================================== background */
  draw.bg = function (ctx, scene, l, st, t) {
    var P = l.props, W = scene.meta.width, H = scene.meta.height;
    var cols = P.colors || ["#101114", "#1d2126"];
    ctx.save();
    ctx.setTransform(baseScale(ctx), 0, 0, baseScale(ctx), 0, 0);
    ctx.globalAlpha = clamp(st.alpha, 0, 1);
    if (P.mode === "radial") {
      var gx = (P.cx === undefined ? 0.5 : P.cx) * W, gy = (P.cy === undefined ? 0.32 : P.cy) * H;
      var rad = (P.r || 1.05) * Math.max(W, H) * (1 + (P.pulse ? Math.sin(t * (P.pulseSpeed || 1.4)) * P.pulse : 0));
      var g = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(1, rad));
      cols.forEach(function (c, i, a) { g.addColorStop(a.length === 1 ? 0 : i / (a.length - 1), c); });
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    } else {
      var ang = deg((P.angle === undefined ? 145 : P.angle) + (P.drift ? Math.sin(t * 0.25) * P.drift : 0));
      var cx2 = Math.cos(ang) * W * 0.6, cy2 = Math.sin(ang) * H * 0.6;
      var lg = ctx.createLinearGradient(W / 2 - cx2, H / 2 - cy2, W / 2 + cx2, H / 2 + cy2);
      cols.forEach(function (c, i, a) { lg.addColorStop(a.length === 1 ? 0 : i / (a.length - 1), c); });
      ctx.fillStyle = lg;
      ctx.fillRect(0, 0, W, H);
    }
    /* soft colour pools — the hand-built gradient look */
    (P.pools || []).forEach(function (p, i) {
      var px = p.x * W + Math.sin(t * (p.speed || 0.22) + i * 2.1) * (p.float || 0) * W;
      var py = p.y * H + Math.cos(t * (p.speed || 0.22) * 0.8 + i) * (p.float || 0) * H;
      var pr = (p.r || 0.4) * Math.max(W, H) * (1 + Math.sin(t * 0.5 + i) * (p.breathe || 0));
      var pg = ctx.createRadialGradient(px, py, 0, px, py, Math.max(1, pr));
      pg.addColorStop(0, C.rgba(p.color, p.alpha === undefined ? 0.5 : p.alpha));
      pg.addColorStop(1, C.rgba(p.color, 0));
      ctx.fillStyle = pg;
      ctx.fillRect(0, 0, W, H);
    });
    ctx.restore();
  };

  /* ------------------------------------------------------------------
     interiorStudy — the stand-in a plate draws when the stock photo
     can't be fetched (offline render, blocked CDN, exported file with
     no network). Rather than a grey box it paints an abstraction of
     the same thing: a lit room — wall planes, a window, the spill on
     the floor, furniture silhouettes, one warm lamp. Seeded by the
     asset id so every plate is different but frame-stable.
     ------------------------------------------------------------------ */
  function interiorStudy(ctx, w, h, id, t, warm) {
    var r1 = U.hash(id || "plate");
    var pr = U.prand(Math.floor(r1 * 1e6));
    var wallA = ["#2a2e35", "#333840", "#252a30"][Math.floor(pr() * 3)];
    var wallB = "#15181c";
    var floorY = h * (0.62 + pr() * 0.12);
    var g = ctx.createLinearGradient(0, 0, w * 0.35, h);
    g.addColorStop(0, wallA);
    g.addColorStop(1, wallB);
    ctx.fillStyle = g;
    ctx.fillRect(-40, -40, w + 80, h + 80);
    /* a corner: two wall planes meeting */
    var cx = w * (0.28 + pr() * 0.4);
    ctx.fillStyle = "rgba(255,255,255,0.035)";
    ctx.beginPath();
    ctx.moveTo(cx, -40);
    ctx.lineTo(w + 40, -40);
    ctx.lineTo(w + 40, floorY);
    ctx.lineTo(cx, floorY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.lineWidth = Math.max(1, w * 0.004);
    ctx.beginPath();
    ctx.moveTo(cx, -40);
    ctx.lineTo(cx, floorY);
    ctx.stroke();
    /* floor, slightly warmer, with a reflection gradient */
    var fg = ctx.createLinearGradient(0, floorY, 0, h + 40);
    fg.addColorStop(0, "#3a3128");
    fg.addColorStop(0.35, "#211d1a");
    fg.addColorStop(1, "#0f1012");
    ctx.fillStyle = fg;
    ctx.fillRect(-40, floorY, w + 80, h - floorY + 80);
    ctx.strokeStyle = "rgba(0,0,0,.3)";
    ctx.beginPath();
    ctx.moveTo(-40, floorY);
    ctx.lineTo(w + 40, floorY);
    ctx.stroke();
    /* the window, and the daylight it throws on the floor */
    var winW = w * (0.16 + pr() * 0.12), winH = h * (0.26 + pr() * 0.16);
    var winX = pr() > 0.5 ? w * (0.08 + pr() * 0.1) : w - winW - w * (0.06 + pr() * 0.12);
    var winY = h * (0.1 + pr() * 0.12);
    var wg = ctx.createLinearGradient(winX, winY, winX, winY + winH);
    wg.addColorStop(0, "rgba(246,241,232,0.92)");
    wg.addColorStop(1, "rgba(214,206,192,0.5)");
    ctx.fillStyle = wg;
    ctx.fillRect(winX, winY, winW, winH);
    ctx.fillStyle = "rgba(20,22,26,0.55)";
    ctx.fillRect(winX + winW * 0.48, winY, Math.max(1.5, winW * 0.035), winH);
    ctx.fillRect(winX, winY + winH * 0.5, winW, Math.max(1.5, winH * 0.02));
    var sg = ctx.createLinearGradient(winX, winY + winH, winX + winW * 0.6, h);
    sg.addColorStop(0, "rgba(246,240,228,0.16)");
    sg.addColorStop(1, "rgba(246,240,228,0)");
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.moveTo(winX, floorY);
    ctx.lineTo(winX + winW, floorY);
    ctx.lineTo(winX + winW * 1.9, h + 40);
    ctx.lineTo(winX - winW * 0.5, h + 40);
    ctx.closePath();
    ctx.fill();
    /* furniture: a low seat, a tall thing, a pendant — pure silhouette */
    var ink = "rgba(12,13,15,0.72)";
    var seatW = w * (0.3 + pr() * 0.18), seatH = h * (0.09 + pr() * 0.05);
    var seatX = w * (0.12 + pr() * 0.4);
    ctx.fillStyle = ink;
    U.rr(ctx, seatX, floorY - seatH, seatW, seatH, seatH * 0.28);
    ctx.fill();
    U.rr(ctx, seatX + seatW * 0.06, floorY - seatH * 2.1, seatW * 0.9, seatH * 1.25, seatH * 0.3);
    ctx.fill();
    /* a plant / floor lamp column */
    var px2 = seatX + seatW * (1.25 + pr() * 0.3);
    ctx.strokeStyle = "rgba(12,13,15,0.66)";
    ctx.lineWidth = Math.max(1.5, w * 0.006);
    ctx.beginPath();
    ctx.moveTo(px2, floorY);
    ctx.lineTo(px2, floorY - h * 0.16);
    ctx.stroke();
    ctx.fillStyle = "rgba(12,13,15,0.6)";
    for (var lf = 0; lf < 5; lf++) {
      var a = -1.57 + (lf - 2) * 0.42 + pr() * 0.1;
      ctx.beginPath();
      ctx.ellipse(px2 + Math.cos(a) * w * 0.035, floorY - h * 0.16 + Math.sin(a) * h * 0.028, w * 0.03, h * 0.012, a, 0, 6.2832);
      ctx.fill();
    }
    /* warm pendant glow */
    var lx = w * (0.2 + pr() * 0.6), ly = h * (0.14 + pr() * 0.1);
    ctx.strokeStyle = "rgba(0,0,0,.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(lx, -10);
    ctx.lineTo(lx, ly);
    ctx.stroke();
    ctx.fillStyle = "rgba(14,15,17,.8)";
    ctx.beginPath();
    ctx.moveTo(lx - w * 0.035, ly);
    ctx.lineTo(lx + w * 0.035, ly);
    ctx.lineTo(lx + w * 0.024, ly + h * 0.026);
    ctx.lineTo(lx - w * 0.024, ly + h * 0.026);
    ctx.closePath();
    ctx.fill();
    var glow = ctx.createRadialGradient(lx, ly + h * 0.03, 0, lx, ly + h * 0.03, h * 0.16);
    glow.addColorStop(0, "rgba(255,190,110,0.5)");
    glow.addColorStop(1, "rgba(255,170,80,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lx, ly + h * 0.03, h * 0.16, 0, 6.2832);
    ctx.fill();
    if (warm !== false) {
      /* grade it toward the brand so a stand-in never fights the palette */
      ctx.fillStyle = "rgba(196,90,15,0.1)";
      ctx.fillRect(-40, -40, w + 80, h + 80);
    }
    /* a little grain so flat gradients read as photography */
    ctx.globalAlpha *= 0.5;
    for (var q = 0; q < 90; q++) {
      ctx.fillStyle = pr() > 0.5 ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.05)";
      ctx.fillRect(pr() * w, pr() * h, w * 0.02, h * 0.006);
    }
    ctx.globalAlpha /= 0.5;
  }

  /* ================================================== plate (photo / video) */
  function paintPlate(ctx, scene, l, w, h, alpha, t, rec) {
    var P = l.props || {};
    var radius = P.radius === undefined ? 0 : P.radius;
    ctx.save();
    if (P.clip === "ellipse") { ctx.beginPath(); ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, 6.2832); ctx.clip(); }
    else if (P.clip === "blob") { U.blob(ctx, w / 2, h / 2, Math.min(w, h) / 2, 1, P.seed || 1, t); ctx.clip(); }
    else { rr(ctx, 0, 0, w, h, radius); ctx.clip(); }

    /* Ken Burns — a zoom/pan window interpolated across the layer's life */
    var kb = P.kb;
    if (kb) {
      var e = TLM.ease(kb.ease || "sineInOut", clamp(norm(t - (l.in || 0), 0, Math.max(0.001, (TLM.layerOut ? TLM.layerOut(l) : (l.in || 0) + 4) - (l.in || 0))), 0, 1));
      var z = lerp(kb.from && kb.from.z ? kb.from.z : 1.04, kb.to && kb.to.z ? kb.to.z : 1.18, e);
      ctx.translate(w / 2, h / 2);
      ctx.scale(z, z);
      ctx.translate(-w / 2 + lerp(kb.from ? kb.from.x || 0 : 0, kb.to ? kb.to.x || 0 : 0, e), -h / 2 + lerp(kb.from ? kb.from.y || 0 : 0, kb.to ? kb.to.y || 0 : 0, e));
    }
    var img = rec && rec.ok ? rec.el : null;
    if (img) {
      var s = Math.max(w / (rec.w || w), h / (rec.h || h));
      var dw = (rec.w || w) * s, dh = (rec.h || h) * s;
      comp(ctx, "source-over");
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    } else {
      interiorStudy(ctx, w, h, (P.src || l.id || "plate") + ":" + (l.__seed || 3), t, true);
    }
    comp(ctx, "source-over");
    if (P.dim) { ctx.fillStyle = C.rgba(P.dimColor || "#08090b", P.dim); ctx.fillRect(-40, -40, w + 80, h + 80); }
    if (P.tint) {
      comp(ctx, P.tintBlend || "soft-light");
      ctx.fillStyle = C.rgba(P.tint, P.tintAlpha === undefined ? 0.3 : P.tintAlpha);
      ctx.fillRect(-40, -40, w + 80, h + 80);
      comp(ctx, "source-over");
    }
    if (P.scrim) {
      var top = !!P.scrimTop;
      var sg = ctx.createLinearGradient(0, top ? 0 : h, 0, top ? h * (P.scrimTo || 0.8) : h * (1 - (P.scrimTo || 0.8)));
      sg.addColorStop(0, C.rgba(P.scrimColor || "#0a0b0d", P.scrimAlpha === undefined ? 0.88 : P.scrimAlpha));
      sg.addColorStop(1, C.rgba(P.scrimColor || "#0a0b0d", 0));
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, w, h);
    }
    if (P.chroma) {
      comp(ctx, "screen");
      ctx.fillStyle = C.rgba(P.chromaColor || "#ff6a1a", P.chromaAlpha || 0.09);
      ctx.fillRect(0, 0, w * P.chroma, h);
      comp(ctx, "source-over");
    }
    ctx.restore();
    if (P.frameW) {
      ctx.save();
      ctx.globalAlpha = clamp(alpha, 0, 1);
      ctx.strokeStyle = C.rgba(P.frameColor || "#f1efec", P.frameAlpha === undefined ? 0.5 : P.frameAlpha);
      ctx.lineWidth = P.frameW;
      rr(ctx, P.frameW / 2, P.frameW / 2, w - P.frameW, h - P.frameW, radius);
      ctx.stroke();
      ctx.restore();
    }
  }

  draw.photo = function (ctx, scene, l, st, t, opts) {
    var P = l.props, w = st.w, h = st.h;
    var pool = opts && opts.assets;
    var rec = pool ? pool.get(P.src) : null;
    ctx.save();
    place(ctx, scene, l, st, t);
    if (P.shadow) {
      ctx.save();
      setBlur(ctx, P.shadow.blur || 34);
      ctx.fillStyle = C.rgba(P.shadow.color || "#000000", P.shadow.alpha === undefined ? 0.5 : P.shadow.alpha);
      rr(ctx, P.shadow.x || 0, P.shadow.y || 16, w, h, P.radius || 0);
      ctx.fill();
      ctx.restore();
      if (filterOK(ctx)) ctx.filter = st.blur ? "blur(" + st.blur.toFixed(2) + "px)" : "none";
    }
    if (needsClip(st)) { ctx.save(); clipReveal(ctx, w, h, st); }
    if (rec && rec.kind === "video" && rec.el && opts && opts.setVideoTime) opts.setVideoTime(rec.el, t - (l.in || 0) + (P.timeFrom || 0));
    paintPlate(ctx, scene, l, w, h, st.alpha, t, rec);
    if (needsClip(st)) ctx.restore();
    ctx.restore();
  };
  draw.video = draw.photo;

  /* ================================================== strip — a row of plates */
  draw.strip = function (ctx, scene, l, st, t, opts) {
    var P = l.props, items = P.items || [], n = items.length || 1;
    var gap = P.gap === undefined ? 14 : P.gap;
    var cw = (st.w - gap * (n - 1)) / n;
    var pool = opts && opts.assets;
    ctx.save();
    place(ctx, scene, l, st, t);
    items.forEach(function (it, i) {
      var ip = TLM.ease(P.ease || "expoOut", clamp((t - (l.in || 0) - i * (P.stagger === undefined ? 0.11 : P.stagger)) / Math.max(0.001, P.itemDur || 0.65), 0, 1));
      if (ip <= 0.001) return;
      ctx.save();
      ctx.globalAlpha = clamp(st.alpha, 0, 1) * ip;
      ctx.translate(i * (cw + gap), (1 - ip) * (P.rise || 90) + (it.y || 0));
      ctx.transform(1, 0, 0, 0.55 + 0.45 * ip, 0, (0.45 - 0.45 * ip) * st.h);
      var rec = pool && it.src ? pool.get(it.src) : null;
      paintPlate(ctx, scene, { props: { radius: P.radius === undefined ? 12 : P.radius, kb: it.kb, dim: P.dim, tint: P.tint, tintAlpha: P.tintAlpha, clip: P.clip, scrim: P.scrim, scrimAlpha: P.scrimAlpha, scrimTop: P.scrimTop }, in: l.in, __seed: i + 1 }, cw, st.h, st.alpha * ip, t, rec);
      if (it.label) {
        ctx.font = TLM.fontString({ font: P.labelFont || "mono", size: P.labelSize || 19, weight: 700 }, scene);
        ctx.fillStyle = C.rgba(P.labelColor || "#f1efec", 0.8);
        ctx.fillText(String(it.label).toUpperCase(), 6, st.h - 10);
      }
      ctx.restore();
    });
    ctx.restore();
  };

  /* ================================================== swatch — material tiles */
  draw.swatch = function (ctx, scene, l, st, t, opts) {
    var P = l.props, items = P.items || [];
    var cols = P.cols || 2, rows = Math.max(1, Math.ceil(items.length / cols));
    var gap = P.gap === undefined ? 18 : P.gap;
    var cw = (st.w - gap * (cols - 1)) / cols;
    var ch = (st.h - gap * (rows - 1)) / rows;
    var pool = opts && opts.assets;
    ctx.save();
    place(ctx, scene, l, st, t);
    items.forEach(function (it, i) {
      var ip = TLM.ease(P.ease || "backOut", clamp((t - (l.in || 0) - i * (P.stagger === undefined ? 0.12 : P.stagger)) / Math.max(0.001, P.itemDur || 0.6), 0, 1));
      if (ip <= 0.001) return;
      var rad = P.radius === undefined ? 18 : P.radius;
      ctx.save();
      ctx.globalAlpha = clamp(st.alpha, 0, 1) * ip;
      ctx.translate((i % cols) * (cw + gap) + cw / 2, Math.floor(i / cols) * (ch + gap) + ch / 2);
      ctx.scale(0.7 + 0.3 * ip, 0.7 + 0.3 * ip);
      ctx.rotate((1 - ip) * (P.rotFrom === undefined ? -0.07 : P.rotFrom));
      ctx.translate(-cw / 2, -ch / 2);
      var rec = it.src && pool ? pool.get(it.src) : null;
      if (rec) paintPlate(ctx, scene, { props: { radius: rad, clip: P.clip, dim: it.dim, tint: P.tint, tintAlpha: P.tintAlpha }, in: l.in, __seed: i + 2 }, cw, ch, st.alpha * ip, t, rec);
      else {
        if (it.grad && it.grad.length > 1) {
          var g = ctx.createLinearGradient(0, 0, cw, ch);
          it.grad.forEach(function (c, k, a) { g.addColorStop(k / (a.length - 1), c); });
          ctx.fillStyle = g;
        } else ctx.fillStyle = it.color || "#2a2e34";
        rr(ctx, 0, 0, cw, ch, rad);
        ctx.fill();
        var sh = ctx.createLinearGradient(0, 0, cw * 0.9, ch);
        sh.addColorStop(0, "rgba(255,255,255,.22)");
        sh.addColorStop(0.5, "rgba(255,255,255,0)");
        ctx.fillStyle = sh;
        rr(ctx, 0, 0, cw, ch, rad);
        ctx.fill();
        if (it.grain) {
          ctx.save();
          rr(ctx, 0, 0, cw, ch, rad);
          ctx.clip();
          var pat = noiseTile(ctx, 128, 0.6);
          if (pat) { comp(ctx, "overlay"); ctx.globalAlpha *= it.grain; ctx.fillStyle = pat; ctx.fillRect(0, 0, cw, ch); }
          ctx.restore();
        }
      }
      if (P.frame !== false) {
        ctx.strokeStyle = C.rgba(P.frameColor || "#ffffff", P.frameAlpha === undefined ? 0.16 : P.frameAlpha);
        ctx.lineWidth = P.frameW || 2;
        rr(ctx, 1, 1, cw - 2, ch - 2, rad);
        ctx.stroke();
      }
      if (it.label) {
        var ls = P.labelSize || 22;
        ctx.font = TLM.fontString({ font: P.labelFont || "grotesk", size: ls, weight: 800 }, scene);
        ctx.fillStyle = C.rgba(P.labelColor || "#ffffff", 0.94);
        ctx.fillText(P.upper === false ? it.label : String(it.label).toUpperCase(), 18, P.labelPos === "top" ? ls + 16 : ch - 18);
        if (it.sub) {
          ctx.font = TLM.fontString({ font: "mono", size: ls * 0.6, weight: 500 }, scene);
          ctx.fillStyle = C.rgba(P.subColor || "#f1efec", 0.6);
          ctx.fillText(String(it.sub).toUpperCase(), 18, P.labelPos === "top" ? ls + 16 + 24 : ch - 18 - 28);
        }
      }
      ctx.restore();
    });
    ctx.restore();
  };

  /* ================================================== text */
  function getLayout(ctx, l, P, w, scene) {
    var key = [P.text, P.size, P.weight, P.tracking, P.leading, Math.round(w), P.align, P.upper, P.font, P.italic].join("|");
    var c = layoutCache && layoutCache.get(l);
    if (c && c.key === key) return c.v;
    var lay = TLM.layoutText(ctx, {
      text: P.text, font: P.font, size: P.size, weight: P.weight, italic: P.italic,
      tracking: P.tracking || 0, leading: P.leading === undefined ? 1.02 : P.leading,
      upper: P.upper !== false, align: P.align || "left",
      maxWidth: P.wrap === false ? 1e9 : w, w: w, __scene: scene,
    });
    if (layoutCache) layoutCache.set(l, { key: key, v: lay });
    return lay;
  }
  var GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/\\|<>*#%";
  function word(ctx, wd, x, y, P, prog) {
    var col = wd.hi ? P.accent || "#ff6a1a" : P.color || "#f1efec";
    var decode = wd.hi && P.decode;
    if (P.outline) {
      ctx.lineWidth = P.strokeW || 2;
      ctx.strokeStyle = C.rgba(col, P.strokeAlpha === undefined ? 0.95 : P.strokeAlpha);
      ctx.strokeText(wd.s, x, y);
      return;
    }
    if (P.strokeW) {
      ctx.lineWidth = P.strokeW;
      ctx.lineJoin = "round";
      ctx.strokeStyle = C.rgba(P.stroke || "#0a0b0d", P.strokeAlpha === undefined ? 0.85 : P.strokeAlpha);
      ctx.strokeText(wd.s, x, y);
    }
    if (!decode) {
      ctx.fillStyle = C.rgba(col, 1);
      ctx.fillText(wd.s, x, y);
      return;
    }
    /* scramble-decode, letter by letter, settling left → right */
    var cx = x;
    for (var k = 0; k < wd.s.length; k++) {
      var sp = clamp((prog - k * 0.05) / 0.3, 0, 1);
      var ch = sp >= 1 ? wd.s[k] : GLYPHS[Math.floor(hash(k * 7.3 + Math.floor(prog * 30) + 1) * GLYPHS.length)];
      ctx.fillStyle = C.rgba(sp >= 1 ? col : P.decodingColor || "#8b9097", sp >= 1 ? 1 : 0.75 + 0.25 * sp);
      ctx.fillText(ch, cx, y);
      cx += wd.adv[k];
    }
  }
  draw.text = function (ctx, scene, l, st, t, opts) {
    var P = l.props, w = st.w;
    ctx.save();
    place(ctx, scene, l, st, t);
    if (needsClip(st)) { ctx.save(); clipReveal(ctx, w, st.h, st); }
    var lay = getLayout(ctx, l, P, w, scene);
    var size = lay.size, leading = lay.leading, localT = t - (l.in || 0);
    ctx.font = TLM.fontString(P, scene);
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    var total = lay.height;
    var boxY = st.h > total ? (P.valign === "top" ? 0 : P.valign === "bottom" ? st.h - total : (st.h - total) / 2) : (P.valign === "bottom" ? st.h - total : 0);

    if (P.box) {
      var pad = P.boxPad || [26, 18, 26, 18];
      var bw = (P.boxWidth === "text" ? lay.w : w) + pad[1] + pad[3];
      var bh = total + pad[0] + pad[2];
      var bx = P.align === "center" ? (w - bw) / 2 : P.align === "right" ? w - bw : -pad[1];
      ctx.save();
      ctx.fillStyle = C.rgba(P.box, P.boxAlpha === undefined ? 1 : P.boxAlpha);
      rr(ctx, bx, boxY - pad[0], bw, bh, P.boxRadius === undefined ? 8 : P.boxRadius);
      ctx.fill();
      if (P.boxStroke) {
        ctx.strokeStyle = C.rgba(P.boxStroke, 0.65);
        ctx.lineWidth = P.boxStrokeW || 2;
        ctx.stroke();
      }
      ctx.restore();
    }
    var reveal = P.reveal || "none";
    var stag = P.stagger === undefined ? 0.05 : P.stagger;
    var rdur = P.revealDur || 0.44;
    var firstBase = boxY + size * 0.82;
    var wi = 0;
    if (P.ul) {
      var up = TLM.ease("expoOut", clamp((localT - (P.ulDelay || 0.3)) / Math.max(0.001, P.ulDur || 0.5), 0, 1));
      ctx.fillStyle = C.rgba(P.ul === true ? P.accent || "#ff6a1a" : P.ul, 0.95);
      var uw = lay.w * up;
      ctx.fillRect(P.align === "center" ? (w - lay.w) / 2 : P.align === "right" ? w - uw : 0, boxY + total - (P.ulGap || 6) + size * 0.12, uw, P.ulW || 5);
    }
    lay.lines.forEach(function (line, li) {
      var baseY = firstBase + li * leading;
      line.words.forEach(function (wd) {
        wi++;
        var delay = (reveal === "lines" ? li : wi - 1) * stag;
        var p = TLM.ease(P.revealEase || "swift", clamp((localT - delay) / rdur, 0, 1));
        if (p <= 0.001) return;
        var ox = 0, oy = 0, oalpha = 1, oscale = 1, ob = 0;
        var dist = P.revealDist === undefined ? 54 : P.revealDist;
        if (reveal === "wordsUp") { oy = (1 - p) * dist; oalpha = p; ob = (1 - p) * 3; }
        else if (reveal === "wordsDown") { oy = -(1 - p) * dist; oalpha = p; }
        else if (reveal === "wordsLeft") { ox = -(1 - p) * dist; oalpha = p; }
        else if (reveal === "lines" || reveal === "lineMask") { oy = (1 - p) * (dist * 0.7); oalpha = p; }
        else if (reveal === "scale") { oscale = lerp(0.6, 1, TLM.ease("backOut", p)); oalpha = p; }
        else if (reveal === "pop") { oscale = lerp(1.32, 1, TLM.ease("backOut", p)); oalpha = Math.min(1, p * 1.7); }
        else if (reveal === "decode" || reveal === "shuffle") { oalpha = Math.min(1, 0.2 + p * 1.4); }
        else if (reveal === "rise") { oy = (1 - p) * 24; oalpha = p * p; }
        else if (reveal === "blur") { oalpha = p; ob = (1 - p) * 9; }
        var x = line.x + wd.x + ox;
        var y = baseY + oy;
        ctx.save();
        ctx.globalAlpha = ctx.globalAlpha * oalpha;
        if (oscale !== 1) {
          ctx.translate(x + wd.w / 2, y - size * 0.32);
          ctx.scale(oscale, oscale);
          ctx.translate(-(x + wd.w / 2), -(y - size * 0.32));
        }
        if (ob) setBlur(ctx, ob);
        if (P.glow) {
          ctx.shadowColor = C.rgba(P.glowColor || P.accent || "#ff6a1a", P.glowAlpha === undefined ? 0.85 : P.glowAlpha);
          ctx.shadowBlur = P.glow;
        }
        if (P.shadowY !== undefined) {
          ctx.save();
          ctx.shadowColor = "transparent";
          ctx.globalAlpha *= P.shadowA === undefined ? 0.4 : P.shadowA;
          ctx.fillStyle = C.rgba(P.shadowColor || "#000000", 1);
          ctx.fillText(wd.s, x + (P.shadowX || 0), y + (P.shadowY || 4));
          ctx.restore();
        }
        word(ctx, wd, x, y, P, reveal === "decode" || reveal === "shuffle" ? clamp((localT - delay) / (rdur * 1.6), 0, 1) : 1);
        ctx.shadowBlur = 0;
        ctx.shadowColor = "transparent";
        setBlur(ctx, 0);
        ctx.restore();
      });
    });
    if (needsClip(st)) ctx.restore();
    ctx.restore();
  };

  /* ================================================== counter */
  draw.counter = function (ctx, scene, l, st, t, opts) {
    var P = l.props;
    var out = TLM.layerOut(l);
    var p = TLM.ease(P.ease || "expoOut", clamp(norm(t, l.in || 0, out - (P.tail === undefined ? 0.3 : P.tail)), 0, 1));
    var v = lerp(P.from === undefined ? 0 : P.from, P.to === undefined ? 100 : P.to, p);
    var txt;
    if (P.pad) txt = ("00000" + Math.round(v)).slice(-P.pad);
    else if (P.thousand && v >= 1000) txt = String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    else txt = String(P.decimals ? v.toFixed(P.decimals) : Math.round(v));
    if (P.prefix) txt = P.prefix + txt;
    if (P.suffix) txt += P.suffix;
    ctx.save();
    place(ctx, scene, l, st, t);
    var size = P.size || 150;
    ctx.font = TLM.fontString({ font: P.font || "display", size: size, weight: P.weight || 400 }, scene);
    ctx.textBaseline = "alphabetic";
    var m = ctx.measureText(txt).width;
    var x = P.align === "center" ? (st.w - m) / 2 : P.align === "right" ? st.w - m : 0;
    var y = P.y === undefined ? size * 0.82 : P.y;
    if (P.glow) { ctx.shadowColor = C.rgba(P.glowColor || "#ff6a1a", 0.7); ctx.shadowBlur = P.glow; }
    ctx.fillStyle = C.rgba(P.color || "#f1efec", 1);
    ctx.fillText(txt, x, y);
    ctx.shadowBlur = 0;
    if (P.tick && p < 1) {
      ctx.globalAlpha *= 0.4 * (1 - p);
      ctx.fillStyle = C.rgba(P.tickColor || "#ff6a1a", 1);
      ctx.fillText(txt, x, y - 3);
    }
    if (P.label) {
      ctx.font = TLM.fontString({ font: P.labelFont || "mono", size: P.labelSize || 24, weight: 700 }, scene);
      var lbl = String(P.label).toUpperCase();
      ctx.fillStyle = C.rgba(P.labelColor || "#8b9097", 0.95);
      ctx.fillText(lbl, P.labelAlign === "right" ? st.w - ctx.measureText(lbl).width : x, y + (P.labelGap || 32));
    }
    if (P.bar) {
      ctx.fillStyle = C.rgba(P.barTrack || "#ffffff", 0.12);
      ctx.fillRect(0, P.barY || 26, st.w, P.barH || 4);
      ctx.fillStyle = C.rgba(P.barColor || "#c45a0f", 1);
      ctx.fillRect(0, P.barY || 26, st.w * p, P.barH || 4);
    }
    ctx.restore();
  };

  /* ================================================== shape primitives */
  draw.shape = function (ctx, scene, l, st, t, opts) {
    var P = l.props, w = st.w, h = st.h;
    ctx.save();
    place(ctx, scene, l, st, t);
    if (needsClip(st)) { ctx.save(); clipReveal(ctx, w, h, st); }
    var grow = P.grow ? TLM.ease(P.growEase || "expoOut", clamp(norm(t, l.in || 0, (l.in || 0) + (P.growDur === undefined ? 0.7 : P.growDur)), 0, 1)) : 1;
    var kind = P.shape || "rect";
    var strokeKind = kind === "line" || kind === "vline" || kind === "diag" || kind === "plus" || kind === "wave" || kind === "brackets" || kind === "ring" || kind === "arc";
    function path() {
      ctx.beginPath();
      if (kind === "ellipse") ctx.ellipse(w / 2, h / 2, (w / 2) * grow, (h / 2) * grow, 0, 0, 6.2832);
      else if (kind === "circle") ctx.arc(w / 2, h / 2, (Math.min(w, h) / 2) * grow, 0, 6.2832);
      else if (kind === "ring" || kind === "arc") {
        var from = deg(P.from === undefined ? -90 : P.from);
        var sw = deg((P.sweep === undefined ? 360 : P.sweep) * grow);
        ctx.arc(w / 2, h / 2, (Math.min(w, h) / 2) * (P.rMul === undefined ? 1 : P.rMul), from, from + sw, !!P.ccw);
      } else if (kind === "line") { ctx.moveTo(0, h / 2); ctx.lineTo(w * grow, h / 2); }
      else if (kind === "vline") { ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h * grow); }
      else if (kind === "diag") { ctx.moveTo(0, h); ctx.lineTo(w * grow, 0); }
      else if (kind === "tri") { ctx.moveTo(w / 2, 0); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); }
      else if (kind === "brackets") {
        var c = (P.len || 26) * grow;
        ctx.moveTo(0, c); ctx.lineTo(0, 0); ctx.lineTo(c, 0);
        ctx.moveTo(w - c, 0); ctx.lineTo(w, 0); ctx.lineTo(w, c);
        ctx.moveTo(w, h - c); ctx.lineTo(w, h); ctx.lineTo(w - c, h);
        ctx.moveTo(c, h); ctx.lineTo(0, h); ctx.lineTo(0, h - c);
      } else if (kind === "plus") { ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); }
      else if (kind === "wave") {
        for (var x = 0; x <= w; x += 6) ctx.lineTo(x, h / 2 + Math.sin((x / w) * Math.PI * (P.cycles || 3) + t * (P.speed || 2)) * (P.amp === undefined ? h / 3 : P.amp));
      } else if (kind === "blob") U.blob(ctx, w / 2, h / 2, (Math.min(w, h) / 2) * grow, P.wob === undefined ? 1 : P.wob, P.seed || 1, t);
      else if (kind === "poly") {
        var n = P.sides || 6;
        for (var i = 0; i < n; i++) {
          var a = deg((P.rot0 === undefined ? -90 : P.rot0) + (360 / n) * i);
          var rx = Math.cos(a) * (w / 2) * grow, ry = Math.sin(a) * (h / 2) * grow;
          i ? ctx.lineTo(w / 2 + rx, h / 2 + ry) : ctx.moveTo(w / 2 + rx, h / 2 + ry);
        }
        ctx.closePath();
      } else rr(ctx, 0, 0, w * grow, h, P.radius === undefined ? (kind === "pill" ? h / 2 : 0) : P.radius);
    }
    if (P.fill) {
      if (P.grad && P.grad.length > 1) {
        var a2 = deg(P.gradAngle === undefined ? 90 : P.gradAngle);
        var g = ctx.createLinearGradient(w / 2 - Math.cos(a2) * w / 2, h / 2 - Math.sin(a2) * h / 2, w / 2 + Math.cos(a2) * w / 2, h / 2 + Math.sin(a2) * h / 2);
        P.grad.forEach(function (c, i, arr) { g.addColorStop(i / (arr.length - 1), c); });
        ctx.fillStyle = g;
      } else ctx.fillStyle = C.rgba(P.fill, P.fillAlpha === undefined ? 1 : P.fillAlpha);
      if (strokeKind) {
        /* line-ish shapes have no fill — draw the path and stroke it with the fill colour */
        path();
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = P.strokeW || Math.max(1, P.w || 2);
        ctx.lineCap = P.cap || "butt";
        ctx.stroke();
      } else { path(); ctx.fill(); }
    }
    if (P.stroke) {
      comp(ctx, "source-over");
      ctx.strokeStyle = C.rgba(P.stroke, P.strokeAlpha === undefined ? 1 : P.strokeAlpha);
      ctx.lineWidth = P.strokeW || 2;
      ctx.lineCap = P.cap || "butt";
      if (P.dash) ctx.setLineDash(typeof P.dash === "string" ? P.dash.split(",").map(Number) : P.dash);
      if (P.dashOffset) ctx.lineDashOffset = -t * P.dashOffset;
      path();
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (P.glow) {
      ctx.save();
      setBlur(ctx, P.glowSize || 24);
      ctx.globalAlpha *= 0.6;
      ctx.fillStyle = C.rgba(P.glowColor || P.fill || "#ff6a1a", 1);
      path();
      ctx.fill();
      ctx.restore();
    }
    if (needsClip(st)) ctx.restore();
    ctx.restore();
  };

  /* ================================================== SVG paths — the real logo */
  var PathCtor = global.Path2D;
  function resolvePaths(P) {
    if (P.paths) return { paths: P.paths, vb: P.viewBox || [0, 0, 908, 275] };
    var L = P.logo && TLM.LOGOS ? TLM.LOGOS[P.logo] : null;
    if (!L) return { paths: [], vb: P.viewBox || [0, 0, 908, 275] };
    var paths = P.group && L.groups ? L.groups[P.group] || L.groups.all : L.groups.all;
    return { paths: paths, vb: L.viewBox };
  }
  draw.path = function (ctx, scene, l, st, t, opts) {
    var P = l.props;
    if (!PathCtor) return;
    ctx.save();
    place(ctx, scene, l, st, t);
    var R = resolvePaths(P);
    var paths = R.paths;
    var vb = P.viewBox || R.vb;
    /* a subset (the mark alone, the word alone) is framed by its OWN box —
       otherwise the emblem would float off-centre inside the lockup's viewBox */
    if (P.fit !== "viewBox" && paths.length && paths[0] && paths[0].b) {
      var bx = 1e9, by = 1e9, bx2 = -1e9, by2 = -1e9;
      for (var qi = 0; qi < paths.length; qi++) {
        var qb = paths[qi].b;
        if (!qb) continue;
        if (qb[0] < bx) bx = qb[0];
        if (qb[1] < by) by = qb[1];
        if (qb[0] + qb[2] > bx2) bx2 = qb[0] + qb[2];
        if (qb[1] + qb[3] > by2) by2 = qb[1] + qb[3];
      }
      if (bx2 > bx && by2 > by) vb = [bx, by, bx2 - bx, by2 - by];
    }
    ctx.save();
    var k = P.fit === "stretch" ? [st.w / vb[2], st.h / vb[3]] : (function () { var s = Math.min(st.w / vb[2], st.h / vb[3]); return [s, s]; })();
    ctx.translate((st.w - vb[2] * k[0]) / 2 - vb[0] * k[0], (st.h - vb[3] * k[1]) / 2 - vb[1] * k[1]);
    ctx.scale(k[0], k[1]);
    var din = l.in || 0;
    var drawOn = P.drawOn ? TLM.ease(P.drawEase || "cubicOut", clamp(norm(t, din, din + (P.drawOnDur || 1.1)), 0, 1)) : null;
    var fillP = P.fillReveal === false ? 1 : TLM.ease("quadOut", clamp(norm(t, din + (P.drawOn ? P.drawOnDur || 1.1 : 0), din + (P.drawOn ? P.drawOnDur || 1.1 : 0) + (P.fillDur || 0.5)), 0, 1));
    if (P.clipReveal) {
      var cr = TLM.ease(P.clipEase || "expoOut", clamp(norm(t, din, din + (P.clipDur || 0.9)), 0, 1));
      ctx.beginPath();
      ctx.rect(vb[0] - 20, vb[1] - 20, (vb[2] + 40) * cr, vb[3] + 40);
      ctx.clip();
    }
    paths.forEach(function (pp, idx) {
      var d = typeof pp === "string" ? pp : pp.d;
      if (!d) return;
      var p2;
      try { p2 = new PathCtor(d); } catch (e) { return; }
      var rule = (typeof pp === "object" && (pp.r === 1 || pp.rule === "evenodd")) ? "evenodd" : "nonzero";
      var base = (typeof pp === "object" && (pp.f || pp.fill)) || P.fill || "#f1efec";
      var keep = P.keepBrand && typeof pp === "object" && /c45a0f/i.test(base);
      var fill = P.tint && P.tint !== "auto" && !keep ? P.tint : base;
      if (P.dupe) {
        /* dupe = draw each path twice (offset) — reads as a printed misregistration */
      }
      var delay = (P.stagger || 0) * idx;
      var local = clamp(norm(t, din + delay, din + delay + (P.partDur || 1)), 0, 1);
      if (drawOn !== null) {
        ctx.save();
        ctx.globalAlpha = clamp(st.alpha, 0, 1) * (1 - drawOn);
        ctx.strokeStyle = C.rgba(P.strokeColor || "#ff6a1a", 1);
        ctx.lineWidth = (P.strokeW || 3) / k[0];
        var L = P.dashLen || 5200;
        ctx.setLineDash([L]);
        ctx.lineDashOffset = L * (1 - TLM.ease("cubicOut", clamp((norm(t, din, din + (P.drawOnDur || 1.1)) - delay), 0, 1)));
        ctx.stroke(p2);
        ctx.setLineDash([]);
        ctx.restore();
      }
      if (fillP * local > 0.002) {
        ctx.globalAlpha = clamp(st.alpha, 0, 1) * fillP * local;
        ctx.fillStyle = C.rgba(fill, 1);
        try { ctx.fill(p2, P.useRule === false ? "nonzero" : rule); } catch (e) { ctx.fill(p2); }
      }
      if (P.outline) {
        ctx.globalAlpha = clamp(st.alpha, 0, 1) * fillP;
        ctx.lineWidth = (P.outlineW || 1) / k[0];
        ctx.strokeStyle = C.rgba(P.outlineColor || "#000000", 0.3);
        ctx.stroke(p2);
      }
    });
    ctx.restore();
    ctx.restore();
  };

  /* ================================================== particles */
  draw.particles = function (ctx, scene, l, st, t, opts) {
    var P = l.props, W = scene.meta.width, H = scene.meta.height;
    var n = P.count || 60;
    var box = P.box || [0, 0, W, H];
    var life = P.life || 14;
    ctx.save();
    if (l.follow) place(ctx, scene, l, st, t);
    else ctx.setTransform(baseScale(ctx), 0, 0, baseScale(ctx), 0, 0);
    comp(ctx, P.blend || "screen");
    var gAlpha = clamp(st.alpha, 0, 1);
    for (var i = 0; i < n; i++) {
      var r1 = hash(i * 1.37 + 0.5), r2 = hash(i * 3.71 + 2.1), r3 = hash(i * 9.13 + 5.7), r4 = hash(i * 2.31 + 9.3);
      var ph = ((t * (P.speed || 1) + r1 * life) % life) / life;
      var x = box[0] + r2 * box[2] + Math.sin(t * (P.sway || 0.5) + i) * (P.swayAmp === undefined ? 18 : P.swayAmp) * (0.4 + r3);
      var y = P.rise === false ? box[1] + ph * box[3] : box[1] + (1 - ph) * box[3] * (P.span === undefined ? 1.1 : P.span);
      var sz = (P.size || 3) * (0.35 + r3 * 1.35);
      var al = gAlpha * (P.alpha === undefined ? 0.5 : P.alpha) * (0.2 + 0.8 * Math.sin(ph * Math.PI)) * (0.5 + r4 * 0.9);
      if (P.flicker) al *= 0.6 + 0.4 * Math.sin(t * (4 + r1 * 6) + i);
      if (al <= 0.008) continue;
      if (P.shape === "dot") {
        ctx.globalAlpha = al;
        ctx.fillStyle = C.rgba(P.color || "#ffd8b0", 1);
        ctx.beginPath();
        ctx.arc(x, y, sz, 0, 6.2832);
        ctx.fill();
      } else if (P.shape === "streak") {
        ctx.globalAlpha = al * 0.85;
        ctx.strokeStyle = C.rgba(P.color || "#ffd8b0", 1);
        ctx.lineWidth = Math.max(0.5, sz * 0.7);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (P.vx || 0) * 5, y + (P.rise === false ? 14 : -14) * (P.len || 1));
        ctx.stroke();
      } else {
        var rad = sz * 7;
        var g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, C.rgba(P.color || "#ffd8b0", 1));
        g.addColorStop(0.35, C.rgba(P.color2 || P.color || "#ff8a4c", 0.4));
        g.addColorStop(1, C.rgba(P.color || "#ffd8b0", 0));
        ctx.globalAlpha = al;
        ctx.fillStyle = g;
        ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
    }
    ctx.restore();
  };

  /* ================================================== light sweep */
  draw.sweep = function (ctx, scene, l, st, t, opts) {
    var P = l.props, W = scene.meta.width, H = scene.meta.height;
    var per = P.period || 3.6;
    var prog = P.once
      ? clamp(norm(t, (l.in || 0) + (P.delay || 0), (l.in || 0) + (P.delay || 0) + (P.dur || 1.2)), 0, 1)
      : ((t - (l.in || 0) + (P.delay || 0)) % per) / per;
    if (prog <= 0 || prog >= 1) return;
    ctx.save();
    if (l.follow) place(ctx, scene, l, st, t);
    else ctx.setTransform(baseScale(ctx), 0, 0, baseScale(ctx), 0, 0);
    comp(ctx, P.blend || "screen");
    var bw = (P.width === undefined ? 0.24 : P.width) * W;
    var len = Math.hypot(W, H) * 1.3;
    var travel = lerp(-bw, W + bw, TLM.ease(P.ease || "sineInOut", prog));
    ctx.translate(travel, H / 2);
    ctx.rotate(deg(P.angle === undefined ? 16 : P.angle));
    var g = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
    var col = P.color || "#ffd9b8";
    g.addColorStop(0, C.rgba(col, 0));
    g.addColorStop(0.5, C.rgba(col, P.alpha === undefined ? 0.2 : P.alpha));
    g.addColorStop(1, C.rgba(col, 0));
    ctx.globalAlpha = clamp(st.alpha, 0, 1) * (P.once ? Math.sin(prog * Math.PI) : 1);
    ctx.fillStyle = g;
    ctx.fillRect(-bw / 2, -len / 2, bw, len);
    ctx.restore();
  };

  /* ================================================== grain / scanlines */
  function noiseTile(ctx, size, contrast) {
    if (noiseTiles) {
      var c = noiseTiles.get(ctx);
      if (c && c.size === size && c.contrast === contrast) return c.tile;
    }
    if (!global.document || !global.document.createElement) return null;
    var n = global.document.createElement("canvas");
    n.width = n.height = size;
    var nc = n.getContext("2d");
    if (!nc.createImageData) return null;
    var id = nc.createImageData(size, size);
    var rnd = U.prand(7);
    for (var i = 0; i < id.data.length; i += 4) {
      var v = 128 + (rnd() - 0.5) * 255 * (contrast || 0.55);
      id.data[i] = id.data[i + 1] = id.data[i + 2] = clamp(v, 0, 255);
      id.data[i + 3] = 255;
    }
    nc.putImageData(id, 0, 0);
    var pat = null;
    if (ctx.createPattern) {
      try {
        pat = ctx.createPattern(n, "repeat");
      } catch (e) {
        /* a canvas that won't accept a pattern from a DOM node (headless
           backends) — draw.grain has a dot-field fallback for exactly this */
        pat = null;
      }
    }
    if (noiseTiles) noiseTiles.set(ctx, { size: size, contrast: contrast, tile: pat });
    return pat;
  }
  TLM.noiseTile = noiseTile;
  draw.grain = function (ctx, scene, l, st, t) {
    var P = l.props, W = scene.meta.width, H = scene.meta.height;
    ctx.save();
    ctx.setTransform(baseScale(ctx), 0, 0, baseScale(ctx), 0, 0);
    ctx.globalAlpha = clamp(st.alpha, 0, 1) * (P.alpha === undefined ? 0.075 : P.alpha);
    comp(ctx, P.blend || "overlay");
    var pat = noiseTile(ctx, P.tile || 128, P.contrast === undefined ? 0.6 : P.contrast);
    var fr = Math.floor(t * (scene.meta.fps || 30));
    if (pat) {
      if (P.flicker !== false) ctx.translate(-Math.floor(hash(fr * 1.7) * 64), -Math.floor(hash(fr * 2.3) * 64));
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, W + 128, H + 128);
    } else {
      /* no pattern support: the same idea, drawn — a seeded speckle field that
         still re-rolls every frame so it flickers like film grain */
      var n2 = Math.round((P.alpha === undefined ? 0.075 : P.alpha) * 26000) + 900;
      var rnd = U.prand(fr * 3 + 11);
      for (var q = 0; q < n2; q++) {
        var gx = rnd() * W, gy = rnd() * H, gv = rnd();
        ctx.fillStyle = gv > 0.5 ? "rgba(255,255,255," + (0.25 + gv * 0.5).toFixed(3) + ")" : "rgba(0,0,0," + (0.3 + gv * 0.5).toFixed(3) + ")";
        ctx.fillRect(gx, gy, 1.6, 1.6);
      }
    }
    if (P.scanlines) {
      comp(ctx, "source-over");
      ctx.globalAlpha = clamp(st.alpha, 0, 1) * (P.scanAlpha || 0.05);
      ctx.fillStyle = "#000";
      for (var y = 0; y < H; y += P.scanGap || 4) ctx.fillRect(0, y, W, P.scanW || 1);
    }
    ctx.restore();
  };

  /* ================================================== vignette */
  draw.vignette = function (ctx, scene, l, st) {
    var P = l.props, W = scene.meta.width, H = scene.meta.height;
    ctx.save();
    ctx.setTransform(baseScale(ctx), 0, 0, baseScale(ctx), 0, 0);
    ctx.globalAlpha = clamp(st.alpha, 0, 1);
    var cy = (P.cy === undefined ? 0.48 : P.cy) * H;
    var g = ctx.createRadialGradient(W / 2, cy, 0, W / 2, cy, (P.r === undefined ? 0.8 : P.r) * Math.max(W, H));
    g.addColorStop(0, C.rgba(P.color || "#000000", 0));
    g.addColorStop(clamp(P.feather === undefined ? 0.5 : P.feather, 0.02, 0.96), C.rgba(P.color || "#000000", 0));
    g.addColorStop(1, C.rgba(P.color || "#000000", P.alpha === undefined ? 0.55 : P.alpha));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (P.topGlow) {
      comp(ctx, "screen");
      var tg = ctx.createLinearGradient(0, 0, 0, H * 0.55);
      tg.addColorStop(0, C.rgba(P.topGlow, P.topGlowAlpha || 0.15));
      tg.addColorStop(1, C.rgba(P.topGlow, 0));
      ctx.fillStyle = tg;
      ctx.fillRect(0, 0, W, H * 0.55);
    }
    ctx.restore();
  };

  /* ================================================== grid */
  draw.grid = function (ctx, scene, l, st, t) {
    var P = l.props, W = scene.meta.width, H = scene.meta.height;
    var box = P.box || [0, 0, W, H];
    ctx.save();
    if (l.follow) place(ctx, scene, l, st, t);
    else ctx.setTransform(baseScale(ctx), 0, 0, baseScale(ctx), 0, 0);
    var cell = P.cell || 60;
    var off = (t * (P.speed || 0) + (P.offset || 0)) % cell;
    ctx.globalAlpha = clamp(st.alpha, 0, 1) * (P.alpha === undefined ? 0.14 : P.alpha);
    ctx.strokeStyle = C.rgba(P.color || "#7f858e", 1);
    ctx.lineWidth = P.w || 1;
    if (P.perspective) {
      var hz = (P.horizon === undefined ? 0.44 : P.horizon) * H;
      var vpx = W / 2 + (P.vp || 0);
      for (var i = -16; i <= 16; i++) {
        ctx.beginPath();
        ctx.moveTo(vpx + i * cell * 1.5, box[1] + box[3]);
        ctx.lineTo(vpx + i * cell * 0.1, hz);
        ctx.stroke();
      }
      for (var j = 0; j < 20; j++) {
        var f = (j / 20 + ((t * (P.speed || 0.1)) % 0.05)) % 1;
        var yy = hz + Math.pow(f, 2.6) * (box[1] + box[3] - hz);
        ctx.globalAlpha = clamp(st.alpha, 0, 1) * (P.alpha === undefined ? 0.14 : P.alpha) * (0.15 + 0.85 * f);
        ctx.beginPath();
        ctx.moveTo(box[0], yy);
        ctx.lineTo(box[0] + box[2], yy);
        ctx.stroke();
      }
    } else {
      for (var x = box[0] - cell + off; x <= box[0] + box[2]; x += cell) { ctx.beginPath(); ctx.moveTo(x, box[1]); ctx.lineTo(x, box[1] + box[3]); ctx.stroke(); }
      for (var y = box[1] - cell + off; y <= box[1] + box[3]; y += cell) { ctx.beginPath(); ctx.moveTo(box[0], y); ctx.lineTo(box[0] + box[2], y); ctx.stroke(); }
    }
    ctx.restore();
  };

  /* ================================================== marquee ticker */
  draw.ticker = function (ctx, scene, l, st, t) {
    var P = l.props;
    ctx.save();
    place(ctx, scene, l, st, t);
    var size = P.size || 30;
    ctx.font = TLM.fontString({ font: P.font || "display", size: size, weight: P.weight || 400 }, scene);
    ctx.textBaseline = "middle";
    var unit = String(P.text || "").toUpperCase() + (P.sep === undefined ? "   ·   " : P.sep);
    var uw = ctx.measureText(unit).width + (P.tracking || 0) * unit.length + (P.gap || 0);
    if (P.band) {
      ctx.fillStyle = C.rgba(P.band, P.bandAlpha === undefined ? 1 : P.bandAlpha);
      ctx.fillRect(0, 0, st.w, st.h);
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, st.w, st.h);
    ctx.clip();
    ctx.fillStyle = C.rgba(P.color || "#f1efec", 1);
    var n = Math.ceil(st.w / uw) + 2;
    var off = ((t * (P.speed === undefined ? 90 : P.speed)) % uw) * (P.dir === "right" ? -1 : 1);
    for (var i = 0; i < n; i++) {
      if (P.tracking) {
        var s = unit, xx = i * uw + off - uw;
        for (var k = 0; k < s.length; k++) { ctx.fillText(s[k], xx, st.h / 2); xx += ctx.measureText(s[k]).width + P.tracking; }
      } else ctx.fillText(unit, i * uw + off - uw, st.h / 2);
    }
    ctx.restore();
    ctx.restore();
  };

  /* ================================================== bars */
  draw.bars = function (ctx, scene, l, st, t) {
    var P = l.props, n = P.count || 24;
    var gap = P.gap === undefined ? 6 : P.gap;
    var bw = (st.w - gap * (n - 1)) / n;
    var beat = scene.music && scene.music.bpm ? 60 / scene.music.bpm : 0.5;
    var bp = (t % beat) / beat;
    var kick = P.beat === false ? 0 : Math.exp(-bp * 7) * (P.beatAmt === undefined ? 0.3 : P.beatAmt);
    ctx.save();
    place(ctx, scene, l, st, t);
    for (var i = 0; i < n; i++) {
      var f = i / n;
      var v =
        0.2 +
        0.5 * Math.abs(Math.sin(t * (2.1 + f * 5.5) + i * 1.7)) * (0.5 + 0.5 * Math.sin(t * 1.3 + f * 3)) +
        0.28 * Math.abs(Math.sin(t * (8 - f * 4))) * (1 - f) +
        kick * (1 - f * 0.6) +
        (hash(Math.floor(t * 12) + i * 31) - 0.5) * 0.12;
      v = clamp(v * (P.amp === undefined ? 0.9 : P.amp), 0, 1.3);
      var bh = Math.max(P.min || 4, v * st.h);
      var x = i * (bw + gap);
      ctx.fillStyle = P.grad && P.grad.length > 1 ? (function () { var g = ctx.createLinearGradient(0, st.h - bh, 0, st.h); g.addColorStop(0, P.grad[0]); g.addColorStop(1, P.grad[1]); return g; })() : C.rgba(P.color || "#ff6a1a", 1);
      if (P.mirror) {
        ctx.fillRect(x, st.h / 2 - bh, bw, bh);
        ctx.globalAlpha = clamp(st.alpha, 0, 1) * 0.5;
        ctx.fillRect(x, st.h / 2, bw, bh * 0.7);
        ctx.globalAlpha = clamp(st.alpha, 0, 1);
      } else {
        rr(ctx, x, P.origin === "top" ? 0 : st.h - bh, bw, bh, P.radius === undefined ? 2 : P.radius);
        ctx.fill();
      }
    }
    ctx.restore();
  };

  /* ================================================== gauge */
  draw.gauge = function (ctx, scene, l, st, t) {
    var P = l.props;
    var r = Math.min(st.w, st.h) / 2 - (P.strokeW || 10) - 2;
    var p = P.value !== undefined ? P.value : TLM.ease(P.ease || "cubicOut", clamp(norm(t, (l.in || 0) + (P.delay || 0), (l.in || 0) + (P.delay || 0) + (P.dur === undefined ? 1.2 : P.dur)), 0, 1));
    ctx.save();
    place(ctx, scene, l, st, t);
    ctx.translate(st.w / 2, st.h / 2);
    ctx.lineCap = P.cap || "round";
    var from = deg(P.from === undefined ? 130 : P.from);
    var total = deg(P.sweep === undefined ? 280 : P.sweep);
    if (P.track !== false) {
      ctx.strokeStyle = C.rgba(P.trackColor || "#ffffff", P.trackAlpha === undefined ? 0.12 : P.trackAlpha);
      ctx.lineWidth = P.strokeW || 10;
      ctx.beginPath();
      ctx.arc(0, 0, r, from, from + total);
      ctx.stroke();
    }
    ctx.strokeStyle = P.grad && P.grad.length > 1 ? (function () { var g = ctx.createLinearGradient(-r, -r, r, r); g.addColorStop(0, P.grad[0]); g.addColorStop(1, P.grad[1]); return g; })() : C.rgba(P.color || "#ff6a1a", 1);
    ctx.lineWidth = P.strokeW || 10;
    ctx.beginPath();
    ctx.arc(0, 0, r, from, from + total * p);
    ctx.stroke();
    if (P.ticks) {
      var tc = P.tickCount || 10;
      ctx.lineWidth = 2;
      ctx.strokeStyle = C.rgba(P.tickColor || "#ffffff", 0.28);
      for (var i = 0; i <= tc; i++) {
        var a = from + (total * i) / tc;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (r + (P.strokeW || 10) * 0.7 + 4), Math.sin(a) * (r + (P.strokeW || 10) * 0.7 + 4));
        ctx.lineTo(Math.cos(a) * (r + (P.strokeW || 10) * 0.7 + 13), Math.sin(a) * (r + (P.strokeW || 10) * 0.7 + 13));
        ctx.stroke();
      }
    }
    if (P.dot !== false) {
      var a2 = from + total * p;
      ctx.fillStyle = C.rgba(P.dotColor || "#fff8f2", 1);
      ctx.beginPath();
      ctx.arc(Math.cos(a2) * r, Math.sin(a2) * r, (P.strokeW || 10) * 0.55, 0, 6.2832);
      ctx.fill();
    }
    if (P.center) {
      ctx.font = TLM.fontString({ font: P.centerFont || "display", size: P.centerSize || 78, weight: 400 }, scene);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = C.rgba(P.centerColor || "#f1efec", 1);
      var v = P.centerTo === undefined
        ? (P.centerDecimals === undefined ? Math.round(p * 100) : (p * 100).toFixed(P.centerDecimals))
        : (P.centerDecimals === undefined ? Math.round(p * P.centerTo) : (p * P.centerTo).toFixed(P.centerDecimals));
      ctx.fillText((P.centerFormat ? P.centerFormat.replace("{v}", String(v)) : String(v)) + (P.centerSuffix === undefined ? "%" : P.centerSuffix), 0, 0);
      ctx.textAlign = "left";
    }
    ctx.restore();
  };

  /* ================================================== stars */
  draw.stars = function (ctx, scene, l, st, t) {
    var P = l.props, n = P.count || 5;
    var filled = P.value === undefined ? 5 : P.value;
    var sz = P.size || 40, gap = P.gap === undefined ? 10 : P.gap;
    ctx.save();
    place(ctx, scene, l, st, t);
    for (var i = 0; i < n; i++) {
      var fv = clamp(filled - i, 0, 1);
      var ip = TLM.ease("backOut", clamp((t - (l.in || 0) - i * (P.stagger === undefined ? 0.08 : P.stagger)) / Math.max(0.001, P.dur || 0.4), 0, 1));
      if (ip <= 0.001) continue;
      ctx.save();
      ctx.globalAlpha = clamp(st.alpha, 0, 1) * ip;
      ctx.translate(i * (sz + gap) + sz / 2, sz / 2);
      ctx.scale(ip, ip);
      ctx.beginPath();
      for (var k = 0; k < 10; k++) {
        var a = -Math.PI / 2 + (k * Math.PI) / 5;
        var r = (k % 2 ? 0.42 : 1) * (sz / 2);
        if (k) ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fillStyle = C.rgba(P.emptyColor || "#3a3e45", 1);
      ctx.fill();
      if (fv > 0.01) {
        ctx.save();
        ctx.clip();
        ctx.fillStyle = C.rgba(P.color || "#ff9040", 1);
        ctx.fillRect(-sz, -sz, sz * 2 * fv, sz * 2);
        ctx.restore();
      }
      ctx.restore();
    }
    ctx.restore();
  };

  /* ================================================== frame — reel UI chrome */
  draw.frame = function (ctx, scene, l, st, t) {
    var P = l.props, W = scene.meta.width, H = scene.meta.height;
    var m = P.margin === undefined ? 34 : P.margin;
    ctx.save();
    ctx.setTransform(baseScale(ctx), 0, 0, baseScale(ctx), 0, 0);
    ctx.globalAlpha = clamp(st.alpha, 0, 1);
    var gp = TLM.ease("expoOut", clamp(norm(t, l.in || 0, (l.in || 0) + (P.dur || 0.5)), 0, 1));
    ctx.strokeStyle = C.rgba(P.color || "#f1efec", P.alpha === undefined ? 0.42 : P.alpha);
    ctx.lineWidth = P.w || 3;
    ctx.lineCap = P.cap || "square";
    var L = (P.len === undefined ? 46 : P.len) * gp;
    [[m, m, 1, 1], [W - m, m, -1, 1], [W - m, H - m, -1, -1], [m, H - m, 1, -1]].forEach(function (q) {
      ctx.beginPath();
      ctx.moveTo(q[0], q[1] + q[3] * L);
      ctx.lineTo(q[0], q[1]);
      ctx.lineTo(q[0] + q[2] * L, q[1]);
      ctx.stroke();
    });
    var ls = P.labelSize || 20;
    if (P.label) {
      ctx.font = TLM.fontString({ font: P.labelFont || "mono", size: ls, weight: 700 }, scene);
      ctx.fillStyle = C.rgba(P.labelColor || "#ff6a1a", 0.92);
      ctx.fillText(String(P.label).toUpperCase(), m, m + ls + 20);
    }
    if (P.right) {
      ctx.font = TLM.fontString({ font: "mono", size: ls, weight: 700 }, scene);
      ctx.fillStyle = C.rgba(P.rightColor || "#f1efec", 0.7);
      var s = P.tc ? TLM.fmtTC(t, scene.meta.fps || 30, P.tcStyle) : String(P.right);
      ctx.fillText(s.toUpperCase(), W - m - ctx.measureText(s).width, m + ls + 20);
    }
    if (P.edgeBars) {
      ctx.fillStyle = C.rgba(P.edgeColor || "#c45a0f", 1);
      ctx.fillRect(0, 0, P.edgeW || 10, H * gp);
      ctx.fillRect(W - (P.edgeW || 10), H - H * gp, P.edgeW || 10, H * gp);
    }
    ctx.restore();
  };

  /* ================================================== progress — chapter bar */
  draw.progress = function (ctx, scene, l, st, t) {
    var P = l.props, w = st.w, h = st.h;
    var p = clamp(norm(t, 0, scene.meta.duration), 0, 1);
    var bh = P.barH || 4;
    ctx.save();
    place(ctx, scene, l, st, t);
    ctx.fillStyle = C.rgba(P.track || "#ffffff", P.trackAlpha === undefined ? 0.14 : P.trackAlpha);
    rr(ctx, 0, (h - bh) / 2, w, bh, bh / 2);
    ctx.fill();
    ctx.fillStyle = P.grad && P.grad.length > 1 ? (function () { var g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, P.grad[0]); g.addColorStop(1, P.grad[1]); return g; })() : C.rgba(P.color || "#ff6a1a", 1);
    rr(ctx, 0, (h - bh) / 2, Math.max(bh, w * p), bh, bh / 2);
    ctx.fill();
    (P.marks || []).forEach(function (mk) {
      var x = w * clamp(norm(mk.t === undefined ? mk : mk.t, 0, scene.meta.duration), 0, 1);
      ctx.fillStyle = C.rgba(P.markColor || "#f1efec", 0.5);
      ctx.fillRect(x, 0, P.markW || 2, h);
    });
    if (P.head !== false) {
      ctx.fillStyle = C.rgba(P.headColor || "#ffffff", 1);
      ctx.beginPath();
      ctx.arc(w * p, h / 2, P.headR || 6, 0, 6.2832);
      ctx.fill();
    }
    ctx.restore();
  };
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : this);
