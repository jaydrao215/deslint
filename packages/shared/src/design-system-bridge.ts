import type { DesignSystem, RuleConfig, Severity } from './config-schema.js';

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
 * Today the bridge wires two fields:
 *   - `colors`  → `deslint/no-arbitrary-colors`.customTokens
 *   - `spacing` → `deslint/no-arbitrary-spacing`.customScale (px)
 *
 * `fonts` and `borderRadius` are intentionally not bridged: the existing
 * rules for typography / border-radius don't consume those shapes yet.
 * That wiring is tracked as a schema-extension follow-up so the bridge
 * can stay small and well-tested.
 *
 * Precedence rules:
 *   - user rule explicitly sets `customTokens`/`customScale` → bridge
 *     makes no change for that key.
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

  return { rules, warnings };
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
