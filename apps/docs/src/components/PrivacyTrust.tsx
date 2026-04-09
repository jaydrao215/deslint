'use client';

import { FadeIn } from './motion';
import { ShieldOff, EyeOff, Cpu, Lock, FileCheck2, Terminal } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * "Privacy by architecture" — the other half of the Deslint pitch. Everything
 * SonarQube and CodeRabbit require a cloud roundtrip or an LLM for, Deslint
 * does on the developer's machine. This section makes that unambiguous and
 * unapologetic.
 */
interface Pillar {
  icon: ReactNode;
  badge: string;
  title: string;
  description: string;
  detail: string;
}

const PILLARS: Pillar[] = [
  {
    icon: <ShieldOff className="h-5 w-5" />,
    badge: 'Zero cloud',
    title: 'Your code never leaves your machine',
    description:
      'No SaaS roundtrip. No upload step. No API key in a CI secret. Deslint runs as an ESLint plugin and a local CLI — same binaries, offline-capable, air-gap friendly.',
    detail: 'No egress',
  },
  {
    icon: <EyeOff className="h-5 w-5" />,
    badge: 'Zero telemetry',
    title: 'No analytics, no phone-home',
    description:
      'Deslint does not collect usage, file paths, rule triggers, machine IDs, or anonymous counts. There is nothing to opt out of because there is nothing being collected in the first place.',
    detail: 'No tracking',
  },
  {
    icon: <Cpu className="h-5 w-5" />,
    badge: 'Zero LLMs',
    title: 'Deterministic static analysis',
    description:
      'Every rule is pure AST pattern matching — no LLM, no embedding, no fuzzy judgment. Same input always produces the same output, which is the only way compliance evidence is defensible.',
    detail: 'Pure AST',
  },
];

const BADGES: { icon: ReactNode; label: string; sublabel: string }[] = [
  {
    icon: <Lock className="h-4 w-4" />,
    label: 'Offline-capable',
    sublabel: 'Runs behind a firewall, on an air-gapped CI, inside a container without egress',
  },
  {
    icon: <FileCheck2 className="h-4 w-4" />,
    label: 'Reproducible builds',
    sublabel: 'Same commit → same Design Health Score → same compliance verdict',
  },
  {
    icon: <Terminal className="h-4 w-4" />,
    label: 'MIT-licensed',
    sublabel: 'Inspect every rule, fork it, vendor it, audit it',
  },
];

export function PrivacyTrust() {
  return (
    <section className="relative py-24 px-6 bg-surface-100 overflow-hidden">
      {/* Subtle blueprint grid */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(26,82,118,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(26,82,118,0.2) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative mx-auto max-w-6xl">
        <FadeIn className="mb-14 max-w-2xl">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Privacy by architecture
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-balance">
            Three zeros nobody else can claim
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">
            Security and legal teams buy Deslint because there is nothing to
            review: no vendor, no contract, no cloud, no LLM, no data. The
            architecture is the privacy policy.
          </p>
        </FadeIn>

        <div className="grid gap-6 md:grid-cols-3 mb-12">
          {PILLARS.map((p, i) => (
            <FadeIn key={p.badge} delay={i * 0.08}>
              <div className="h-full rounded-2xl border border-gray-200/80 bg-white p-7 shadow-sm hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 relative overflow-hidden">
                {/* Big "0" watermark */}
                <div
                  aria-hidden="true"
                  className="absolute -top-6 -right-4 text-[140px] font-bold leading-none text-primary/[0.04] select-none"
                >
                  0
                </div>
                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-sm shadow-primary/20">
                      {p.icon}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary-light bg-primary-50 px-2 py-1 rounded-full">
                      {p.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2 leading-snug">
                    {p.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {p.description}
                  </p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Secondary trust row */}
        <FadeIn delay={0.3}>
          <div className="rounded-2xl border border-gray-200/80 bg-white p-5 sm:p-6">
            <div className="grid gap-5 sm:grid-cols-3">
              {BADGES.map((b) => (
                <div key={b.label} className="flex items-start gap-3">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-primary-50 text-primary border border-primary/10">
                    {b.icon}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900">{b.label}</div>
                    <div className="text-xs text-gray-500 leading-relaxed mt-0.5">
                      {b.sublabel}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
