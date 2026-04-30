import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FadeIn } from '@/components/motion';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';

const PUBLISHED = '2026-04-30';
const UPDATED = '2026-04-30';
const READING_MINUTES = 13;

export const metadata: Metadata = {
  title: 'Frontend launch readiness: 14 checks before AI code goes live',
  description:
    'A deterministic 14-point launch checklist for apps your AI just wrote. Design tokens, responsive coverage, WCAG 2.2, dark mode, and the frontend-safety basics — with the rule that catches each one and a one-command scan to run them all.',
  alternates: { canonical: '/blog/frontend-launch-readiness-checklist' },
  keywords: [
    'frontend launch checklist',
    'is my ai app ready to ship',
    'pre-launch checklist react',
    'ai code launch readiness',
    'cursor app launch checklist',
    'shadcn launch checklist',
    'tailwind pre-launch qa',
    'wcag 2.2 launch checklist',
    'frontend safety checklist',
    'dangerously set inner html xss',
    'launch readiness ai generated code',
  ],
  openGraph: {
    title: 'Frontend launch readiness: 14 checks before AI code goes live',
    description:
      'A deterministic 14-point launch checklist for apps your AI just wrote. One command runs them all.',
    url: 'https://deslint.com/blog/frontend-launch-readiness-checklist',
    type: 'article',
    publishedTime: PUBLISHED,
    modifiedTime: UPDATED,
    authors: ['Deslint'],
    // Explicit override — the root layout sets a site-wide
    // openGraph.images. Without this, the inherited image wins over the
    // colocated opengraph-image.tsx in this same directory. See
    // /launch-check/page.tsx for the same pattern.
    images: [
      {
        url: '/blog/frontend-launch-readiness-checklist/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Frontend launch readiness — 14 checks before AI code goes live',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Frontend launch readiness: 14 checks before AI code goes live',
    description:
      'A deterministic checklist for AI-built frontends — design tokens, responsive, WCAG, dark mode, and frontend-safety basics.',
    images: ['/blog/frontend-launch-readiness-checklist/opengraph-image'],
  },
};

// Two complementary JSON-LD blobs: BlogPosting (article metadata) and
// HowTo (step-by-step rich result). HowTo eligibility on a 14-step
// checklist is the highest-leverage rich-snippet shape Google rewards
// for this content type. The no-dangerous-html rule whitelists
// <script type="application/ld+json"> so this won't fire on us.
const ARTICLE_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: 'Frontend launch readiness: 14 checks before AI code goes live',
  description:
    'A deterministic 14-point launch checklist for AI-built frontends — design tokens, responsive coverage, WCAG 2.2, dark mode, and the frontend-safety basics.',
  datePublished: PUBLISHED,
  dateModified: UPDATED,
  author: { '@type': 'Organization', name: 'Deslint', url: 'https://deslint.com' },
  publisher: {
    '@type': 'Organization',
    name: 'Deslint',
    url: 'https://deslint.com',
    logo: { '@type': 'ImageObject', url: 'https://deslint.com/icons/icon-192.png' },
  },
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': 'https://deslint.com/blog/frontend-launch-readiness-checklist',
  },
  keywords:
    'frontend launch checklist, is my ai app ready to ship, pre-launch checklist react, ai code launch readiness, wcag 2.2 launch checklist',
};

const HOWTO_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'Run the 14-check frontend launch readiness scan on AI-built code',
  description:
    'A 14-step deterministic checklist for verifying AI-generated frontend code before a launch.',
  totalTime: 'PT15M',
  estimatedCost: { '@type': 'MonetaryAmount', currency: 'USD', value: '0' },
  step: [
    { '@type': 'HowToStep', position: 1, name: 'No hardcoded Tailwind spacing values', url: 'https://deslint.com/docs/rules/no-arbitrary-spacing' },
    { '@type': 'HowToStep', position: 2, name: 'No hex colors outside the palette', url: 'https://deslint.com/docs/rules/no-arbitrary-colors' },
    { '@type': 'HowToStep', position: 3, name: 'No magic numbers in grid / flex layout', url: 'https://deslint.com/docs/rules/no-magic-numbers-layout' },
    { '@type': 'HowToStep', position: 4, name: 'No fixed-width containers without breakpoints', url: 'https://deslint.com/docs/rules/responsive-required' },
    { '@type': 'HowToStep', position: 5, name: 'Viewport meta does not block zoom', url: 'https://deslint.com/docs/rules/viewport-meta' },
    { '@type': 'HowToStep', position: 6, name: 'Interactive targets ≥ 24×24', url: 'https://deslint.com/docs/rules/touch-target-size' },
    { '@type': 'HowToStep', position: 7, name: 'Every <img> has meaningful alt (WCAG 1.1.1)', url: 'https://deslint.com/docs/rules/image-alt-text' },
    { '@type': 'HowToStep', position: 8, name: 'Every form input has a programmatic label (WCAG 1.3.1)', url: 'https://deslint.com/docs/rules/form-labels' },
    { '@type': 'HowToStep', position: 9, name: 'No generic link text (WCAG 2.4.4)', url: 'https://deslint.com/docs/rules/link-text' },
    { '@type': 'HowToStep', position: 10, name: 'No outline:none without a focus indicator (WCAG 2.4.7)', url: 'https://deslint.com/docs/rules/focus-visible-style' },
    { '@type': 'HowToStep', position: 11, name: 'Dark mode applied across, not on a sample', url: 'https://deslint.com/docs/rules/dark-mode-coverage' },
    { '@type': 'HowToStep', position: 12, name: 'No dangerouslySetInnerHTML on untrusted data', url: 'https://deslint.com/docs/rules/no-dangerous-html' },
    { '@type': 'HowToStep', position: 13, name: '<a target="_blank"> has rel="noopener noreferrer"', url: 'https://deslint.com/docs/rules/safe-external-links' },
    { '@type': 'HowToStep', position: 14, name: '<iframe> has a sandbox attribute', url: 'https://deslint.com/docs/rules/iframe-sandbox' },
  ],
};

// Reusable helper for each check — keeps the article body scannable and
// uniform without duplicating the title/rule/code structure 14 times.
function CheckCard({
  num,
  title,
  rule,
  ruleHref,
  wcag,
  badCode,
  goodCode,
  children,
}: {
  num: number;
  title: string;
  rule: string;
  ruleHref: string;
  wcag?: string;
  badCode: string;
  goodCode: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-6 py-5 mb-5">
      <div className="flex items-baseline gap-3 flex-wrap mb-2">
        <span className="inline-flex items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold w-7 h-7">
          {num}
        </span>
        <h3 className="text-xl font-semibold tracking-tight text-gray-900">{title}</h3>
        {wcag && (
          <span className="text-xs font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
            WCAG {wcag}
          </span>
        )}
      </div>
      <div className="text-sm text-gray-600 leading-relaxed mb-3">{children}</div>
      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <div className="rounded-lg bg-fail/5 border border-fail/15 px-3 py-2 font-mono text-xs text-gray-700 whitespace-pre overflow-x-auto">
          <div className="text-fail-dark text-2xs font-sans font-semibold uppercase tracking-wider mb-1">
            What AI ships
          </div>
          {badCode}
        </div>
        <div className="rounded-lg bg-pass/5 border border-pass/15 px-3 py-2 font-mono text-xs text-gray-700 whitespace-pre overflow-x-auto">
          <div className="text-pass-dark text-2xs font-sans font-semibold uppercase tracking-wider mb-1">
            What it should look like
          </div>
          {goodCode}
        </div>
      </div>
      <div className="text-xs text-gray-500">
        <span className="font-semibold text-gray-700">Caught by: </span>
        <Link href={ruleHref} className="font-mono text-primary hover:underline">
          {rule}
        </Link>
      </div>
    </div>
  );
}

function CategoryHeading({ num, title, blurb }: { num: string; title: string; blurb: string }) {
  // Plain <div> instead of FadeIn — the consistent-component-spacing rule
  // groups all FadeIn instances and complains when one uses mt-12/mb-6
  // while the others use mt-14/mb-12. Category headings genuinely want
  // tighter spacing into their content, so we opt out of the FadeIn class
  // group rather than match the other vertical rhythm.
  return (
    <div className="mt-12 mb-6">
      <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
        Category {num}
      </p>
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-2">
        {title}
      </h2>
      <p className="text-base text-gray-600 leading-relaxed">{blurb}</p>
    </div>
  );
}

export default function FrontendLaunchReadinessChecklist() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_JSON_LD) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(HOWTO_JSON_LD) }}
      />
      <BreadcrumbJsonLd
        trail={[
          { name: 'Blog', path: '/blog' },
          { name: 'Frontend launch readiness', path: '/blog/frontend-launch-readiness-checklist' },
        ]}
      />
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pt-32 pb-20">
        {/* Article header */}
        <FadeIn className="mb-12">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
            Launch readiness · {READING_MINUTES} min read
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-[1.08] mb-6">
            Frontend launch readiness:{' '}
            <span className="text-primary">14 checks before AI code goes live</span>
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed mb-8">
            Cursor wrote your checkout flow. Claude Code added a settings page in
            twenty seconds. Codex generated the whole signup form. Everything looks
            fine in dev — until someone opens it on a phone, in dark mode, with a
            screen reader, on the same Wi-Fi as a malicious frame.{' '}
            <strong className="text-gray-900">
              Here&rsquo;s the deterministic 14-point checklist your AI didn&rsquo;t
              run.
            </strong>
          </p>
          <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
            <time dateTime={PUBLISHED}>April 30, 2026</time>
            <span aria-hidden="true">·</span>
            <span>{READING_MINUTES} min read</span>
            <span aria-hidden="true">·</span>
            <Link href="/launch-check" className="text-primary hover:underline">
              Run the scan
            </Link>
            <span aria-hidden="true">·</span>
            <Link href="/docs/rules" className="text-primary hover:underline">
              All 37 rules
            </Link>
          </div>
        </FadeIn>

        {/* Intro */}
        <FadeIn className="prose prose-gray max-w-none mb-12 text-gray-700 leading-relaxed">
          <p className="text-base mb-4">
            Most launch checklists are vibes. &ldquo;Make sure responsive works.
            Test dark mode. Run an accessibility audit.&rdquo; Items vague enough
            that anyone can tick them off without actually checking anything. Then
            production breaks.
          </p>
          <p className="text-base mb-4">
            This one is different. Every check is a deterministic ESLint rule that
            either passes or fails on every render of every file — no LLM in the
            check path, no judgement calls. Run it once, get a 0&ndash;100 score
            and a list of the exact lines to fix. Then run it again on the next
            AI-generated PR. Then on the one after that.
          </p>
          <p className="text-base mb-4">
            Fourteen checks across five categories &mdash; design tokens,
            responsive coverage, WCAG 2.2, dark mode, and the frontend-safety
            basics that a freshly-generated React app routinely ships without. We
            walk all fourteen below, with the rule that catches each one and a
            two-line bad/good diff. The closing section turns the whole list into
            a single command: <code className="font-mono text-sm bg-gray-100 px-1.5 py-0.5 rounded">npx deslint launch-check</code>.
          </p>
          <p className="text-base">
            None of this is novel. The rules have existed in some form for years
            in the ESLint ecosystem. What&rsquo;s new is the volume of code AI
            agents are now writing &mdash; and the fact that they consistently
            ship the same fourteen mistakes. The checklist exists because the
            agents don&rsquo;t.
          </p>
        </FadeIn>


        {/* Category 1: Design tokens */}
        <CategoryHeading
          num="1 / 5"
          title="Design tokens (3 checks)"
          blurb="Tailwind made the design system visible in className. AI agents make it disappear again with arbitrary values: p-[13px] instead of p-3, bg-[#1A5276] instead of bg-primary. Three checks catch every common drift before it sediments into the codebase."
        />

        <CheckCard
          num={1}
          title="No hardcoded Tailwind spacing"
          rule="no-arbitrary-spacing"
          ruleHref="/docs/rules/no-arbitrary-spacing"
          badCode={`<div className="p-[13px] m-[7px] gap-[20px]" />`}
          goodCode={`<div className="p-3 m-2 gap-5" />`}
        >
          AI agents pick whatever pixel value matches the screenshot they were
          given, ignoring your spacing scale. Three weeks later your scale has
          fifteen near-identical values nobody chose, and rhythm collapses. The
          rule flags <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">p-[Npx]</code>,{' '}
          <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">m-[Npx]</code>,{' '}
          <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">gap-[Npx]</code>,{' '}
          <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">w-[Npx]</code>{' '}
          and friends, and auto-fixes to the nearest scale entry.
        </CheckCard>

        <CheckCard
          num={2}
          title="No hex colors outside the palette"
          rule="no-arbitrary-colors"
          ruleHref="/docs/rules/no-arbitrary-colors"
          badCode={`<button className="bg-[#1A5276] text-[#fff]" />`}
          goodCode={`<button className="bg-primary text-white" />`}
        >
          A raw hex inside <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">className</code>{' '}
          ships a brand color that isn&rsquo;t in your tokens, won&rsquo;t flip in
          dark mode, and won&rsquo;t pass contrast on every surface. Catches{' '}
          <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">bg-[#...]</code>,{' '}
          <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">text-[rgb(...)]</code>,{' '}
          <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">border-[hsl(...)]</code>{' '}
          and rewrites them to the closest token. CSS variables (
          <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">var(--brand)</code>
          ) are allowed by default.
        </CheckCard>

        <CheckCard
          num={3}
          title="No magic numbers in grid / flex layout"
          rule="no-magic-numbers-layout"
          ruleHref="/docs/rules/no-magic-numbers-layout"
          badCode={`<div className="grid grid-cols-[200px_1fr] basis-[180px]" />`}
          goodCode={`<div className="grid grid-cols-[var(--sidebar)_1fr] basis-[var(--sidebar)]" />`}
        >
          AI loves <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">grid-cols-[200px_1fr]</code>{' '}
          because it matches the design at one breakpoint. It also breaks the
          moment a label gets longer or the language switches. The rule flags raw
          pixel values in grid, flex, and order utilities &mdash; CSS functions
          like <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">minmax()</code>{' '}
          and <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">repeat()</code>{' '}
          pass through.
        </CheckCard>


        {/* Category 2: Responsive */}
        <CategoryHeading
          num="2 / 5"
          title="Responsive (3 checks)"
          blurb="Most AI agents never opened DevTools. They built your UI at one viewport size, the one in their training distribution. Three checks catch the layouts that pretend desktop is everywhere."
        />

        <CheckCard
          num={4}
          title="No fixed-width containers without breakpoints"
          rule="responsive-required"
          ruleHref="/docs/rules/responsive-required"
          badCode={`<div className="w-[800px]">…</div>`}
          goodCode={`<div className="w-full max-w-[800px] sm:w-auto">…</div>`}
        >
          A literal <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">w-[800px]</code>{' '}
          ships horizontal scroll on every phone in the world. The rule flags any
          fixed-width container (w, max-w, min-w with a px value) that
          doesn&rsquo;t also declare a responsive variant under the configured
          breakpoints (<code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">sm:</code>,{' '}
          <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">md:</code>{' '}
          by default).
        </CheckCard>

        <CheckCard
          num={5}
          title="Viewport meta does not block zoom"
          rule="viewport-meta"
          ruleHref="/docs/rules/viewport-meta"
          badCode={`<meta name="viewport" content="width=device-width, user-scalable=no" />`}
          goodCode={`<meta name="viewport" content="width=device-width, initial-scale=1" />`}
        >
          AI sometimes copy-pastes a {' '}
          <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">user-scalable=no</code>{' '}
          or <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">maximum-scale=1</code>{' '}
          from a 2016 Stack Overflow answer that was wrong then too. Both block
          users with low vision from pinch-zooming and fail WCAG 1.4.4. The rule
          flags the offending viewport meta in the document head.
        </CheckCard>

        <CheckCard
          num={6}
          title="Interactive targets ≥ 24×24"
          rule="touch-target-size"
          ruleHref="/docs/rules/touch-target-size"
          wcag="2.5.8"
          badCode={`<button className="h-4 w-4 p-0">×</button>`}
          goodCode={`<button className="h-6 w-6 p-1 inline-flex items-center justify-center">×</button>`}
        >
          A 16&times;16 close button works on a desktop trackpad and is
          unhittable on a phone. WCAG 2.2 AA requires interactive targets to be
          at least 24&times;24 CSS pixels (or have 24px spacing around them). The
          rule walks every <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">&lt;button&gt;</code>,{' '}
          <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">&lt;a&gt;</code>, and form
          control and computes the rendered click box from Tailwind sizing
          utilities.
        </CheckCard>


        {/* Category 3: Accessibility */}
        <CategoryHeading
          num="3 / 5"
          title="Accessibility — WCAG 2.2 (4 checks)"
          blurb="Accessibility is the first thing AI strips when it's 'cleaning up' code. Every check below cites the WCAG success criterion it enforces, so when reviewers ask what spec line you fail, the answer is in the lint message."
        />

        <CheckCard
          num={7}
          title="Every <img> has meaningful alt"
          rule="image-alt-text"
          ruleHref="/docs/rules/image-alt-text"
          wcag="1.1.1"
          badCode={`<img src="/hero.jpg" />
<img src="/hero.jpg" alt="image" />`}
          goodCode={`<img src="/hero.jpg" alt="Two engineers reviewing a dashboard on a laptop" />
<img src="/decoration.svg" alt="" role="presentation" />`}
        >
          AI ships images with no <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">alt</code>{' '}
          attribute, or with placeholder text like <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">alt=&quot;image&quot;</code>{' '}
          and <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">alt=&quot;photo&quot;</code>.
          The rule treats both as failures, distinguishes them in the message
          (missing vs. meaningless), and accepts {' '}
          <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">alt=&quot;&quot;</code>{' '}
          on decorative images that also carry{' '}
          <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">role=&quot;presentation&quot;</code>{' '}
          or <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">aria-hidden</code>.
        </CheckCard>

        <CheckCard
          num={8}
          title="Every form input has a programmatic label"
          rule="form-labels"
          ruleHref="/docs/rules/form-labels"
          wcag="1.3.1 · 3.3.2"
          badCode={`<input type="email" placeholder="Email" />`}
          goodCode={`<label htmlFor="email">Email</label>
<input id="email" type="email" placeholder="Email" />`}
        >
          A placeholder is not a label &mdash; screen readers don&rsquo;t announce
          it once the user starts typing, and the contrast on most placeholder
          colors fails. The rule walks every input / select / textarea, checks
          for an associated{' '}
          <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">&lt;label htmlFor&gt;</code>,{' '}
          a wrapping <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">&lt;label&gt;</code>{' '}
          ancestor, or an{' '}
          <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">aria-label</code>/
          <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">aria-labelledby</code>,
          and reports the ones that have none.
        </CheckCard>

        <CheckCard
          num={9}
          title="No generic link text"
          rule="link-text"
          ruleHref="/docs/rules/link-text"
          wcag="2.4.4"
          badCode={`<a href="/docs/api">Click here</a>
<a href="/blog/x">Read more</a>`}
          goodCode={`<a href="/docs/api">Read the API reference</a>
<a href="/blog/x">Read &quot;Tailwind v4 migration&quot;</a>`}
        >
          Screen-reader users navigate by listing every link on a page. A list of
          ten <em>Click here</em> entries reveals nothing. The rule flags{' '}
          <em>click here</em>, <em>here</em>, <em>read more</em>, <em>more</em>,{' '}
          <em>learn more</em>, <em>this link</em>, and the empty / icon-only
          variants &mdash; with a configurable allowlist for project-specific
          phrasing.
        </CheckCard>

        <CheckCard
          num={10}
          title="No outline:none without a focus indicator"
          rule="focus-visible-style"
          ruleHref="/docs/rules/focus-visible-style"
          wcag="2.4.7"
          badCode={`<button className="outline-none rounded px-3 py-2">Sign in</button>`}
          goodCode={`<button className="outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-3 py-2">Sign in</button>`}
        >
          AI strips <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">outline-none</code>{' '}
          on every interactive element to make designs look &ldquo;clean,&rdquo;
          and forgets to add a replacement. Keyboard users can no longer see
          where they are. The rule flags any element that nukes the outline
          without declaring at least one of{' '}
          <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">focus-visible:</code>,{' '}
          <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">focus:ring-*</code>,{' '}
          <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">focus:outline-*</code>,
          or a corresponding utility.
        </CheckCard>


        {/* Category 4: Dark mode */}
        <CategoryHeading
          num="4 / 5"
          title="Dark mode (1 check)"
          blurb="Either you support dark mode everywhere or you don't ship it. Half-coverage is worse than no coverage — users land on a white modal in a black app and lose trust."
        />

        <CheckCard
          num={11}
          title="Dark mode applied across, not on a sample"
          rule="dark-mode-coverage"
          ruleHref="/docs/rules/dark-mode-coverage"
          badCode={`<div className="bg-white text-gray-900 border-gray-200">…</div>`}
          goodCode={`<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800">…</div>`}
        >
          You asked the AI to add dark mode. It added{' '}
          <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">dark:</code>{' '}
          variants to half the file and called it done. The rule walks every
          element with a color or background utility, checks for a paired{' '}
          <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">dark:</code>{' '}
          variant on the same property, and reports the ones still in light mode.
          Off in the recommended config &mdash; turn it to{' '}
          <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">warn</code>{' '}
          when you start shipping dark mode.
        </CheckCard>


        {/* Category 5: Frontend safety */}
        <CategoryHeading
          num="5 / 5"
          title="Frontend safety (3 checks)"
          blurb="The basics every shipped app should pass. AI generates these patterns confidently and incorrectly: rendered comments via dangerouslySetInnerHTML, target=_blank without rel, embedded iframes without sandbox. All three landed as new rules in Deslint 0.8."
        />

        <CheckCard
          num={12}
          title={"No dangerouslySetInnerHTML on untrusted data"}
          rule="no-dangerous-html"
          ruleHref="/docs/rules/no-dangerous-html"
          badCode={`<div dangerouslySetInnerHTML={{ __html: comment }} />`}
          goodCode={`<div>{comment}</div>
{/* or, if HTML is genuinely needed */}
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(comment) }} />`}
        >
          The single most common XSS path in AI-generated React code: an agent
          renders a user comment, a markdown blob, or a server response with{' '}
          <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">dangerouslySetInnerHTML</code>{' '}
          and never sanitizes. The rule flags every JSX element that uses the
          prop, with three deliberate whitelist exceptions:{' '}
          <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">&lt;script type=&quot;application/ld+json&quot;&gt;</code>{' '}
          (Schema.org structured data is always dev-controlled),{' '}
          <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">&lt;style&gt;</code>{' '}
          (CSS injection has a different threat model), and Next.js&rsquo;s{' '}
          <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">&lt;Script&gt;</code>{' '}
          component (inline scripts via the framework&rsquo;s loading strategy).
        </CheckCard>

        <CheckCard
          num={13}
          title={'<a target="_blank"> has rel="noopener noreferrer"'}
          rule="safe-external-links"
          ruleHref="/docs/rules/safe-external-links"
          badCode={`<a href="https://x.com/u" target="_blank">Profile</a>
<a href="https://x.com/u" target="_blank" rel="noreferrer">Profile</a>`}
          goodCode={`<a href="https://x.com/u" target="_blank" rel="noopener noreferrer">Profile</a>`}
        >
          Without <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">noopener</code>,
          the new tab can navigate the opener via{' '}
          <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">window.opener</code>{' '}
          (reverse tab-nabbing). Without{' '}
          <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">noreferrer</code>,
          the destination sees the source URL in headers. The rule flags missing
          rel attributes and partial rel values (only one of the two tokens), and
          autofixes on JSX.
        </CheckCard>

        <CheckCard
          num={14}
          title="<iframe> has a sandbox attribute"
          rule="iframe-sandbox"
          ruleHref="/docs/rules/iframe-sandbox"
          badCode={`<iframe src="https://embed.example.com" />`}
          goodCode={`<iframe src="https://embed.example.com" sandbox="" />
{/* or opt-in only what's needed */}
<iframe src="https://embed.example.com" sandbox="allow-scripts allow-same-origin" />`}
        >
          An iframe without sandbox inherits full origin privileges &mdash; it
          can navigate the parent, run scripts, submit forms with credentials,
          and break out via top-level navigation. The rule flags every{' '}
          <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">&lt;iframe&gt;</code>{' '}
          missing the attribute. Suggestion only: the right sandbox value
          depends on what the embed needs to do, so we don&rsquo;t auto-fix.
        </CheckCard>


        {/* Outro: run the checklist */}
        <FadeIn className="mt-14 mb-12 rounded-2xl border border-primary/20 bg-primary-50/40 px-6 py-7">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-3">
            Run the whole checklist in one command
          </h2>
          <p className="text-base text-gray-700 leading-relaxed mb-4">
            Reading a 14-point list is helpful exactly once. The goal is for it
            to run on every PR before anyone else has to think about it. Two
            commands do that:
          </p>
          <div className="rounded-xl bg-gray-950 text-gray-200 font-mono text-sm leading-relaxed px-5 py-4 mb-3 whitespace-pre overflow-x-auto">
            <span className="text-gray-500 select-none">$ </span>
            <span className="text-pass">npx</span>{' '}
            <span className="text-white">deslint launch-check</span>
            {`\n\n  Frontend Launch Readiness: 73/100\n  Spacing 56 · Typography 80 · Responsive 62 · Consistency 95\n  17 violations, 9 auto-fixable\n`}
          </div>
          <div className="rounded-xl bg-gray-950 text-gray-200 font-mono text-sm leading-relaxed px-5 py-4 whitespace-pre overflow-x-auto">
            <span className="text-gray-500 select-none">$ </span>
            <span className="text-pass">npx</span>{' '}
            <span className="text-white">deslint fix --all</span>
            {`\n\n  Fixed 9 violations across 4 files`}
          </div>
          <p className="text-sm text-gray-600 leading-relaxed mt-4">
            Both commands run locally, with zero LLM in the check path and zero
            code leaving your machine.{' '}
            <Link href="/sample-report.html" className="text-primary hover:underline">
              See the full HTML report
            </Link>{' '}
            the first command writes to{' '}
            <code className="font-mono text-xs bg-white border border-gray-200 px-1.5 py-0.5 rounded">.deslint/report.html</code>.
            Once a project clears the checklist on local, wire it into the agent
            loop with the{' '}
            <Link href="/mcp" className="text-primary hover:underline">
              MCP server
            </Link>{' '}
            so Cursor / Claude Code / Codex / Windsurf can&rsquo;t silently
            regress what you just fixed, and at the merge gate with the{' '}
            <Link href="/action" className="text-primary hover:underline">
              GitHub Action
            </Link>{' '}
            so PRs that drop the score are blocked.
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <Link
              href="/launch-check"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-light motion-safe:transition-colors"
            >
              Run the launch check
            </Link>
            <Link
              href="/docs/getting-started"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 motion-safe:transition-colors"
            >
              Install in 30 seconds
            </Link>
            <Link
              href="/cli"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 motion-safe:transition-colors"
            >
              See every CLI command
            </Link>
          </div>
        </FadeIn>

        {/* Why deterministic */}
        <FadeIn className="mb-12">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-4">
            Why a deterministic checklist beats &ldquo;run it through another AI&rdquo;
          </h2>
          <p className="text-base text-gray-700 leading-relaxed mb-4">
            A second LLM reviewing the first one feels productive and
            isn&rsquo;t. Two reasons.
          </p>
          <p className="text-base text-gray-700 leading-relaxed mb-4">
            <strong className="text-gray-900">Same input, different output.</strong>{' '}
            Run the same scan twice and an AI reviewer flags different things on
            the second pass. Run a deterministic ESLint rule twice and the
            messages are byte-identical. When the merge gate fails, you can
            point at a line. When you fix it, the failure goes away.
          </p>
          <p className="text-base text-gray-700 leading-relaxed mb-4">
            <strong className="text-gray-900">No exfiltration surface.</strong>{' '}
            Every rule on this checklist runs on your machine against your
            files. No code leaves your laptop, your CI runner, or your
            air-gapped enterprise environment. The MCP server uses stdio &mdash;
            the same protocol your editor already uses to talk to language
            servers &mdash; so the data path is local, auditable, and
            indistinguishable from any other lint run.
          </p>
          <p className="text-base text-gray-700 leading-relaxed">
            The rules in this checklist exist because the patterns AI gets
            wrong are the same ones humans got wrong before AI &mdash; we just
            now hit them an order of magnitude more often. ESLint, Tailwind,
            and the WCAG specs already encode the answers. A linter is the
            shape of tool that turns those answers into a one-command checklist
            you can ship behind.
          </p>
        </FadeIn>

        {/* Related reading */}
        <FadeIn className="mt-14 pt-8 border-t border-gray-200">
          <h2 className="text-xl font-bold tracking-tight text-gray-900 mb-4">
            Related reading
          </h2>
          <ul className="space-y-3">
            <li>
              <Link
                href="/blog/fix-design-drift-ai-generated-code"
                className="block group"
              >
                <h3 className="font-semibold text-gray-900 group-hover:text-primary motion-safe:transition-colors">
                  How to fix design drift in AI-generated code
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  The same agent that ships these 14 mistakes also ships token
                  drift. A deterministic playbook for catching it at generation
                  time.
                </p>
              </Link>
            </li>
            <li>
              <Link
                href="/blog/tailwind-arbitrary-values"
                className="block group"
              >
                <h3 className="font-semibold text-gray-900 group-hover:text-primary motion-safe:transition-colors">
                  The hidden cost of Tailwind arbitrary values
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Why <code className="font-mono text-xs">p-[13px]</code> and{' '}
                  <code className="font-mono text-xs">bg-[#1a5276]</code> are
                  more expensive than they look, and why AI agents amplify the
                  cost.
                </p>
              </Link>
            </li>
            <li>
              <Link
                href="/blog/tailwind-v4-eslint-migration"
                className="block group"
              >
                <h3 className="font-semibold text-gray-900 group-hover:text-primary motion-safe:transition-colors">
                  Tailwind v4 ESLint migration: a deterministic upgrade guide
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  A working playbook for moving an ESLint setup from Tailwind
                  v3 to v4 &mdash; what changes, what goes stale, and the
                  deterministic checks that make the migration boring instead
                  of risky.
                </p>
              </Link>
            </li>
          </ul>
        </FadeIn>

      </main>
      <Footer />
    </>
  );
}
