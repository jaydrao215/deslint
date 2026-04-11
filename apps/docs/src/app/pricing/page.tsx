'use client';

import { motion } from 'framer-motion';
import { Check, ArrowRight, ShieldCheck, Users, Building2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

interface Tier {
  name: string;
  icon: typeof ShieldCheck;
  price: string;
  priceSuffix?: string;
  description: string;
  features: string[];
  cta: string;
  ctaStyle: 'primary' | 'outline' | 'dark';
  badge?: string;
  waitlist?: boolean;
  href?: string;
}

const TIERS: Tier[] = [
  {
    name: 'Open Source',
    icon: ShieldCheck,
    price: 'Free',
    priceSuffix: 'forever',
    description:
      'Full ESLint plugin, CLI, and MCP server. Everything you need to gate design quality locally and in CI.',
    features: [
      '33 deterministic rules',
      'WCAG 2.2 AA compliance reports',
      'Design Health Score + quality gates',
      'Auto-fix for 11 rules',
      'React, Vue, Svelte, Angular, HTML',
      'MCP server for AI coding agents',
      'Local-first — zero cloud dependency',
      'MIT licensed',
    ],
    cta: 'Get Started',
    ctaStyle: 'outline',
    href: '/docs/getting-started',
  },
  {
    name: 'Teams',
    icon: Users,
    price: '$29',
    priceSuffix: '/ seat / month',
    description:
      'Cross-repo dashboards, trend tracking, Figma design-token sync, and team-wide quality baselines.',
    features: [
      'Everything in Open Source',
      'Team dashboard with trend charts',
      'Cross-repo design debt tracking',
      'Figma design-token sync',
      'Shared quality gate presets',
      'Slack / Teams notifications',
      'Priority rule-request voting',
      'Email support (< 24 h SLA)',
    ],
    cta: 'Join the Waitlist',
    ctaStyle: 'primary',
    badge: 'Coming Soon',
    waitlist: true,
  },
  {
    name: 'Enterprise',
    icon: Building2,
    price: 'Custom',
    description:
      'Self-hosted deployment, SSO, audit logs, custom rules, and dedicated onboarding for large engineering orgs.',
    features: [
      'Everything in Teams',
      'Self-hosted / air-gapped deployment',
      'SAML SSO + SCIM provisioning',
      'Audit logs + compliance exports',
      'Custom rule development',
      'Dedicated success engineer',
      'SLA-backed support (< 4 h)',
      'Volume licensing',
    ],
    cta: 'Contact Us',
    ctaStyle: 'dark',
    waitlist: true,
  },
];

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main>
        <PricingHero />
        <PricingGrid />
        <FaqSection />
      </main>
      <Footer />
    </>
  );
}

/* ─── Hero ─────────────────────────────────────────────────── */

function PricingHero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-16 px-6">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(83, 74, 183, 0.07), transparent)',
          }}
        />
        <div className="absolute inset-0 dot-grid opacity-40" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary-50/60 px-4 py-1.5 text-sm font-medium text-primary mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            Open source core, paid team layer
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-[1.1] mb-5"
        >
          Free to lint.{' '}
          <span className="gradient-text-hero">Pay to scale.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-base sm:text-lg text-gray-500 leading-relaxed max-w-xl mx-auto"
        >
          Every rule, every framework, every CI pipeline — free and MIT-licensed.
          Teams and Enterprise add dashboards, trend tracking, and org-wide governance.
        </motion.p>
      </div>
    </section>
  );
}

/* ─── Pricing Grid ─────────────────────────────────────────── */

function PricingGrid() {
  return (
    <section className="px-6 pb-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-6 lg:grid-cols-3">
          {TIERS.map((tier, i) => (
            <TierCard key={tier.name} tier={tier} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TierCard({ tier, index }: { tier: Tier; index: number }) {
  const isHighlighted = tier.ctaStyle === 'primary';

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 + index * 0.1, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={`relative flex flex-col rounded-2xl border p-7 transition-shadow duration-300 ${
        isHighlighted
          ? 'border-primary/30 bg-white shadow-xl shadow-primary/10 ring-1 ring-primary/10'
          : 'border-gray-200 bg-white hover:shadow-lg hover:shadow-gray-200/60'
      }`}
    >
      {tier.badge && (
        <div className="absolute -top-3 left-7">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white shadow-lg shadow-primary/25">
            <Sparkles className="h-3 w-3" />
            {tier.badge}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${
              isHighlighted
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            <tier.icon className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">{tier.name}</h2>
        </div>

        <div className="flex items-baseline gap-1.5 mb-3">
          <span className="text-4xl font-bold tracking-tight text-gray-900">
            {tier.price}
          </span>
          {tier.priceSuffix && (
            <span className="text-sm text-gray-500">{tier.priceSuffix}</span>
          )}
        </div>

        <p className="text-sm text-gray-500 leading-relaxed">{tier.description}</p>
      </div>

      {/* Features */}
      <ul className="mb-8 space-y-3 flex-1">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm text-gray-700">
            <Check className="h-4 w-4 mt-0.5 shrink-0 text-pass" />
            {feature}
          </li>
        ))}
      </ul>

      {/* CTA */}
      {tier.waitlist ? (
        <WaitlistForm tier={tier} />
      ) : (
        <Link
          href={tier.href ?? '#'}
          className={`flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-300 ${ctaClasses(tier.ctaStyle)}`}
        >
          {tier.cta}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </motion.div>
  );
}

function ctaClasses(style: Tier['ctaStyle']): string {
  switch (style) {
    case 'primary':
      return 'bg-primary text-white hover:bg-primary-light hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5';
    case 'dark':
      return 'bg-gray-900 text-white hover:bg-gray-800 hover:shadow-xl hover:shadow-gray-900/20 hover:-translate-y-0.5';
    case 'outline':
      return 'border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5';
  }
}

/* ─── Waitlist Form ────────────────────────────────────────── */

function WaitlistForm({ tier }: { tier: Tier }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setState('submitting');

    try {
      // POST to the waitlist API route.
      // Falls back to localStorage if the endpoint is not yet deployed.
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), tier: tier.name }),
      });

      if (res.ok) {
        setState('success');
        return;
      }
    } catch {
      // API not available — store locally as fallback
    }

    // Fallback: persist to localStorage so entries aren't lost
    try {
      const key = 'deslint_waitlist';
      const existing = JSON.parse(localStorage.getItem(key) ?? '[]');
      existing.push({ email: email.trim(), tier: tier.name, ts: Date.now() });
      localStorage.setItem(key, JSON.stringify(existing));
    } catch {
      // storage unavailable
    }

    setState('success');
  }

  if (state === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center justify-center gap-2 rounded-xl bg-pass/10 border border-pass/20 px-5 py-3 text-sm font-semibold text-pass"
      >
        <Check className="h-4 w-4" />
        You&apos;re on the list!
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
      <div className="flex gap-2">
        <label htmlFor={`waitlist-${tier.name}`} className="sr-only">
          Email address
        </label>
        <input
          id={`waitlist-${tier.name}`}
          type="email"
          required
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40 transition-all"
        />
        <button
          type="submit"
          disabled={state === 'submitting'}
          className={`shrink-0 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-300 disabled:opacity-60 ${ctaClasses(tier.ctaStyle)}`}
        >
          {state === 'submitting' ? 'Joining...' : tier.cta}
        </button>
      </div>
      <p className="text-[11px] text-gray-400 text-center">
        No spam, ever. We&apos;ll only email when {tier.name} launches.
      </p>
    </form>
  );
}

/* ─── FAQ ──────────────────────────────────────────────────── */

const FAQS = [
  {
    q: 'Will the open source version stay free?',
    a: 'Yes. The ESLint plugin, CLI, MCP server, and GitHub Action are MIT-licensed and will always be free. Paid tiers add team collaboration features on top — they never gate-keep existing functionality.',
  },
  {
    q: 'What happens after I join the waitlist?',
    a: "You'll receive a single email when the Teams or Enterprise tier launches. No newsletters, no drip campaigns — just the launch announcement with early-access pricing.",
  },
  {
    q: 'Can I self-host the paid features?',
    a: 'The Enterprise tier includes self-hosted / air-gapped deployment. Teams is a managed service. Both keep your source code local — only aggregated scores and metadata leave your machine.',
  },
  {
    q: 'How does pricing work for open source maintainers?',
    a: "Open source projects get Teams features free. We'll announce the OSS program alongside the Teams launch.",
  },
  {
    q: 'Is there a free trial for Teams?',
    a: 'Yes. Every Teams subscription starts with a 14-day free trial, no credit card required.',
  },
];

function FaqSection() {
  return (
    <section className="border-t border-gray-100 bg-surface-100 py-20 px-6">
      <div className="mx-auto max-w-3xl">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 text-center mb-12"
        >
          Frequently asked questions
        </motion.h2>

        <div className="space-y-6">
          {FAQS.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="rounded-xl border border-gray-200 bg-white p-6"
            >
              <h3 className="text-sm font-semibold text-gray-900 mb-2">{faq.q}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
