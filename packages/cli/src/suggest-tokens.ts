/**
 * `vizlint suggest-tokens` command
 *
 * Scans the project, finds all violations with no auto-fix, then classifies them:
 *
 * Tier 1 — Near-miss: value is close to a standard Tailwind scale class.
 *           Recommendation: use the standard class, don't create a variable.
 *
 * Tier 2 — Repeated custom: value appears 2+ times, no close Tailwind equivalent.
 *           Recommendation: this is a design decision — name it semantically.
 *
 * Tier 3 — One-off: value appears once, no close Tailwind equivalent.
 *           Recommendation: review intent — probably accidental.
 *
 * Only Tier 2 gets a CSS block, because only intentional repeated values
 * belong in a design system.
 */

import { relative } from 'node:path';
import chalk from 'chalk';
import type { LintResult, LintMessage } from './lint-runner.js';

/** Convert a CSS value string to pixels (px, rem, em assume 16px root). */
function toPx(value: string): number | null {
  const match = value.match(/^(\d+(?:\.\d+)?)(px|rem|em)$/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  const unit = match[2];
  if (unit === 'px') return num;
  if (unit === 'rem' || unit === 'em') return num * 16;
  return null;
}

// ── Tailwind semantic max-w scale ────────────────────────────────────

const TAILWIND_MAX_W_SCALE: Record<string, number> = {
  'max-w-xs':         320,
  'max-w-sm':         384,
  'max-w-md':         448,
  'max-w-lg':         512,
  'max-w-xl':         576,
  'max-w-2xl':        672,
  'max-w-3xl':        768,
  'max-w-4xl':        896,
  'max-w-5xl':       1024,
  'max-w-6xl':       1152,
  'max-w-7xl':       1280,
  'max-w-prose':      624, // ~65ch at 16px
  'max-w-screen-sm':  640,
  'max-w-screen-md':  768,
  'max-w-screen-lg': 1024,
  'max-w-screen-xl': 1280,
  'max-w-screen-2xl':1536,
};

// Spacing scale for w, h, p, gap, m etc.
const TAILWIND_SPACING_SCALE: Record<string, number> = {
  '0': 0, 'px': 1, '0.5': 2, '1': 4, '1.5': 6, '2': 8, '2.5': 10,
  '3': 12, '3.5': 14, '4': 16, '5': 20, '6': 24, '7': 28, '8': 32,
  '9': 36, '10': 40, '11': 44, '12': 48, '14': 56, '16': 64, '20': 80,
  '24': 96, '28': 112, '32': 128, '36': 144, '40': 160, '44': 176,
  '48': 192, '52': 208, '56': 224, '60': 240, '64': 256, '72': 288,
  '80': 320, '96': 384,
};

export interface TokenSuggestion {
  cls: string;
  prefix: string;
  value: string;
  varName: string;
  replacement: string;
  count: number;
  locations: Array<{ file: string; line: number }>;
  hasScaleFix: boolean;
  /** Nearest Tailwind class + pixel distance if a near-miss exists */
  nearMiss: { cls: string; px: number; diff: number } | null;
  /** Tier classification */
  tier: 'near-miss' | 'repeated-custom' | 'one-off';
}

/** Extract the arbitrary class from a violation message (the backtick-quoted token) */
function extractClassName(message: string): string | null {
  const match = message.match(/`([^`]+)`/);
  return match ? match[1] : null;
}

/** Check if a violation message includes an auto-fix suggestion */
function hasSuggestion(message: string): boolean {
  return message.includes('Suggested:');
}

/** Parse the prefix and value from an arbitrary class like `max-w-[800px]` */
function parseArbitraryClass(cls: string): { prefix: string; value: string } | null {
  const match = cls.match(/^([\w-]+)-\[([^\]]+)\]$/);
  if (!match) return null;
  return { prefix: match[1], value: match[2] };
}

/**
 * Find the nearest semantic class and its pixel value for a given prefix + px value.
 * Returns the nearest class even if far — caller decides the threshold.
 */
function findNearest(
  prefix: string,
  px: number,
): { cls: string; px: number; diff: number } | null {
  let scale: Record<string, number>;
  let buildCls: (key: string) => string;

  if (prefix === 'max-w') {
    scale = TAILWIND_MAX_W_SCALE;
    buildCls = (key) => key; // keys are already full class names
  } else if (prefix === 'w' || prefix === 'min-w') {
    // w uses spacing scale
    scale = TAILWIND_SPACING_SCALE;
    buildCls = (key) => `${prefix}-${key}`;
  } else {
    // h, p, gap, m etc. — spacing scale
    scale = TAILWIND_SPACING_SCALE;
    buildCls = (key) => `${prefix}-${key}`;
  }

  let nearest: { cls: string; px: number; diff: number } | null = null;
  let minDiff = Infinity;

  for (const [key, scalePx] of Object.entries(scale)) {
    const diff = Math.abs(px - scalePx);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = { cls: buildCls(key), px: scalePx, diff };
    }
  }

  return nearest;
}

/** Near-miss threshold: within 15% of the value or 32px, whichever is larger */
function isNearMiss(px: number, diff: number): boolean {
  const threshold = Math.max(32, px * 0.15);
  return diff <= threshold;
}

/**
 * Derive a CSS variable name from a prefix + value.
 * Strips trailing 'px' (redundant), keeps 'rem'.
 */
function deriveVarName(prefix: string, value: string): string {
  const safeValue = value
    .replace(/px$/, '')           // 800px → 800
    .replace(/\./g, '-')          // 4.5rem → 4-5rem
    .replace(/[^a-zA-Z0-9-]/g, '');

  if (prefix === 'w' || prefix === 'max-w' || prefix === 'min-w') {
    return `--width-${safeValue}`;
  }
  if (prefix === 'h' || prefix === 'max-h' || prefix === 'min-h') {
    return `--height-${safeValue}`;
  }
  if (
    prefix === 'p' || prefix === 'px' || prefix === 'py' ||
    prefix === 'pt' || prefix === 'pb' || prefix === 'pl' || prefix === 'pr' ||
    prefix === 'gap' || prefix === 'gap-x' || prefix === 'gap-y'
  ) {
    return `--spacing-${safeValue}`;
  }
  if (prefix === 'm' || prefix === 'mx' || prefix === 'my' ||
      prefix === 'mt' || prefix === 'mb' || prefix === 'ml' || prefix === 'mr') {
    return `--spacing-${safeValue}`;
  }
  return `--size-${safeValue}`;
}

/**
 * Group violations from a lint result into classified token suggestions.
 */
export function buildTokenSuggestions(
  lintResult: LintResult,
  cwd: string,
): {
  suggestions: TokenSuggestion[];
  fixable: Array<{ cls: string; replacement: string; count: number; locations: Array<{ file: string; line: number }> }>;
} {
  const suggestionMap = new Map<string, TokenSuggestion>();
  const fixableMap = new Map<string, {
    cls: string; replacement: string; count: number;
    locations: Array<{ file: string; line: number }>;
  }>();

  for (const result of lintResult.results) {
    const file = relative(cwd, result.filePath);
    for (const msg of result.messages as LintMessage[]) {
      if (msg.ruleId !== 'vizlint/no-arbitrary-spacing') continue;

      const cls = extractClassName(msg.message);
      if (!cls) continue;

      if (hasSuggestion(msg.message)) {
        const suggMatch = msg.message.match(/Suggested: `([^`]+)`/);
        const replacement = suggMatch ? suggMatch[1] : cls;
        if (!fixableMap.has(cls)) {
          fixableMap.set(cls, { cls, replacement, count: 0, locations: [] });
        }
        const entry = fixableMap.get(cls)!;
        entry.count++;
        entry.locations.push({ file, line: msg.line });
      } else {
        if (!suggestionMap.has(cls)) {
          const parsed = parseArbitraryClass(cls);
          if (!parsed) continue;

          const px = toPx(parsed.value);
          const nearMiss = px !== null ? findNearest(parsed.prefix, px) : null;
          const isNM = nearMiss !== null && px !== null && isNearMiss(px, nearMiss.diff);

          const varName = deriveVarName(parsed.prefix, parsed.value);
          const replacement = `${parsed.prefix}-[var(${varName})]`;

          suggestionMap.set(cls, {
            cls,
            prefix: parsed.prefix,
            value: parsed.value,
            varName,
            replacement,
            count: 0,
            locations: [],
            hasScaleFix: false,
            nearMiss: nearMiss,
            tier: isNM ? 'near-miss' : 'one-off', // will upgrade to repeated-custom after counting
          });
        }
        const entry = suggestionMap.get(cls)!;
        entry.count++;
        entry.locations.push({ file, line: msg.line });
      }
    }
  }

  // Classify tiers now that we have counts
  for (const s of suggestionMap.values()) {
    if (s.tier === 'near-miss') continue; // near-miss regardless of count
    s.tier = s.count >= 2 ? 'repeated-custom' : 'one-off';
  }

  const suggestions = [...suggestionMap.values()].sort((a, b) => b.count - a.count);
  const fixable = [...fixableMap.values()].sort((a, b) => b.count - a.count);

  return { suggestions, fixable };
}

/**
 * Format the suggest-tokens output — design-guidance first, CSS second.
 */
export function formatSuggestTokens(
  suggestions: TokenSuggestion[],
  fixable: Array<{ cls: string; replacement: string; count: number; locations: Array<{ file: string; line: number }> }>,
): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(chalk.bold('  Vizlint — Design Analysis'));
  lines.push(chalk.gray('  ─'.repeat(24)));
  lines.push('');

  const nearMiss = suggestions.filter(s => s.tier === 'near-miss');
  const repeatedCustom = suggestions.filter(s => s.tier === 'repeated-custom');
  const oneOffs = suggestions.filter(s => s.tier === 'one-off');

  // ── Tier 0: Auto-fixable ──
  if (fixable.length > 0) {
    lines.push(chalk.bold.green('  ✓ Auto-fixable (exact Tailwind scale match)'));
    lines.push(chalk.gray('    Run `vizlint fix [dir] --all` to apply these automatically.'));
    lines.push('');
    for (const f of fixable) {
      const files = groupByFile(f.locations);
      lines.push(
        `  ${chalk.cyan(f.cls)} → ${chalk.green(f.replacement)}` +
        chalk.gray(` (${f.count} occurrence${f.count !== 1 ? 's' : ''})`),
      );
      for (const [file, lineNums] of files) {
        lines.push(chalk.gray(`    ${file}  lines ${lineNums.join(', ')}`));
      }
      lines.push('');
    }
  }

  if (suggestions.length === 0) {
    lines.push(chalk.green('  All violations are auto-fixable — no custom values found.'));
    lines.push('');
    return lines.join('\n');
  }

  // ── Tier 1: Near-miss — align to Tailwind scale ──
  if (nearMiss.length > 0) {
    lines.push(chalk.bold.yellow('  ≈ Close to standard Tailwind classes — consider aligning'));
    lines.push(chalk.gray(
      '    These values are near a Tailwind semantic class. Using the standard class',
    ));
    lines.push(chalk.gray(
      '    communicates intent and avoids one-off pixel values.',
    ));
    lines.push('');

    for (const s of nearMiss) {
      const files = groupByFile(s.locations);
      const fileCount = new Set(s.locations.map(l => l.file)).size;
      lines.push(
        `  ${chalk.cyan(s.cls)}  ${chalk.gray(`${s.count} occurrence${s.count !== 1 ? 's' : ''} across ${fileCount} file${fileCount !== 1 ? 's' : ''}`)}`
      );
      for (const [file, lineNums] of files) {
        lines.push(chalk.gray(`    ${file}  lines ${lineNums.join(', ')}`));
      }
      if (s.nearMiss) {
        const direction = s.nearMiss.px > toPxFallback(s.value) ? 'larger' : 'smaller';
        lines.push(
          `  → Closest: ${chalk.green(s.nearMiss.cls)} (${s.nearMiss.px}px — ${s.nearMiss.diff}px ${direction} than your value)`,
        );
        lines.push(chalk.dim(`    Is the difference intentional? If not, switch to ${s.nearMiss.cls}.`));
      }
      lines.push('');
    }
  }

  // ── Tier 2: Repeated custom values — design decisions worth naming ──
  if (repeatedCustom.length > 0) {
    lines.push(chalk.bold.blue(`  ● Consistent custom values — these look like design decisions`));
    lines.push(chalk.gray(
      '    These values appear multiple times, suggesting they are intentional.',
    ));
    lines.push(chalk.gray(
      '    If so, give them a semantic name in your design system — not just a number.',
    ));
    lines.push('');

    for (const s of repeatedCustom) {
      const files = groupByFile(s.locations);
      const fileCount = new Set(s.locations.map(l => l.file)).size;
      lines.push(
        `  ${chalk.cyan(s.cls)}  ${chalk.bold(String(s.count))} occurrences across ${fileCount} file${fileCount !== 1 ? 's' : ''}`,
      );
      for (const [file, lineNums] of files) {
        lines.push(chalk.gray(`    ${file}  lines ${lineNums.join(', ')}`));
      }
      if (s.nearMiss) {
        lines.push(chalk.gray(`    (nearest Tailwind class: ${s.nearMiss.cls} at ${s.nearMiss.px}px — ${s.nearMiss.diff}px off)`));
      }
      lines.push('');
    }

    // ── CSS block — only for repeated custom values ──
    lines.push(chalk.bold('  ─'.repeat(24)));
    lines.push(chalk.bold('  If these are intentional design values, name them semantically:'));
    lines.push('');
    lines.push(chalk.dim('  ┌─────────────────────────────────────────────────────────────'));
    lines.push(chalk.dim('  │') + chalk.gray('  /* Add to your @theme inline block in styles.css */'));
    lines.push(chalk.dim('  │'));

    const seenVarNames = new Set<string>();
    const widthVars = repeatedCustom.filter(s => s.varName.startsWith('--width-'));
    const heightVars = repeatedCustom.filter(s => s.varName.startsWith('--height-'));
    const spacingVars = repeatedCustom.filter(s => !s.varName.startsWith('--width-') && !s.varName.startsWith('--height-'));

    if (widthVars.length > 0) {
      lines.push(chalk.dim('  │') + chalk.gray('  /* ── Layout widths — rename to match your design language ── */'));
      for (const s of widthVars) {
        if (seenVarNames.has(s.varName)) continue;
        seenVarNames.add(s.varName);
        const fileCount = new Set(s.locations.map(l => l.file)).size;
        const hint = fileCount === 1 ? s.locations[0].file.split('/').pop() ?? '' : `${fileCount} files`;
        lines.push(
          chalk.dim('  │') + `  ${chalk.yellow(s.varName)}: ${s.value};` +
          chalk.gray(`   /* e.g. --width-content or --width-page — used in ${hint} */`),
        );
      }
      lines.push(chalk.dim('  │'));
    }

    if (heightVars.length > 0) {
      lines.push(chalk.dim('  │') + chalk.gray('  /* ── Heights ── */'));
      for (const s of heightVars) {
        if (seenVarNames.has(s.varName)) continue;
        seenVarNames.add(s.varName);
        const fileCount = new Set(s.locations.map(l => l.file)).size;
        const hint = fileCount === 1 ? s.locations[0].file.split('/').pop() ?? '' : `${fileCount} files`;
        lines.push(
          chalk.dim('  │') + `  ${chalk.yellow(s.varName)}: ${s.value};` +
          chalk.gray(`   /* e.g. --height-card-header — used in ${hint} */`),
        );
      }
      lines.push(chalk.dim('  │'));
    }

    if (spacingVars.length > 0) {
      lines.push(chalk.dim('  │') + chalk.gray('  /* ── Spacing ── */'));
      for (const s of spacingVars) {
        if (seenVarNames.has(s.varName)) continue;
        seenVarNames.add(s.varName);
        lines.push(chalk.dim('  │') + `  ${chalk.yellow(s.varName)}: ${s.value};`);
      }
    }

    lines.push(chalk.dim('  └─────────────────────────────────────────────────────────────'));
    lines.push('');
    lines.push(chalk.bold('  Then replace in your templates:'));
    lines.push('');
    for (const s of repeatedCustom) {
      lines.push(`  ${chalk.gray(s.cls.padEnd(22))} →  ${chalk.green(s.replacement)}`);
    }
    lines.push('');
    lines.push(chalk.dim('  After replacing, re-run `vizlint scan .` to confirm 0 violations.'));
    lines.push('');
  }

  // ── Tier 3: One-offs ──
  if (oneOffs.length > 0) {
    lines.push(chalk.bold.gray(`  ○ One-off values — review intent`));
    lines.push(chalk.gray(
      '    Each appears only once. Likely accidental rather than intentional.',
    ));
    lines.push(chalk.gray(
      '    Consider whether the nearest Tailwind class serves the same purpose.',
    ));
    lines.push('');
    for (const s of oneOffs) {
      const loc = s.locations[0];
      lines.push(`  ${chalk.cyan(s.cls)}  ${chalk.gray(`${loc.file}:${loc.line}`)}`);
      if (s.nearMiss) {
        lines.push(
          chalk.dim(`    → nearest: ${s.nearMiss.cls} (${s.nearMiss.px}px) — ${s.nearMiss.diff}px off. Intentional difference?`),
        );
      } else {
        lines.push(chalk.dim(`    → no close Tailwind match. Is this value documented in your design spec?`));
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

/** Group locations by file, returning Map<file, line[]> sorted by line */
function groupByFile(
  locations: Array<{ file: string; line: number }>,
): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (const loc of locations) {
    if (!map.has(loc.file)) map.set(loc.file, []);
    map.get(loc.file)!.push(loc.line);
  }
  for (const lines of map.values()) lines.sort((a, b) => a - b);
  return map;
}

/** Safe px conversion that falls back to 0 for direction computation */
function toPxFallback(value: string): number {
  return toPx(value) ?? 0;
}
