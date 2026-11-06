"use client";

import { useEffect, useRef, useState } from "react";

const BARS = 56;

function pseudoPeaks(seed: string): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const out: number[] = [];
  for (let i = 0; i < BARS; i++) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    const r = ((h >>> 0) % 1000) / 1000;
    const env = 0.35 + 0.65 * Math.sin((Math.PI * (i + 1)) / (BARS + 1));
    out.push(Math.max(0.12, Math.min(1, (0.25 + r * 0.75) * env)));
  }
  return out;
}

async function realPeaks(src: string): Promise<number[] | null> {
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const decoded = await ctx.decodeAudioData(buf);
    ctx.close();
    const data = decoded.getChannelData(0);
    const size = Math.floor(data.length / BARS);
    if (size < 1) return null;
    const step = Math.max(1, Math.floor(size / 50));
    const peaks: number[] = [];
    for (let i = 0; i < BARS; i++) {
      let max = 0;
      for (let j = i * size; j < (i + 1) * size; j += step) max = Math.max(max, Math.abs(data[j]));
      peaks.push(max);
    }
    const top = Math.max(...peaks) || 1;
    return peaks.map((p) => Math.max(0.1, p / top));
  } catch {
    return null;
  }
}

function fmt(s: number) {
  const n = Math.max(0, Math.round(s));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
}

export default function VoicePlayer({ src }: { src: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const raf = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [peaks, setPeaks] = useState<number[]>(() => pseudoPeaks(src));

  useEffect(() => {
    let alive = true;
    setPeaks(pseudoPeaks(src));
    setPlaying(false);
    setT(0);
    setDur(0);
    realPeaks(src).then((p) => {
      if (alive && p) setPeaks(p);
    });
    return () => {
      alive = false;
    };
  }, [src]);

  useEffect(() => {
    if (!playing) return;
    const tick = () => {
      if (audio.current) setT(audio.current.currentTime);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [playing]);

  async function toggle() {
    const a = audio.current;
    if (!a) return;
    if (a.paused) {
      try {
        await a.play();
      } catch {
        setPlaying(false);
      }
    } else {
      a.pause();
    }
  }

  function seekTo(ratio: number) {
    const a = audio.current;
    if (!a || !dur) return;
    const clamped = Math.min(1, Math.max(0, ratio));
    a.currentTime = clamped * dur;
    setT(a.currentTime);
  }

  function onSeek(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    seekTo((e.clientX - rect.left) / rect.width);
  }

  function onKey(e: React.KeyboardEvent<HTMLDivElement>) {
    const a = audio.current;
    if (!a || !dur) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      seekTo((a.currentTime + 2) / dur);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      seekTo((a.currentTime - 2) / dur);
    }
  }

  const progress = dur ? Math.min(1, t / dur) : 0;

  return (
    <div className="flex min-w-0 flex-[1_1_300px] items-center gap-3 rounded-xl border border-line-2 bg-bg px-3 py-2.5">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Mettre en pause" : "Écouter le message publié"}
        className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-brand text-white hover:bg-brand-dark"
      >
        {playing ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
          </svg>
        )}
      </button>

      <div
        role="slider"
        tabIndex={0}
        aria-label="Position de lecture"
        aria-valuemin={0}
        aria-valuemax={Math.round(dur)}
        aria-valuenow={Math.round(t)}
        onClick={onSeek}
        onKeyDown={onKey}
        className="relative flex h-10 min-w-0 flex-1 cursor-pointer items-center gap-[2px] rounded outline-brand"
      >
        {peaks.map((p, i) => (
          <span
            key={i}
            style={{ height: `${Math.round(p * 100)}%` }}
            className={`min-w-[2px] flex-1 rounded-full ${(i + 0.5) / BARS <= progress ? "bg-brand" : "bg-line-2"}`}
          />
        ))}
        <span className="pointer-events-none absolute top-0 bottom-0 w-0.5 rounded bg-navy" style={{ left: `${progress * 100}%` }} />
      </div>

      <span className="flex-none font-mono text-xs text-muted tabular-nums">
        {fmt(t)} / {fmt(dur)}
      </span>

      <audio
        ref={audio}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration || 0)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setT(0);
        }}
      />
    </div>
  );
}
