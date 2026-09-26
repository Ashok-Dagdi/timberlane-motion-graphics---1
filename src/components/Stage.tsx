import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Composition } from "../video/Composition";
import { H, W } from "../video/timeline";
import { ALL_IMAGES } from "../video/assets";

export function useMediaPreload() {
  const [loaded, setLoaded] = useState(0);
  const total = ALL_IMAGES.length;
  useEffect(() => {
    let alive = true;
    let n = 0;
    ALL_IMAGES.forEach((src) => {
      const img = new Image();
      const done = () => {
        if (!alive) return;
        n += 1;
        setLoaded(n);
      };
      img.onload = done;
      img.onerror = done;
      img.src = src;
    });
    return () => {
      alive = false;
    };
  }, []);
  return { loaded, total, ready: loaded >= total };
}

export function Stage({
  time,
  playing,
  onToggle,
  grain,
  guides,
  burnIn,
  ready,
  progress,
}: {
  time: number;
  playing: boolean;
  onToggle: () => void;
  grain: boolean;
  guides: boolean;
  burnIn: boolean;
  ready: boolean;
  progress: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setScale(Math.min(r.width / W, r.height / H));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const started = time > 0.001 || playing;
  // poster frame: hold the formed logo card until the viewer hits play
  const shown = started ? time : 1.45;

  return (
    <div ref={box} className="relative h-full w-full">
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: W * scale,
          height: H * scale,
          transform: "translate(-50%,-50%)",
          borderRadius: Math.max(10, 26 * scale),
          overflow: "hidden",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,.09), 0 40px 120px -20px rgba(0,0,0,.9), 0 0 90px -10px rgba(255,90,31,.22)",
          background: "#08080a",
        }}
      >
        <div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <Composition t={shown} playing={playing} grain={grain} guides={guides} burnIn={burnIn} />
        </div>

        {/* poster / play affordance */}
        <button
          onClick={onToggle}
          className="group absolute inset-0 cursor-pointer"
          aria-label={playing ? "Pause" : "Play"}
          style={{
            background: started && playing ? "transparent" : "rgba(8,8,10,.45)",
            transition: "background .3s",
          }}
        >
          {!playing && (
            <span
              className="absolute left-1/2 top-1/2 flex items-center justify-center rounded-full transition-transform group-hover:scale-110"
              style={{
                width: 86,
                height: 86,
                transform: "translate(-50%,-50%)",
                background: "#ff5a1f",
                boxShadow: "0 0 60px rgba(255,90,31,.7)",
              }}
            >
              <svg width="28" height="32" viewBox="0 0 28 32" fill="#08080a">
                <path d="M2 2l24 14L2 30z" />
              </svg>
            </span>
          )}
          {!started && (
            <span
              className="absolute left-0 right-0 text-center"
              style={{
                bottom: 42 * scale + 24,
                fontFamily: "var(--font-mono2)",
                fontSize: 11,
                letterSpacing: "0.34em",
                color: "rgba(241,239,236,.72)",
              }}
            >
              TAP TO PLAY · SOUND ON
            </span>
          )}
        </button>

        {!ready && (
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/10">
            <div className="h-full bg-[#ff5a1f] transition-[width] duration-200" style={{ width: `${progress * 100}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
