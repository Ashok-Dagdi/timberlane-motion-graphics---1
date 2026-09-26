import { useLayoutEffect, useRef, useState } from "react";
import { StoryComposition } from "./scenes";
import { H, W } from "./timeline";

export function StoryStage({ time, playing, onToggle }: { time: number; playing: boolean; onToggle: () => void }) {
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
      <div className="absolute left-1/2 top-1/2" style={{ width: W * scale, height: H * scale, transform: "translate(-50%,-50%)", borderRadius: 16, overflow: "hidden", background: "#100e0c", boxShadow: "0 0 0 1px rgba(255,255,255,.08), 0 40px 90px rgba(0,0,0,.8)" }}>
        <div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <StoryComposition t={time} />
        </div>
        <button onClick={onToggle} className="absolute inset-0 cursor-pointer" aria-label={playing ? "Pause" : "Play"} style={{ background: started && playing ? "transparent" : "rgba(16,14,12,.35)" }}>
          {!playing && (
            <span className="absolute left-1/2 top-1/2 flex items-center justify-center rounded-full" style={{ width: 84, height: 84, transform: "translate(-50%,-50%)", background: "#ff5a1f" }}>
              <svg width="26" height="30" viewBox="0 0 28 32" fill="#100e0c"><path d="M2 2l24 14L2 30z" /></svg>
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
