'use client';

import { useRef } from 'react';
import { ExternalLink, Film, GitBranch, Terminal } from 'lucide-react';
import { useAutoplayWhenVisible } from '@/lib/useAutoplayWhenVisible';

const metrics = [
  { label: 'OSS repo scanned', value: 'shadcn-ui/ui' },
  { label: 'Frontend files', value: '3,110' },
  { label: 'Autofixed', value: '999 issues' },
  { label: 'Design debt removed', value: '61.6 h' },
];

export function OssProofSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  useAutoplayWhenVisible(videoRef);

  return (
    <section className="bg-gray-950 px-6 py-20 text-white">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.25fr] lg:items-center">
        <div>
          <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary-100">
            <Film className="h-4 w-4" />
            Real OSS proof
          </p>
          <h2 className="mb-4 text-balance text-3xl font-bold leading-tight sm:text-4xl">
            A recorded Deslint 0.7.2 run on a real React codebase.
          </h2>
          <p className="mb-6 text-base leading-relaxed text-gray-300">
            We cloned <span className="font-semibold text-white">shadcn-ui/ui</span>,
            ran the published npm package, then rendered the captured terminal
            output into this short video. No synthetic repo, no invented numbers.
          </p>

          <div className="mb-6 grid grid-cols-2 gap-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xl font-bold tracking-tight text-white">{metric.value}</div>
                <div className="mt-1 text-xs text-gray-400">{metric.label}</div>
              </div>
            ))}
          </div>

          <div className="space-y-3 text-sm text-gray-300">
            <div className="flex items-start gap-3">
              <Terminal className="mt-0.5 h-4 w-4 shrink-0 text-primary-100" />
              <span>
                Score improved from <strong className="text-white">92</strong> to{' '}
                <strong className="text-white">96</strong>; warnings dropped from{' '}
                <strong className="text-white">2,477</strong> to{' '}
                <strong className="text-white">1,378</strong>.
              </span>
            </div>
            <div className="flex items-start gap-3">
              <GitBranch className="mt-0.5 h-4 w-4 shrink-0 text-primary-100" />
              <span>
                Fixes touched <strong className="text-white">554 files</strong> via{' '}
                <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-white">
                  deslint fix --all
                </code>
                .
              </span>
            </div>
          </div>
        </div>

        <div>
          <div className="overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10">
            <video
              ref={videoRef}
              className="block h-auto w-full"
              poster="/demo/deslint-oss-before-after-poster.jpg"
              muted
              loop
              playsInline
              preload="none"
              aria-label="Rendered terminal video of Deslint 0.7.2 scanning and fixing shadcn-ui/ui"
            >
              <source src="/demo/deslint-oss-before-after.webm" type="video/webm" />
              <source src="/demo/deslint-oss-before-after.mp4" type="video/mp4" />
              Your browser does not support embedded video.
            </video>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-400">
            <span>Rendered from captured command output, not a simulated product result.</span>
            <a
              href="https://github.com/shadcn-ui/ui"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-primary-100 hover:text-white"
            >
              Source repo
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
