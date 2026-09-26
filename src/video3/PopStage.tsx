import { useLayoutEffect, useRef, useState } from "react";
import { PopComposition } from "./scenes";
import { H, W } from "./timeline";

export function PopStage({
  time,
  playing,
  onToggle,
}: {
  time: number;
  playing: boolean;
  onToggle: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);

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

  return (
    <div ref={box} className="relative h-full w-full">
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: W * scale,
          height: H * scale,
          transform: "translate(-50%,-50%)",
          borderRadius: Math.max(8, 20 * scale),
          overflow: "hidden",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,.1), 0 40px 120px -20px rgba(0,0,0,.9), 0 0 90px -10px rgba(255,90,31,.3)",
          background: "#f6ead6",
        }}
      >
        <div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <PopComposition t={time} />
        </div>

        <button
          onClick={onToggle}
          className="group absolute inset-0 cursor-pointer"
          aria-label={playing ? "Pause" : "Play"}
          style={{
            background: started && playing ? "transparent" : "rgba(20,19,17,.28)",
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
                border: "4px solid #141311",
                boxShadow: "6px 6px 0 #141311, 0 0 50px rgba(255,90,31,.6)",
              }}
            >
              <svg width="28" height="32" viewBox="0 0 28 32" fill="#141311">
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
                color: "rgba(20,19,17,.85)",
                fontWeight: 700,
              }}
            >
              TAP TO PLAY · SOUND ON
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
