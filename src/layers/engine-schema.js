/* ==================================================================
   engine-schema.js — what every layer type is, in one place
   ------------------------------------------------------------------
   Single source of truth for
     · the inspector's controls (kind → widget)
     · "new layer" defaults
     · the generated IMPORT-JSON docs + sample scene
   Add a field here and it shows up in the editor and the docs.
   ================================================================== */
(function (global) {
  "use strict";
  var TLM = (global.TLM = global.TLM || {});

  function F(key, label, kind, extra) {
    return Object.assign({ key: key, label: label || key.split(".").pop().toUpperCase(), kind: kind }, extra || {});
  }
  var n = function (k, l, min, max, step, unit, extra) { return F(k, l, "number", Object.assign({ min: min, max: max, step: step, unit: unit }, extra || {})); };
  var r = function (k, l, min, max, step, extra) { return F(k, l, "range", Object.assign({ min: min === undefined ? 0 : min, max: max === undefined ? 1 : max, step: step || 0.01 }, extra || {})); };
  var e = function (k, l, values, extra) { return F(k, l, "enum", Object.assign({ values: values }, extra || {})); };
  var c = function (k, l) { return F(k, l, "color"); };
  var b = function (k, l) { return F(k, l, "bool"); };
  var tx = function (k, l) { return F(k, l, "text"); };
  var ar = function (k, l) { return F(k, l, "area"); };

  var EASES = TLM.EASE ? Object.keys(TLM.EASE) : ["swift", "expoOut", "backOut"];
  var ENTER = ["fade", "up", "down", "left", "right", "scale", "zoomIn", "zoomOut", "rise", "blur", "spinIn", "wipeL", "wipeR", "wipeU", "wipeD", "circle", "maskUp", "lineMask", "none"];
  var EXIT = ["fade", "up", "down", "left", "right", "scale", "zoomIn", "wipeL", "wipeR", "wipeU", "wipeD", "circle", "none"];
  var REVEAL = ["none", "wordsUp", "wordsDown", "wordsLeft", "lines", "scale", "pop", "rise", "blur", "decode", "shuffle"];
  var FACES = ["display", "grotesk", "mono", "serif"];
  var G = { timing: "Timing", layout: "Layout", motion: "Motion" };

  /* transform + timing channels every layer shares */
  var COMMON = [
    F("name", "NAME", "text"),
    n("in", "IN", 0, 600, 1 / 30, "s", { group: G.timing }),
    n("dur", "LENGTH", 0.04, 600, 1 / 30, "s", { group: G.timing }),
    n("t.x", "X", -4000, 4000, 1, "px", { group: G.layout }),
    n("t.y", "Y", -4000, 4000, 1, "px", { group: G.layout }),
    n("t.w", "W", 1, 6000, 1, "px", { group: G.layout }),
    n("t.h", "H", 1, 6000, 1, "px", { group: G.layout }),
    n("t.rot", "ROTATE", -180, 180, 0.5, "°", { group: G.layout }),
    r("t.scale", "SCALE", 0.05, 6, 0.01, { group: G.layout }),
    r("t.opacity", "OPACITY", 0, 1, 0.01, { group: G.layout }),
    r("t.anchorX", "ANCHOR X", 0, 1, 0.05, { group: G.layout }),
    r("t.anchorY", "ANCHOR Y", 0, 1, 0.05, { group: G.layout }),
    r("parallax", "CAM PARALLAX", 0, 2, 0.05, { group: G.layout }),
    e("blend", "BLEND", ["source-over", "multiply", "screen", "overlay", "soft-light", "lighten", "darken", "difference", "exclusion", "color-dodge", "lighter"], { group: G.layout }),
    e("anim.enter", "ENTER", ENTER, { group: G.motion }),
    e("anim.exit", "EXIT", EXIT, { group: G.motion }),
    n("anim.dur", "ENTER TIME", 0, 4, 0.05, "s", { group: G.motion }),
    n("anim.exitDur", "EXIT TIME", 0, 4, 0.05, "s", { group: G.motion }),
    e("anim.ease", "EASE", EASES, { group: G.motion }),
    n("anim.dist", "ENTER DIST", 0, 900, 2, "px", { group: G.motion }),
    n("anim.stagger", "STAGGER", 0, 0.4, 0.005, "s", { group: G.motion }),
    n("anim.float", "FLOAT", 0, 60, 0.5, "px", { group: G.motion }),
    r("anim.pulse", "PULSE", 0, 0.3, 0.005, { group: G.motion }),
    n("anim.shake", "SHAKE", 0, 60, 0.5, "px", { group: G.motion }),
    n("anim.spin", "SPIN", -4, 4, 0.05, "rev/s", { group: G.motion }),
    e("anim.exitEase", "EXIT EASE", EASES, { group: G.motion }),
    r("anim.scaleFrom", "ENTER SCALE FROM", 0.05, 3, 0.01, { group: G.motion }),
    n("anim.rotFrom", "ENTER ROTATE FROM", -180, 180, 1, "°", { group: G.motion }),
    n("anim.skew", "SKEW", -0.5, 0.5, 0.01, { group: G.motion }),
    n("anim.blur", "ENTER BLUR", 0, 60, 0.5, "px", { group: G.motion }),
    n("anim.blurAfter", "POST-BLUR", 0, 60, 0.5, "px", { group: G.motion }),
    n("anim.floatSpeed", "FLOAT SPEED", 0, 6, 0.05, "rad/s", { group: G.motion }),
    n("anim.pulseSpeed", "PULSE SPEED", 0, 8, 0.05, "rad/s", { group: G.motion }),
    n("anim.drift", "DRIFT", 0, 200, 1, "px", { group: G.motion }),
    n("anim.driftSpeed", "DRIFT SPEED", 0, 4, 0.02, "rad/s", { group: G.motion }),
    n("anim.shakeDecay", "SHAKE DECAY", 0.05, 4, 0.05, "s", { group: G.motion }),
    r("anim.breathe", "BREATHE", 0, 0.2, 0.002, { group: G.motion }),
    n("anim.seed", "SEED", 0, 999, 1, { group: G.motion }),
    n("t.z", "DEPTH", -2000, 2000, 1, "px", { group: G.layout }),
  ];

  var TYPES = (TLM.TYPES = {
    bg: {
      label: "BACKGROUND", hint: "gradient wash + drifting colour pools",
      fields: [
        e("props.mode", "MODE", ["linear", "radial"]), n("props.angle", "ANGLE", -180, 180, 1, "°"),
        F("props.colors", "COLOURS", "colors", { max: 5 }), n("props.drift", "DRIFT", 0, 40, 0.5),
        F("props.pools", "COLOUR POOLS", "pools"),
        r("props.cx", "RADIAL X", 0, 1, 0.01), r("props.cy", "RADIAL Y", 0, 1, 0.01), r("props.r", "RADIAL SIZE", 0.1, 3, 0.01),
      ],
      sample: { t: {}, props: { mode: "linear", angle: 145, colors: ["#101114", "#22262c"] } },
    },
    photo: {
      label: "PLATE", hint: "stock photo with Ken Burns, grade + scrim",
      fields: [
        F("props.src", "ASSET", "asset"), n("props.timeFrom", "CLIP OFFSET", 0, 60, 0.1, "s"),
        n("props.radius", "RADIUS", 0, 400, 1), e("props.clip", "CLIP", ["none", "ellipse", "blob"]),
        r("props.dim", "DIM", 0, 1, 0.01), c("props.dimColor", "DIM COLOUR"),
        c("props.tint", "GRADE TINT"), r("props.tintAlpha", "TINT AMOUNT"),
        e("props.tintBlend", "TINT BLEND", ["soft-light", "overlay", "multiply", "screen", "color"]),
        b("props.scrim", "SCRIM"), b("props.scrimTop", "SCRIM FROM TOP"), r("props.scrimAlpha", "SCRIM ALPHA"),
        r("props.chroma", "CHROMA EDGE", 0, 0.2, 0.005),
        n("props.frameW", "FRAME", 0, 24, 1), c("props.frameColor", "FRAME COLOUR"),
        F("props.shadow", "DROP SHADOW", "shadow"), F("props.kb", "KEN BURNS", "kb"),
      ],
      sample: {
        t: { x: 540, y: 700, w: 1080, h: 1420 },
        props: { src: "hero", radius: 0, dim: 0.35, kb: { from: { z: 1.04 }, to: { z: 1.16, x: 20, y: -18 }, ease: "sineInOut" } },
        anim: { enter: "wipeU", dur: 0.7, ease: "expoOut" },
      },
    },
    video: {
      label: "B-ROLL", hint: "stock clip as a plate (falls back to its poster)",
      fields: [
        F("props.src", "ASSET", "asset"), n("props.timeFrom", "CLIP OFFSET", 0, 30, 0.1, "s"),
        n("props.radius", "RADIUS", 0, 400, 1), r("props.dim", "DIM", 0, 1, 0.01),
        c("props.tint", "GRADE TINT"), r("props.tintAlpha", "TINT AMOUNT"), b("props.loop", "LOOP"),
      ],
      sample: { t: { x: 540, y: 1500, w: 420, h: 260 }, props: { src: "roll", radius: 16, dim: 0.2 }, anim: { enter: "scale", dur: 0.5 } },
    },
    strip: {
      label: "STRIP", hint: "a row of plates that stagger in",
      fields: [
        F("props.items", "PANELS", "items", { cols: ["src", "label"] }),
        n("props.gap", "GAP", 0, 120, 1), n("props.radius", "RADIUS", 0, 200, 1),
        n("props.stagger", "STAGGER", 0, 0.6, 0.01, "s"), n("props.itemDur", "PANEL TIME", 0.1, 2, 0.05, "s"),
        r("props.dim", "DIM", 0, 1, 0.01),
              e("props.ease", "EASE", EASES), n("props.rise", "RISE", 0, 400, 2, "px"),
        e("props.labelFont", "LABEL FACE", FACES), n("props.labelSize", "LABEL SIZE", 8, 80, 1), c("props.labelColor", "LABEL COLOUR"),
        e("props.clip", "MASK", ["none", "ellipse", "blob"]), b("props.scrim", "SCRIM"), r("props.scrimAlpha", "SCRIM ALPHA"),
      ],
      sample: { t: { x: 540, y: 1300, w: 940, h: 300 }, props: { items: [{ src: "kitchen", label: "KITCHEN" }, { src: "bedroom", label: "BEDROOM" }], gap: 16, radius: 12 } },
    },
    swatch: {
      label: "SWATCHES", hint: "material / colour grid",
      fields: [
        F("props.items", "TILES", "items", { cols: ["label", "sub", "color", "src"] }),
        n("props.cols", "COLUMNS", 1, 6, 1), n("props.gap", "GAP", 0, 80, 1), n("props.radius", "RADIUS", 0, 120, 1),
        n("props.stagger", "STAGGER", 0, 0.5, 0.01, "s"), e("props.ease", "EASE", EASES),
        n("props.labelSize", "LABEL SIZE", 8, 80, 1), c("props.tint", "TINT"), r("props.tintAlpha", "TINT AMOUNT"),
        n("props.itemDur", "TILE TIME", 0.05, 3, 0.05, "s"), e("props.labelFont", "LABEL FACE", FACES),
        c("props.labelColor", "LABEL COLOUR"), c("props.subColor", "SUB COLOUR"), b("props.upper", "UPPERCASE"),
        e("props.labelPos", "LABEL AT", ["bottom", "top"]), r("props.rotFrom", "TILT IN", -0.5, 0.5, 0.005, { unit: "rad" }),
      ],
      sample: {
        t: { x: 540, y: 1000, w: 900, h: 620 },
        props: { cols: 2, gap: 20, radius: 18, items: [{ label: "OAK", color: "#c8955f", sub: "18 MM" }, { label: "STONE", color: "#e6e3de", sub: "HONED" }] },
      },
    },
    text: {
      label: "TEXT", hint: "kinetic type — per-word reveal, **word** = accent colour",
      fields: [
        ar("props.text", "TEXT"), e("props.font", "FACE", FACES),
        n("props.size", "SIZE", 6, 400, 1, "px"), n("props.weight", "WEIGHT", 100, 900, 50),
        n("props.tracking", "TRACKING", -30, 80, 0.5), r("props.leading", "LEADING", 0.6, 2.4, 0.01),
        e("props.align", "ALIGN", ["left", "center", "right"]), e("props.valign", "IN BOX", ["top", "middle", "bottom"]),
        b("props.upper", "UPPERCASE"), b("props.italic", "ITALIC"),
        c("props.color", "COLOUR"), c("props.accent", "HIGHLIGHT COLOUR"),
        e("props.reveal", "REVEAL", REVEAL), n("props.revealDur", "REVEAL TIME", 0.05, 2, 0.01, "s"),
        n("props.revealDist", "REVEAL DIST", 0, 300, 2), e("props.revealEase", "REVEAL EASE", EASES),
        n("props.stagger", "WORD DELAY", 0, 0.4, 0.005, "s"),
        b("props.outline", "OUTLINE"), n("props.strokeW", "STROKE", 0, 20, 0.5), c("props.stroke", "STROKE COLOUR"),
        n("props.glow", "GLOW", 0, 80, 1), c("props.glowColor", "GLOW COLOUR"),
        c("props.box", "BACKING"), F("props.boxPad", "BACKING PAD", "vec4"), n("props.boxRadius", "BACKING RADIUS", 0, 200, 1),
        c("props.ul", "UNDERLINE"), n("props.ulW", "UNDERLINE W", 1, 40, 1),
        n("props.ulDur", "UNDERLINE TIME", 0.05, 2, 0.01, "s"), n("props.ulDelay", "UNDERLINE DELAY", 0, 4, 0.01, "s"), r("props.glowAlpha", "GLOW ALPHA"),
      ],
      sample: {
        t: { x: 540, y: 900, w: 880, h: 300 },
        props: { text: "YOUR HOME,\n**REIMAGINED.**", font: "display", size: 150, tracking: -3, leading: 0.94, align: "center", color: "#f1efec", accent: "#ff6a1a", reveal: "wordsUp" },
        anim: { enter: "maskUp", dur: 0.7, ease: "expoOut" },
      },
    },
    counter: {
      label: "COUNTER", hint: "number that counts up on the beat",
      fields: [
        n("props.from", "FROM", -1e6, 1e6, 0.1), n("props.to", "TO", -1e6, 1e6, 0.1),
        n("props.decimals", "DECIMALS", 0, 3, 1), n("props.pad", "PAD DIGITS", 0, 6, 1),
        b("props.thousand", "THOUSAND SEP"), tx("props.prefix", "PREFIX"), tx("props.suffix", "SUFFIX"),
        e("props.ease", "EASE", EASES), n("props.tail", "RUN UP TO", 0, 3, 0.05, "s"),
        n("props.size", "SIZE", 10, 500, 1, "px"), e("props.font", "FACE", FACES), c("props.color", "COLOUR"),
        e("props.align", "ALIGN", ["left", "center", "right"]), tx("props.label", "LABEL"),
        n("props.labelSize", "LABEL SIZE", 8, 90, 1), c("props.labelColor", "LABEL COLOUR"),
        b("props.bar", "PROGRESS BAR"), c("props.barColor", "BAR COLOUR"), c("props.barTrack", "BAR TRACK"), n("props.barH", "BAR HEIGHT", 1, 40, 1),
        b("props.tick", "DIGIT FLICKER"), n("props.weight", "WEIGHT", 100, 900, 50),
        c("props.tickColor", "TICK COLOUR"), n("props.glow", "GLOW", 0, 80, 1),
      ],
      sample: { t: { x: 200, y: 520, w: 680, h: 210 }, props: { to: 320, suffix: "+", size: 190, label: "HOMES DELIVERED", ease: "expoOut", color: "#f1efec", align: "center" } },
    },
    shape: {
      label: "SHAPE", hint: "bars, rules, wipes, brackets, waves",
      fields: [
        e("props.shape", "SHAPE", ["rect", "pill", "ellipse", "circle", "ring", "arc", "line", "vline", "diag", "tri", "poly", "plus", "wave", "blob", "brackets"]),
        c("props.fill", "FILL"), r("props.fillAlpha", "FILL ALPHA"),
        F("props.grad", "GRADIENT", "colors"), n("props.gradAngle", "GRAD ANGLE", -180, 180, 1, "°"),
        n("props.radius", "RADIUS", 0, 600, 1), c("props.stroke", "STROKE"), n("props.strokeW", "STROKE WIDTH", 0.5, 40, 0.5),
        tx("props.dash", "DASH"), n("props.dashOffset", "DASH FLOW", -600, 600, 10),
        e("props.cap", "CAP", ["butt", "round", "square"]), n("props.sides", "POLY SIDES", 3, 12, 1),
        n("props.from", "ARC FROM", -360, 360, 1, "°"), n("props.sweep", "ARC SWEEP", -360, 360, 1, "°"),
        b("props.grow", "GROW IN"), n("props.growDur", "GROW TIME", 0, 3, 0.05, "s"),
        e("props.growEase", "GROW EASE", EASES),
        n("props.glow", "GLOW", 0, 80, 1), c("props.glowColor", "GLOW COLOUR"),
        n("props.cycles", "WAVE CYCLES", 1, 12, 1), n("props.amp", "WAVE AMP", 0, 300, 1), n("props.speed", "WAVE SPEED", 0, 12, 0.1),
      ],
      sample: { t: { x: 540, y: 1200, w: 620, h: 8 }, props: { shape: "rect", fill: "#c45a0f", radius: 4, grow: true, growDur: 0.8 }, anim: { enter: "none" } },
    },
    path: {
      label: "LOGO / PATH", hint: "SVG geometry — the Timberlane lockup, revealed part by part",
      fields: [
        e("props.logo", "LOGO", ["timberlane", "none"]), e("props.group", "PART", ["all", "mark", "furn", "word", "tag"]),
        c("props.fill", "RECOLOUR"), c("props.tint", "TINT"), b("props.keepBrand", "KEEP BRAND ORANGE"),
        e("props.fit", "FIT", ["inside", "stretch", "viewBox"]),
        b("props.drawOn", "LINE-DRAW ON"), n("props.drawOnDur", "DRAW TIME", 0.1, 4, 0.05, "s"),
        c("props.strokeColor", "DRAW COLOUR"), n("props.strokeW", "DRAW WEIGHT", 0.5, 20, 0.5),
        b("props.fillReveal", "FADE FILL IN"), n("props.fillDur", "FILL TIME", 0.05, 3, 0.05, "s"),
        b("props.clipReveal", "CLIP WIPE IN"), n("props.clipDur", "CLIP TIME", 0.05, 3, 0.05, "s"),
        n("props.stagger", "PART DELAY", 0, 0.4, 0.005, "s"),
        e("props.drawEase", "DRAW EASE", EASES), e("props.clipEase", "CLIP EASE", EASES), n("props.partDur", "PART TIME", 0.05, 4, 0.05, "s"),
        b("props.outline", "OUTLINE"), c("props.outlineColor", "OUTLINE COLOUR"),
        F("props.paths", "CUSTOM PATH DATA", "json"),
      ],
      sample: { t: { x: 540, y: 980, w: 700, h: 212 }, props: { logo: "timberlane", group: "all", clipReveal: true, clipDur: 0.8, keepBrand: true }, anim: { enter: "none" } },
    },
    gauge: {
      label: "GAUGE", hint: "arc progress with a value in the middle",
      fields: [
        n("props.strokeW", "RING", 2, 60, 1), c("props.color", "COLOUR"), F("props.grad", "GRADIENT", "colors"),
        n("props.from", "FROM", -360, 360, 1, "°"), n("props.sweep", "SWEEP", -360, 360, 1, "°"),
        n("props.dur", "FILL TIME", 0.2, 6, 0.05, "s"), n("props.delay", "DELAY", 0, 4, 0.05, "s"),
        e("props.ease", "EASE", EASES), b("props.track", "SHOW TRACK"), c("props.trackColor", "TRACK COLOUR"),
        b("props.ticks", "TICKS"), n("props.tickCount", "TICK COUNT", 2, 60, 1),
        b("props.center", "CENTRE VALUE"), n("props.centerSize", "CENTRE SIZE", 10, 200, 1),
        tx("props.centerSuffix", "SUFFIX"), n("props.centerTo", "VALUE AT 100%", -1e4, 1e4, 1),
        n("props.centerDecimals", "DECIMALS", 0, 3, 1),
        b("props.dot", "HEAD DOT"), c("props.dotColor", "DOT COLOUR"), r("props.trackAlpha", "TRACK ALPHA"), e("props.centerFont", "CENTRE FACE", FACES),
        c("props.centerColor", "CENTRE COLOUR"), n("props.dotR", "DOT RADIUS", 2, 40, 1),
      ],
      sample: { t: { x: 540, y: 860, w: 360, h: 360 }, props: { strokeW: 14, color: "#ff6a1a", from: 130, sweep: 280, dur: 1.4, center: true, centerSize: 74 } },
    },
    stars: {
      label: "RATING", hint: "partial-fill star row",
      fields: [
        n("props.count", "COUNT", 1, 10, 1), r("props.value", "VALUE", 0, 10, 0.05),
        n("props.size", "SIZE", 10, 160, 1), n("props.gap", "GAP", 0, 60, 1),
        c("props.color", "COLOUR"), c("props.emptyColor", "EMPTY COLOUR"),
        n("props.stagger", "STAGGER", 0, 0.4, 0.005, "s"), n("props.dur", "POP TIME", 0.05, 2, 0.05, "s"),
      ],
      sample: { t: { x: 300, y: 1180, w: 300, h: 56 }, props: { value: 4.9, size: 52, color: "#ff9040" } },
    },
    bars: {
      label: "SPECTRUM", hint: "beat-locked audio bars",
      fields: [
        n("props.count", "BARS", 4, 96, 1), n("props.gap", "GAP", 0, 40, 1),
        c("props.color", "COLOUR"), F("props.grad", "GRADIENT", "colors"),
        r("props.amp", "AMPLITUDE", 0.1, 2, 0.05), n("props.min", "MIN HEIGHT", 0, 80, 1),
        n("props.radius", "RADIUS", 0, 30, 1), e("props.origin", "ORIGIN", ["bottom", "top"]),
        b("props.mirror", "MIRROR"), b("props.beat", "ON THE BEAT"), r("props.beatAmt", "BEAT KICK", 0, 1, 0.02),
      ],
      sample: { t: { x: 540, y: 1820, w: 880, h: 70 }, props: { count: 34, gap: 8, grad: ["#ff6a1a", "#5a5f66"], amp: 0.9 } },
    },
    particles: {
      label: "PARTICLES", hint: "dust / embers / streaks",
      fields: [
        n("props.count", "COUNT", 1, 400, 1), e("props.shape", "SHAPE", ["glow", "dot", "streak"]),
        c("props.color", "COLOUR"), c("props.color2", "HALO COLOUR"), r("props.alpha", "ALPHA"),
        r("props.size", "SIZE", 0.5, 40, 0.5), r("props.speed", "SPEED", 0.05, 8, 0.05),
        n("props.life", "LOOP LENGTH", 2, 60, 1, "s"), b("props.rise", "RISE"),
        r("props.sway", "SWAY", 0, 4, 0.05), n("props.swayAmp", "SWAY AMOUNT", 0, 120, 1),
        b("props.flicker", "FLICKER"), e("props.blend", "BLEND", ["screen", "lighter", "source-over", "overlay"]),
        F("props.box", "BOX x,y,w,h", "vec4"),
      ],
      sample: { t: {}, props: { count: 70, shape: "glow", color: "#ffd8b0", alpha: 0.42, size: 3, speed: 0.5, sway: 0.4, flicker: true } },
    },
    sweep: {
      label: "LIGHT SWEEP", hint: "specular band travelling across the frame",
      fields: [
        c("props.color", "COLOUR"), r("props.alpha", "ALPHA", 0, 0.6, 0.01), r("props.width", "BAND WIDTH", 0.02, 1, 0.01),
        n("props.angle", "ANGLE", -90, 90, 1, "°"), n("props.period", "PERIOD", 0.4, 20, 0.1, "s"),
        b("props.once", "ONCE ONLY"), n("props.delay", "DELAY", 0, 8, 0.05, "s"), n("props.dur", "DURATION", 0.1, 6, 0.05, "s"),
        e("props.blend", "BLEND", ["screen", "lighter", "overlay", "source-over"]), e("props.ease", "EASE", EASES),
        b("follow", "FOLLOW LAYER"),
      ],
      sample: { t: {}, props: { color: "#ffd9b8", alpha: 0.16, width: 0.26, angle: 16, period: 4.2 }, anim: { enter: "none", exit: "none" } },
    },
    grain: {
      label: "FILM GRAIN", hint: "noise + optional scanlines",
      fields: [
        r("props.alpha", "AMOUNT", 0, 0.4, 0.005), n("props.tile", "TILE", 32, 512, 16, "px"),
        r("props.contrast", "CONTRAST", 0.1, 1, 0.05), e("props.blend", "BLEND", ["overlay", "soft-light", "screen", "source-over"]),
        b("props.flicker", "FLICKER"), b("props.scanlines", "SCANLINES"), r("props.scanAlpha", "SCAN ALPHA", 0, 0.3, 0.01),
      ],
      sample: { t: {}, props: { alpha: 0.07, contrast: 0.6 }, anim: { enter: "none", exit: "none" } },
    },
    vignette: {
      label: "VIGNETTE", hint: "edge falloff + optional warm glow",
      fields: [
        c("props.color", "COLOUR"), r("props.alpha", "AMOUNT"), r("props.r", "RADIUS", 0.2, 2, 0.01),
        r("props.cy", "CENTRE Y"), r("props.feather", "FEATHER", 0.02, 0.95, 0.01),
        c("props.topGlow", "TOP GLOW"), r("props.topGlowAlpha", "GLOW ALPHA", 0, 0.6, 0.01),
      ],
      sample: { t: {}, props: { color: "#000000", alpha: 0.5, r: 0.82, topGlow: "#c45a0f", topGlowAlpha: 0.14 }, anim: { enter: "none", exit: "none" } },
    },
    grid: {
      label: "GRID", hint: "blueprint lines or perspective floor",
      fields: [
        n("props.cell", "CELL", 8, 300, 1), c("props.color", "COLOUR"), r("props.alpha", "ALPHA", 0, 0.6, 0.005),
        r("props.w", "LINE", 0.5, 6, 0.25), n("props.speed", "SCROLL", -200, 200, 1),
        b("props.perspective", "PERSPECTIVE"), r("props.horizon", "HORIZON", 0.05, 0.95, 0.01),
        F("props.box", "BOX x,y,w,h", "vec4"), b("follow", "FOLLOW LAYER"),
      ],
      sample: { t: {}, props: { cell: 72, color: "#8b9097", alpha: 0.1, speed: 14 }, anim: { enter: "none", exit: "none" } },
    },
    ticker: {
      label: "TICKER", hint: "endless marquee strip",
      fields: [
        tx("props.text", "TEXT"), e("props.font", "FACE", FACES), n("props.size", "SIZE", 8, 160, 1),
        c("props.color", "COLOUR"), n("props.speed", "SPEED", -600, 600, 5, "px/s"),
        e("props.dir", "DIRECTION", ["left", "right"]), tx("props.sep", "SEPARATOR"),
        n("props.tracking", "TRACKING", -10, 60, 0.5), c("props.band", "BAND COLOUR"), r("props.bandAlpha", "BAND ALPHA"),
        n("props.weight", "WEIGHT", 100, 900, 50),
      ],
      sample: { t: { x: 540, y: 200, w: 1080, h: 74 }, props: { text: "TURNKEY INTERIORS", size: 40, speed: 120, band: "#c45a0f", color: "#0e0f11" } },
    },
    frame: {
      label: "REEL CHROME", hint: "corner brackets, label, live timecode",
      fields: [
        n("props.margin", "MARGIN", 0, 200, 1), n("props.len", "BRACKET LEN", 4, 300, 2),
        r("props.w", "LINE", 1, 20, 0.5), c("props.color", "COLOUR"), r("props.alpha", "ALPHA"),
        tx("props.label", "LABEL"), tx("props.right", "RIGHT LABEL"), b("props.tc", "LIVE TIMECODE"),
        n("props.labelSize", "LABEL SIZE", 8, 60, 1), c("props.labelColor", "LABEL COLOUR"),
        b("props.edgeBars", "EDGE BARS"), c("props.edgeColor", "EDGE COLOUR"),
        n("props.dur", "DRAW TIME", 0.05, 3, 0.05, "s"),
      ],
      sample: { t: {}, props: { label: "REEL 08", right: "TIMBERLANE.CO.IN", color: "#f1efec", alpha: 0.4, dur: 0.6 }, anim: { enter: "none", exit: "none" } },
    },
    progress: {
      label: "PROGRESS", hint: "playhead bar with chapter ticks",
      fields: [
        n("props.barH", "BAR", 1, 40, 1), c("props.color", "COLOUR"), F("props.grad", "GRADIENT", "colors"),
        c("props.track", "TRACK COLOUR"), r("props.trackAlpha", "TRACK ALPHA"),
        F("props.marks", "CHAPTERS", "marks"), b("props.head", "HEAD DOT"), c("props.headColor", "HEAD COLOUR"),
        n("props.markW", "TICK WIDTH", 1, 12, 1), c("props.markColor", "TICK COLOUR"), n("props.headR", "HEAD RADIUS", 1, 20, 1),
      ],
      sample: { t: { x: 540, y: 1856, w: 900, h: 26 }, props: { barH: 5, color: "#ff6a1a", track: "#ffffff", trackAlpha: 0.14 } },
    },
  });

  TLM.fieldsFor = function (type) {
    var T = TYPES[type] || { fields: [] };
    return { common: COMMON, own: (T.fields || []).concat() };
  };
  TLM.typeNames = function () { return Object.keys(TYPES); };
  TLM.typeLabel = function (type) { return (TYPES[type] && TYPES[type].label) || type; };
  TLM.sampleLayer = function (type) {
    var T = TYPES[type] || { sample: {} };
    var s = JSON.parse(JSON.stringify(T.sample || {}));
    return {
      id: "new_" + type, name: (T.label || type).toLowerCase(), type: type, in: 0, dur: 4,
      t: Object.assign({ x: 540, y: 960, w: 600, h: 160, rot: 0, scale: 1, opacity: 1 }, s.t || {}),
      props: s.props || {},
      anim: Object.assign({ enter: "fade", exit: "fade", dur: 0.5, ease: "swift" }, s.anim || {}),
    };
  };

  TLM.getPath = function (obj, key) {
    var p = key.split("."), v = obj;
    for (var i = 0; i < p.length; i++) { if (v === undefined || v === null) return undefined; v = v[p[i]]; }
    return v;
  };
  TLM.setPath = function (obj, key, value) {
    var p = key.split("."), v = obj;
    for (var i = 0; i < p.length - 1; i++) {
      if (v[p[i]] === undefined || v[p[i]] === null || typeof v[p[i]] !== "object") v[p[i]] = {};
      v = v[p[i]];
    }
    v[p[p.length - 1]] = value;
  };

  /* ---------- docs: the schema IS the documentation ---------- */
  TLM.schemaMarkdown = function () {
    var L = [];
    L.push("# Scene JSON — field reference", "");
    L.push("A scene is `{ name, fps, meta:{width,height,duration,title}, theme, assets, camera, beats, layers[] }`.");
    L.push("Every layer: `id, name, type, in, dur, hidden, locked, blend, parallax, t{}, anim{}, props{}` —");
    L.push("`t` = where it is, `anim` = how it arrives and leaves, `props` = what it draws.", "");
    L.push("## Shared channels", "", "| field | kind |", "|---|---|");
    COMMON.forEach(function (x) { L.push("| `" + x.key + "` | " + x.kind + (x.min !== undefined ? " " + x.min + "…" + x.max + (x.unit || "") : "") + " |"); });
    L.push("", "## Layer types", "");
    Object.keys(TYPES).forEach(function (k) {
      var T = TYPES[k];
      L.push("### `" + k + "` — " + T.label, "", T.hint, "", "| prop | control |", "|---|---|");
      (T.fields || []).forEach(function (x) {
        L.push("| `" + x.key + "` | " + x.kind + (x.values ? " · " + x.values.join(" / ") : "") + (x.min !== undefined ? " · " + x.min + "…" + x.max + (x.unit || "") : "") + " |");
      });
      L.push("", "```json", JSON.stringify(TLM.sampleLayer(k), null, 2), "```", "");
    });
    L.push("## Easings", "", EASES.join(" · "), "");
    return L.join("\n");
  };
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : this);
