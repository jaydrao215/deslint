// Single source of truth for the 33 Deslint rules.
//
// Consumed by:
//   - apps/docs/src/app/docs/rules/page.tsx       (hub / category index)
//   - apps/docs/src/app/docs/rules/[slug]/page.tsx (per-rule page)
//   - apps/docs/src/app/sitemap.ts                (auto-includes every slug)
//
// Adding a new rule? Append a Rule entry below and the sitemap, hub page,
// and dynamic route pick it up on the next build. Each rule must declare
// three relatedSlugs so the per-page "Related rules" block has content.

export type RuleCategory =
  | 'Colors'
  | 'Spacing'
  | 'Typography'
  | 'Responsive'
  | 'Accessibility'
  | 'Consistency'
  | 'Motion & Animation';

export interface Rule {
  slug: string;
  name: string;
  category: RuleCategory;
  /** One-sentence summary. Used in lists, meta descriptions, and JSON-LD. */
  tagline: string;
  /** Long-form paragraph(s) describing what the rule catches and why. */
  description: string;
  fixable: string;
  suggestions: string;
  /** Optional WCAG criteria mapping (e.g. "WCAG 2.4.7 (Focus Visible)"). */
  wcag?: string;
  /** Raw JSON snippet showing rule options. */
  options?: string;
  /** Raw code block — example that violates the rule. */
  badCode: string;
  /** Raw code block — example that satisfies the rule. */
  goodCode: string;
  /** Three semantically related rule slugs for the "Related rules" block. */
  relatedSlugs: [string, string, string];
}

export const RULES: Rule[] = [
  {
    slug: 'no-arbitrary-colors',
    name: 'no-arbitrary-colors',
    category: 'Colors',
    tagline:
      'Disallow arbitrary color values like bg-[#FF0000] in Tailwind classes.',
    description:
      'Flags arbitrary color values inside Tailwind utility classes — bg-[#FF0000], text-[#333], border-[hsl(0,0%,50%)] — and steers the codebase back to the imported design-token palette. The most common form of design-system drift in AI-generated code: the model knows the brand hex, types it directly, and bypasses the token that exists for exactly that color.',
    fixable: 'Yes — auto-fix replaces with the nearest token in your scale.',
    suggestions: 'Yes — surfaces the closest legal tokens.',
    options: `["error", {
  "allowlist": ["#1E3A5F"],
  "customTokens": { "brand-navy": "#1E3A5F" }
}]`,
    badCode: `<div className="bg-[#FF5733] text-[#333]" />`,
    goodCode: `<div className="bg-red-500 text-gray-700" />`,
    relatedSlugs: ['consistent-color-palette', 'dark-mode-coverage', 'a11y-color-contrast'],
  },
  {
    slug: 'a11y-color-contrast',
    name: 'a11y-color-contrast',
    category: 'Colors',
    tagline:
      'Flag text/background color combinations below WCAG AA contrast.',
    description:
      'Computes the actual contrast ratio between the text color class and the background color class on the same element and flags combinations below 4.5:1 for normal text or 3:1 for large text. Catches the most common a11y regression AI agents ship: a "subtle" text color that fails Lighthouse the next morning.',
    fixable: 'No.',
    suggestions: 'Yes — proposes accessible alternatives from your palette.',
    wcag: 'WCAG 1.4.3 (Contrast Minimum), 1.4.6 (Contrast Enhanced).',
    options: `["error", {
  "customColors": { "brand-navy": "#1E3A5F" }
}]`,
    badCode: `<div className="bg-gray-100 text-gray-300" />`,
    goodCode: `<div className="bg-gray-100 text-gray-900" />`,
    relatedSlugs: ['no-arbitrary-colors', 'dark-mode-coverage', 'focus-visible-style'],
  },
  {
    slug: 'dark-mode-coverage',
    name: 'dark-mode-coverage',
    category: 'Colors',
    tagline:
      'Require a dark: variant for every background color class.',
    description:
      'Detects elements that ship a background color class without a corresponding dark: variant. Auto-fixes by inserting the inverted shade so the component visually flips correctly when the theme switches. The rule that matters most after an AI agent generates a new component: light mode looks great, dark mode is unreadable.',
    fixable: 'Yes — adds the dark: variant with the inverted shade.',
    suggestions: 'Yes.',
    options: `["warn", {
  "ignoredPrefixes": ["bg-gradient"],
  "ignoredColors": ["bg-transparent"]
}]`,
    badCode: `<div className="bg-white" />`,
    goodCode: `<div className="bg-white dark:bg-gray-900" />`,
    relatedSlugs: ['no-arbitrary-colors', 'consistent-color-palette', 'a11y-color-contrast'],
  },
  {
    slug: 'consistent-color-palette',
    name: 'consistent-color-palette',
    category: 'Colors',
    tagline:
      'Cap the number of unique color families used in a single file.',
    description:
      'Counts the unique non-grayscale color families used inside a file and warns when the count exceeds the configured ceiling. AI agents reach outside the design system the moment they need to differentiate a status badge — within a few PRs you have eight palettes coexisting on one screen.',
    fixable: 'No.',
    suggestions: 'No.',
    options: `["warn", {
  "maxUniqueColors": 8,
  "ignoreGrayscale": true
}]`,
    badCode: `<div className="bg-red-500 text-blue-600 border-green-400" />
<div className="bg-purple-300 text-orange-500 border-pink-200" />
<div className="bg-teal-100 text-amber-700 border-cyan-500" />`,
    goodCode: `<div className="bg-blue-500 text-blue-900 border-blue-200" />
<div className="bg-gray-100 text-gray-700 border-gray-300" />`,
    relatedSlugs: ['no-arbitrary-colors', 'dark-mode-coverage', 'a11y-color-contrast'],
  },
  {
    slug: 'no-arbitrary-spacing',
    name: 'no-arbitrary-spacing',
    category: 'Spacing',
    tagline:
      'Disallow arbitrary spacing values like p-[13px] in Tailwind classes.',
    description:
      'Flags arbitrary padding, margin, and gap values in Tailwind utility classes and pushes the codebase back onto the spacing scale. The "shadow scale" of 13px, 17px, 22px values that AI agents accumulate between Tuesday and the rebrand.',
    fixable: 'Yes — replaces with the nearest scale value.',
    suggestions: 'Yes.',
    options: `["error", {
  "allowlist": ["24px"],
  "customScale": { "18": 18 }
}]`,
    badCode: `<div className="p-[13px] mt-[7px]" />`,
    goodCode: `<div className="p-3 mt-2" />`,
    relatedSlugs: ['no-magic-numbers-layout', 'consistent-component-spacing', 'spacing-rhythm-consistency'],
  },
  {
    slug: 'no-magic-numbers-layout',
    name: 'no-magic-numbers-layout',
    category: 'Spacing',
    tagline:
      'Disallow arbitrary values inside grid and flex layout classes.',
    description:
      'Targets the layout-specific arbitrary values — gap-[16px], grid-cols-[200px_1fr] — that bypass the spacing token system. Layout drift is harder to spot than colour drift because the diff still renders correctly; it only breaks at the second breakpoint.',
    fixable: 'Yes — replaces with the nearest scale value.',
    suggestions: 'Yes.',
    badCode: `<div className="grid gap-[16px] grid-cols-[200px_1fr]" />`,
    goodCode: `<div className="grid gap-4 grid-cols-[200px_1fr]" />`,
    relatedSlugs: ['no-arbitrary-spacing', 'consistent-component-spacing', 'no-arbitrary-zindex'],
  },
  {
    slug: 'no-arbitrary-typography',
    name: 'no-arbitrary-typography',
    category: 'Typography',
    tagline:
      'Disallow arbitrary font-size, weight, and line-height values.',
    description:
      'Flags arbitrary text-[15px], font-[450], and leading-[27px] values. Agents love the in-between sizes; your type ramp ends up with seven values nobody wrote down.',
    fixable: 'Yes — replaces with the nearest scale value.',
    suggestions: 'Yes.',
    options: `["warn", {
  "allowlist": ["15px"],
  "customScale": {
    "fontSize": { "hero": "4rem" }
  }
}]`,
    badCode: `<p className="text-[15px] font-[450]" />`,
    goodCode: `<p className="text-base font-medium" />`,
    relatedSlugs: ['heading-hierarchy', 'no-arbitrary-spacing', 'consistent-border-radius'],
  },
  {
    slug: 'heading-hierarchy',
    name: 'heading-hierarchy',
    category: 'Typography',
    tagline:
      'Enforce sequential heading levels and at most one <h1> per file.',
    description:
      'Flags heading sequences that skip levels (h1 → h3) and pages with more than one h1. Heading hierarchy is structural metadata for assistive tech, search engines, and outline generators — AI-generated marketing pages routinely break it.',
    fixable: 'No.',
    suggestions: 'No.',
    wcag: 'WCAG 1.3.1 (Info and Relationships), 2.4.6 (Headings and Labels).',
    badCode: `<h1>Title</h1>
<h3>Subsection</h3>`,
    goodCode: `<h1>Title</h1>
<h2>Section</h2>
<h3>Subsection</h3>`,
    relatedSlugs: ['prefer-semantic-html', 'no-arbitrary-typography', 'link-text'],
  },
  {
    slug: 'responsive-required',
    name: 'responsive-required',
    category: 'Responsive',
    tagline:
      'Require responsive breakpoints on fixed-width layout containers.',
    description:
      'Detects fixed-width layout containers that lack responsive variants and would overflow on mobile. The single biggest source of "AI shipped a desktop-only layout" regressions.',
    fixable: 'No.',
    suggestions: 'No.',
    options: `["warn", {
  "requiredBreakpoints": ["sm", "md"],
  "iconSizeThreshold": 48,
  "ignoredPrefixes": ["max-w-"]
}]`,
    badCode: `<div className="w-[800px]" />`,
    goodCode: `<div className="w-full md:w-[800px]" />`,
    relatedSlugs: ['touch-target-size', 'responsive-image-optimization', 'viewport-meta'],
  },
  {
    slug: 'touch-target-size',
    name: 'touch-target-size',
    category: 'Responsive',
    tagline:
      'Flag interactive elements smaller than 24×24 px.',
    description:
      'AI agents over-index on visual density and ship icon buttons that are physically impossible to tap on a phone. This rule flags interactive elements with explicit dimensions below the WCAG minimum so a designer can resize before merge.',
    fixable: 'No.',
    suggestions: 'Yes — proposes minimum size classes.',
    wcag: 'WCAG 2.5.8 (Target Size Minimum).',
    badCode: `<button className="w-4 h-4">×</button>`,
    goodCode: `<button className="w-6 h-6">×</button>`,
    relatedSlugs: ['responsive-required', 'focus-visible-style', 'icon-accessibility'],
  },
  {
    slug: 'focus-visible-style',
    name: 'focus-visible-style',
    category: 'Responsive',
    tagline:
      'Block outline-none unless a replacement focus indicator is present.',
    description:
      'Detects elements that strip the default focus outline (outline-none, outline-0) without providing a focus-visible: replacement. Removing focus indicators silently breaks keyboard navigation for every assistive-tech user; the rule keeps the UX intact.',
    fixable: 'No.',
    suggestions: 'Yes — proposes focus-visible:ring-2.',
    wcag: 'WCAG 2.4.7 (Focus Visible).',
    badCode: `<button className="outline-none">Click</button>`,
    goodCode: `<button className="outline-none focus-visible:ring-2 focus-visible:ring-offset-2">Click</button>`,
    relatedSlugs: ['focus-trap-patterns', 'icon-accessibility', 'aria-validation'],
  },
  {
    slug: 'image-alt-text',
    name: 'image-alt-text',
    category: 'Accessibility',
    tagline:
      'Require meaningful alt text on every <img> element.',
    description:
      'Flags <img> tags missing the alt attribute or shipping a generic placeholder ("image", "photo"). AI generators routinely omit alt entirely; the rule keeps the SEO + a11y promise of every image carrying its description.',
    fixable: 'No.',
    suggestions: 'Yes.',
    wcag: 'WCAG 1.1.1 (Non-text Content).',
    badCode: `<img src="hero.png" />`,
    goodCode: `<img src="hero.png" alt="Product screenshot showing dashboard" />`,
    relatedSlugs: ['responsive-image-optimization', 'icon-accessibility', 'aria-validation'],
  },
  {
    slug: 'form-labels',
    name: 'form-labels',
    category: 'Accessibility',
    tagline:
      'Every form input must have an associated label.',
    description:
      'Requires every <input>, <select>, and <textarea> to carry an associated <label>, aria-label, or aria-labelledby. AI-generated forms frequently rely on placeholder-as-label, which fails screen readers and many autofill heuristics.',
    fixable: 'No.',
    suggestions: 'No.',
    wcag: 'WCAG 1.3.1 (Info and Relationships), 3.3.2 (Labels or Instructions).',
    badCode: `<input type="email" />`,
    goodCode: `<label htmlFor="email">Email</label>
<input id="email" type="email" />`,
    relatedSlugs: ['autocomplete-attribute', 'missing-states', 'aria-validation'],
  },
  {
    slug: 'autocomplete-attribute',
    name: 'autocomplete-attribute',
    category: 'Accessibility',
    tagline:
      'Require autocomplete on identity and payment form fields.',
    description:
      'Flags identity, address, and payment inputs that lack an autocomplete attribute. The rule protects autofill UX (a power-user expectation) and the WCAG criterion that browsers rely on autocomplete to assist cognitively-impaired users.',
    fixable: 'No.',
    suggestions: 'Yes — proposes the correct autocomplete value per input.',
    wcag: 'WCAG 1.3.5 (Identify Input Purpose).',
    badCode: `<input type="email" name="email" />`,
    goodCode: `<input type="email" name="email" autoComplete="email" />`,
    relatedSlugs: ['form-labels', 'missing-states', 'aria-validation'],
  },
  {
    slug: 'aria-validation',
    name: 'aria-validation',
    category: 'Accessibility',
    tagline:
      'Forbid invalid ARIA roles and unknown aria-* attributes.',
    description:
      'Validates ARIA usage against WAI-ARIA 1.2: catches typos in role names ("buton"), unknown aria-* attributes, and required-attribute combinations the model forgets. AI generators frequently invent plausible-looking ARIA that is not in the spec.',
    fixable: 'No.',
    suggestions: 'No.',
    wcag: 'WCAG 4.1.2 (Name, Role, Value).',
    badCode: `<div role="buton" />`,
    goodCode: `<div role="button" tabIndex={0} />`,
    relatedSlugs: ['focus-visible-style', 'form-labels', 'prefer-semantic-html'],
  },
  {
    slug: 'link-text',
    name: 'link-text',
    category: 'Accessibility',
    tagline:
      'Forbid empty anchors and generic "click here" link text.',
    description:
      'Flags anchor tags with no visible text and the generic phrases ("click here", "read more", "learn more") that strip a link of its semantic purpose. Screen-reader users navigate by listing links — generic text removes the link\'s entire signal.',
    fixable: 'No.',
    suggestions: 'No.',
    wcag: 'WCAG 2.4.4 (Link Purpose, In Context).',
    badCode: `<a href="/pricing">click here</a>`,
    goodCode: `<a href="/pricing">View pricing plans</a>`,
    relatedSlugs: ['prefer-semantic-html', 'heading-hierarchy', 'image-alt-text'],
  },
  {
    slug: 'lang-attribute',
    name: 'lang-attribute',
    category: 'Accessibility',
    tagline:
      'Require a valid lang attribute on the <html> element.',
    description:
      'Verifies that the document root carries a valid BCP-47 language tag. Missing lang attributes break screen-reader pronunciation and translation tools — and AI agents that scaffold a fresh layout file omit it most of the time.',
    fixable: 'Yes — adds lang="en" to the <html> tag.',
    suggestions: 'Yes.',
    wcag: 'WCAG 3.1.1 (Language of Page).',
    badCode: `<html>...</html>`,
    goodCode: `<html lang="en">...</html>`,
    relatedSlugs: ['viewport-meta', 'heading-hierarchy', 'aria-validation'],
  },
  {
    slug: 'viewport-meta',
    name: 'viewport-meta',
    category: 'Accessibility',
    tagline:
      'Forbid disabling user scaling on the viewport meta tag.',
    description:
      'Flags viewport meta tags that disable zoom (user-scalable=no, maximum-scale=1). Disabling zoom locks out low-vision users and is a recurring AI scaffold default copied from outdated mobile-web tutorials.',
    fixable: 'No.',
    suggestions: 'No.',
    wcag: 'WCAG 1.4.4 (Resize Text).',
    badCode: `<meta name="viewport" content="width=device-width, user-scalable=no" />`,
    goodCode: `<meta name="viewport" content="width=device-width, initial-scale=1" />`,
    relatedSlugs: ['lang-attribute', 'responsive-required', 'responsive-image-optimization'],
  },
  {
    slug: 'prefer-semantic-html',
    name: 'prefer-semantic-html',
    category: 'Accessibility',
    tagline:
      'Prefer semantic HTML over <div onClick> and redundant ARIA roles.',
    description:
      'Detects two adjacent anti-patterns: <div> / <span> with click handlers (should be a <button>) and elements with redundant ARIA roles (a <nav> with role="navigation"). Both are AI-coding-agent staples — the model knows the syntax of every HTML element but defaults to div + click handler when in doubt.',
    fixable: 'No.',
    suggestions: 'Yes.',
    wcag: 'WCAG 4.1.2 (Name, Role, Value).',
    options: `["warn", {
  "checkClickHandlers": true,
  "checkRoles": true
}]`,
    badCode: `<div onClick={handleClick}>Submit</div>
<div role="navigation">...</div>`,
    goodCode: `<button onClick={handleClick}>Submit</button>
<nav>...</nav>`,
    relatedSlugs: ['aria-validation', 'link-text', 'heading-hierarchy'],
  },
  {
    slug: 'consistent-component-spacing',
    name: 'consistent-component-spacing',
    category: 'Consistency',
    tagline:
      'Detect inconsistent spacing patterns across similar components.',
    description:
      'Compares spacing utilities applied to similar components (Cards, Buttons) within a file and surfaces the dominant pattern as the recommended standard. Catches the slow drift where Card A is p-4 and Card B is p-5 because two different agents wrote them on two different days.',
    fixable: 'No.',
    suggestions: 'No.',
    options: `["warn", {
  "threshold": 2,
  "ignoreSizeVariants": true
}]`,
    badCode: `<div className="p-4 rounded-lg">Card A</div>
<div className="p-5 rounded-lg">Card B</div>`,
    goodCode: `<div className="p-4 rounded-lg">Card A</div>
<div className="p-4 rounded-lg">Card B</div>`,
    relatedSlugs: ['no-arbitrary-spacing', 'consistent-border-radius', 'spacing-rhythm-consistency'],
  },
  {
    slug: 'consistent-border-radius',
    name: 'consistent-border-radius',
    category: 'Consistency',
    tagline:
      'Detect inconsistent border-radius across similar components.',
    description:
      'Compares border-radius utilities across similar components and reports the dominant pattern as the recommended standard. Mixed radii are the visual signature of an AI-assembled UI: every individual card looks fine, the grid of them screams.',
    fixable: 'No.',
    suggestions: 'No.',
    badCode: `<div className="rounded-md p-4">Card A</div>
<div className="rounded-xl p-4">Card B</div>`,
    goodCode: `<div className="rounded-xl p-4">Card A</div>
<div className="rounded-xl p-4">Card B</div>`,
    relatedSlugs: ['consistent-component-spacing', 'no-arbitrary-spacing', 'no-arbitrary-typography'],
  },
  {
    slug: 'max-component-lines',
    name: 'max-component-lines',
    category: 'Consistency',
    tagline:
      'Flag single-file components exceeding a configurable line count.',
    description:
      'Warns when a component file grows beyond the configured line ceiling. Long components are the asymptote of AI iterative editing — easier to ask the agent to add than to extract — and the rule keeps the codebase decomposable.',
    fixable: 'No.',
    suggestions: 'No.',
    options: `["warn", {
  "maxLines": 300,
  "ignoreComments": false,
  "ignoreBlankLines": false
}]`,
    badCode: `// 600-line single-file component`,
    goodCode: `// Decomposed into focused sub-components`,
    relatedSlugs: ['no-duplicate-class-strings', 'max-tailwind-classes', 'no-inline-styles'],
  },
  {
    slug: 'missing-states',
    name: 'missing-states',
    category: 'Consistency',
    tagline:
      'Detect form elements missing error, disabled, or required handling.',
    description:
      'Flags interactive elements that ship without disabled, aria-invalid, or aria-required handling. Missing states is what separates a demo input from a production input — and what AI agents most often leave for "later".',
    fixable: 'No.',
    suggestions: 'Yes.',
    options: `["error", {
  "requireDisabled": true,
  "requireAriaInvalid": true,
  "requireAriaRequired": true,
  "formElements": ["input", "select", "textarea", "button"]
}]`,
    badCode: `<input type="text" />`,
    goodCode: `<input type="text" disabled={isDisabled} aria-invalid={hasError} aria-required />`,
    relatedSlugs: ['form-labels', 'autocomplete-attribute', 'aria-validation'],
  },
  {
    slug: 'no-arbitrary-zindex',
    name: 'no-arbitrary-zindex',
    category: 'Consistency',
    tagline:
      'Disallow arbitrary z-index values like z-[999].',
    description:
      'Forbids arbitrary z-index utilities and steers usage back onto the Tailwind scale (z-0, z-10, z-20, z-30, z-40, z-50). Stacking-context drift is one of the hardest-to-debug categories of design regression — keep the layer model declarative.',
    fixable: 'Yes — replaces with the nearest scale value.',
    suggestions: 'Yes.',
    options: `["error", {
  "allowlist": [999, 9999]
}]`,
    badCode: `<div className="z-[999]" />`,
    goodCode: `<div className="z-50" />`,
    relatedSlugs: ['no-arbitrary-spacing', 'focus-trap-patterns', 'no-inline-styles'],
  },
  {
    slug: 'no-inline-styles',
    name: 'no-inline-styles',
    category: 'Consistency',
    tagline:
      'Disallow inline style attributes; use Tailwind utility classes.',
    description:
      'Flags inline style={{ ... }} usage and steers it onto Tailwind utilities (or CSS variables for dynamic cases). Inline styles are how AI agents bypass the design-token boundary entirely — every one is a hex / pixel / colour outside the system.',
    fixable: 'No.',
    suggestions: 'Yes.',
    badCode: `<div style={{ color: "red", padding: "16px" }} />`,
    goodCode: `<div className="text-red-500 p-4" />`,
    relatedSlugs: ['no-arbitrary-colors', 'no-arbitrary-spacing', 'max-tailwind-classes'],
  },
  {
    slug: 'no-conflicting-classes',
    name: 'no-conflicting-classes',
    category: 'Consistency',
    tagline:
      'Detect contradictory Tailwind classes on the same element.',
    description:
      'Catches contradictory utilities applied to the same element — flex hidden, text-left text-center — that silently cancel each other out. Conflict is rarely intentional; it is the residue of an agent rewriting a className without removing the previous version.',
    fixable: 'No.',
    suggestions: 'No.',
    options: `["warn", {
  "customConflicts": [["my-class-a", "my-class-b"]]
}]`,
    badCode: `<div className="flex hidden" />
<p className="text-left text-center" />`,
    goodCode: `<div className="flex items-center gap-4" />
<div className="flex sm:hidden" />`,
    relatedSlugs: ['no-duplicate-class-strings', 'max-tailwind-classes', 'no-inline-styles'],
  },
  {
    slug: 'no-duplicate-class-strings',
    name: 'no-duplicate-class-strings',
    category: 'Consistency',
    tagline:
      'Flag identical className strings repeated 3+ times in a file.',
    description:
      'Detects identical full className strings repeated three or more times in a single file — a textbook signal that an extraction is missing. AI agents copy whole class strings between siblings; the rule keeps the codebase composable.',
    fixable: 'No.',
    suggestions: 'No.',
    options: `["warn", {
  "threshold": 3,
  "minClassCount": 3
}]`,
    badCode: `<div className="flex items-center gap-4 p-4 rounded-lg" />
<div className="flex items-center gap-4 p-4 rounded-lg" />
<div className="flex items-center gap-4 p-4 rounded-lg" />`,
    goodCode: `const cardClasses = "flex items-center gap-4 p-4 rounded-lg";
<div className={cardClasses} />`,
    relatedSlugs: ['max-tailwind-classes', 'no-conflicting-classes', 'max-component-lines'],
  },
  {
    slug: 'max-tailwind-classes',
    name: 'max-tailwind-classes',
    category: 'Consistency',
    tagline:
      'Flag elements with too many Tailwind utility classes.',
    description:
      'Caps the number of utility classes per element. Long class strings are unreadable in review and almost always indicate the element should be extracted into a primitive. AI agents add classes; nobody removes them.',
    fixable: 'No.',
    suggestions: 'No.',
    options: `["warn", {
  "max": 15
}]`,
    badCode: `<div className="flex items-center justify-between gap-4 p-4 m-2 rounded-lg border bg-white text-gray-900 shadow-sm hover:shadow-md transition-all w-full h-auto min-h-screen" />`,
    goodCode: `<Card className="flex items-center justify-between gap-4">
  <CardContent>...</CardContent>
</Card>`,
    relatedSlugs: ['no-duplicate-class-strings', 'max-component-lines', 'no-conflicting-classes'],
  },
  {
    slug: 'prefers-reduced-motion',
    name: 'prefers-reduced-motion',
    category: 'Motion & Animation',
    tagline:
      'Require animations to respect prefers-reduced-motion.',
    description:
      'Flags Tailwind animation utilities (animate-spin, transition-*) that ship without a motion-reduce: variant. The rule keeps the codebase usable for vestibular-disorder users — a population AI agents never optimise for by default.',
    fixable: 'Yes — wraps the class in a motion-reduce: variant.',
    suggestions: 'Yes.',
    wcag: 'WCAG 2.3.3 (Animation from Interactions).',
    badCode: `<div className="animate-spin transition-all duration-500" />`,
    goodCode: `<div className="animate-spin motion-reduce:animate-none transition-all motion-reduce:transition-none" />`,
    relatedSlugs: ['focus-visible-style', 'focus-trap-patterns', 'icon-accessibility'],
  },
  {
    slug: 'icon-accessibility',
    name: 'icon-accessibility',
    category: 'Motion & Animation',
    tagline:
      'Require icons to carry an accessible name or be marked decorative.',
    description:
      'Detects icons (Lucide, Heroicons, Radix) that ship without aria-label on the parent button or aria-hidden on the icon itself. Icon-only buttons are an AI staple; without explicit a11y treatment they are invisible to screen readers.',
    fixable: 'Yes — auto-adds aria-hidden to decorative icons.',
    suggestions: 'Yes.',
    wcag: 'WCAG 1.1.1 (Non-text Content), 4.1.2 (Name, Role, Value).',
    badCode: `<button><X /></button>`,
    goodCode: `<button aria-label="Close dialog"><X aria-hidden /></button>`,
    relatedSlugs: ['image-alt-text', 'focus-visible-style', 'aria-validation'],
  },
  {
    slug: 'focus-trap-patterns',
    name: 'focus-trap-patterns',
    category: 'Motion & Animation',
    tagline:
      'Detect modals and drawers that don\'t establish a focus trap.',
    description:
      'Flags overlay components (modal, dialog, drawer) that lack role="dialog", aria-modal, and the structural cues needed for a focus trap. Without them, keyboard users tab out of the modal into background content — silent but severe.',
    fixable: 'Yes — auto-adds role and aria-modal.',
    suggestions: 'Yes.',
    wcag: 'WCAG 2.4.3 (Focus Order).',
    badCode: `<div className="fixed inset-0">...</div>`,
    goodCode: `<div role="dialog" aria-modal="true" className="fixed inset-0">...</div>`,
    relatedSlugs: ['focus-visible-style', 'aria-validation', 'prefers-reduced-motion'],
  },
  {
    slug: 'responsive-image-optimization',
    name: 'responsive-image-optimization',
    category: 'Motion & Animation',
    tagline:
      'Flag <img> elements missing loading, width/height, or srcset.',
    description:
      'Detects <img> tags missing loading="lazy", explicit dimensions, or a srcset. These attributes protect Core Web Vitals (LCP, CLS) and mobile bandwidth — and AI agents routinely omit them.',
    fixable: 'Yes — adds loading="lazy" and decoding="async".',
    suggestions: 'Yes.',
    badCode: `<img src="hero.jpg" alt="Hero" />`,
    goodCode: `<img src="hero.jpg" alt="Hero" width="1200" height="630" loading="lazy" decoding="async" />`,
    relatedSlugs: ['image-alt-text', 'responsive-required', 'viewport-meta'],
  },
  {
    slug: 'spacing-rhythm-consistency',
    name: 'spacing-rhythm-consistency',
    category: 'Motion & Animation',
    tagline:
      'Detect stacks that mix spacing tokens from different sub-scales.',
    description:
      'Flags vertical stacks where the spacing tokens drift across sub-scales (mt-3 next to mt-5 next to mt-7) inside the same section. A strong tell-tale of AI-assembled layouts; off by default, enable once your design system has stabilised.',
    fixable: 'No.',
    suggestions: 'No.',
    badCode: `<section>
  <h2 className="mt-3">A</h2>
  <p className="mt-5">B</p>
  <p className="mt-7">C</p>
</section>`,
    goodCode: `<section className="space-y-4">
  <h2>A</h2>
  <p>B</p>
  <p>C</p>
</section>`,
    relatedSlugs: ['no-arbitrary-spacing', 'consistent-component-spacing', 'consistent-border-radius'],
  },
];

export const RULES_BY_SLUG: Record<string, Rule> = Object.fromEntries(
  RULES.map((r) => [r.slug, r]),
);

export function getRule(slug: string): Rule | undefined {
  return RULES_BY_SLUG[slug];
}

export function getRelatedRules(rule: Rule): Rule[] {
  return rule.relatedSlugs
    .map((slug) => RULES_BY_SLUG[slug])
    .filter((r): r is Rule => Boolean(r));
}

export const CATEGORIES: RuleCategory[] = [
  'Colors',
  'Spacing',
  'Typography',
  'Responsive',
  'Accessibility',
  'Consistency',
  'Motion & Animation',
];

export function getRulesByCategory(category: RuleCategory): Rule[] {
  return RULES.filter((r) => r.category === category);
}




