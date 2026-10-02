/* ==================================================================
   html-shell.js — the standalone document, as a function
   ------------------------------------------------------------------
   `TLM.buildShell({ scene, parts, fontCSS })` returns one complete HTML
   file as a string: the scene JSON, the engine scripts, the score and a
   player that turns into the editor when you press E.

   It is a classic script (like the engine) because the app builds it
   with the engine's own text at hand — and because that means the
   export can be tested without a browser (see tools/standalone-smoke).
   ================================================================== */
(function (global) {
  "use strict";
  var TLM = (global.TLM = global.TLM || {});

  function esc(s) {
    return String(s).replace(/<\/(script)/gi, "<\\/$1");
  }

  TLM.buildShell = function (cfg) {
    var scene = cfg.scene;
    var parts = cfg.parts || []; /* [[id, sourceText], …] in load order */
    var fontCSS = cfg.fontCSS || "";
    var title = scene.name || "motion-layers";
    var meta = scene.meta || {};
    var scripts = parts
      .map(function (p) {
        return '<script id="' + p[0] + '">\n' + esc(p[1]) + "\n</script>";
      })
      .join("\n");

    return (
      "<!doctype html>\n" +
      "<!--\n" +
      "  " +
      (scene.title || title) +
      " — standalone reel + editor\n" +
      "  " +
      "-".repeat(74) +
      "\n" +
      "  Everything this file needs is inside it: the scene JSON (#tl-scene), the layer\n" +
      "  engine, the score (synthesised live in WebAudio — no audio files) and the type\n" +
      "  families as base64. Open it: it plays. Press E (or add ?edit) and it becomes the\n" +
      "  full layer editor — drag the text, retime the blocks, edit props — and you can\n" +
      "  download the edited file again from the same button. No server, no build step.\n" +
      "\n" +
      "  To change the film without the editor: edit the JSON in #tl-scene. Field\n" +
      "  reference: the DOCS panel inside, or README.md → “Scene JSON”.\n" +
      "-->\n" +
      '<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' +
      '<meta name="color-scheme" content="dark">\n' +
      "<title>" + esc(title) + " — motion layers</title>\n<style>\n" +
      fontCSS +
      "\n" +
      `
html,body{margin:0;height:100%;background:#07080a;color:#f4f1ea;font-family:"Archivo",system-ui,sans-serif;overflow:hidden}
#tl-root{position:fixed;inset:0}
#tl-root.edit{overflow:hidden}
.tlp{position:fixed;inset:0;display:grid;place-items:center;background:radial-gradient(1200px 700px at 50% -10%, rgba(196,90,15,.13), transparent 60%),#07080a}
.tlp canvas{display:block;box-shadow:0 40px 120px -30px #000,0 0 0 1px #23272d}
.tlp-bar{position:fixed;left:0;right:0;bottom:0;display:flex;align-items:center;gap:14px;padding:12px 16px;
  background:linear-gradient(#0000,#000000d0);font-size:11px;letter-spacing:.14em;text-transform:uppercase;z-index:3}
.tlp-bar b{font-weight:700}
.tlp-bar span{color:#8b929a;font-family:"JetBrains Mono",monospace;letter-spacing:.06em;text-transform:none}
.tlp-bar button{background:#15181c;border:1px solid #2a2f35;color:#f4f1ea;border-radius:20px;padding:6px 12px;
  font:inherit;letter-spacing:.14em;text-transform:uppercase;font-size:10px;cursor:pointer}
.tlp-bar button:hover{border-color:#ff6a1a;color:#ff6a1a}
.tlp-prog{position:fixed;left:0;bottom:0;height:2px;background:#ff6a1a;width:0;z-index:4}
.tlp-hint{position:fixed;top:14px;left:50%;transform:translateX(-50%);font-size:10px;letter-spacing:.2em;
  text-transform:uppercase;color:#7d848c;background:#0b0d10cc;border:1px solid #22262b;border-radius:20px;padding:6px 12px;z-index:3}
` +
      "</style>\n</head>\n<body>\n" +
      '<div id="tl-root"></div>\n' +
      '<script type="application/json" id="tl-scene">' +
      esc(JSON.stringify(scene)) +
      "</scr" +
      "ipt>\n" +
      scripts +
      "\n<script>\n" +
      PLAYER +
      "\n</scr" +
      "ipt>\n</body>\n</html>\n"
    );
  };

  /* the boot code inside the exported file: a player that promotes itself
     into the editor, wired to the same engine and the same score */
  var PLAYER = `(function () {
  var root = document.getElementById("tl-root");
  var scene = JSON.parse(document.getElementById("tl-scene").textContent);
  TLM.normalize(scene);
  var meta = scene.meta, W = meta.width, H = meta.height;
  var editor = null, mode = /[?&]edit/.test(location.search) ? "edit" : "play";
  var player = null;

  function setEditor(on) {
    var ed = root.querySelector(".tle");
    if (ed) ed.style.display = on ? "" : "none";
  }
  function stopPlayer() {
    if (!player) return;
    cancelAnimationFrame(player.raf);
    player.root.remove();
    player = null;
    try { TLM.music.pause(); } catch (e) { /* no audio yet */ }
  }
  function startEdit(t) {
    stopPlayer();
    root.className = "edit";
    mode = "edit";
    setEditor(true);
    if (!editor) {
      editor = TLM.mountEditor(root, { scene: scene, start: t || 0 });
    } else {
      editor.setTime(t || 0, false);
    }
  }
  function startPlay() {
    stopPlayer();
    mode = "play";
    setEditor(false);
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var host = document.createElement("div");
    host.className = "tlp";
    var cv = document.createElement("canvas");
    var bar = document.createElement("div");
    bar.className = "tlp-bar";
    var prog = document.createElement("div");
    prog.className = "tlp-prog";
    var hint = document.createElement("div");
    hint.className = "tlp-hint";
    hint.textContent = "click or space = play · E = edit the layers";
    function fit() {
      var sc = Math.min((innerWidth * 0.97) / W, (innerHeight * 0.93) / H);
      cv.style.width = Math.round(W * sc) + "px";
      cv.style.height = Math.round(H * sc) + "px";
      cv.width = Math.round(W * sc * dpr);
      cv.height = Math.round(H * sc * dpr);
      return sc;
    }
    var sc = fit();
    var ctx = cv.getContext("2d");
    var pool = new TLM.AssetPool(scene);
    try { pool.preload(); } catch (e) { /* stand-ins paint themselves */ }
    var t = 0, playing = false, last = 0, dirty = true;
    var bPlay = document.createElement("button");
    bPlay.textContent = "▶ PLAY";
    var bEdit = document.createElement("button");
    bEdit.textContent = "EDIT LAYERS →";
    var bMute = document.createElement("button");
    bMute.textContent = "♪ SOUND ON";
    var tc = document.createElement("span");
    var sp = document.createElement("div");
    sp.style.flex = "1";
    bar.appendChild(bPlay);
    bar.appendChild(tc);
    bar.appendChild(sp);
    bar.appendChild(bMute);
    bar.appendChild(bEdit);
    host.appendChild(cv);
    host.appendChild(prog);
    host.appendChild(hint);
    host.appendChild(bar);
    root.appendChild(host);
    root.className = "";

    function paint() {
      ctx.setTransform(dpr * (cv.width / W), 0, 0, dpr * (cv.width / W), 0, 0);
      TLM.render(ctx, scene, t, { scale: cv.width / W, assets: pool });
      tc.textContent = TLM.fmtTC(t, meta.fps) + " / " + TLM.fmtTC(meta.duration, meta.fps) +
        " · " + W + "×" + H + " @" + meta.fps + "fps · " + scene.layers.length + " layers";
      prog.style.width = (100 * t / meta.duration) + "%";
    }
    function step(now) {
      if (!player) return;
      if (playing) {
        var dt = Math.min(0.12, (now - last) / 1000);
        last = now;
        t += dt;
        if (t >= meta.duration) t = 0;
        dirty = true;
      }
      if (dirty) { paint(); dirty = false; }
      player.raf = requestAnimationFrame(step);
    }
    function play() {
      playing = true;
      last = performance.now();
      bPlay.textContent = "❚❚ PAUSE";
      try { TLM.music.resync(t, 1); TLM.music.play(); } catch (e) { /* gesture needed */ }
    }
    function pause() {
      playing = false;
      bPlay.textContent = "▶ PLAY";
      try { TLM.music.pause(); } catch (e) { /* silent */ }
    }
    player = { root: host, raf: 0, paint: paint, toggle: function () { if (playing) pause(); else play(); } };
    paint();
    player.raf = requestAnimationFrame(step);
    cv.addEventListener("click", function () { player.toggle(); });
    bPlay.addEventListener("click", function (e) { e.stopPropagation(); player.toggle(); });
    bMute.addEventListener("click", function (e) {
      e.stopPropagation();
      var m = false;
      try { m = TLM.music.toggleMute(); } catch (err) { /* no audio */ }
      bMute.textContent = m ? "♪ SOUND OFF" : "♪ SOUND ON";
    });
    bEdit.addEventListener("click", function (e) { e.stopPropagation(); startEdit(t); });
    addEventListener("resize", function () { sc = fit(); dirty = true; });
  }
  addEventListener("keydown", function (ev) {
    var tag = (ev.target && ev.target.tagName) || "";
    if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
    if (mode === "play" && (ev.key === "e" || ev.key === "E")) { startEdit(0); return; }
    if (mode === "play" && ev.code === "Space") { ev.preventDefault(); if (player) player.toggle(); return; }
    if (mode === "edit" && ev.key === "Escape") startPlay();
  });
  if (mode === "edit") startEdit(0); else startPlay();
})();`;
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : this);
