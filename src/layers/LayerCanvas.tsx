/* ==================================================================
   LayerCanvas.tsx — the layer scene as a React component
   ------------------------------------------------------------------
   Piece 08 in the reel, and the offline render target, is the same
   canvas the editor paints: <LayersComposition t={seconds} /> renders
   the scene at exactly that time and nothing else. No CSS animation,
   no requestAnimationFrame — frame-exact, so a scrub, a still and an
   exported video are all the same picture.
   ================================================================== */
import { useLayoutEffect, useRef } from "react";

import "./engine-core.js";
import "./logo.js";
import "./engine-draw.js";
import "./scene-timberlane.js";
import { preloadFontFaces } from "./font-guard";

type AnyObj = Record<string, any>;

export function useLayerScene(): { scene: AnyObj; pool: AnyObj; W: number; H: number; fps: number; duration: number } {
  const ref = useRef<{ scene: AnyObj; pool: AnyObj } | null>(null);
  if (!ref.current) {
    const TLM = (window as unknown as { TLM: AnyObj }).TLM;
    const scene = JSON.parse(JSON.stringify(TLM.SCENES.timberlane)) as AnyObj;
    TLM.normalize(scene);
    const pool = new TLM.AssetPool(scene);
    try {
      void pool.preload();
    } catch {
      /* offline: the plates fall back to the painted interior study */
    }
    ref.current = { scene, pool };
  }
  const { scene } = ref.current;
  preloadFontFaces();
  return {
    scene,
    pool: ref.current.pool,
    W: scene.meta.width as number,
    H: scene.meta.height as number,
    fps: (scene.meta.fps || 30) as number,
    duration: (scene.meta.duration || 30) as number,
  };
}

export function LayersComposition({ t, guides }: { t: number; guides?: boolean }) {
  const { scene, pool, W, H } = useLayerScene();
  const ref = useRef<HTMLCanvasElement | null>(null);

  useLayoutEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const TLM = (window as unknown as { TLM: AnyObj }).TLM;
    TLM.render(ctx, scene, t, { assets: pool, guides: !!guides, debug: true });
  }, [t, scene, pool, guides]);

  return (
    <canvas
      ref={ref}
      width={W}
      height={H}
      style={{ width: W, height: H, display: "block", background: scene.meta.base || "#0b0c0e" }}
    />
  );
}
