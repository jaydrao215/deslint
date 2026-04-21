/**
 * Classify an ESLint autofix by visual-regression safety.
 *
 * GitHub "commit suggestion" blocks let a reviewer apply a fix in one
 * click without ever opening the code. That's magic when the fix is
 * visually lossless; it's a footgun when it isn't. This module decides
 * which category a given fix falls into so `review.ts` can emit a
 * suggestion block only when one-click is provably safe.
 *
 * Safety tiers:
 *   - 'identical'      — the fix produces byte-equivalent CSS output.
 *                        Example: `bg-[#1A5276]` → `bg-primary` when
 *                        `designSystem.colors.primary === '#1A5276'`.
 *                        Zero pixel change possible.
 *   - 'additive-safe'  — the fix only *adds* a media-query modifier
 *                        that is a no-op for users in the default
 *                        state. Example: wrapping a transition class
 *                        in `motion-safe:`. Users without the
 *                        `prefers-reduced-motion` preference see
 *                        identical output; users with it get correct
 *                        a11y behavior.
 *   - 'heuristic'      — opinionated replacement. Example: closest
 *                        token match `max-w-[800px]` → `max-w-3xl`
 *                        (32px difference). Surfaced as a read-only
 *                        suggestion; the reviewer must run
 *                        `deslint fix` locally to apply.
 */

export type FixSafety = 'identical' | 'additive-safe' | 'heuristic';

export interface DesignSystemColors {
  [name: string]: string;
}

export interface ClassifyFixInput {
  ruleId: string;
  /** The original source text that the fix replaces. */
  originalText: string;
  /** The text the fix will substitute in. */
  replacementText: string;
  /** Design-system tokens from `.deslintrc.json`, used to prove a
   *  token-based replacement is byte-identical to the arbitrary value. */
  designSystem?: {
    colors?: DesignSystemColors;
  };
}

/**
 * Return the safety tier for a proposed ESLint autofix.
 */
export function classifyFixSafety(input: ClassifyFixInput): FixSafety {
  if (isMotionSafeWrap(input.ruleId, input.originalText, input.replacementText)) {
    return 'additive-safe';
  }
  if (isIdenticalColorReplacement(input)) {
    return 'identical';
  }
  return 'heuristic';
}

/**
 * Detect a prefers-reduced-motion fix that only adds the
 * `motion-safe:` modifier. The fix is a no-op for the default state
 * (users without the preference) and corrects behavior for users with
 * `prefers-reduced-motion: reduce`, which is the desired outcome.
 */
function isMotionSafeWrap(
  ruleId: string,
  originalText: string,
  replacementText: string,
): boolean {
  if (ruleId !== 'deslint/prefers-reduced-motion') return false;
  if (/\bmotion-safe:/.test(originalText)) return false;
  if (!/\bmotion-safe:/.test(replacementText)) return false;
  // The fix should otherwise preserve every token — strip the prefix
  // from the replacement and confirm the result equals the original
  // (ignoring whitespace the wrapping may rearrange).
  const stripped = replacementText.replace(/\bmotion-safe:/g, '');
  return normalizeSpaces(stripped) === normalizeSpaces(originalText);
}

/**
 * Detect an arbitrary-color → design-token replacement where the
 * token's configured value equals the original hex. This is the only
 * color replacement we can *prove* is byte-identical — any
 * closest-match fix is opinionated and must fall through to
 * 'heuristic'.
 */
function isIdenticalColorReplacement(input: ClassifyFixInput): boolean {
  if (input.ruleId !== 'deslint/no-arbitrary-colors') return false;
  const colors = input.designSystem?.colors;
  if (!colors) return false;

  const origHex = extractArbitraryHex(input.originalText);
  if (!origHex) return false;

  const tokenName = extractTokenName(input.replacementText);
  if (!tokenName) return false;

  const tokenValue = colors[tokenName];
  if (typeof tokenValue !== 'string') return false;

  return normalizeHex(tokenValue) === normalizeHex(origHex);
}

/**
 * Pull the `#XXXXXX` out of a Tailwind-style arbitrary color utility
 * (e.g. `bg-[#1A5276]` or `text-[#FFF]`). Returns the bare hex with a
 * leading `#`, or null if no hex is found.
 */
export function extractArbitraryHex(text: string): string | null {
  const match = text.match(/\[#([0-9a-fA-F]{3,8})\]/);
  if (!match) return null;
  return `#${match[1]}`;
}

/**
 * Pull the token name from a class utility like `bg-primary` or
 * `text-accent-500`. Returns the trailing token segment (after the
 * first `-`), or null if the shape isn't recognized.
 */
export function extractTokenName(text: string): string | null {
  const match = text.match(/(?:^|\s)(?:bg|text|border|ring|fill|stroke|from|to|via|outline|accent|caret|decoration|divide|placeholder|shadow)-([a-zA-Z][a-zA-Z0-9-]*)/);
  return match ? match[1] : null;
}

/**
 * Canonical lowercase form of a hex color. Expands 3/4-digit shorthand
 * to 6/8 so `#fff` compares equal to `#FFFFFF`. Drops the leading `#`.
 */
export function normalizeHex(hex: string): string {
  const raw = hex.replace(/^#/, '').toLowerCase();
  if (raw.length === 3 || raw.length === 4) {
    return raw
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return raw;
}

function normalizeSpaces(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}
