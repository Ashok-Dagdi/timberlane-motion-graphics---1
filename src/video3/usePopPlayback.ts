import { useCallback, useEffect, useRef, useState } from "react";
import { score3 } from "./audio";
import { DURATION } from "./timeline";

export function usePopPlayback(enabled = true) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [loop, setLoop] = useState(true);
  const [muted, setMuted] = useState(false);

  const tRef = useRef(0);
  const rateRef = useRef(1);
  const loopRef = useRef(true);
  const raf = useRef(0);
  const last = useRef(0);

  rateRef.current = rate;
  loopRef.current = loop;

  const stopLoopRaf = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = 0;
  };

  const pause = useCallback(() => {
    setPlaying(false);
    stopLoopRaf();
    score3.stop();
  }, []);

  const play = useCallback(() => {
    if (tRef.current >= DURATION - 0.02) {
      tRef.current = 0;
      setTime(0);
    }
    setPlaying(true);
    void score3.start(tRef.current, rateRef.current);
  }, []);

  const toggle = useCallback(() => (playing ? pause() : play()), [playing, pause, play]);

  const seek = useCallback((v: number, resync = false) => {
    const nv = Math.max(0, Math.min(DURATION, v));
    tRef.current = nv;
    setTime(nv);
    if (resync) score3.resync(nv, rateRef.current);
  }, []);

  useEffect(() => {
    if (!playing) return;
    last.current = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last.current) / 1000);
      last.current = now;
      let nt = tRef.current + dt * rateRef.current;
      if (nt >= DURATION) {
        if (loopRef.current) {
          nt -= DURATION;
          score3.resync(nt, rateRef.current);
        } else {
          tRef.current = DURATION;
          setTime(DURATION);
          setPlaying(false);
          score3.stop();
          return;
        }
      }
      tRef.current = nt;
      setTime(nt);
      raf.current = requestAnimationFrame(frame);
    };
    raf.current = requestAnimationFrame(frame);
    return stopLoopRaf;
  }, [playing]);

  useEffect(() => {
    score3.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    if (playing) score3.resync(tRef.current, rate);
  }, [rate, playing]);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const reel = (window as unknown as { __reel?: string }).__reel;
      if (reel && reel !== "03") return;
      if (e.code === "Space") {
        e.preventDefault();
        toggle();
      } else if (e.code === "ArrowRight") {
        seek(tRef.current + (e.shiftKey ? 1 : 1 / 30), true);
      } else if (e.code === "ArrowLeft") {
        seek(tRef.current - (e.shiftKey ? 1 : 1 / 30), true);
      } else if (e.key.toLowerCase() === "r") {
        seek(0, true);
      } else if (e.key.toLowerCase() === "m") {
        setMuted((m) => !m);
      } else if (e.key.toLowerCase() === "l") {
        setLoop((l) => !l);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, seek, enabled]);

  useEffect(() => () => score3.stop(), []);

  return { time, playing, play, pause, toggle, seek, rate, setRate, loop, setLoop, muted, setMuted, tRef };
}
