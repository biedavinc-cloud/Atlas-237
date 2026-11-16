import { useEffect, useState } from 'react';

interface VideoBackgroundProps {
  /** Ordered list of video URLs to try (mp4/webm). First working one wins. */
  sources: string[];
  /** Still image shown while the video loads, and if it never loads. */
  poster?: string;
  /** Tailwind classes for a color/gradient layer drawn on top (for text contrast). */
  overlayClassName?: string;
  className?: string;
}

/**
 * Full-bleed autoplaying background video that never breaks the page it's
 * placed in:
 * - If every source fails (bad URL, offline, blocked by the browser), the
 *   <video> is dropped and only the poster/overlay show — whatever
 *   background already sits behind this component in the parent markup
 *   remains visible underneath, so there is never a blank box.
 * - Respects `prefers-reduced-motion`: no autoplaying motion for people who
 *   asked their OS not to show it.
 * - Small screens, Save-Data and 2G/3G connections show the poster only.
 * - muted + playsInline + loop is what makes autoplay actually allowed by
 *   browsers (Safari/iOS in particular refuses autoplay otherwise).
 *
 * Usage: place as the first child of a `position: relative` container, put
 * your real content after it with a higher stacking context (e.g. a
 * `relative z-10` wrapper), same pattern already used for this app's blurred
 * gradient blobs.
 */
export function VideoBackground({ sources, poster, overlayClassName, className }: VideoBackgroundProps) {
  const [failed, setFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  // Phones, Save-Data and slow connections get the poster only: these clips
  // are multi-megabyte and would cost mobile visitors data and battery.
  const [lightMode] = useState(() => {
    if (typeof window === 'undefined') return true;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    return window.matchMedia('(max-width: 767px)').matches
      || Boolean(conn?.saveData)
      || ['slow-2g', '2g', '3g'].includes(conn?.effectiveType || '');
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const showVideo = !failed && !reducedMotion && !lightMode && sources.length > 0;

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className || ''}`} aria-hidden="true">
      {showVideo ? (
        <video
          className="h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={poster}
          onError={() => setFailed(true)}
        >
          {sources.map((src) => (
            <source key={src} src={src} type={src.endsWith('.webm') ? 'video/webm' : 'video/mp4'} />
          ))}
        </video>
      ) : poster ? (
        <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${poster})` }} />
      ) : null}
      {overlayClassName && <div className={`absolute inset-0 ${overlayClassName}`} />}
    </div>
  );
}
