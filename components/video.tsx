"use client";
import { useEffect, useRef, useState } from "react";
export function OriginalVideo({
  src,
  poster,
  label,
  controls = true,
  priority = false,
  loop = false,
}: {
  src: string;
  poster?: string | null;
  label: string;
  controls?: boolean;
  priority?: boolean;
  loop?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(priority);
  const [reducedMotion, setReducedMotion] = useState(true);
  const manualPlayback = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) setLoaded(true);
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const reportBlocked = () => { if (priority) window.dispatchEvent(new Event("mi-logo-blocked")); };
    const updatePlayback = () => {
      setReducedMotion(motion.matches && !manualPlayback.current);
      if (visible && !document.hidden && (!motion.matches || manualPlayback.current)) {
        el.muted = true;
        el.defaultMuted = true;
        el.play().catch(reportBlocked);
      }
      else {
        el.pause();
        if (visible && motion.matches && !manualPlayback.current) reportBlocked();
      }
    };
    const manualPlay = () => { manualPlayback.current = true; updatePlayback(); };
    updatePlayback();
    motion.addEventListener("change", updatePlayback);
    el.addEventListener("canplay", updatePlayback);
    document.addEventListener("visibilitychange", updatePlayback);
    document.addEventListener("pointerdown", updatePlayback);
    document.addEventListener("keydown", updatePlayback);
    if (priority) window.addEventListener("mi-logo-play", manualPlay);
    return () => {
      motion.removeEventListener("change", updatePlayback);
      el.removeEventListener("canplay", updatePlayback);
      document.removeEventListener("visibilitychange", updatePlayback);
      document.removeEventListener("pointerdown", updatePlayback);
      document.removeEventListener("keydown", updatePlayback);
      window.removeEventListener("mi-logo-play", manualPlay);
      el.pause();
    };
  }, [visible, src, priority]);
  return (
    <video
      ref={ref}
      src={loaded ? src : undefined}
      poster={poster ?? undefined}
      muted
      playsInline
      autoPlay={visible && !reducedMotion}
      loop={loop}
      controls={controls}
      preload={priority ? "auto" : "none"}
      aria-label={label}
    />
  );
}

export function LogoPlaybackControl() {
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    const show = () => setBlocked(true);
    window.addEventListener("mi-logo-blocked", show);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) show();
    return () => window.removeEventListener("mi-logo-blocked", show);
  }, []);
  if (!blocked) return null;
  return <button type="button" className="logo-playback-control" onClick={() => {
    window.dispatchEvent(new Event("mi-logo-play"));
    setBlocked(false);
  }}>Reproduzir animação da logo</button>;
}
