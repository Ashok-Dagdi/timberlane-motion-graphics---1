import { useLayoutEffect, useRef, useState } from "react";
import { DossierComposition } from "./scenes";
import { H, W } from "./timeline";

export function CaseStage({
  time,
  playing,
  onToggle,
}: {
  time: number;
  playing: boolean;
  onToggle: () => void;
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

  return (
    <div ref={box} className="relative h-full w-full">
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: W * scale,
          height: H * scale,
          transform: "translate(-50%,-50%)",
          borderRadius: Math.max(10, 24 * scale),
          overflow: "hidden",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,.08), 0 40px 120px -20px rgba(0,0,0,.95), 0 0 80px -10px rgba(255,90,31,.24)",
          background: "#090b0e",
        }}
      >
        <div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <DossierComposition t={time} />
        </div>

        <button
          onClick={onToggle}
          className="group absolute inset-0 cursor-pointer"
          aria-label={playing ? "Pause" : "Play"}
          style={{
            background: started && playing ? "transparent" : "rgba(9,11,14,.38)",
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
                boxShadow: "0 0 60px rgba(255,90,31,.6)",
              }}
            >
              <svg width="28" height="32" viewBox="0 0 28 32" fill="#090b0e">
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
                color: "rgba(198,204,210,.7)",
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
