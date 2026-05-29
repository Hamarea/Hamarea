"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Play } from "lucide-react";
import { SACOCHE } from "@/lib/product";

export function VideoReel() {
  const reels: ReadonlyArray<{ src: string; caption?: string }> = SACOCHE.media.reels;
  if (reels.length === 0) return null;

  return (
    <section className="bg-[var(--color-foreground)] py-16 text-white md:py-20">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/60">
            En action
          </p>
          <h2 className="mt-2 font-display text-3xl md:text-4xl">
            Voyez par vous-même.
          </h2>
          <p className="mt-3 text-sm text-white/70">
            Pas de retouche, pas de mise en scène. Juste la sacoche, dans la vraie vie.
          </p>
        </div>

        <div className="mt-10 -mx-4 overflow-x-auto px-4 pb-4 [scrollbar-width:thin] md:overflow-visible md:px-0">
          <ul className="flex snap-x snap-mandatory gap-4 md:grid md:grid-cols-3 md:gap-6">
            {reels.map((r) => (
              <li
                key={r.src}
                className="w-[78vw] shrink-0 snap-center sm:w-[60vw] md:w-auto"
              >
                <ReelPlayer src={r.src} caption={r.caption} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function ReelPlayer({
  src,
  caption,
}: {
  src: string;
  caption?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) {
          el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const toggleSound = () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  };

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  return (
    <div className="group relative aspect-[9/16] overflow-hidden rounded-2xl bg-black ring-1 ring-white/10">
      <video
        ref={videoRef}
        src={src}
        muted={muted}
        loop
        playsInline
        preload="none"
        className="h-full w-full object-cover"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {/* Bottom caption gradient */}
      {caption && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4">
          <p className="text-sm font-medium text-white drop-shadow">{caption}</p>
        </div>
      )}

      {/* Tap-to-play overlay (mobile-friendly) */}
      {!playing && inView && (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 grid place-items-center bg-black/30 backdrop-blur-[2px]"
          aria-label="Lire"
        >
          <span className="grid h-16 w-16 place-items-center rounded-full bg-white/90 text-[var(--color-foreground)]">
            <Play className="ml-1 h-7 w-7" />
          </span>
        </button>
      )}

      {/* Mute toggle */}
      <button
        type="button"
        onClick={toggleSound}
        aria-label={muted ? "Activer le son" : "Couper le son"}
        className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white backdrop-blur transition-colors hover:bg-black/70"
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
