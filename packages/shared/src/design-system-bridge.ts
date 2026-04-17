import type { DesignSystem, RuleConfig, Severity } from './config-schema.js';

/**
 * Parse an em string to integer milli-em (e.g. "-0.02em" → -20).
 * Returns null for anything else — tracking tokens must be expressed in
 * em to line up with the rule's internal representation.
 */
export function parseEmToMilliEm(value: string): number | null {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)em$/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  if (!Number.isFinite(num)) return null;
  return Math.round(num * 1000);
}

/**
 * Parse a CSS length value to pixels.
 *
 * Accepts px, rem, em. rem/em assume a 16px root — this matches
 * eslint-plugin's `toPx()` helper and the Tailwind default root-size, so
 * a token declared as "1rem" converts to the same 16 the rule compares
 * against when it sees `p-[16px]`.
 *
 * Returns null for values the bridge can't safely resolve to a scalar
 * pixel distance: %, vh/vw, ch, calc(), var(). The caller surfaces these
 * as warnings rather than silently dropping them.
 */
export function parseCssLengthToPx(value: string): number | null {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)(px|rem|em)$/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  if (!Number.isFinite(num)) return null;
  switch (match[2]) {
    case 'px':
      return num;
    case 'rem':
    case 'em':
      return num * 16;
    default:
      return null;
  }
}

export interface BridgeOptions {
  /**
   * Existing user-authored rule configuration (from `config.rules` or a
   * selected profile's rules). Used so the bridge never overwrites an
   * explicit `customTokens`/`customScale` — a hand-tuned value always
   * wins over a design-system-derived default.
   */
  existingRules?: Record<string, RuleConfig>;
}

export interface BridgeResult {
  /**
   * Rule config fragments produced for the keys the bridge touches.
   * Callers should merge these ON TOP of `existingRules` (bridge wins
   * for these keys) — the bridge has already folded in user severity
   * and non-conflicting options for those keys.
   */
  rules: Record<string, RuleConfig>;
  /** Non-fatal messages (e.g. unparseable spacing values). */
  warnings: string[];
}

/**
 * Translate a `DesignSystem` config into per-rule ESLint options so the
 * imported tokens actually drive enforcement.
 *
 * The bridge wires four fields:
 *   - `colors`       → `deslint/no-arbitrary-colors`.customTokens
 *   - `spacing`      → `deslint/no-arbitrary-spacing`.customScale (px)
 *   - `typography`   → `deslint/no-arbitrary-typography`.customScale
 *                      (px for fontSize/leading, milli-em for tracking,
 *                      numeric passthrough for fontWeight)
 *   - `borderRadius` → `deslint/no-arbitrary-border-radius`.customScale (px)
 *
 * `fonts` is deliberately not bridged — there is no lint rule that
 * consumes font-family tokens today, so wiring would be noise.
 *
 * Precedence rules (per rule):
 *   - user rule explicitly sets the conflict key (`customTokens` /
 *     `customScale`) → bridge makes no change for that rule.
 *   - user rule severity is `'off'` → bridge makes no change.
 *   - user rule severity is `'warn'`/`'error'` (plain or tupled without
 *     the conflict option) → bridge uses user severity, merges injected
 *     option, preserves any other user-set options.
 *   - no user rule → bridge defaults to `'warn'`.
 */
export function applyDesignSystemToRules(
  designSystem: DesignSystem | undefined,
  { existingRules }: BridgeOptions = {},
): BridgeResult {
  const rules: Record<string, RuleConfig> = {};
  const warnings: string[] = [];

  if (!designSystem) return { rules, warnings };

  // ── Colors ──────────────────────────────────────────────────────────
  if (designSystem.colors && Object.keys(designSystem.colors).length > 0) {
    const ruleId = 'deslint/no-arbitrary-colors';
    const existing = pickRuleConfig(existingRules, ruleId);
    if (existing?.severity !== 'off' && !hasOptionKey(existing, 'customTokens')) {
      rules[ruleId] = [
        existing?.severity ?? 'warn',
        { ...(existing?.options ?? {}), customTokens: { ...designSystem.colors } },
      ];
    }
  }

  // ── Spacing (rem/em/px string → px number) ─────────────────────────
  if (designSystem.spacing && Object.keys(designSystem.spacing).length > 0) {
    const ruleId = 'deslint/no-arbitrary-spacing';
    const existing = pickRuleConfig(existingRules, ruleId);
    if (existing?.severity !== 'off' && !hasOptionKey(existing, 'customScale')) {
      const customScale: Record<string, number> = {};
      for (const [name, raw] of Object.entries(designSystem.spacing)) {
        const px = parseCssLengthToPx(raw);
        if (px === null) {
          warnings.push(
            `designSystem.spacing.${name}: "${raw}" is not a px/rem/em value; token skipped.`,
          );
          continue;
        }
        customScale[name] = px;
      }
      if (Object.keys(customScale).length > 0) {
        rules[ruleId] = [
          existing?.severity ?? 'warn',
          { ...(existing?.options ?? {}), customScale },
        ];
      }
    }
  }

  // ── Typography ──────────────────────────────────────────────────────
  if (designSystem.typography && hasAnyTypographyToken(designSystem.typography)) {
    const ruleId = 'deslint/no-arbitrary-typography';
    const existing = pickRuleConfig(existingRules, ruleId);
    if (existing?.severity !== 'off' && !hasOptionKey(existing, 'customScale')) {
      const customScale: {
        fontSize?: Record<string, number>;
        fontWeight?: Record<string, number>;
        leading?: Record<string, number>;
        tracking?: Record<string, number>;
      } = {};

      if (designSystem.typography.fontSize) {
        const out: Record<string, number> = {};
        for (const [name, raw] of Object.entries(designSystem.typography.fontSize)) {
          const px = parseCssLengthToPx(raw);
          if (px === null) {
            warnings.push(
              `designSystem.typography.fontSize.${name}: "${raw}" is not a px/rem/em value; token skipped.`,
            );
            continue;
          }
          out[name] = px;
        }
        if (Object.keys(out).length > 0) customScale.fontSize = out;
      }

      if (designSystem.typography.fontWeight) {
        const out: Record<string, number> = {};
        for (const [name, raw] of Object.entries(designSystem.typography.fontWeight)) {
          if (!Number.isFinite(raw) || raw < 1 || raw > 1000) {
            warnings.push(
              `designSystem.typography.fontWeight.${name}: "${raw}" is not a numeric 1–1000 weight; token skipped.`,
            );
            continue;
          }
          out[name] = raw;
        }
        if (Object.keys(out).length > 0) customScale.fontWeight = out;
      }

      if (designSystem.typography.leading) {
        const out: Record<string, number> = {};
        for (const [name, raw] of Object.entries(designSystem.typography.leading)) {
          const px = parseCssLengthToPx(raw);
          if (px === null) {
            warnings.push(
              `designSystem.typography.leading.${name}: "${raw}" is not a px/rem/em value; token skipped.`,
            );
            continue;
          }
          out[name] = px;
        }
        if (Object.keys(out).length > 0) customScale.leading = out;
      }

      if (designSystem.typography.tracking) {
        const out: Record<string, number> = {};
        for (const [name, raw] of Object.entries(designSystem.typography.tracking)) {
          const milliEm = parseEmToMilliEm(raw);
          if (milliEm === null) {
            warnings.push(
              `designSystem.typography.tracking.${name}: "${raw}" is not an em value; token skipped.`,
            );
            continue;
          }
          out[name] = milliEm;
        }
        if (Object.keys(out).length > 0) customScale.tracking = out;
      }

      if (Object.keys(customScale).length > 0) {
        rules[ruleId] = [
          existing?.severity ?? 'warn',
          { ...(existing?.options ?? {}), customScale },
        ];
      }
    }
  }

  // ── Border radius (rem/em/px string → px number) ────────────────────
  if (designSystem.borderRadius && Object.keys(designSystem.borderRadius).length > 0) {
    const ruleId = 'deslint/no-arbitrary-border-radius';
    const existing = pickRuleConfig(existingRules, ruleId);
    if (existing?.severity !== 'off' && !hasOptionKey(existing, 'customScale')) {
      const customScale: Record<string, number> = {};
      for (const [name, raw] of Object.entries(designSystem.borderRadius)) {
        const px = parseCssLengthToPx(raw);
        if (px === null) {
          warnings.push(
            `designSystem.borderRadius.${name}: "${raw}" is not a px/rem/em value; token skipped.`,
          );
          continue;
        }
        customScale[name] = px;
      }
      if (Object.keys(customScale).length > 0) {
        rules[ruleId] = [
          existing?.severity ?? 'warn',
          { ...(existing?.options ?? {}), customScale },
        ];
      }
    }
  }

  return { rules, warnings };
}

function hasAnyTypographyToken(t: NonNullable<DesignSystem['typography']>): boolean {
  return Boolean(
    (t.fontSize && Object.keys(t.fontSize).length > 0) ||
      (t.fontWeight && Object.keys(t.fontWeight).length > 0) ||
      (t.leading && Object.keys(t.leading).length > 0) ||
      (t.tracking && Object.keys(t.tracking).length > 0),
  );
}

interface ResolvedRule {
  severity: Severity;
  options: Record<string, unknown> | undefined;
}

/**
 * Accept both prefixed (`deslint/no-arbitrary-colors`) and bare
 * (`no-arbitrary-colors`) keys — `runLint` normalises on lookup, so users
 * write either form in `.deslintrc.json`.
 */
function pickRuleConfig(
  existing: Record<string, RuleConfig> | undefined,
  ruleId: string,
): ResolvedRule | undefined {
  if (!existing) return undefined;
  const bare = ruleId.startsWith('deslint/') ? ruleId.slice('deslint/'.length) : ruleId;
  const raw = existing[ruleId] ?? existing[bare];
  if (raw === undefined) return undefined;
  if (typeof raw === 'string') return { severity: raw, options: undefined };
  if (Array.isArray(raw)) {
    return { severity: raw[0], options: raw[1] as Record<string, unknown> };
  }
  return undefined;
}

function hasOptionKey(rule: ResolvedRule | undefined, key: string): boolean {
  return Boolean(rule?.options && key in rule.options);
}
