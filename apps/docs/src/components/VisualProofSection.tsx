'use client';

import { motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Film } from 'lucide-react';
import { Beat1DarkMode } from './mockups/visual-proof/Beat1DarkMode';
import { Beat2Reflow } from './mockups/visual-proof/Beat2Reflow';
import { Beat3Contrast } from './mockups/visual-proof/Beat3Contrast';
import { Beat4A11y } from './mockups/visual-proof/Beat4A11y';

interface Beat {
  id: string;
  number: string;
  title: string;
  blurb: string;
  render: (props: { isActive: boolean; autoPlay: boolean }) => React.ReactNode;
}

const BEATS: Beat[] = [
  {
    id: 'dark-mode',
    number: '01',
    title: 'Dark mode · flipped',
    blurb: 'AI wrote hardcoded colors. The preview looks fine. Flip to dark mode and the page breaks.',
    render: (props) => <Beat1DarkMode {...props} />,
  },
  {
    id: 'reflow',
    number: '02',
    title: 'Responsive · reflow',
    blurb:
      'Fixed widths and rigid grids survive the laptop. Drop to 375px and watch content clip off-screen.',
    render: (props) => <Beat2Reflow {...props} />,
  },
  {
    id: 'contrast',
    number: '03',
    title: 'Contrast · readability',
    blurb:
      'A subtitle that looks “stylish” at full vision disappears entirely under mild vision loss.',
    render: (props) => <Beat3Contrast {...props} />,
  },
  {
    id: 'a11y',
    number: '04',
    title: 'A11y · the invisible wins',
    blurb:
      'No pixel diff. Empty alt, skipped headings, unlabeled inputs. Lighthouse score: 67 → 100.',
    render: (props) => <Beat4A11y {...props} />,
  },
];

const BEAT_DURATION_MS = 9000;

export function VisualProofSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { margin: '-100px' });

  const [currentBeat, setCurrentBeat] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [captureMode, setCaptureMode] = useState(false);

  // `?vp-autoplay=1` is the hook the Playwright capture script uses.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('vp-autoplay') === '1') {
      setCaptureMode(true);
      setIsPlaying(true);
      setCurrentBeat(0);
      setTimeout(() => {
        stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, []);

  const autoplayActive = isPlaying && (captureMode || inView);

  useEffect(() => {
    if (!autoplayActive) return;
    const id = setInterval(() => {
      setCurrentBeat((b) => (b + 1) % BEATS.length);
    }, BEAT_DURATION_MS);
    return () => clearInterval(id);
  }, [autoplayActive]);

  const togglePlay = () => setIsPlaying((p) => !p);
  const jumpTo = (i: number) => {
    setCurrentBeat(i);
    setIsPlaying(false);
  };

  const active = BEATS[currentBeat];

  return (
    <section
      ref={sectionRef}
      id="visual-proof"
      className="relative overflow-hidden bg-gradient-to-b from-white via-gray-50 to-white px-6 py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 max-w-3xl">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.4 }}
            className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary"
          >
            Visual proof
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mb-4 text-balance text-3xl font-bold leading-tight text-gray-900 sm:text-4xl lg:text-5xl"
          >
            Before and after, rendered in your browser —{' '}
            <span className="gradient-text-hero">not a screenshot.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="max-w-2xl text-lg leading-relaxed text-gray-500"
          >
            Four common failures AI code generators ship — dark mode, responsive
            reflow, contrast, and the invisible accessibility gaps that only show
            up in audits. Each one rendered live, before and after Deslint fixes it.
          </motion.p>
        </div>

        <motion.div
          ref={stageRef}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="relative rounded-3xl bg-white p-6 shadow-xl ring-1 ring-gray-200 sm:p-8 lg:p-10"
        >
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-3">
                <span className="font-mono text-xs font-semibold text-primary/70">
                  {active.number}
                </span>
                <h3 className="text-lg font-bold text-gray-900 sm:text-xl">{active.title}</h3>
              </div>
              <p className="max-w-2xl text-sm text-gray-500">{active.blurb}</p>
            </div>
            <button
              type="button"
              onClick={togglePlay}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200 transition-all hover:bg-gray-200"
              aria-label={isPlaying ? 'Pause autoplay' : 'Resume autoplay'}
            >
              {isPlaying ? (
                <>
                  <Pause className="h-3 w-3" /> Pause
                </>
              ) : (
                <>
                  <Play className="h-3 w-3" /> Play
                </>
              )}
            </button>
          </div>

          <div key={active.id} className="min-h-[420px]">
            {active.render({ isActive: true, autoPlay: isPlaying && inView })}
          </div>
        </motion.div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BEATS.map((b, i) => {
            const isCurrent = i === currentBeat;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => jumpTo(i)}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`Jump to beat ${b.number}: ${b.title}`}
                className={`group relative overflow-hidden rounded-xl border p-4 text-left transition-all ${
                  isCurrent
                    ? 'border-primary bg-primary-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className={`font-mono text-xs font-semibold ${
                      isCurrent ? 'text-primary' : 'text-gray-400'
                    }`}
                  >
                    {b.number}
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      isCurrent ? 'text-primary' : 'text-gray-900'
                    }`}
                  >
                    {b.title}
                  </span>
                </div>
                {isCurrent && autoplayActive && (
                  <motion.div
                    key={`${b.id}-${currentBeat}`}
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: BEAT_DURATION_MS / 1000, ease: 'linear' }}
                    className="absolute bottom-0 left-0 h-0.5 bg-primary"
                  />
                )}
              </button>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="mt-12"
          aria-label="Pre-rendered video of the four visual proof beats"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-50 text-primary ring-1 ring-primary/15">
                <Film className="h-3.5 w-3.5" />
              </span>
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  Or watch the 40-second loop
                </div>
                <div className="text-xs text-gray-500">
                  Same four beats, pre-rendered. Perfect for sharing.
                </div>
              </div>
            </div>
            <div className="hidden items-center gap-3 text-[10px] text-gray-400 sm:flex">
              <span className="font-mono">1280×900 · H.264</span>
              <span className="h-3 w-px bg-gray-200" aria-hidden />
              <a
                href="/demo/visual-proof.mp4"
                download
                className="font-medium text-primary hover:text-primary-light"
              >
                Download MP4
              </a>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl bg-gray-950 shadow-xl ring-1 ring-gray-200">
            <video
              className="block h-auto w-full"
              poster="/demo/visual-proof-poster.jpg"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="40-second recorded loop of the four visual proof beats"
            >
              <source src="/demo/visual-proof.webm" type="video/webm" />
              <source src="/demo/visual-proof.mp4" type="video/mp4" />
              Your browser doesn’t support embedded video. Download the{' '}
              <a href="/demo/visual-proof.mp4">MP4</a>.
            </video>
          </div>
        </motion.div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-center text-xs text-gray-500">
          <span>Every fix is deterministic — same input, same output.</span>
          <span className="hidden h-3 w-px bg-gray-200 sm:inline-block" />
          <span>Inline-styled demos so this page passes its own compliance check.</span>
          <span className="hidden h-3 w-px bg-gray-200 sm:inline-block" />
          <span>
            <code className="font-mono text-gray-700">npx deslint scan</code> on your repo to see yours.
          </span>
        </div>
      </div>
    </section>
  );
}
