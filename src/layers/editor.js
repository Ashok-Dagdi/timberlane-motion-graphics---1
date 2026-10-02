/* ==================================================================
   editor.js — the Layers studio (vanilla, self-contained)
   ------------------------------------------------------------------
   Everything the reel needs to be *edited*, not just played:
     · a canvas you can drag text and layouts around on (move/resize/
       rotate, snapping, live guides)
     · a layer stack with visibility / lock / order / add / duplicate
     · an inspector generated from engine-schema.js — one definition
       drives the UI, the docs and the sample JSON
     · a timeline with drag-to-move and drag-to-trim blocks, snapped to
       the music's beat grid
     · transport wired to the score, undo/redo, keyboard shortcuts
     · EXPORT (webm + still PNG), DOWNLOAD HTML, EXPORT/IMPORT JSON,
       and a written "how to write the JSON" panel

   It ships as one classic script with its own CSS string, so the
   exported HTML gets the identical editor by pasting this file in.
   ================================================================== */
(function (global) {
  "use strict";
  var TLM = (global.TLM = global.TLM || {});
  var U = TLM.util || TLM;
  var C = TLM.color || {};

  var CSS = `
.tle{--bg:#0b0c0e;--bg2:#13161a;--bg3:#1b1f24;--ln:#262b31;--tx:#e9e6df;--dim:#8b929a;--ac:#ff6a1a;--ac2:#c45a0f;
  position:absolute;inset:0;display:grid;grid-template-rows:auto 1fr auto;background:var(--bg);color:var(--tx);
  font-family:"Archivo",ui-sans-serif,system-ui,sans-serif;font-size:12px;letter-spacing:.02em;overflow:hidden}
.tle *{box-sizing:border-box}
.tle button,.tle input,.tle select,.tle textarea{font:inherit;color:inherit}
.tle-top{display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--bg2);border-bottom:1px solid var(--ln)}
.tle-brand{display:flex;align-items:baseline;gap:8px;font-weight:800;letter-spacing:.14em;font-size:11px;text-transform:uppercase}
.tle-brand b{color:var(--ac)}
.tle-brand span{color:var(--dim);font-weight:600;letter-spacing:.1em}
.tle-t{display:flex;align-items:center;gap:4px;margin-left:6px}
.tle-btn{background:var(--bg3);border:1px solid var(--ln);border-radius:7px;padding:6px 10px;cursor:pointer;white-space:nowrap;
  font-weight:600;letter-spacing:.08em;font-size:10.5px;text-transform:uppercase;transition:background .14s,border-color .14s,color .14s}
.tle-btn:hover{background:#242a30;border-color:#39424a}
.tle-btn.pri{background:var(--ac2);border-color:#d96b1e;color:#fff}
.tle-btn.pri:hover{background:var(--ac)}
.tle-btn.on{background:#2a3138;border-color:var(--ac);color:var(--ac)}
.tle-btn:disabled{opacity:.4;cursor:default}
.tle-tc{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:12px;color:var(--tx);letter-spacing:.06em;min-width:82px;text-align:center}
.tle-tc em{color:var(--dim);font-style:normal;font-size:10px}
.tle-sp{flex:1}
.tle-main{display:grid;grid-template-columns:250px minmax(320px,1fr) 320px;min-height:0}
.tle-side{display:flex;flex-direction:column;min-height:0;background:var(--bg2);border-right:1px solid var(--ln)}
.tle-right{border-right:0;border-left:1px solid var(--ln)}
.tle-h{display:flex;align-items:center;gap:6px;padding:8px 10px;border-bottom:1px solid var(--ln);font-size:10px;
  letter-spacing:.16em;text-transform:uppercase;color:var(--dim);font-weight:700}
.tle-h .tle-sp{flex:1}
.tle-scroll{overflow:auto;min-height:0;flex:1;scrollbar-width:thin}
.tle-tabs{display:flex;gap:2px;padding:6px;border-bottom:1px solid var(--ln);background:var(--bg2)}
.tle-tab{flex:1;text-align:center;padding:6px 4px;border-radius:6px;cursor:pointer;font-size:10px;letter-spacing:.12em;
  text-transform:uppercase;font-weight:700;color:var(--dim);border:1px solid transparent}
.tle-tab.on{color:var(--tx);background:var(--bg3);border-color:var(--ln)}
/* layers list */
.tle-ly{display:flex;align-items:center;gap:6px;padding:5px 8px;border-bottom:1px solid #1d2126;cursor:pointer;position:relative}
.tle-ly:hover{background:#171b20}
.tle-ly.sel{background:#1e242a}
.tle-ly.sel:before{content:"";position:absolute;left:0;top:0;bottom:0;width:2px;background:var(--ac)}
.tle-ly i{width:44px;font-style:normal;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--dim);flex:none;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tle-ly b{font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11.5px}
.tle-ly.sel b{color:#fff}
.tle-ly .g{opacity:.55;display:flex;gap:3px}
.tle-ly .g:hover{opacity:1}
.tle-ic{width:20px;height:20px;border-radius:5px;border:1px solid transparent;background:transparent;cursor:pointer;
  display:grid;place-items:center;padding:0;font-size:11px;line-height:1;color:var(--dim)}
.tle-ic:hover{border-color:var(--ln);background:var(--bg3);color:var(--tx)}
.tle-ic.x{color:#ff6a6a}
.tle-ly.off b,.tle-ly.off i{opacity:.4;text-decoration:line-through}
/* stage */
.tle-stage{position:relative;display:grid;place-items:center;background:
  repeating-conic-gradient(#0e1013 0% 25%,#0b0c0e 0% 50%) 50%/22px 22px;min-height:0;overflow:hidden}
.tle-wrap{position:relative;line-height:0;box-shadow:0 30px 80px -20px #000,0 0 0 1px #2a2f35}
.tle-wrap canvas{display:block;max-width:100%;max-height:100%;touch-action:none;cursor:grab}
.tle-ov{position:absolute;inset:0;pointer-events:none}
.tle-hud{position:absolute;left:10px;bottom:10px;display:flex;gap:8px;align-items:center;background:#0d0f12cc;
  border:1px solid var(--ln);border-radius:8px;padding:5px 9px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--dim)}
.tle-hud b{color:var(--tx);font-weight:600;letter-spacing:.04em;text-transform:none;font-size:11px}
.tle-zoom{position:absolute;right:10px;bottom:10px;display:flex;gap:4px}
/* inspector */
.tle-ins{padding:8px 10px 26px}
.tle-grp{margin:0 0 12px;border:1px solid var(--ln);border-radius:9px;overflow:hidden;background:#101317}
.tle-grp>h4{margin:0;padding:7px 9px;font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--dim);
  background:var(--bg3);border-bottom:1px solid var(--ln);display:flex;gap:6px;align-items:center;cursor:pointer;font-weight:700}
.tle-grp>h4 span{flex:1}
.tle-grp.closed>div{display:none}
.tle-f{display:grid;grid-template-columns:78px 1fr;gap:8px;align-items:center;padding:4px 9px;border-bottom:1px solid #191d21}
.tle-f:last-child{border-bottom:0}
.tle-f>label{font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--dim);cursor:ew-resize;user-select:none}
.tle-f>label:hover{color:var(--ac)}
.tle-f input[type=text],.tle-f input[type=number],.tle-f select,.tle-f textarea,.tle-f input[type=color]{
  background:#0b0e11;border:1px solid var(--ln);border-radius:6px;padding:4px 6px;width:100%;min-width:0;font-size:11.5px;font-family:inherit}
.tle-f textarea{min-height:62px;resize:vertical;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:10.5px;line-height:1.5}
.tle-f input[type=number]:focus,.tle-f input[type=text]:focus,.tle-f textarea:focus{border-color:var(--ac);outline:none}
.tle-f input[type=color]{padding:0;height:22px;width:34px;flex:none;cursor:pointer}
.tle-f input[type=range]{width:100%;accent-color:var(--ac);height:16px}
.tle-row{display:flex;gap:5px;align-items:center}
.tle-chips{display:flex;flex-wrap:wrap;gap:3px}
.tle-chip{border:1px solid var(--ln);background:#0b0e11;border-radius:20px;padding:2px 8px;font-size:9.5px;letter-spacing:.06em;
  cursor:pointer;color:var(--dim);text-transform:uppercase;font-weight:600}
.tle-chip.on{border-color:var(--ac);color:var(--ac);background:#211a14}
.tle-note{padding:8px 10px;color:var(--dim);font-size:11px;line-height:1.55;border-bottom:1px solid var(--ln);background:#0f1215}
.tle-note b{color:var(--tx)}
.tle-note code{font-family:"JetBrains Mono",monospace;font-size:10px;color:var(--ac)}
/* json + docs panes */
.tle-code{display:flex;flex-direction:column;height:100%}
.tle-code pre,.tle-code textarea{flex:1;margin:0;padding:10px 12px;background:#0a0c0e;border:0;color:#cfd6dd;
  font-family:"JetBrains Mono",ui-monospace,monospace;font-size:10.5px;line-height:1.6;overflow:auto;white-space:pre-wrap;word-break:break-word;resize:none}
.tle-code pre.md{white-space:pre-wrap;color:#b9c0c8}
/* timeline */
.tle-tl{background:var(--bg2);border-top:1px solid var(--ln);display:grid;grid-template-rows:18px 1fr;min-height:132px;height:158px}
.tle-rule{position:relative;grid-column:1/-1;border-bottom:1px solid var(--ln);cursor:ew-resize;overflow:hidden}
.tle-tick{position:absolute;top:4px;font-size:8.5px;color:var(--dim);font-family:"JetBrains Mono",monospace;transform:translateX(-50%)}
.tle-beat{position:absolute;top:0;bottom:0;width:1px;background:#20262c}
.tle-beat.bar{background:#2c343b}
.tle-lanes{position:relative;grid-column:1/-1;overflow-y:auto;overflow-x:hidden;scrollbar-width:thin}
.tle-lane{position:relative;height:19px;border-bottom:1px solid #14181c}
.tle-lane:hover{background:#141820}
.tle-lane.sel{background:#1a2026}
.tle-blk{position:absolute;top:3px;height:13px;border-radius:3px;background:#2b333b;border:1px solid #3c4650;cursor:grab;
  display:flex;align-items:center;overflow:hidden}
.tle-blk:hover{border-color:var(--ac)}
.tle-blk.drag{cursor:grabbing;border-color:var(--ac);z-index:3}
.tle-blk span{font-size:8.5px;padding:0 4px;color:#c8cfd6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}
.tle-blk .rz{position:absolute;right:0;top:0;bottom:0;width:7px;cursor:ew-resize;background:linear-gradient(90deg,transparent,#5b6873)}
.tle-blk.k0{background:#3a2a1e;border-color:#6b4a2a}
.tle-blk.k1{background:#243038}
.tle-blk.k2{background:#2c2440}
.tle-blk.k3{background:#1e3630}
.tle-phead{position:absolute;top:0;bottom:0;width:1px;background:var(--ac);z-index:4;pointer-events:none}
.tle-phead:before{content:"";position:absolute;top:-6px;left:-4px;border:4px solid transparent;border-top-color:var(--ac)}
.tle-sel{position:absolute;top:0;bottom:0;background:#ff6a1a1a;border-left:1px solid #ff6a1a55;border-right:1px solid #ff6a1a55;z-index:2;pointer-events:none}
/* overlays */
.tle-tst{position:fixed;right:14px;bottom:14px;z-index:40;background:#0f1215;border:1px solid var(--ac);color:var(--tx);
  border-radius:8px;padding:8px 12px;font-size:11px;box-shadow:0 10px 30px #000a;opacity:0;transition:opacity .2s;pointer-events:none}
.tle-tst.on{opacity:1}
.tle-dlg{position:absolute;inset:0;z-index:30;background:#05070aee;display:grid;place-items:center;padding:20px}
.tle-dlg .box{background:var(--bg2);border:1px solid var(--ln);border-radius:14px;max-width:860px;width:100%;max-height:100%;
  display:flex;flex-direction:column;overflow:hidden;box-shadow:0 40px 100px #000c}
.tle-dlg .box h3{margin:0;padding:14px 18px;border-bottom:1px solid var(--ln);font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--dim)}
.tle-dlg .box .body{padding:14px 18px;overflow:auto;font-size:12px;line-height:1.65;color:#c6ccd3}
.tle-dlg .box .body h4{color:var(--tx);margin:16px 0 6px;font-size:11px;letter-spacing:.14em;text-transform:uppercase}
.tle-dlg .box .body code{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--ac)}
.tle-dlg .box .body pre{background:#0a0c0e;padding:10px;border-radius:8px;overflow:auto;font-family:"JetBrains Mono",monospace;font-size:10.5px;line-height:1.55;color:#cfd6dd}
.tle-dlg .foot{padding:12px 18px;border-top:1px solid var(--ln);display:flex;gap:8px;justify-content:flex-end}
.tle-grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media (max-width:1150px){.tle-main{grid-template-columns:200px minmax(280px,1fr) 260px}}
@media (max-width:860px){.tle-main{grid-template-columns:1fr;grid-template-rows:minmax(0,1fr) minmax(0,220px)}
  .tle-side{border-right:0;border-bottom:1px solid var(--ln)}.tle-tl{height:120px}}
`;

  /* ---------------------------------------------------------------- */
  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt !== undefined) n.textContent = txt;
    return n;
  }
  function btn(cls, label, fn, title) {
    var b = el("button", "tle-btn" + (cls ? " " + cls : ""), label);
    if (title) b.title = title;
    b.addEventListener("click", function (ev) {
      ev.stopPropagation();
      fn(ev);
    });
    return b;
  }
  function fmt(v, d) {
    if (typeof v !== "number") return String(v);
    var m = Math.pow(10, d === undefined ? 2 : d);
    return String(Math.round(v * m) / m);
  }
  var PALETTE = ["#f4f1ea", "#c45a0f", "#ff6a1a", "#373b42", "#9aa0a8", "#0b0c0e", "#c8955f", "#e6e0d6", "#7c4a2e", "#4c525a"];

  /* ================================================================
     mount(root, { scene, onExportHTML, onChange }) → api
     ================================================================ */
  function mount(root, opts) {
    opts = opts || {};
    root.classList.add("tle-host");
    var host = el("div", "tle");
    root.appendChild(host);
    var styleTag = el("style");
    styleTag.textContent = CSS;
    document.head.appendChild(styleTag);

    var api = {
      scene: opts.scene,
      t: 0,
      playing: false,
      loop: true,
      sel: null,
      zoom: 0,
      snap: true,
      guides: true,
      muted: false,
      tab: "layers",
      pane: "inspector",
      undo: [],
      redo: [],
      listeners: [],
    };
    api.onChange = opts.onChange;

    /* ---------------- top bar ---------------- */
    var top = el("div", "tle-top");
    var brand = el("div", "tle-brand");
    brand.appendChild(el("b", null, "LAYERS"));
    brand.appendChild(el("span", null, "· motion studio"));
    top.appendChild(brand);

    var transport = el("div", "tle-t");
    var bPlay = btn("", "▶", togglePlay, "play / pause  (space)");
    var bStop = btn("", "■", function () {
      setTime(0);
      pause();
    });
    var bLoop = btn("on", "↻", function () {
      api.loop = !api.loop;
      bLoop.classList.toggle("on", api.loop);
    });
    var bMute = btn("", "♪", function () {
      if (TLM.music && TLM.music.toggleMute) {
        var m = TLM.music.toggleMute();
        bMute.classList.toggle("on", !m);
        bMute.textContent = m ? "♪̸" : "♪";
      }
    }, "mute the score");
    transport.appendChild(bPlay);
    transport.appendChild(bStop);
    transport.appendChild(bLoop);
    transport.appendChild(bMute);
    var tc = el("div", "tle-tc");
    transport.appendChild(tc);
    top.appendChild(transport);
    top.appendChild(el("div", "tle-sp"));

    var bSnap = btn("", "SNAP", function () {
      api.snap = !api.snap;
      bSnap.classList.toggle("on", api.snap);
    }, "snap to frame edges, centre and the beat grid");
    bSnap.classList.add("on");
    var bGuides = btn("", "GUIDES", function () {
      api.guides = !api.guides;
      bGuides.classList.toggle("on", api.guides);
      draw();
    });
    bGuides.classList.add("on");
    var bUndo = btn("", "↶", function () { doUndo(); }, "undo (⌘Z)");
    var bRedo = btn("", "↷", function () { doRedo(); }, "redo (⇧⌘Z)");
    top.appendChild(bUndo);
    top.appendChild(bRedo);
    top.appendChild(bSnap);
    top.appendChild(bGuides);
    top.appendChild(btn("", "DOCS", function () { openDocs(); }, "how the scene JSON works"));
    top.appendChild(btn("", "JSON", function () { setPane("json"); }, "scene as JSON"));
    top.appendChild(btn("", "NEW", function () { newScene(); }, "blank 9:16 scene"));
    top.appendChild(btn("", "IMPORT", function () { importJSON(); }, "load a scene .json"));
    top.appendChild(btn("", "EXPORT JSON", function () { exportJSON(); }));
    top.appendChild(btn("", "STILL PNG", function () { exportStill(); }));
    var bRec = btn("", "● EXPORT VIDEO", function () { exportVideo(); }, "record the canvas (with the score) to a .webm");
    top.appendChild(bRec);
    top.appendChild(btn("pri", "⬇ HTML", function () { exportHTML(); }, "a single editable .html file"));
    host.appendChild(top);

    /* ---------------- middle ---------------- */
    var main = el("div", "tle-main");
    host.appendChild(main);

    /* layers column */
    var side = el("div", "tle-side");
    var lh = el("div", "tle-h");
    lh.appendChild(el("span", null, "Layer stack"));
    lh.appendChild(el("span", "tle-sp"));
    var nLayers = el("span", null, "");
    nLayers.style.color = "var(--tx)";
    lh.appendChild(nLayers);
    side.appendChild(lh);
    var layerList = el("div", "tle-scroll");
    layerList.style.paddingBottom = "40px";
    side.appendChild(layerList);
    var addRow = el("div", "tle-h");
    addRow.style.borderTop = "1px solid var(--ln)";
    addRow.style.borderBottom = "0";
    var addSel = document.createElement("select");
    addSel.style.cssText = "background:#0b0e11;border:1px solid var(--ln);border-radius:6px;padding:4px 6px;flex:1;font-size:10.5px";
    TLM.typeNames().forEach(function (ty) {
      var o = document.createElement("option");
      o.value = ty;
      o.textContent = (TLM.TYPES[ty].label || ty) + " — " + ty;
      addSel.appendChild(o);
    });
    addRow.appendChild(addSel);
    addRow.appendChild(btn("pri", "+ ADD", function () { addLayer(addSel.value); }));
    side.appendChild(addRow);
    main.appendChild(side);

    /* stage */
    var stage = el("div", "tle-stage");
    var wrap = el("div", "tle-wrap");
    stage.appendChild(wrap);
    var cv = document.createElement("canvas");
    wrap.appendChild(cv);
    var ov = el("canvas", "tle-ov");
    ov.style.pointerEvents = "none";
    wrap.appendChild(ov);
    var hud = el("div", "tle-hud");
    var hudName = el("b", null, "—");
    var hudPos = el("span", null, "");
    hud.appendChild(hudName);
    hud.appendChild(hudPos);
    stage.appendChild(hud);
    var zoomBar = el("div", "tle-zoom");
    var zLabel = el("div", "tle-hud");
    zLabel.style.cssText = "position:static";
    var zTxt = el("span", null, "fit");
    zLabel.appendChild(zTxt);
    zoomBar.appendChild(zLabel);
    zoomBar.appendChild(btn("", "−", function () { setZoom(api.zoom - 0.15); }));
    zoomBar.appendChild(btn("", "+", function () { setZoom(api.zoom + 0.15); }));
    zoomBar.appendChild(btn("", "FIT", function () { setZoom(0); }));
    stage.appendChild(zoomBar);
    main.appendChild(stage);

    /* inspector column */
    var right = el("div", "tle-side tle-right");
    var tabs = el("div", "tle-tabs");
    var tabDefs = [
      ["inspector", "PROPS"],
      ["json", "LAYER JSON"],
      ["scene", "SCENE"],
    ];
    tabDefs.forEach(function (d) {
      var t = el("div", "tle-tab", d[1]);
      t.dataset.k = d[0];
      t.addEventListener("click", function () {
        setPane(d[0]);
      });
      tabs.appendChild(t);
    });
    right.appendChild(tabs);
    var insPane = el("div", "tle-scroll tle-ins");
    var codePane = el("div", "tle-scroll tle-code");
    right.appendChild(insPane);
    right.appendChild(codePane);
    main.appendChild(right);

    /* ---------------- timeline ---------------- */
    var tl = el("div", "tle-tl");
    var rule = el("div", "tle-rule");
    var lanes = el("div", "tle-lanes");
    tl.appendChild(rule);
    tl.appendChild(lanes);
    var phead = el("div", "tle-phead");
    lanes.appendChild(phead);
    var selBox = el("div", "tle-sel");
    lanes.appendChild(selBox);
    host.appendChild(tl);

    var toastEl = el("div", "tle-tst");
    host.appendChild(toastEl);
    function toast(msg) {
      toastEl.textContent = msg;
      toastEl.classList.add("on");
      clearTimeout(toast._t);
      toast._t = setTimeout(function () {
        toastEl.classList.remove("on");
      }, 1900);
    }
    api.toast = toast;

    /* ================= canvas sizing ================= */
    var ctx = cv.getContext("2d");
    var octx = ov.getContext("2d");
    var view = { scale: 1, w: 0, h: 0 };
    function layout() {
      var S = api.scene;
      var W = S.meta.width, H = S.meta.height;
      var box = stage.getBoundingClientRect();
      var availW = Math.max(120, box.width - 28), availH = Math.max(120, box.height - 28);
      var fit = Math.min(availW / W, availH / H);
      var sc = api.zoom === 0 ? fit : fit * Math.max(0.2, Math.min(4, api.zoom));
      var dpr = Math.min(2, global.devicePixelRatio || 1);
      view.scale = sc;
      view.w = Math.round(W * sc);
      view.h = Math.round(H * sc);
      [cv, ov].forEach(function (c2) {
        c2.style.width = view.w + "px";
        c2.style.height = view.h + "px";
        c2.width = Math.round(W * sc * dpr);
        c2.height = Math.round(H * sc * dpr);
      });
      wrap.style.width = view.w + "px";
      wrap.style.height = view.h + "px";
      zTxt.textContent = (sc / fit).toFixed(2) + "×";
      draw();
    }
    function setZoom(z) {
      api.zoom = z;
      layout();
    }

    /* ================= draw ================= */
    var pool = null;
    function ensurePool() {
      if (pool && pool.__scene === api.scene) return pool;
      pool = new TLM.AssetPool(api.scene);
      pool.__scene = api.scene;
      try {
        pool.preload();
      } catch (e) {
        /* no-op: plates just stay as stand-ins */
      }
      return pool;
    }
    function draw() {
      var S = api.scene;
      var dpr = Math.min(2, global.devicePixelRatio || 1);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      TLM.render(ctx, S, api.t, {
        scale: view.scale,
        assets: ensurePool(),
        debug: true,
        only: api.only ? [api.only] : null,
        guides: false,
      });
      drawOverlay();
    }
    function drawOverlay() {
      var S = api.scene;
      octx.setTransform(1, 0, 0, 1, 0, 0);
      octx.clearRect(0, 0, ov.width, ov.height);
      var dpr = Math.min(2, global.devicePixelRatio || 1);
      octx.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, 0, 0);
      var l = selected();
      if (!l) return;
      var box = TLM.layerBox(l, api.t, S);
      if (!box) return;
      var px = 1 / view.scale;
      octx.save();
      octx.lineWidth = px;
      octx.strokeStyle = "rgba(255,106,26,.95)";
      octx.strokeRect(box.x, box.y, box.w, box.h);
      octx.setLineDash([4 * px, 3 * px]);
      octx.strokeStyle = "rgba(255,106,26,.4)";
      octx.beginPath();
      octx.moveTo(box.cx, box.y - 9 * px);
      octx.lineTo(box.cx, box.y + box.h + 9 * px);
      octx.moveTo(box.x - 9 * px, box.cy);
      octx.lineTo(box.x + box.w + 9 * px, box.cy);
      octx.stroke();
      octx.setLineDash([]);
      /* corner handles */
      var hs = 7 * px;
      octx.fillStyle = "#0b0c0e";
      octx.strokeStyle = "rgba(255,106,26,1)";
      [[box.x, box.y], [box.x + box.w, box.y], [box.x + box.w, box.y + box.h], [box.x, box.y + box.h]].forEach(function (p) {
        octx.beginPath();
        octx.rect(p[0] - hs / 2, p[1] - hs / 2, hs, hs);
        octx.fill();
        octx.stroke();
      });
      /* rotate nub */
      octx.beginPath();
      octx.arc(box.cx, box.y - 18 * px, 4.5 * px, 0, 6.2832);
      octx.fill();
      octx.stroke();
      if (snapLines.length) {
        octx.strokeStyle = "rgba(246,241,232,.75)";
        octx.lineWidth = px;
        snapLines.forEach(function (v) {
          octx.beginPath();
          if (v.a === "x") {
            octx.moveTo(v.p, 0);
            octx.lineTo(v.p, S.meta.height);
          } else {
            octx.moveTo(0, v.p);
            octx.lineTo(S.meta.width, v.p);
          }
          octx.stroke();
        });
      }
      octx.restore();
    }
    var snapLines = [];

    function selected() {
      if (!api.sel) return null;
      for (var i = 0; i < api.scene.layers.length; i++) if (api.scene.layers[i].id === api.sel) return api.scene.layers[i];
      return null;
    }
    api.selected = selected;

    /* ================= pointer editing ================= */
    var drag = null;
    function toScene(ev) {
      var r = cv.getBoundingClientRect();
      return { x: (ev.clientX - r.left) / view.scale, y: (ev.clientY - r.top) / view.scale };
    }
    function hit(p) {
      var S = api.scene;
      for (var i = S.layers.length - 1; i >= 0; i--) {
        var l = S.layers[i];
        if (l.hidden || l.locked) continue;
        if (api.t < (l.in || 0) || api.t > TLM.layerOut(l)) continue;
        var b = TLM.layerBox(l, api.t, S);
        if (!b) continue;
        var pad = 6 / view.scale;
        if (p.x >= b.x - pad && p.x <= b.x + b.w + pad && p.y >= b.y - pad && p.y <= b.y + b.h + pad) return { l: l, b: b };
      }
      return null;
    }
    cv.addEventListener("pointerdown", function (ev) {
      var p = toScene(ev);
      var S = api.scene;
      var sel = selected();
      var mode = "move", anchor = sel ? TLM.layerBox(sel, api.t, S) : null;
      if (sel && anchor && !sel.locked) {
        var hs = 9 / view.scale;
        var corners = [[anchor.x, anchor.y], [anchor.x + anchor.w, anchor.y], [anchor.x + anchor.w, anchor.y + anchor.h], [anchor.x, anchor.y + anchor.h]];
        for (var ci = 0; ci < 4; ci++) {
          if (Math.abs(p.x - corners[ci][0]) < hs && Math.abs(p.y - corners[ci][1]) < hs) {
            mode = "size";
            drag = { corner: ci };
            break;
          }
        }
        if (mode !== "size" && Math.hypot(p.x - anchor.cx, p.y - (anchor.y - 18 / view.scale)) < 11 / view.scale) {
          mode = "rot";
        }
      }
      if (mode === "move") {
        var h2 = hit(p);
        if (!h2) {
          api.sel = null;
          syncAll();
          return;
        }
        if (!sel || h2.l.id !== sel.id) {
          api.sel = h2.l.id;
          snapshot();
          syncAll();
          sel = h2.l.id ? selected() : null;
        }
        if (!sel) return;
        anchor = h2.b;
      } else {
        snapshot();
      }
      var st0 = TLM.layerState(sel, api.t, S);
      drag = Object.assign(drag || {}, {
        mode: mode,
        id: sel.id,
        p0: p,
        x0: st0.x,
        y0: st0.y,
        w0: st0.w || anchor.w,
        h0: st0.h || anchor.h,
        rot0: st0.rot || 0,
        ax: st0.ax,
        ay: st0.ay,
      });
      try {
        cv.setPointerCapture(ev.pointerId);
      } catch (e) { /* older browsers */ }
      ev.preventDefault();
    });
    cv.addEventListener("pointermove", function (ev) {
      var p = toScene(ev);
      var S = api.scene;
      if (!drag) {
        var h = hit(p);
        cv.style.cursor = h ? (h.l.locked ? "not-allowed" : "move") : "default";
        if (h) {
          hudName.textContent = h.l.name || h.l.type;
          hudPos.textContent = h.l.type + " · " + Math.round(h.b.w) + "×" + Math.round(h.b.h);
        }
        return;
      }
      var l = selected();
      if (!l) return;
      var dx = p.x - drag.p0.x, dy = p.y - drag.p0.y;
      var W = S.meta.width, H = S.meta.height;
      l.t = l.t || {};
      if (drag.mode === "move") {
        var nx = drag.x0 + dx, ny = drag.y0 + dy;
        if (ev.shiftKey) {
          if (Math.abs(dx) > Math.abs(dy)) ny = drag.y0;
          else nx = drag.x0;
        }
        snapLines = [];
        if (api.snap) {
          var tol = 8 / view.scale;
          var candX = [W / 2, 0, W, 90, W - 90], candY = [H / 2, 0, H, 90, H - 90];
          var bw = drag.w0, bh = drag.h0;
          candX.forEach(function (g) {
            [nx - bw / 2, nx, nx + bw / 2].forEach(function (v, k) {
              if (Math.abs(v - g) < tol) {
                nx += g - v;
                snapLines.push({ a: "x", p: g });
                k === 1 && (nx = nx);
              }
            });
          });
          candY.forEach(function (g) {
            [ny - bh / 2, ny, ny + bh / 2].forEach(function (v) {
              if (Math.abs(v - g) < tol) {
                ny += g - v;
                snapLines.push({ a: "y", p: g });
              }
            });
          });
        }
        l.t.x = Math.round(nx * 10) / 10;
        l.t.y = Math.round(ny * 10) / 10;
      } else if (drag.mode === "size") {
        var c = drag.corner;
        var sgnX = c === 1 || c === 2 ? 1 : -1, sgnY = c === 2 || c === 3 ? 1 : -1;
        var w = Math.max(8, drag.w0 + sgnX * dx * 2), hh = Math.max(8, drag.h0 + sgnY * dy * 2);
        if (ev.shiftKey) hh = Math.max(8, Math.round(w * (drag.h0 / drag.w0)));
        l.t.w = Math.round(w);
        l.t.h = Math.round(hh);
      } else if (drag.mode === "rot") {
        var b = TLM.layerBox(l, api.t, S);
        var a = Math.atan2(p.y - b.cy, p.x - b.cx) * 57.29578 + 90;
        if (ev.shiftKey) a = Math.round(a / 15) * 15;
        l.t.rot = Math.round(((a + 540) % 360) - 180) / 10;
      }
      hudName.textContent = l.name || l.type;
      hudPos.textContent = "x " + Math.round(l.t.x) + "  y " + Math.round(l.t.y) + "  " + Math.round(l.t.w || 0) + "×" + Math.round(l.t.h || 0) + (l.t.rot ? "  " + l.t.rot + "°" : "");
      draw();
    });
    function endDrag() {
      if (!drag) return;
      drag = null;
      snapLines = [];
      renderLayers();
      buildInspector();
      if (api.pane !== "inspector") buildCode();
      draw();
      dirty();
    }
    cv.addEventListener("pointerup", endDrag);
    cv.addEventListener("pointercancel", endDrag);
    window.addEventListener("blur", endDrag);

    /* ================= layers list ================= */
    function renderLayers() {
      var S = api.scene;
      layerList.textContent = "";
      nLayers.textContent = S.layers.length + " LAYERS";
      for (var i = S.layers.length - 1; i >= 0; i--) {
        (function (l, idx) {
          var row = el("div", "tle-ly" + (l.id === api.sel ? " sel" : "") + (l.hidden ? " off" : ""));
          var g = el("div", "g");
          var eye = el("button", "tle-ic", l.hidden ? "◌" : "●");
          eye.title = "show / hide";
          eye.addEventListener("click", function (e) {
            e.stopPropagation();
            snapshot();
            l.hidden = !l.hidden;
            syncAll();
          });
          var lock = el("button", "tle-ic", l.locked ? "🔒" : "🔓");
          lock.title = "lock";
          lock.addEventListener("click", function (e) {
            e.stopPropagation();
            l.locked = !l.locked;
            syncAll();
          });
          var up = el("button", "tle-ic", "▲");
          up.title = "bring forward";
          up.addEventListener("click", function (e) {
            e.stopPropagation();
            move(idx, 1);
          });
          var dn = el("button", "tle-ic", "▼");
          dn.title = "send back";
          dn.addEventListener("click", function (e) {
            e.stopPropagation();
            move(idx, -1);
          });
          var dup = el("button", "tle-ic", "⧉");
          dup.title = "duplicate";
          dup.addEventListener("click", function (e) {
            e.stopPropagation();
            dup_(idx);
          });
          var del = el("button", "tle-ic x", "✕");
          del.title = "delete";
          del.addEventListener("click", function (e) {
            e.stopPropagation();
            del_(idx);
          });
          g.appendChild(eye);
          g.appendChild(lock);
          g.appendChild(up);
          g.appendChild(dn);
          g.appendChild(dup);
          g.appendChild(del);
          row.appendChild(el("i", null, l.type));
          var nm = el("b", null, l.name || l.id);
          row.appendChild(nm);
          row.appendChild(g);
          row.addEventListener("click", function () {
            api.sel = l.id;
            setPane(api.pane === "json" ? "json" : "inspector");
            syncAll();
          });
          nm.addEventListener("dblclick", function () {
            var v = prompt("Rename layer", l.name || l.id);
            if (v !== null) {
              snapshot();
              l.name = v;
              syncAll();
            }
          });
          row.addEventListener("dblclick", function () {
            setTime(l.in + 0.01);
          });
          layerList.appendChild(row);
        })(S.layers[i], i);
      }
      renderTimeline();
    }
    function move(i, dir) {
      var a = api.scene.layers;
      var j = i + dir;
      if (j < 0 || j >= a.length) return;
      snapshot();
      var tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
      syncAll();
    }
    function dup_(i) {
      snapshot();
      var c = JSON.parse(JSON.stringify(api.scene.layers[i]));
      c.id = c.id + "_" + TLM.uid();
      c.name = (c.name || c.type) + " copy";
      c.in = Math.round(((c.in || 0) + 0.5) * 100) / 100;
      if (c.t) c.t.y = (c.t.y || 0) + 30;
      api.scene.layers.splice(i + 1, 0, c);
      api.sel = c.id;
      syncAll();
      toast("duplicated");
    }
    function del_(i) {
      snapshot();
      var l = api.scene.layers[i];
      api.scene.layers.splice(i, 1);
      if (api.sel === l.id) api.sel = null;
      syncAll();
      toast("deleted “" + (l.name || l.type) + "” — ⌘Z to undo");
    }
    function addLayer(type) {
      snapshot();
      var l = TLM.sampleLayer(type);
      l.id = type + "_" + TLM.uid();
      l.name = (TLM.typeLabel(type) || type).toLowerCase();
      l.in = Math.round(api.t * 100) / 100;
      l.dur = 4;
      if (l.t) {
        l.t.x = api.scene.meta.width / 2;
        l.t.y = api.scene.meta.height / 2;
      }
      api.scene.layers.push(l);
      api.sel = l.id;
      setPane("inspector");
      syncAll();
      toast("added " + (TLM.typeLabel(type) || type));
    }
    api.addLayer = addLayer;

    /* ================= timeline ================= */
    function tlScale() {
      var w = lanes.clientWidth || 600;
      return w / api.scene.meta.duration;
    }
    function renderTimeline() {
      var S = api.scene, sc = tlScale(), dur = S.meta.duration;
      rule.textContent = "";
      var step = dur > 20 ? 2 : 1;
      for (var t = 0; t <= dur; t += step) {
        var tk = el("div", "tle-tick", t + "s");
        tk.style.left = t * sc + "px";
        rule.appendChild(tk);
      }
      var bpm = (S.music && S.music.bpm) || (TLM.MUSIC && TLM.MUSIC.bpm) || 120;
      var beat = 60 / bpm;
      for (var bt = 0; bt <= dur; bt += beat) {
        var isBar = Math.abs(bt / (beat * 4) - Math.round(bt / (beat * 4))) < 0.001;
        var ln = el("div", "tle-beat" + (isBar ? " bar" : ""));
        ln.style.left = bt * sc + "px";
        rule.appendChild(ln);
      }
      lanes.textContent = "";
      lanes.appendChild(phead);
      lanes.appendChild(selBox);
      S.layers.forEach(function (l, i) {
        var lane = el("div", "tle-lane" + (l.id === api.sel ? " sel" : ""));
        lane.dataset.i = i;
        var out = TLM.layerOut(l);
        var blk = el("div", "tle-blk k" + (["bg", "grain", "vignette", "frame", "grid", "particles", "sweep"].indexOf(l.type) >= 0 ? 0 : l.type === "text" || l.type === "counter" || l.type === "ticker" ? 1 : l.type === "photo" || l.type === "video" || l.type === "strip" ? 2 : 3));
        blk.style.left = (l.in || 0) * sc + "px";
        blk.style.width = Math.max(6, ((l.dur === undefined ? 4 : l.dur) || 1) * sc) + "px";
        blk.appendChild(el("span", null, (l.name || l.id) + "  " + fmt(l.in, 2) + "→" + fmt(out, 2)));
        if (l.hidden) blk.style.opacity = 0.35;
        blk.addEventListener("pointerdown", function (ev) {
          api.sel = l.id;
          renderLayers();
          buildInspector();
          var p0x = ev.clientX;
          var i0 = l.in || 0;
          var d0 = l.dur === undefined ? 4 : l.dur;
          var trim = ev.offsetX > blk.clientWidth - 9;
          snapshot();
          blk.classList.add("drag");
          try { blk.setPointerCapture(ev.pointerId); } catch (e) { /* no pointer capture: still draggable */ }
          function mv(e2) {
            var dt = (e2.clientX - p0x) / sc;
            if (trim) l.dur = Math.max(0.04, Math.round((d0 + dt) * 100) / 100);
            else {
              var nt = i0 + dt;
              if (api.snap) {
                var b2 = Math.round(nt / (beat / 2)) * (beat / 2);
                if (Math.abs(nt - b2) < 0.09) nt = b2;
              }
              l.in = Math.max(0, Math.round(nt * 100) / 100);
            }
            blk.style.left = (l.in || 0) * sc + "px";
            blk.style.width = Math.max(6, (l.dur || 1) * sc) + "px";
            draw();
            buildInspector();
          }
          function up2() {
            blk.removeEventListener("pointermove", mv);
            blk.removeEventListener("pointerup", up2);
            blk.classList.remove("drag");
            renderLayers();
          }
          blk.addEventListener("pointermove", mv);
          blk.addEventListener("pointerup", up2);
          ev.preventDefault();
        });
        blk.addEventListener("dblclick", function () {
          setTime(l.in + 0.02);
        });
        lane.appendChild(blk);
        lanes.appendChild(lane);
      });
      phead.style.height = S.layers.length * 20 + "px";
      selBox.style.height = S.layers.length * 20 + "px";
      posHead();
    }
    function posHead() {
      var sc = tlScale();
      phead.style.left = api.t * sc + "px";
      var l = selected();
      if (l) {
        selBox.style.left = (l.in || 0) * sc + "px";
        selBox.style.width = Math.max(4, (l.dur === undefined ? 4 : l.dur) * sc) + "px";
        selBox.style.display = "block";
      } else selBox.style.display = "none";
    }
    rule.addEventListener("pointerdown", scrub);
    lanes.addEventListener("pointerdown", function (ev) {
      if (ev.target === lanes) scrub(ev);
    });
    function scrub(ev) {
      var sc = tlScale();
      var r = lanes.getBoundingClientRect();
      function mv(e2) {
        setTime(Math.max(0, Math.min(api.scene.meta.duration, (e2.clientX - r.left) / sc)));
      }
      mv(ev);
      try {
        rule.setPointerCapture(ev.pointerId);
      } catch (e) { /* noop */ }
      function up2() {
        rule.removeEventListener("pointermove", mv);
        rule.removeEventListener("pointerup", up2);
      }
      rule.addEventListener("pointermove", mv);
      rule.addEventListener("pointerup", up2);
    }

    /* ================= inspector ================= */
    function field(fdef, get, set) {
      var row = el("div", "tle-f");
      var lab = el("label", null, fdef.label);
      row.appendChild(lab);
      var val = get();
      var kind = fdef.kind;
      var box = el("div", "tle-row");
      box.style.minWidth = "0";
      box.style.flex = "1";
      row.appendChild(box);
      function num(v) {
        return isNaN(v) ? 0 : v;
      }
      if (kind === "number" || kind === "range") {
        var inp = document.createElement("input");
        inp.type = "text";
        inp.value = val === undefined || val === null ? (fdef.min || 0) : fmt(val, 4);
        inp.addEventListener("change", function () {
          set(num(parseFloat(inp.value)));
          commit();
        });
        var rg = document.createElement("input");
        rg.type = "range";
        rg.min = fdef.min === undefined ? -2000 : fdef.min;
        rg.max = fdef.max === undefined ? 2000 : fdef.max;
        rg.step = fdef.step || 0.01;
        rg.value = val === undefined ? 0 : val;
        rg.addEventListener("input", function () {
          set(num(parseFloat(rg.value)));
          inp.value = fmt(num(parseFloat(rg.value)), 3);
          draw();
        });
        rg.addEventListener("change", commit);
        if (kind === "range" || Math.abs((fdef.max || 0) - (fdef.min || 0)) < 40) box.appendChild(rg);
        box.appendChild(inp);
        lab.addEventListener("pointerdown", function (ev) {
          /* drag the label to scrub the number, like AE */
          var x0 = ev.clientX, v0 = num(parseFloat(inp.value)) || 0;
          var step = fdef.step || 1;
          function mv(e2) {
            var nv = Math.round((v0 + (e2.clientX - x0) * step * (e2.shiftKey ? 0.1 : 1)) / step) * step;
            inp.value = fmt(nv, 4);
            if (rg) rg.value = nv;
            set(nv);
            draw();
          }
          function up2() {
            window.removeEventListener("pointermove", mv);
            window.removeEventListener("pointerup", up2);
            commit();
          }
          window.addEventListener("pointermove", mv);
          window.addEventListener("pointerup", up2);
          ev.preventDefault();
        });
      } else if (kind === "color") {
        var sw = document.createElement("input");
        sw.type = "color";
        sw.value = /^#[0-9a-f]{6}$/i.test(String(val || "")) ? val : "#c45a0f";
        var tx = document.createElement("input");
        tx.type = "text";
        tx.value = val === undefined ? "" : String(val);
        sw.addEventListener("input", function () {
          tx.value = sw.value;
          set(sw.value);
          draw();
        });
        sw.addEventListener("change", commit);
        tx.addEventListener("change", function () {
          set(tx.value);
          if (/^#[0-9a-f]{6}$/i.test(tx.value)) sw.value = tx.value;
          commit();
        });
        box.appendChild(sw);
        box.appendChild(tx);
      } else if (kind === "bool") {
        var chip = el("div", "tle-chip" + (val ? " on" : ""), val ? "YES" : "NO");
        chip.addEventListener("click", function () {
          set(!val);
          commit();
          buildInspector();
          draw();
        });
        box.appendChild(chip);
      } else if (kind === "enum") {
        var wrapc = el("div", "tle-chips");
        (fdef.values || []).forEach(function (v) {
          var chip = el("div", "tle-chip" + (val === v ? " on" : ""), v);
          chip.addEventListener("click", function () {
            set(v);
            commit();
            buildInspector();
            draw();
          });
          wrapc.appendChild(chip);
        });
        box.appendChild(wrapc);
      } else if (kind === "area" || kind === "json" || kind === "items" || kind === "colors" || kind === "vec4" || kind === "pools" || kind === "marks" || kind === "kb" || kind === "shadow") {
        var ta = document.createElement("textarea");
        ta.value = typeof val === "string" ? val : JSON.stringify(val === undefined ? (kind === "items" || kind === "colors" || kind === "pools" || kind === "marks" ? [] : {}) : val, null, kind === "vec4" ? 0 : 1);
        if (kind === "vec4") ta.style.minHeight = "26px";
        ta.addEventListener("change", function () {
          if (typeof val === "string") set(ta.value);
          else {
            try {
              set(JSON.parse(ta.value));
            } catch (e) {
              toast("that block isn’t valid JSON — left unchanged");
              return;
            }
          }
          commit();
          draw();
          renderLayers();
        });
        box.appendChild(ta);
      } else if (kind === "asset") {
        var sel = document.createElement("select");
        var ids = Object.keys(api.scene.assets || {});
        var o0 = document.createElement("option");
        o0.value = "";
        o0.textContent = "— none —";
        sel.appendChild(o0);
        ids.forEach(function (id) {
          var o = document.createElement("option");
          o.value = id;
          o.textContent = id;
          if (id === val) o.selected = true;
          sel.appendChild(o);
        });
        sel.addEventListener("change", function () {
          set(sel.value);
          commit();
          draw();
        });
        box.appendChild(sel);
        var pal = btn("", "PLATE…", function () {
          var inp2 = document.createElement("input");
          inp2.type = "file";
          inp2.accept = "image/*,video/*";
          inp2.onchange = function () {
            var f = inp2.files && inp2.files[0];
            if (!f) return;
            var fr = new FileReader();
            fr.onload = function () {
              var aid = "up_" + TLM.uid();
              api.scene.assets = api.scene.assets || {};
              api.scene.assets[aid] = fr.result;
              set(aid);
              pool = null;
              commit();
              draw();
              buildInspector();
              toast("image inlined as " + aid);
            };
            fr.readAsDataURL(f);
          };
          inp2.click();
        }, "upload your own plate (stored inline in the scene)");
        pal.style.padding = "3px 7px";
        box.appendChild(pal);
      } else {
        var t2 = document.createElement("input");
        t2.type = "text";
        t2.value = val === undefined ? "" : String(val);
        t2.addEventListener("change", function () {
          set(t2.value);
          commit();
          draw();
          renderLayers();
        });
        box.appendChild(t2);
      }
      return row;
    }
    function commit() {
      renderLayers();
      if (api.pane === "json" || api.pane === "scene") buildCode();
      dirty();
    }
    function buildInspector() {
      insPane.textContent = "";
      var l = selected();
      if (!l) {
        var note = el("div", "tle-note");
        note.innerHTML =
          "<b>Nothing selected.</b><br>Click a layer on the canvas, in the stack, or in the timeline. " +
          "Drag to move · corner handles resize · the dot above rotates · ⇧ constrains. " +
          "The <b>JSON</b> tab shows the whole scene, and <b>DOCS</b> explains every field.";
        insPane.appendChild(note);
        codePane.textContent = "";
        return;
      }
      var head = el("div", "", "");
      head.style.cssText = "display:flex;gap:8px;align-items:center;margin-bottom:8px";
      head.appendChild(el("span", "tle-chip on", l.type));
      head.appendChild(el("span", null, "id: " + l.id));
      head.style.color = "var(--dim)";
      head.style.fontSize = "10px";
      insPane.appendChild(head);
      var acts = el("div", "tle-row");
      acts.style.marginBottom = "10px";
      [
        ["ISOLATE", function () { api.only = api.only ? null : l.id; draw(); toast(api.only ? "solo layer" : "all layers"); }],
        ["+2s", function () { snapshot(); l.dur = ((l.dur === undefined ? 4 : l.dur) + 2).toFixed(2) * 1; commit(); }],
        ["FIT W", function () { snapshot(); l.t.w = api.scene.meta.width; l.t.x = api.scene.meta.width / 2; commit(); }],
        ["DUP", function () { dup_(api.scene.layers.indexOf(l)); }],
        ["DEL", function () { del_(api.scene.layers.indexOf(l)); }],
      ].forEach(function (a) {
        var b2 = btn("", a[0], a[1]);
        b2.style.padding = "4px 7px";
        b2.style.fontSize = "9.5px";
        acts.appendChild(b2);
      });
      insPane.appendChild(acts);

      var F = TLM.fieldsFor(l.type);
      var groups = {};
      function push(g, node) {
        (groups[g] = groups[g] || []).push(node);
      }
      F.common.forEach(function (fd) {
        push(fd.group || "Layout", field(fd, function () { return TLM.getPath(l, fd.key); }, function (v) { TLM.setPath(l, fd.key, v); }));
      });
      F.own.forEach(function (fd) {
        push("Props", field(fd, function () { return TLM.getPath(l, fd.key); }, function (v) { TLM.setPath(l, fd.key, v); }));
      });
      ["Props", "Timing", "Layout", "Motion"].forEach(function (gname) {
        if (!groups[gname]) return;
        var grp = el("div", "tle-grp");
        var h4 = el("h4");
        h4.appendChild(el("span", null, gname));
        h4.appendChild(el("span", null, groups[gname].length + ""));
        h4.firstChild.style.color = "var(--tx)";
        h4.addEventListener("click", function () {
          grp.classList.toggle("closed");
        });
        var body = el("div");
        groups[gname].forEach(function (n2) {
          body.appendChild(n2);
        });
        grp.appendChild(h4);
        grp.appendChild(body);
        insPane.appendChild(grp);
      });
    }

    /* json / scene panes */
    var ta = document.createElement("textarea");
    ta.spellcheck = false;
    function buildCode() {
      codePane.textContent = "";
      var bar = el("div", "tle-h");
      bar.appendChild(el("span", null, api.pane === "json" ? "selected layer" : "full scene"));
      bar.appendChild(el("span", "tle-sp"));
      bar.appendChild(btn("", "APPLY", applyCode));
      bar.appendChild(btn("", "FORMAT", function () {
        try {
          ta.value = JSON.stringify(JSON.parse(ta.value), null, 2);
          toast("formatted");
        } catch (e) {
          toast("invalid JSON: " + e.message);
        }
      }));
      bar.appendChild(btn("", "COPY", function () {
        navigator.clipboard && navigator.clipboard.writeText(ta.value);
        toast("copied");
      }));
      codePane.appendChild(bar);
      ta.value = JSON.stringify(api.pane === "json" ? selected() || {} : api.scene, null, 2);
      codePane.appendChild(ta);
    }
    function applyCode() {
      try {
        var v = JSON.parse(ta.value);
        snapshot();
        if (api.pane === "json") {
          var l = selected();
          var i = api.scene.layers.indexOf(l);
          v.id = l.id;
          api.scene.layers[i] = v;
        } else {
          api.scene = TLM.normalize(v);
          pool = null;
        }
        syncAll();
        toast("applied ✓");
      } catch (e) {
        toast("JSON error: " + e.message);
      }
    }
    function setPane(k) {
      api.pane = k;
      tabs.querySelectorAll(".tle-tab").forEach(function (t2) {
        t2.classList.toggle("on", t2.dataset.k === k);
      });
      if (k === "inspector") {
        insPane.style.display = "";
        codePane.style.display = "none";
        buildInspector();
      } else {
        insPane.style.display = "none";
        codePane.style.display = "";
        buildCode();
      }
    }

    /* ================= transport ================= */
    function setTime(t2, resync) {
      api.t = Math.max(0, Math.min(api.scene.meta.duration, t2));
      if (TLM.music && resync !== false) {
        try {
          TLM.music.resync(api.t, 1);
        } catch (e) { /* audio not unlocked yet */ }
      }
      tc.innerHTML = TLM.fmtTC(api.t, api.scene.meta.fps) + " <em>/ " + TLM.fmtTC(api.scene.meta.duration, api.scene.meta.fps) + "</em>";
      posHead();
      draw();
    }
    api.setTime = setTime;
    function togglePlay() {
      if (api.playing) pause();
      else play();
    }
    function play() {
      api.playing = true;
      bPlay.textContent = "❚❚";
      bPlay.classList.add("on");
      if (TLM.music && TLM.music.play) {
        try {
          TLM.music.resync(api.t, 1);
          TLM.music.play();
        } catch (e) { /* silent */ }
      }
      last = performance.now();
      requestAnimationFrame(step);
    }
    function pause() {
      api.playing = false;
      bPlay.textContent = "▶";
      bPlay.classList.remove("on");
      if (TLM.music && TLM.music.pause) {
        try {
          TLM.music.pause();
        } catch (e) { /* silent */ }
      }
    }
    var last = 0;
    function step(now) {
      if (!api.playing) return;
      var fps = api.scene.meta.fps || 30;
      var dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      var t2 = api.t + dt;
      if (t2 >= api.scene.meta.duration) {
        if (api.loop) {
          t2 = 0;
          if (TLM.music && TLM.music.resync) {
            try {
              TLM.music.resync(0, 1);
            } catch (e) { /* silent */ }
          }
        } else {
          t2 = api.scene.meta.duration;
          pause();
        }
      }
      setTime(t2, false);
      if (api.playing) requestAnimationFrame(step);
    }
    /* scrub while the score is running should re-align it */
    cv.addEventListener("wheel", function (ev) {
      if (!ev.shiftKey) return;
      ev.preventDefault();
      setTime(api.t + (ev.deltaY > 0 ? 1 : -1) / (api.scene.meta.fps || 30), true);
    }, { passive: false });

    /* ================= undo ================= */
    function snapshot() {
      api.undo.push(JSON.stringify(api.scene));
      if (api.undo.length > 60) api.undo.shift();
      api.redo.length = 0;
    }
    function doUndo() {
      if (!api.undo.length) return toast("nothing to undo");
      api.redo.push(JSON.stringify(api.scene));
      api.scene = JSON.parse(api.undo.pop());
      pool = null;
      syncAll();
      toast("undo");
    }
    function doRedo() {
      if (!api.redo.length) return toast("nothing to redo");
      api.undo.push(JSON.stringify(api.scene));
      api.scene = JSON.parse(api.redo.pop());
      pool = null;
      syncAll();
      toast("redo");
    }
    function dirty() {
      if (api.onChange) api.onChange(api.scene);
    }
    function syncAll() {
      renderLayers();
      buildInspector();
      if (api.pane !== "inspector") buildCode();
      draw();
      posHead();
      dirty();
    }
    api.syncAll = syncAll;

    /* ================= keyboard ================= */
    function keyHandler(ev) {
      var tag = (ev.target && ev.target.tagName) || "";
      if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
      var l = selected();
      var S = api.scene;
      var meta = ev.metaKey || ev.ctrlKey;
      if (ev.code === "Space") {
        ev.preventDefault();
        togglePlay();
        return;
      }
      if (meta && ev.key.toLowerCase() === "z") {
        ev.preventDefault();
        ev.shiftKey ? doRedo() : doUndo();
        return;
      }
      if (meta && ev.key.toLowerCase() === "d" && l) {
        ev.preventDefault();
        dup_(S.layers.indexOf(l));
        return;
      }
      if ((ev.key === "Delete" || ev.key === "Backspace") && l) {
        ev.preventDefault();
        del_(S.layers.indexOf(l));
        return;
      }
      if (l && ev.key.indexOf("Arrow") === 0) {
        ev.preventDefault();
        snapshot();
        var d = ev.shiftKey ? 10 : ev.altKey ? 0.5 : 1;
        l.t = l.t || {};
        if (meta) {
          /* resize with ⌘+arrows */
          if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") l.t.w = (l.t.w || 100) + (ev.key === "ArrowRight" ? d : -d);
          else l.t.h = (l.t.h || 100) + (ev.key === "ArrowDown" ? d : -d);
        } else {
          if (ev.key === "ArrowRight") l.t.x = (l.t.x || 0) + d;
          if (ev.key === "ArrowLeft") l.t.x = (l.t.x || 0) - d;
          if (ev.key === "ArrowDown") l.t.y = (l.t.y || 0) + d;
          if (ev.key === "ArrowUp") l.t.y = (l.t.y || 0) - d;
        }
        draw();
        buildInspector();
        return;
      }
      if (ev.key === "j") setTime(api.t - 1 / (S.meta.fps || 30) * (ev.shiftKey ? 10 : 1), true);
      if (ev.key === "k") togglePlay();
      if (ev.key === "l") setTime(api.t + 1 / (S.meta.fps || 30) * (ev.shiftKey ? 10 : 1), true);
      if (ev.key === "g") {
        api.guides = !api.guides;
        bGuides.classList.toggle("on", api.guides);
        draw();
      }
      if (ev.key === "Home") setTime(0, true);
      if (ev.key === "End") setTime(S.meta.duration, true);
    }
    host.setAttribute("tabindex", "-1");
    document.addEventListener("keydown", keyHandler);

    /* ================= export / import ================= */
    function exportJSON() {
      var blob = new Blob([JSON.stringify(api.scene, null, 2)], { type: "application/json" });
      dl(blob, (api.scene.name || "scene") + ".json");
      toast("scene JSON downloaded");
    }
    api.exportJSON = exportJSON;
    function dl(blob, name) {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        URL.revokeObjectURL(a.href);
        a.remove();
      }, 800);
    }
    function exportStill() {
      var W = api.scene.meta.width, H = api.scene.meta.height;
      var c2 = document.createElement("canvas");
      c2.width = W;
      c2.height = H;
      TLM.render(c2.getContext("2d"), api.scene, api.t, { assets: ensurePool() });
      c2.toBlob(function (b) {
        dl(b, (api.scene.name || "frame") + "-t" + api.t.toFixed(2) + ".png");
        toast("still frame exported");
      }, "image/png");
    }
    var rec = null;
    function exportVideo() {
      if (rec) {
        rec.stop();
        return;
      }
      if (!cv.captureStream) return toast("this browser can’t record a canvas");
      var fps = api.scene.meta.fps || 30;
      var stream = cv.captureStream(fps);
      try {
        if (TLM.music && TLM.music.ctx && TLM.music.ctx.createMediaStreamDestination) {
          var md = TLM.music.ctx.createMediaStreamDestination();
          TLM.music.master.connect(md);
          md.stream.getAudioTracks().forEach(function (tr2) {
            stream.addTrack(tr2);
          });
        }
      } catch (e) {
        /* no audio track — silent video is still a video */
      }
      var types = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
      var mime = types.filter(function (m2) {
        return MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m2);
      })[0];
      rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12e6 });
      var chunks = [];
      rec.ondataavailable = function (ev) {
        if (ev.data && ev.data.size) chunks.push(ev.data);
      };
      rec.onstop = function () {
        var blob = new Blob(chunks, { type: mime || "video/webm" });
        dl(blob, (api.scene.name || "reel") + ".webm");
        rec = null;
        bRec.classList.remove("pri");
        bRec.textContent = "● EXPORT VIDEO";
        pause();
        toast("webm saved — " + (blob.size / 1048576).toFixed(1) + " MB");
      };
      setTime(0, true);
      play();
      rec.start(400);
      bRec.textContent = "■ STOP RECORDING";
      bRec.classList.add("pri");
      toast("recording " + api.scene.meta.duration + "s in real time — press again to stop early");
      var iv = setInterval(function () {
        if (!rec) {
          clearInterval(iv);
          return;
        }
        if (api.t >= api.scene.meta.duration - 0.02) {
          rec.stop();
          clearInterval(iv);
        }
      }, 250);
    }
    function exportHTML() {
      if (opts.onExportHTML) {
        toast("building the standalone file…");
        Promise.resolve(opts.onExportHTML(api.scene)).then(function (r) {
          if (r && r.blob) dl(r.blob, r.name || "timberlane-layers.html");
          toast("HTML downloaded — open it, press E to edit");
        });
        return;
      }
      /* inside the exported file itself: re-serialise with the live scene */
      var doc = document.documentElement.cloneNode(true);
      var sc = doc.querySelector("#tl-scene");
      if (sc) sc.textContent = JSON.stringify(api.scene);
      dl(new Blob(["<!doctype html>" + doc.outerHTML], { type: "text/html" }), (api.scene.name || "scene") + "-edited.html");
      toast("HTML downloaded");
    }
    api.exportHTML = exportHTML;
    function importJSON() {
      var inp = document.createElement("input");
      inp.type = "file";
      inp.accept = ".json,application/json";
      inp.onchange = function () {
        var f = inp.files && inp.files[0];
        if (!f) return;
        var fr = new FileReader();
        fr.onload = function () {
          loadJSON(fr.result);
        };
        fr.readAsText(f);
      };
      inp.click();
    }
    function loadJSON(text) {
      try {
        var v = JSON.parse(text);
        snapshot();
        api.scene = TLM.normalize(v);
        api.sel = null;
        pool = null;
        setTime(0, false);
        syncAll();
        toast("scene imported — " + api.scene.layers.length + " layers");
      } catch (e) {
        toast("import failed: " + e.message);
      }
    }
    api.loadJSON = loadJSON;
    function newScene() {
      var S = {
        name: "untitled-30s",
        fps: 30,
        meta: { width: 1080, height: 1920, duration: 30, base: "#0b0c0e", title: "untitled" },
        theme: { fonts: { display: "Anton", grotesk: "Archivo", mono: "JetBrains Mono", serif: "Playfair Display" } },
        music: { bpm: 120, key: "A minor", title: "Warm Concrete", bar: 2 },
        assets: {},
        camera: {},
        layers: [],
      };
      ["bg", "grain", "vignette", "text", "shape"].forEach(function (ty) {
        var l = TLM.sampleLayer(ty);
        l.id = ty + "_" + TLM.uid();
        S.layers.push(l);
      });
      snapshot();
      api.scene = TLM.normalize(S);
      api.sel = null;
      pool = null;
      syncAll();
      toast("blank scene — start adding layers");
    }

    /* ================= docs dialog ================= */
    function openDocs() {
      var dlg = el("div", "tle-dlg");
      var box = el("div", "box");
      box.appendChild(el("h3", null, "Scene JSON — how to write one"));
      var body = el("div", "body");
      body.innerHTML =
        "<p>A scene is <b>plain JSON</b> — no functions, no comments. Everything you see in the reel comes from this one object, " +
        "so the file you import is the file you export, and the file you export is the file the standalone HTML plays.</p>" +
        "<h4>The shape</h4><pre>" +
        JSON.stringify(
          {
            name: "my-spot-30s",
            fps: 30,
            meta: { width: 1080, height: 1920, duration: 30, base: "#0b0c0e" },
            theme: { fonts: { display: "Anton", grotesk: "Archivo", mono: "JetBrains Mono", serif: "Playfair Display" } },
            music: { bpm: 120, key: "A minor", title: "Warm Concrete" },
            assets: { hero: "https://…/photo.jpg" },
            camera: { keys: [{ t: 0, x: 0, y: 0, zoom: 1.04, ease: "swift" }], drift: 5, beat: { amount: 0.008, every: 1 } },
            beats: [0, 4, 8],
            layers: [{ id: "t1", name: "headline", type: "text", in: 2.4, dur: 4, t: { x: 540, y: 900, w: 880, h: 300 }, anim: { enter: "up", exit: "fade", dur: 0.6, ease: "expoOut", stagger: 0.06 }, props: { text: "YOUR HOME,\\n**REIMAGINED.**", size: 150 } }],
          },
          null,
          2,
        )
          .replace(/</g, "&lt;") +
        "</pre>" +
        "<h4>Rules of thumb</h4>" +
        "<div style='display:grid;gap:7px;margin-top:6px'>" +
        "<div><b>1 · layers paint in array order</b> — index 0 is the back plate, the last item is the top overlay. " +
        "The editor's stack shows them flipped (top of the list = front), the JSON keeps the paint order.</div>" +
        "<div><b>2 · a layer exists between <code>in</code> and <code>in + dur</code> (seconds).</code></b> Outside that it is not drawn at all.</div>" +
        "<div><b>3 · <code>t</code> is placement, <code>anim</code> is behaviour, <code>props</code> is content.</code></b> " +
        "Anything you add that the engine doesn't know is ignored, so scenes stay forward-compatible.</div>" +
        "<div><b>4 · <code>t.x/t.y</code> is the centre of the box</b> (unless you set <code>t.anchorX/Y</code>), in canvas pixels — " +
        "design against <code>meta.width/height</code> and the renderer scales it to anything.</div>" +
        "<div><b>5 · text is markup-aware:</b> <code>\\n</code> breaks a line, <code>**word**</code> paints that word in " +
        "<code>props.accent</code>. <code>reveal</code> chooses the per-word choreography.</div>" +
        "<div><b>6 · everything is deterministic</b> — the same <code>(scene, t)</code> always paints the same pixels, which is what makes " +
        "scrubbing, stills and frame-by-frame export match what you edited.</div>" +
        "<div><b>7 · <code>assets</code></b> maps an id to a URL or a base64 data URI; plates that can't load paint a generated " +
        "interior stand-in instead of a grey box, so an offline file still looks designed. " +
        "<code>logo:timberlane?tint=%23fff</code> resolves the brand lockup as an image.</div>" +
        "<div><b>8 · <code>camera.keys</code></b> interpolate <code>x/y/zoom/rot</code> over <code>t</code>; layers with " +
        "<code>parallax</code> shift against them (photos 0.35, text 1.0 by default).</div>" +
        "</div>" +
        "<h4>Every type, every field</h4>" +
        "<p style='color:var(--dim)'>generated from the same schema the inspector uses — " +
        TLM.typeNames().length +
        " types, so this can never be out of date.</p>" +
        "<pre class='md' style='max-height:46vh'>" +
        (TLM.schemaMarkdown ? TLM.schemaMarkdown().replace(/</g, "&lt;") : "") +
        "</pre>";
      box.appendChild(body);
      var foot = el("div", "foot");
      foot.appendChild(btn("", "COPY SAMPLE JSON", function () {
        navigator.clipboard && navigator.clipboard.writeText(JSON.stringify(api.scene, null, 2));
        toast("current scene JSON copied");
      }));
      foot.appendChild(btn("", "DOWNLOAD SAMPLE JSON", exportJSON));
      foot.appendChild(btn("pri", "CLOSE", function () {
        dlg.remove();
      }));
      box.appendChild(foot);
      dlg.appendChild(box);
      dlg.addEventListener("click", function (ev) {
        if (ev.target === dlg) dlg.remove();
      });
      host.appendChild(dlg);
    }
    api.openDocs = openDocs;

    /* ================= boot ================= */
    var ro = null;
    if (global.ResizeObserver) {
      ro = new ResizeObserver(function () {
        layout();
        renderTimeline();
      });
      ro.observe(stage);
    }
    window.addEventListener("resize", layout);

    api.destroy = function () {
      window.removeEventListener("resize", layout);
      document.removeEventListener("keydown", keyHandler);
      if (ro) ro.disconnect();
      pause();
      styleTag.parentNode && styleTag.parentNode.removeChild(styleTag);
      host.remove();
    };
    /* open on something you can actually move: the first text layer that is
       alive at the start frame, else the front-most live layer */
    (function pickInitial() {
      var t0 = opts.start !== undefined ? opts.start : 0;
      var S = api.scene;
      var live = S.layers.filter(function (l) { return l.in <= t0 && t0 <= l.in + l.dur; });
      var pref = live.filter(function (l) { return l.type === "text"; });
      var pickL = pref[0] || live[live.length - 1] || S.layers[0];
      if (pickL) api.sel = pickL.id;
    })();
    setPane("inspector");
    layout();
    syncAll();
    setTime(opts.start !== undefined ? opts.start : 0, false);
    return api;
  }

  TLM.mountEditor = mount;
  TLM.EDITOR_CSS = CSS;
})(typeof window !== "undefined" ? window : globalThis);
