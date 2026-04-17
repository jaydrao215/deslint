import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: "shadcn/ui × Deslint — One command to enforce your design tokens",
  description:
    "End-to-end smoke test: pipe a shadcn/ui Style Dictionary tokens file through `deslint import-tokens`, get a Deslint-ready design system in one command. Local-only. Zero cloud.",
  alternates: { canonical: '/case-studies/shadcn' },
  openGraph: {
    title: 'Deslint × shadcn/ui — Token import case study',
    description:
      '25 tokens imported in one command. Colours, radii, fonts, mapped to deslint rule inputs with no hand-editing.',
    url: 'https://deslint.com/case-studies/shadcn',
    type: 'article',
  },
};

export default function ShadcnCaseStudy() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pt-32 pb-20">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
          Case study · shadcn/ui
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-[1.1] mb-6">
          shadcn/ui × Deslint
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed mb-8">
          shadcn/ui is the most widely adopted React component library running
          today. Teams that fork it almost immediately customise the token
          palette — then watch Cursor, Claude Code, and Codex quietly reach
          for <code>bg-[#1a5276]</code> because the agent doesn&apos;t know the
          customised palette. This case study walks the one-command fix:
          import your shadcn tokens into deslint, then let the rules enforce
          them on every AI-generated file.
        </p>

        <section className="mb-10">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-4">
            The setup
          </h2>
          <p className="text-gray-600 mb-4">
            A shadcn/ui project&apos;s tokens typically live as CSS custom
            properties. For this smoke test we exported them to a Style
            Dictionary JSON — the format most shadcn consumers already ship
            through their build pipeline. The representative input (19 colour
            tokens, 4 radii, 2 fonts — 25 total):
          </p>
          <div className="rounded-xl bg-gray-950 text-gray-200 font-mono text-xs px-5 py-4 overflow-x-auto leading-relaxed">
            <pre className="whitespace-pre"><code>{`{
  "color": {
    "background":  { "value": "hsl(0 0% 100%)",         "type": "color" },
    "foreground":  { "value": "hsl(222.2 84% 4.9%)",    "type": "color" },
    "primary": {
      "DEFAULT":   { "value": "hsl(222.2 47.4% 11.2%)", "type": "color" },
      "foreground":{ "value": "hsl(210 40% 98%)",       "type": "color" }
    },
    "destructive": {
      "DEFAULT":   { "value": "hsl(0 84.2% 60.2%)",     "type": "color" },
      "foreground":{ "value": "hsl(210 40% 98%)",       "type": "color" }
    },
    "border":      { "value": "hsl(214.3 31.8% 91.4%)", "type": "color" },
    /* …muted, accent, secondary, popover, card, ring… */
  },
  "radius": {
    "sm": { "value": "0.125rem", "type": "border-radius" },
    "md": { "value": "0.375rem", "type": "border-radius" },
    "lg": { "value": "0.5rem",   "type": "border-radius" },
    "xl": { "value": "0.75rem",  "type": "border-radius" }
  },
  "font": {
    "sans": { "value": "Inter, system-ui, sans-serif",  "type": "font-family" },
    "mono": { "value": "JetBrains Mono, monospace",     "type": "font-family" }
  }
}`}</code></pre>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-4">
            One command
          </h2>
          <div className="rounded-xl bg-gray-950 text-gray-200 font-mono text-sm px-5 py-4 mb-4">
            <span className="text-gray-500 select-none">$ </span>
            <span className="text-white">npx deslint import-tokens --style-dictionary shadcn.tokens.json --format deslintrc --output shadcn.deslintrc.json</span>
          </div>
          <div className="rounded-xl bg-gray-950 text-gray-200 font-mono text-xs px-5 py-4 overflow-x-auto leading-relaxed">
            <div className="text-gray-400">Reading Style Dictionary tokens (local files)…</div>
            <div>
              <span className="text-pass">✓</span>{' '}
              <span className="text-white">Imported 25 token(s) from 1 file(s)</span>
            </div>
            <div>
              <span className="text-pass">✓</span>{' '}
              <span className="text-white">Wrote shadcn.deslintrc.json</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-4">
            25 of 25 tokens accepted. No warnings, no skipped leaves, no manual
            massaging. The adapter ran entirely on-device — no network calls.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-4">
            The output
          </h2>
          <p className="text-gray-600 mb-4">
            A <code>.deslintrc.json</code> fragment ready to merge into your
            existing Deslint config. Every deslint colour / radius / font rule
            immediately recognises the shadcn palette as the allowed set:
          </p>
          <div className="rounded-xl bg-gray-950 text-gray-200 font-mono text-xs px-5 py-4 overflow-x-auto leading-relaxed">
            <pre className="whitespace-pre"><code>{`{
  "designSystem": {
    "colors": {
      "background":           "hsl(0 0% 100%)",
      "foreground":           "hsl(222.2 84% 4.9%)",
      "primary-DEFAULT":      "hsl(222.2 47.4% 11.2%)",
      "primary-foreground":   "hsl(210 40% 98%)",
      "secondary-DEFAULT":    "hsl(210 40% 96.1%)",
      "muted-DEFAULT":        "hsl(210 40% 96.1%)",
      "destructive-DEFAULT":  "hsl(0 84.2% 60.2%)",
      "border":               "hsl(214.3 31.8% 91.4%)",
      "ring":                 "hsl(222.2 84% 4.9%)"
      /* …12 more color keys… */
    },
    "borderRadius": {
      "sm": "0.125rem",
      "md": "0.375rem",
      "lg": "0.5rem",
      "xl": "0.75rem"
    },
    "fonts": {
      "sans": "Inter, system-ui, sans-serif",
      "mono": "JetBrains Mono, monospace"
    }
  }
}`}</code></pre>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-4">
            What the rules now catch
          </h2>
          <p className="text-gray-600 mb-3">
            With the fragment merged, any diff that introduces an
            off-palette colour, an off-scale radius, or a font outside the
            declared pair fails the rule — whether it came from you or from
            an agent:
          </p>
          <ul className="space-y-3 text-gray-700">
            <li>
              <code>no-arbitrary-colors</code> flags{' '}
              <code>bg-[#1a5276]</code> because it isn&apos;t in the 19-colour
              shadcn palette.
            </li>
            <li>
              <code>no-arbitrary-border-radius</code> flags{' '}
              <code>rounded-[11px]</code> because 11 px isn&apos;t one of the
              four radii you declared.
            </li>
            <li>
              <code>no-arbitrary-font-family</code> flags an inline{' '}
              <code>font-[Arial]</code> because only <code>sans</code> and{' '}
              <code>mono</code> are allowed.
            </li>
            <li>
              <code>enforce_budget</code> returns a clean pass when Cursor
              or Claude Code calls the MCP tool — so the agent will stop
              before committing drift.
            </li>
          </ul>
        </section>

        <section className="mb-10 rounded-xl border border-primary/20 bg-primary-50/30 px-6 py-5">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900 mb-3">
            Why this matters for AI-driven teams
          </h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            The shadcn palette is small enough that a human reviewer could
            catch most drift. An agent writing dozens of files per hour
            cannot. By importing the tokens once — this one command — you
            hand the agent a deterministic rule for what a valid shadcn-style
            colour is. No more guessing. No more arbitrary hex sneaking into
            your diff review. And because the adapter is local-only, the
            shadcn palette stays on your machine.
          </p>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/mcp"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-light"
          >
            Install the MCP server
          </Link>
          <Link
            href="/docs/getting-started"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50"
          >
            Getting started
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50"
          >
            Pricing
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
