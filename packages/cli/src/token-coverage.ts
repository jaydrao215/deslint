/**
 * Token coverage: the adoption-centric counterpart to Design Health Score.
 *
 * Where DHS counts violations, this measures *how much* of the class usage
 * in the codebase comes from (a) the imported design system, (b) the
 * default Tailwind scale, or (c) arbitrary `[...]` values — i.e. drift.
 *
 * A design-systems lead reads this report to answer:
 *   "Did importing tokens actually change behavior? Is my team using them?"
 *
 * Two questions the DHS cannot answer, because both "0% token adoption with
 * 0 violations" and "80% adoption with 20 violations" look equally healthy
 * in a violation-count world.
 */

import { readFileSync } from 'node:fs';
import type { DesignSystem } from '@deslint/shared';

export type CoverageCategory = 'colors' | 'spacing' | 'typography' | 'borderRadius';

export interface CategoryCoverage {
  /** Total category-shaped utility usages seen across all files. */
  total: number;
  /** Classes that matched a user-imported token name. */
  token: number;
  /** Classes that matched the default Tailwind scale. */
  default: number;
  /** `prefix-[...]` arbitrary-value usages — drift. */
  arbitrary: number;
  /** token / total × 100. */
  tokenPct: number;
  /** (token + default) / total × 100. Never uses arbitrary. */
  onScalePct: number;
  /** arbitrary / total × 100. */
  driftPct: number;
  /** Top N token names used (numerator of tokenPct). */
  topTokens: { name: string; count: number }[];
  /** Top N arbitrary values repeated — the drift leaderboard. */
  topDrift: { value: string; count: number }[];
}

export interface TokenCoverageResult {
  /** ISO timestamp of the scan. */
  scannedAt: string;
  totalFiles: number;
  totalClassUsages: number;
  /** (sum of onScale across categories) / (sum of total) × 100. */
  overallOnScalePct: number;
  /** (sum of token) / (sum of total) × 100. */
  overallTokenPct: number;
  /** Whether the user imported a design system at all. Drives report copy. */
  hasDesignSystem: boolean;
  categories: Record<CoverageCategory, CategoryCoverage>;
}

const TOP_N = 10;

// ── Category recognition ──────────────────────────────────────────────
//
// These prefixes belong unambiguously to one category. Ambiguous prefixes
// (notably `text-` which is both color *and* font-size) are disambiguated
// per-category below.

const COLOR_PREFIXES = [
  'bg',
  'text',
  'border',
  'ring',
  'shadow',
  'fill',
  'stroke',
  'accent',
  'caret',
  'outline',
  'decoration',
  'placeholder',
  'divide',
];

const SPACING_PREFIXES = [
  'p', 'px', 'py', 'pt', 'pr', 'pb', 'pl', 'pe', 'ps',
  'm', 'mx', 'my', 'mt', 'mr', 'mb', 'ml', 'me', 'ms',
  'gap', 'gap-x', 'gap-y',
  'space-x', 'space-y',
  'inset', 'inset-x', 'inset-y',
  'top', 'right', 'bottom', 'left',
  'w', 'h', 'min-w', 'min-h', 'max-w', 'max-h', 'size',
];

const BORDER_RADIUS_PREFIXES = [
  'rounded',
  'rounded-t', 'rounded-r', 'rounded-b', 'rounded-l',
  'rounded-tl', 'rounded-tr', 'rounded-br', 'rounded-bl',
  'rounded-s', 'rounded-e', 'rounded-ss', 'rounded-se', 'rounded-es', 'rounded-ee',
];

const TYPOGRAPHY_FONT_SIZE_DEFAULTS = new Set([
  'xs', 'sm', 'base', 'lg', 'xl',
  '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl',
]);

const TYPOGRAPHY_FONT_WEIGHT_DEFAULTS = new Set([
  'thin', 'extralight', 'light', 'normal', 'medium',
  'semibold', 'bold', 'extrabold', 'black',
]);

const TYPOGRAPHY_LEADING_DEFAULTS = new Set([
  'none', 'tight', 'snug', 'normal', 'relaxed', 'loose',
  '3', '4', '5', '6', '7', '8', '9', '10',
]);

const TYPOGRAPHY_TRACKING_DEFAULTS = new Set([
  'tighter', 'tight', 'normal', 'wide', 'wider', 'widest',
]);

const DEFAULT_COLOR_PALETTE = new Set([
  'inherit', 'current', 'transparent', 'black', 'white',
  'slate', 'gray', 'zinc', 'neutral', 'stone',
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald',
  'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple',
  'fuchsia', 'pink', 'rose',
]);

const DEFAULT_SPACING_SCALE = new Set([
  '0', 'px', '0.5', '1', '1.5', '2', '2.5', '3', '3.5',
  '4', '5', '6', '7', '8', '9', '10', '11', '12',
  '14', '16', '20', '24', '28', '32', '36', '40',
  '44', '48', '52', '56', '60', '64', '72', '80', '96',
  'auto', 'full', 'screen', 'min', 'max', 'fit',
]);

const DEFAULT_RADIUS_SCALE = new Set([
  'none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', 'full',
]);

/**
 * Match `className="..."`, `class="..."`, `:class="..."`, etc. We aren't
 * parsing JS/TSX — we're treating source as text and scooping string
 * literals that look like class attributes. This misses templated strings
 * (e.g. `cn(...)`) and Vue object syntax, which is acceptable for a
 * coverage signal; the result is a *sample* of class usage, not a lint.
 *
 * One regex per outer quote so the inner value may legitimately contain
 * the other two quote characters — e.g. Vue's `:class="'p-4'"` nests a
 * single-quoted expression inside a double-quoted attribute.
 */
const CLASS_ATTR_PATTERNS: RegExp[] = [
  /(?:class(?:Name)?|:class)\s*=\s*"([^"]*)"/g,
  /(?:class(?:Name)?|:class)\s*=\s*'([^']*)'/g,
  /(?:class(?:Name)?|:class)\s*=\s*`([^`]*)`/g,
];

function unwrapBindingValue(raw: string): string {
  const v = raw.trim();
  if (v.length < 2) return v;
  const first = v[0];
  const last = v[v.length - 1];
  if ((first === "'" || first === '"' || first === '`') && first === last) {
    return v.slice(1, -1);
  }
  return v;
}

function extractClassUsages(source: string): string[] {
  const out: string[] = [];
  for (const re of CLASS_ATTR_PATTERNS) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(source))) {
      const value = unwrapBindingValue(match[1]);
      for (const raw of value.split(/\s+/)) {
        const trimmed = raw.trim();
        if (trimmed) out.push(trimmed);
      }
    }
  }
  return out;
}

/** Strip responsive/state prefixes ("md:", "hover:", ...) — we only classify the base. */
function baseClass(cls: string): string {
  const parts = cls.split(':');
  return parts[parts.length - 1];
}

/** `prefix-[inner]` → returns `inner` or null. */
function arbitraryInner(base: string, prefix: string): string | null {
  const needle = `${prefix}-[`;
  if (!base.startsWith(needle)) return null;
  if (!base.endsWith(']')) return null;
  return base.slice(needle.length, -1);
}

type Bucket = {
  total: number;
  token: number;
  default: number;
  arbitrary: number;
  tokenCounts: Map<string, number>;
  driftCounts: Map<string, number>;
};

function emptyBucket(): Bucket {
  return {
    total: 0,
    token: 0,
    default: 0,
    arbitrary: 0,
    tokenCounts: new Map(),
    driftCounts: new Map(),
  };
}

function recordToken(b: Bucket, name: string) {
  b.total++;
  b.token++;
  b.tokenCounts.set(name, (b.tokenCounts.get(name) ?? 0) + 1);
}

function recordDefault(b: Bucket) {
  b.total++;
  b.default++;
}

function recordArbitrary(b: Bucket, value: string) {
  b.total++;
  b.arbitrary++;
  b.driftCounts.set(value, (b.driftCounts.get(value) ?? 0) + 1);
}

function classifyColor(
  base: string,
  buckets: Record<CoverageCategory, Bucket>,
  tokens: Set<string>,
) {
  for (const prefix of COLOR_PREFIXES) {
    if (!base.startsWith(`${prefix}-`)) continue;
    const rest = base.slice(prefix.length + 1);

    const arb = arbitraryInner(base, prefix);
    if (arb !== null) {
      // Only count colour-shaped arbitraries (hex, rgb, hsl, oklch, named)
      if (!/^(#|rgb|hsl|oklch|oklab|color|[a-zA-Z]+$)/.test(arb)) return false;
      recordArbitrary(buckets.colors, `${prefix}-[${arb}]`);
      return true;
    }

    // Token lookup uses the full rest (handles multi-word token names)
    if (tokens.has(rest) || tokens.has(rest.replace(/-\d+$/, ''))) {
      recordToken(buckets.colors, rest);
      return true;
    }

    // Default palette: `{family}` or `{family}-{shade}` where family ∈ known set
    const family = rest.split('-')[0];
    if (DEFAULT_COLOR_PALETTE.has(family)) {
      recordDefault(buckets.colors);
      return true;
    }
    // Not recognisable as a color — don't double-count under another category
    return false;
  }
  return false;
}

function classifySpacing(
  base: string,
  buckets: Record<CoverageCategory, Bucket>,
  tokens: Set<string>,
) {
  // Longest prefix first so "inset-x" beats "inset".
  const sorted = [...SPACING_PREFIXES].sort((a, b) => b.length - a.length);
  for (const prefix of sorted) {
    if (!base.startsWith(`${prefix}-`) && base !== prefix) continue;
    if (base === prefix) return false; // bare "w" etc. is not a utility
    const rest = base.slice(prefix.length + 1);

    const arb = arbitraryInner(base, prefix);
    if (arb !== null) {
      if (!/^-?\d+(?:\.\d+)?(?:px|rem|em|vh|vw|%)$|^calc\(|^var\(/.test(arb)) return false;
      recordArbitrary(buckets.spacing, `${prefix}-[${arb}]`);
      return true;
    }

    if (tokens.has(rest)) {
      recordToken(buckets.spacing, rest);
      return true;
    }

    if (DEFAULT_SPACING_SCALE.has(rest) || rest === '0' || /^-?\d+(\.\d+)?$/.test(rest)) {
      recordDefault(buckets.spacing);
      return true;
    }
    return false;
  }
  return false;
}

function classifyTypography(
  base: string,
  buckets: Record<CoverageCategory, Bucket>,
  fontSizeTokens: Set<string>,
  fontWeightTokens: Set<string>,
  leadingTokens: Set<string>,
  trackingTokens: Set<string>,
) {
  // text-{size} collides with text-{color}, so we only count text-* if it
  // looks like a size: default keyword, known fontSize token, or arbitrary
  // with a length unit.
  if (base.startsWith('text-')) {
    const rest = base.slice(5);
    const arb = arbitraryInner(base, 'text');
    if (arb !== null && /^\d+(?:\.\d+)?(?:px|rem|em)$/.test(arb)) {
      recordArbitrary(buckets.typography, `text-[${arb}]`);
      return true;
    }
    if (fontSizeTokens.has(rest)) {
      recordToken(buckets.typography, `text-${rest}`);
      return true;
    }
    if (TYPOGRAPHY_FONT_SIZE_DEFAULTS.has(rest)) {
      recordDefault(buckets.typography);
      return true;
    }
    // Otherwise fall through — text-red-500 will be caught by the color classifier.
  }

  if (base.startsWith('font-')) {
    const rest = base.slice(5);
    const arb = arbitraryInner(base, 'font');
    if (arb !== null && /^\d{3,4}$/.test(arb)) {
      recordArbitrary(buckets.typography, `font-[${arb}]`);
      return true;
    }
    if (fontWeightTokens.has(rest)) {
      recordToken(buckets.typography, `font-${rest}`);
      return true;
    }
    if (TYPOGRAPHY_FONT_WEIGHT_DEFAULTS.has(rest)) {
      recordDefault(buckets.typography);
      return true;
    }
    // font-sans, font-mono are family utilities — skip for coverage
    return false;
  }

  if (base.startsWith('leading-')) {
    const rest = base.slice(8);
    const arb = arbitraryInner(base, 'leading');
    if (arb !== null && /^\d+(?:\.\d+)?(?:px|rem|em)$/.test(arb)) {
      recordArbitrary(buckets.typography, `leading-[${arb}]`);
      return true;
    }
    if (leadingTokens.has(rest)) {
      recordToken(buckets.typography, `leading-${rest}`);
      return true;
    }
    if (TYPOGRAPHY_LEADING_DEFAULTS.has(rest)) {
      recordDefault(buckets.typography);
      return true;
    }
    return false;
  }

  if (base.startsWith('tracking-')) {
    const rest = base.slice(9);
    const arb = arbitraryInner(base, 'tracking');
    if (arb !== null && /^-?\d+(?:\.\d+)?em$/.test(arb)) {
      recordArbitrary(buckets.typography, `tracking-[${arb}]`);
      return true;
    }
    if (trackingTokens.has(rest)) {
      recordToken(buckets.typography, `tracking-${rest}`);
      return true;
    }
    if (TYPOGRAPHY_TRACKING_DEFAULTS.has(rest)) {
      recordDefault(buckets.typography);
      return true;
    }
    return false;
  }

  return false;
}

function classifyBorderRadius(
  base: string,
  buckets: Record<CoverageCategory, Bucket>,
  tokens: Set<string>,
) {
  const sorted = [...BORDER_RADIUS_PREFIXES].sort((a, b) => b.length - a.length);
  for (const prefix of sorted) {
    if (base === prefix) {
      // bare `rounded` is the implicit default size → count as default
      recordDefault(buckets.borderRadius);
      return true;
    }
    if (!base.startsWith(`${prefix}-`)) continue;
    const rest = base.slice(prefix.length + 1);

    const arb = arbitraryInner(base, prefix);
    if (arb !== null) {
      if (!/^\d+(?:\.\d+)?(?:px|rem|em|%)$/.test(arb)) return false;
      recordArbitrary(buckets.borderRadius, `${prefix}-[${arb}]`);
      return true;
    }

    if (tokens.has(rest)) {
      recordToken(buckets.borderRadius, rest);
      return true;
    }

    if (DEFAULT_RADIUS_SCALE.has(rest)) {
      recordDefault(buckets.borderRadius);
      return true;
    }
    return false;
  }
  return false;
}

function summarise(b: Bucket): CategoryCoverage {
  const pct = (part: number) => (b.total === 0 ? 0 : Math.round((part / b.total) * 1000) / 10);
  const topFromMap = (m: Map<string, number>) =>
    [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_N)
      .map(([name, count]) => ({ name, count }));

  return {
    total: b.total,
    token: b.token,
    default: b.default,
    arbitrary: b.arbitrary,
    tokenPct: pct(b.token),
    onScalePct: pct(b.token + b.default),
    driftPct: pct(b.arbitrary),
    topTokens: topFromMap(b.tokenCounts),
    topDrift: topFromMap(b.driftCounts).map(({ name, count }) => ({
      value: name,
      count,
    })),
  };
}

export interface ComputeCoverageInput {
  files: string[];
  designSystem?: DesignSystem;
  /** Optional read function — injectable for tests. */
  readFile?: (path: string) => string;
}

export function computeTokenCoverage(input: ComputeCoverageInput): TokenCoverageResult {
  const read = input.readFile ?? ((p: string) => readFileSync(p, 'utf-8'));

  const colorTokens = new Set(Object.keys(input.designSystem?.colors ?? {}));
  const spacingTokens = new Set(Object.keys(input.designSystem?.spacing ?? {}));
  const radiusTokens = new Set(Object.keys(input.designSystem?.borderRadius ?? {}));
  const fontSizeTokens = new Set(
    Object.keys(input.designSystem?.typography?.fontSize ?? {}),
  );
  const fontWeightTokens = new Set(
    Object.keys(input.designSystem?.typography?.fontWeight ?? {}),
  );
  const leadingTokens = new Set(
    Object.keys(input.designSystem?.typography?.leading ?? {}),
  );
  const trackingTokens = new Set(
    Object.keys(input.designSystem?.typography?.tracking ?? {}),
  );

  const hasDesignSystem =
    colorTokens.size +
      spacingTokens.size +
      radiusTokens.size +
      fontSizeTokens.size +
      fontWeightTokens.size +
      leadingTokens.size +
      trackingTokens.size >
    0;

  const buckets: Record<CoverageCategory, Bucket> = {
    colors: emptyBucket(),
    spacing: emptyBucket(),
    typography: emptyBucket(),
    borderRadius: emptyBucket(),
  };

  let totalClassUsages = 0;

  for (const file of input.files) {
    let source: string;
    try {
      source = read(file);
    } catch {
      continue;
    }
    const classes = extractClassUsages(source);
    totalClassUsages += classes.length;

    for (const cls of classes) {
      const base = baseClass(cls);
      // Category classifiers are mutually exclusive and return true when
      // they claim the class. Typography runs before colors so `text-xs`
      // doesn't get double-claimed as "text-*".
      if (classifyTypography(base, buckets, fontSizeTokens, fontWeightTokens, leadingTokens, trackingTokens)) continue;
      if (classifyColor(base, buckets, colorTokens)) continue;
      if (classifyBorderRadius(base, buckets, radiusTokens)) continue;
      classifySpacing(base, buckets, spacingTokens);
    }
  }

  const grandTotal =
    buckets.colors.total +
    buckets.spacing.total +
    buckets.typography.total +
    buckets.borderRadius.total;
  const grandToken =
    buckets.colors.token +
    buckets.spacing.token +
    buckets.typography.token +
    buckets.borderRadius.token;
  const grandOnScale =
    grandToken +
    buckets.colors.default +
    buckets.spacing.default +
    buckets.typography.default +
    buckets.borderRadius.default;

  const pct = (p: number) => (grandTotal === 0 ? 0 : Math.round((p / grandTotal) * 1000) / 10);

  return {
    scannedAt: new Date().toISOString(),
    totalFiles: input.files.length,
    totalClassUsages,
    overallOnScalePct: pct(grandOnScale),
    overallTokenPct: pct(grandToken),
    hasDesignSystem,
    categories: {
      colors: summarise(buckets.colors),
      spacing: summarise(buckets.spacing),
      typography: summarise(buckets.typography),
      borderRadius: summarise(buckets.borderRadius),
    },
  };
}
