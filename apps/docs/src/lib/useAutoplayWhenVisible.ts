'use client';

import { useEffect, type RefObject } from 'react';

/**
 * Drive a `<video>` element's playback from its on-screen visibility.
 *
 * - Plays when ≥35% of the element is in the viewport.
 * - Pauses when scrolled out, freeing the decoder.
 * - Honors `prefers-reduced-motion: reduce` — leaves the poster frame visible
 *   instead of starting playback. (On-brand for a tool that lints a11y.)
 *
 * Pair with `<video preload="none" muted playsInline loop>` so the browser
 * doesn't fetch any bytes until the user actually scrolls near the asset.
 */
export function useAutoplayWhenVisible<T extends HTMLVideoElement>(
  ref: RefObject<T | null>,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (!entry.isIntersecting) {
          el.pause();
          return;
        }
        if (reduce) return;
        // play() returns a promise that may reject (e.g. autoplay blocked).
        // We're muted + in-view so this should normally resolve.
        el.play().catch(() => {});
      },
      { threshold: 0.35 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
}
