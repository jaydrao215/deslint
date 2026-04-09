'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState } from 'react';
import { Check, Copy, Package, FileCode2, Play } from 'lucide-react';

/**
 * Three-step install story, CodeRabbit-style low-friction onboarding but with
 * actual code that works. Everything here is real — the command names and
 * config are the same ones shipped in packages/eslint-plugin README.
 */
interface Step {
  num: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  language: string;
  filename?: string;
  code: string;
}

const STEPS: Step[] = [
  {
    num: '01',
    icon: <Package className="h-4 w-4" />,
    title: 'Install',
    description:
      'Add the ESLint plugin to your existing project. No new toolchain, no separate config file, no peer-dep war.',
    language: 'bash',
    code: 'npm install -D @deslint/eslint-plugin',
  },
  {
    num: '02',
    icon: <FileCode2 className="h-4 w-4" />,
    title: 'Configure',
    description:
      'Drop Deslint into your flat config alongside whatever ESLint rules you already run. One import, one recommended preset.',
    language: 'typescript',
    filename: 'eslint.config.ts',
    code: `import deslint from '@deslint/eslint-plugin';

export default [
  deslint.configs.recommended,
];`,
  },
  {
    num: '03',
    icon: <Play className="h-4 w-4" />,
    title: 'Run',
    description:
      'Errors appear in every ESLint-aware editor instantly. Ship the same rules to CI and to every pull request with no duplication.',
    language: 'bash',
    code: `# In your editor — squiggles in Cursor, VS Code, WebStorm, …
# In your terminal —
npx eslint . --fix

# Full Design Health Score + audit-ready HTML report
npx deslint compliance`,
  },
];

export function QuickStart() {
  return (
    <section className="relative py-24 px-6 bg-white overflow-hidden">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 max-w-2xl">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.4 }}
            className="text-sm font-semibold text-primary uppercase tracking-wider mb-3"
          >
            30-second install
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-balance"
          >
            Three steps from npm install to a Design Health Score
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg text-gray-500 leading-relaxed"
          >
            No account. No API key. No cloud signup. Everything runs
            against your existing ESLint setup the moment you install the
            package.
          </motion.p>
        </div>

        <div className="relative">
          {/* Connecting line on desktop */}
          <div
            aria-hidden="true"
            className="hidden md:block absolute left-[27px] top-8 bottom-8 w-px bg-gradient-to-b from-primary/30 via-primary/20 to-transparent"
          />
          <div className="space-y-8">
            {STEPS.map((step, i) => (
              <StepBlock key={step.num} step={step} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StepBlock({ step, index }: { step: Step; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="grid gap-5 md:grid-cols-[56px_1fr] items-start"
    >
      {/* Step marker */}
      <div className="flex md:justify-center">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/20">
          <span className="font-mono text-sm tabular-nums">{step.num}</span>
        </div>
      </div>

      {/* Content */}
      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr] lg:gap-7 items-start">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/5 text-primary border border-primary/10">
              {step.icon}
            </span>
            <h3 className="text-xl font-bold text-gray-900 leading-tight">{step.title}</h3>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
        </div>

        <CodeBlock
          language={step.language}
          filename={step.filename}
          code={step.code}
        />
      </div>
    </motion.div>
  );
}

function CodeBlock({
  language,
  filename,
  code,
}: {
  language: string;
  filename?: string;
  code: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <div className="rounded-xl border border-gray-800/50 bg-[#0c0c0c] overflow-hidden shadow-2xl shadow-gray-900/5">
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-black/40">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
          </div>
          {filename ? (
            <span className="text-[11px] text-gray-400 font-mono truncate ml-2">
              {filename}
            </span>
          ) : (
            <span className="text-[11px] text-gray-500 font-mono truncate ml-2">
              {language}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? 'Copied' : 'Copy code'}
          className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-pass" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="px-4 py-4 font-mono text-[12px] leading-relaxed text-gray-200 overflow-x-auto">
        <code>{highlightShell(code, language)}</code>
      </pre>
    </div>
  );
}

/**
 * Tiny stateless syntax painter. Intentionally dumb — no tokenizer, no AST.
 * Just color keywords in the languages we actually render in the steps.
 */
function highlightShell(source: string, language: string): React.ReactNode {
  if (language === 'bash') {
    const lines = source.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('#')) {
        return (
          <div key={i}>
            <span className="text-gray-500">{line}</span>
          </div>
        );
      }
      if (line.trim() === '') return <div key={i}>&nbsp;</div>;
      const [cmd, ...rest] = line.split(' ');
      return (
        <div key={i}>
          <span className="text-pass">{cmd}</span>
          <span className="text-gray-300">{rest.length ? ' ' + rest.join(' ') : ''}</span>
        </div>
      );
    });
  }

  if (language === 'typescript') {
    // Very small set of TypeScript keywords we care about in the config.
    return source.split('\n').map((line, i) => {
      const painted = line
        .replace(/(import|from|export|default|const|let|var)/g, '§§K§§$1§§/K§§')
        .replace(/('[^']*')/g, '§§S§§$1§§/S§§');
      const parts = painted.split(/(§§K§§|§§\/K§§|§§S§§|§§\/S§§)/);
      const nodes: React.ReactNode[] = [];
      let mode: 'plain' | 'k' | 's' = 'plain';
      for (const p of parts) {
        if (p === '§§K§§') {
          mode = 'k';
          continue;
        }
        if (p === '§§/K§§') {
          mode = 'plain';
          continue;
        }
        if (p === '§§S§§') {
          mode = 's';
          continue;
        }
        if (p === '§§/S§§') {
          mode = 'plain';
          continue;
        }
        if (!p) continue;
        if (mode === 'k') {
          nodes.push(
            <span key={nodes.length} className="text-[#c586c0]">
              {p}
            </span>,
          );
        } else if (mode === 's') {
          nodes.push(
            <span key={nodes.length} className="text-[#ce9178]">
              {p}
            </span>,
          );
        } else {
          nodes.push(
            <span key={nodes.length} className="text-gray-300">
              {p}
            </span>,
          );
        }
      }
      return <div key={i}>{nodes.length ? nodes : <>&nbsp;</>}</div>;
    });
  }

  return <span className="text-gray-200">{source}</span>;
}
