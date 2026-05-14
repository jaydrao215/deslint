'use client';

import Link from 'next/link';
import { FadeIn, StaggerContainer, StaggerItem } from './motion';
import { ShieldCheck, Globe, FileLock, KeyRound, GitBranch } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface InterceptorTile {
  tool: string;
  status: 'shipped' | 'next' | 'planned';
  title: string;
  body: string;
  Icon: LucideIcon;
}

const INTERCEPTORS: InterceptorTile[] = [
  {
    tool: 'verify_shell_exec',
    status: 'shipped',
    title: 'Shell commands',
    body: 'Allow / deny per-pattern with built-in detection for rm -rf /, curl | sh, reverse shells, and history rewrites.',
    Icon: ShieldCheck,
  },
  {
    tool: 'verify_outbound_request',
    status: 'next',
    title: 'Outbound HTTP',
    body: 'Allowlist hosts the agent may call; block private/loopback/metadata IPs (SSRF) at runtime.',
    Icon: Globe,
  },
  {
    tool: 'verify_file_read',
    status: 'planned',
    title: 'File reads',
    body: 'Confine reads to project root; flag .env, secrets directories, and credential stores.',
    Icon: FileLock,
  },
  {
    tool: 'verify_secret_access',
    status: 'planned',
    title: 'Secret access',
    body: 'Intercept process.env.* reads; flag access to unallowlisted secret keys at runtime.',
    Icon: KeyRound,
  },
  {
    tool: 'verify_git_op',
    status: 'planned',
    title: 'Git operations',
    body: 'Block force-push to protected branches; block history rewrites and tag deletes.',
    Icon: GitBranch,
  },
];

/**
 * Homepage section introducing the Agent Action Firewall.
 *
 * Positioned between McpLoopSection (file-write verification) and ProductShowcase.
 * The arc: "MCP pre-checks the file before write" → "the firewall pre-checks every
 * other action the agent takes." Sub-1 ms warm latency is the contract.
 */
export function AgentFirewallSection() {
  return (
    <section
      id="agent-firewall"
      className="relative overflow-hidden bg-white px-6 py-24"
    >
      {/* Subtle dot grid */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(rgba(15, 76, 117, 0.6) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative mx-auto max-w-6xl">
        <FadeIn className="mb-12 max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            New in v0.10 — Agent Action Firewall
          </div>
          <h2 className="mb-4 text-balance text-3xl font-bold leading-tight text-gray-900 sm:text-4xl">
            File writes were the start.{' '}
            <span className="gradient-text-hero">
              Now intercept every agent action.
            </span>
          </h2>
          <p className="text-lg leading-relaxed text-gray-600">
            The same MCP gate that pre-checks file writes now pre-checks the
            other ways an agent touches your machine. Your AI calls{' '}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-base text-primary">
              verify_shell_exec
            </code>{' '}
            before running any command. Deslint reads{' '}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm">
              .deslint/policy.yml
            </code>{' '}
            and returns{' '}
            <code className="rounded bg-pass/10 px-1.5 py-0.5 font-mono text-sm text-pass">
              allow
            </code>
            {' / '}
            <code className="rounded bg-warn/10 px-1.5 py-0.5 font-mono text-sm text-warn">
              warn
            </code>
            {' / '}
            <code className="rounded bg-fail/10 px-1.5 py-0.5 font-mono text-sm text-fail">
              deny
            </code>{' '}
            in under a millisecond. Same input, same verdict. Same policy file
            covers every interceptor as it ships.
          </p>
        </FadeIn>

        <StaggerContainer
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          staggerDelay={0.05}
        >
          {INTERCEPTORS.map((intr) => (
            <StaggerItem key={intr.tool}>
              <article className="group relative flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-6 transition-colors hover:border-primary/30">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary ring-1 ring-primary/10">
                    <intr.Icon className="h-5 w-5" />
                  </span>
                  <StatusPill status={intr.status} />
                </div>
                <h3 className="mb-1 text-base font-semibold text-gray-900">
                  {intr.title}
                </h3>
                <code className="mb-3 block font-mono text-2xs text-primary">
                  {intr.tool}
                </code>
                <p className="text-sm leading-relaxed text-gray-500">
                  {intr.body}
                </p>
              </article>
            </StaggerItem>
          ))}
          <StaggerItem>
            <Link
              href="/firewall"
              className="group flex h-full flex-col justify-between rounded-2xl border border-dashed border-primary/40 bg-primary-50/40 p-6 transition-colors hover:border-primary hover:bg-primary-50"
            >
              <div>
                <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <h3 className="mb-2 text-base font-semibold text-gray-900">
                  Read the firewall page
                </h3>
                <p className="text-sm leading-relaxed text-gray-500">
                  Why a deterministic firewall, the policy DSL spec, and the
                  seven built-in dangerous-pattern checks.
                </p>
              </div>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:text-primary-light">
                /firewall
                <span aria-hidden>→</span>
              </span>
            </Link>
          </StaggerItem>
        </StaggerContainer>

        <FadeIn delay={0.2}>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <TrustCell value="<1ms" label="warm verdict" detail="cached policy + result · in-process regex" />
            <TrustCell value="7 builtins" label="dangerous-pattern checks" detail="rm -rf / · curl|sh · reverse shell · history rewrite · …" />
            <TrustCell value="0 bytes" label="of source code sent anywhere" detail="local YAML policy · stdio MCP · no network" />
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

function StatusPill({ status }: { status: 'shipped' | 'next' | 'planned' }) {
  if (status === 'shipped') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-pass/10 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider text-pass ring-1 ring-pass/20">
        <span className="h-1.5 w-1.5 rounded-full bg-pass" /> Shipped
      </span>
    );
  }
  if (status === 'next') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/20">
        Next
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider text-gray-500 ring-1 ring-gray-200">
      Planned
    </span>
  );
}

function TrustCell({
  value,
  label,
  detail,
}: {
  value: string;
  label: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-2xl font-bold text-primary tabular-nums">{value}</span>
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      <p className="mt-1 break-words font-mono text-xs text-gray-500">{detail}</p>
    </div>
  );
}
