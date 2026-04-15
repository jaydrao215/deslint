'use client';

import { useRef } from 'react';
import { useAutoplayWhenVisible } from '@/lib/useAutoplayWhenVisible';

/**
 * Pre-rendered video of an actual deslint[bot] PR review:
 *   - inline review comments appearing on the offending line
 *   - one-click "Apply suggestion" for motion-safe:animate-spin
 *   - status chip resolving to "safe to merge"
 *
 * Replaces the static PRReviewMockup at ProductShowcase surface #3 — that
 * surface is fundamentally about motion (review comments arriving), so a
 * static mock undersells it. The hand-coded mock still ships in the repo
 * for /docs and dev fallback; this is the homepage-only swap.
 *
 * preload="none" + IntersectionObserver-driven playback keeps the 690 KB
 * asset off the network until the user actually scrolls near it.
 */
export function PrReviewVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  useAutoplayWhenVisible(videoRef);

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xl shadow-primary/10">
        <video
          ref={videoRef}
          className="block h-auto w-full"
          poster="/demo/pr-comment-poster.jpg"
          muted
          loop
          playsInline
          preload="none"
          aria-label="10-second recording of deslint[bot] posting an inline review comment with a one-click suggested fix and a safe-to-merge status chip"
        >
          <source src="/demo/pr-comment.webm" type="video/webm" />
          <source src="/demo/pr-comment.mp4" type="video/mp4" />
          Your browser doesn’t support embedded video. Download the{' '}
          <a href="/demo/pr-comment.mp4">MP4</a>.
        </video>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-gray-400">
        <span className="font-mono">deslint[bot] · pull/482 · 10s loop</span>
        <a
          href="/demo/pr-comment.mp4"
          download
          className="font-medium text-primary hover:text-primary-light"
        >
          Download MP4
        </a>
      </div>
    </div>
  );
}
