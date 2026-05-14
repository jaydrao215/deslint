/**
 * Agent Action Firewall — policy DSL schema.
 *
 * The firewall extends Deslint from "lint files" to "intercept every
 * agent action." This schema defines the YAML/JSON DSL an org uses to
 * tell the firewall what's allowed, what's denied, and what severity
 * each interception fires at.
 *
 * Design conventions (mirrored from `config-schema.ts`):
 *   - Zod-based: validates at load time, gives precise error messages
 *   - Strict mode: unknown keys are an error (forces typos to surface)
 *   - Layered defaults: a missing section means "no policy on that
 *     action" — the firewall stays opt-in per interception type
 *   - Severity uses the same `'off' | 'warn' | 'error'` ladder as
 *     deslint rules — so users can flip a section from warn → error
 *     without learning new vocabulary
 *
 * Stored at `.deslint/policy.yml` (or `.json`) in the repo. The MCP
 * server reads it once per session, caches it via the existing
 * fast-path infrastructure (see `getCachedConfigs` in
 * `packages/mcp/src/tools.ts`), and consults it on every interceptor
 * call.
 *
 * v0.10 scope (this commit): shell-exec policies. Other action
 * sections (outbound, file-read, secret-access, git-op) are declared
 * here as optional placeholders so a single load + validation cycle
 * covers the whole firewall once those interceptors land.
 */
import { z } from 'zod';
// `safe-regex2` is CommonJS in v5; default-import it so TypeScript/ESM
// interop gives us the callable function rather than the module object.
import safeRegex from 'safe-regex2';
import { SeveritySchema, type Severity } from './config-schema.js';

// ── Match shapes shared across interceptors ──────────────────────────

/**
 * A literal-OR-pattern matcher. Strings starting with `re:` are
 * compiled as RegExp; everything else is exact match. Users can mix
 * both in the same list:
 *
 *   - "pnpm test"            (exact)
 *   - "re:^pnpm (test|run)"  (regex)
 *   - "git status"           (exact)
 */
export const MatchPatternSchema = z.string().min(1).max(512);
export type MatchPattern = z.infer<typeof MatchPatternSchema>;

/**
 * Compile a matcher list once at policy-load time. Cached in the
 * firewall's per-session config cache so repeated interceptor calls
 * don't re-compile. Returns a predicate the interceptor invokes per
 * action.
 *
 * Format:
 *   `re:<pattern>` → RegExp (case-sensitive; users add `(?i)` flag
 *                            equivalent via inline `(?i:...)` or
 *                            the host language's flag inside the regex)
 *   anything else  → exact string match
 *
 * On a malformed regex, the matcher entry is silently skipped (a
 * misconfigured policy must not crash the firewall — a downed gate
 * is worse than a permissive one). Validation surfaces malformed
 * regexes via the optional `validatePatterns` helper below for
 * `deslint policy validate` to call.
 */
/**
 * Wraps `safe-regex2` so the rest of the firewall doesn't have to
 * know its import shape. `safe-regex2` is a static AST inspector — it
 * flags patterns with nested quantifiers (`(a+)+`), alternations
 * inside repetition (`(a|aa)+`), and the other catastrophic-
 * backtracking shapes documented in the ReDoS literature. Patterns
 * with `>25` repetition stars are also flagged (the library default).
 *
 * If the inspector itself throws (it has been known to on exotic
 * AST shapes), we fail closed — treat the pattern as unsafe rather
 * than risk admitting a real ReDoS vector. A user with a benign-but-
 * exotic pattern can always rewrite it as a literal or simplify the
 * regex; a ReDoS that hangs the agent loop has no recovery path.
 */
function isSafeRegexPattern(source: string): boolean {
  try {
    return safeRegex(source);
  } catch {
    return false;
  }
}

export function compileMatchers(patterns: readonly MatchPattern[]): (input: string) => boolean {
  const literals = new Set<string>();
  const regexes: RegExp[] = [];
  for (const p of patterns) {
    if (p.startsWith('re:')) {
      const source = p.slice(3);
      // Two-stage gate. Stage 1: syntactically parseable by JavaScript.
      // Stage 2: not a catastrophic-backtracking shape (ReDoS). Both
      // failure modes silently drop the pattern — the firewall must
      // never crash on a misconfigured policy, but it also must never
      // compile a pattern that can hang the agent loop. Users surface
      // these via `validatePatterns` for a `deslint policy validate`
      // CLI command.
      try {
        if (!isSafeRegexPattern(source)) continue;
        regexes.push(new RegExp(source));
      } catch { /* skip malformed */ }
    } else {
      literals.add(p);
    }
  }
  return (input: string) => {
    if (literals.has(input)) return true;
    for (const re of regexes) if (re.test(input)) return true;
    return false;
  };
}

/**
 * Surface malformed AND unsafe regex patterns for the
 * `deslint policy validate` CLI command. Returns an empty list when
 * every pattern is well-formed and safe (no catastrophic-backtracking
 * shape). Lives in shared so both the MCP server and the future CLI
 * command read the same source of truth.
 */
export function validatePatterns(patterns: readonly MatchPattern[]): Array<{ pattern: string; error: string }> {
  const errors: Array<{ pattern: string; error: string }> = [];
  for (const p of patterns) {
    if (!p.startsWith('re:')) continue;
    const source = p.slice(3);
    try {
      new RegExp(source);
    } catch (err) {
      errors.push({ pattern: p, error: err instanceof Error ? err.message : String(err) });
      continue;
    }
    if (!isSafeRegexPattern(source)) {
      errors.push({
        pattern: p,
        error: 'unsafe regex: matches the catastrophic-backtracking (ReDoS) shape and would be silently skipped by the firewall. Simplify the pattern or rewrite as a literal.',
      });
    }
  }
  return errors;
}

// ── Shell-exec policy (the first interceptor, v0.10) ─────────────────

/**
 * Shell-exec policy. Three lists, evaluated in order:
 *
 *   1. `deny`  — if the candidate command matches any deny pattern,
 *                the action is BLOCKED. Severity `error` always; the
 *                deny list is the hard line.
 *   2. `allow` — if the candidate command matches any allow pattern,
 *                the action is permitted with NO further checks.
 *   3. (fallthrough) — neither allow nor deny matched. The
 *                `defaultAction` decides: 'allow' lets it through,
 *                'warn' returns a warning, 'deny' blocks it.
 *
 * Design rationale: putting `deny` ahead of `allow` lets users write
 * "allow everything starting with `pnpm`, but deny `pnpm publish`"
 * cleanly:
 *
 *   deny:  ["pnpm publish"]
 *   allow: ["re:^pnpm "]
 *
 * Without deny-first, the user would have to write a precise regex
 * exclusion in the allow list, which is brittle and easy to bypass.
 */
export const ShellExecPolicySchema = z
  .object({
    severity: SeveritySchema.optional().describe(
      'Severity reported when a command matches the deny list or fails the fallthrough check. Defaults to `error` for deny matches and the section-level severity for fallthroughs.',
    ),
    deny: z
      .array(MatchPatternSchema)
      .default([])
      .describe('Commands that are always blocked. Matched against the rendered command string. Use `re:<pattern>` for regex.'),
    allow: z
      .array(MatchPatternSchema)
      .default([])
      .describe('Commands that are always permitted. Matched after deny; deny wins on overlap.'),
    defaultAction: z
      .enum(['allow', 'warn', 'deny'])
      .default('warn')
      .describe(
        'What happens when a command matches neither allow nor deny. `allow` is the most permissive (firewall is advisory only); `warn` reports without blocking; `deny` is the strictest (the explicit-allowlist mode regulated industries want).',
      ),
    /** Categories of dangerous shell patterns we ship built-in
     *  detection for. Users opt in by listing them here so the
     *  firewall surfaces "rm -rf /" / "curl | sh" / "eval $(…)" type
     *  patterns without forcing every org to author the regex
     *  themselves. Layered ON TOP of the user's allow/deny — a
     *  built-in pattern fires `error` regardless of the user's
     *  defaultAction. */
    builtinChecks: z
      .array(z.enum([
        'destructive-rm',          // rm -rf /, rm -rf ~, etc.
        'curl-pipe-shell',         // curl ... | sh / bash
        'sudo',                    // sudo invocations
        'history-rewrite',         // git reset --hard / git filter-branch / git push --force
        'process-substitution',    // <(curl ...) / >(...)
        'crypto-mining',           // known miner binaries
        'reverse-shell',           // nc -e, bash -i >& /dev/tcp/...
      ]))
      .default(['destructive-rm', 'curl-pipe-shell', 'reverse-shell'])
      .describe('Categories of dangerous patterns the firewall flags without explicit user config. Each category is implemented as a vetted matcher in the firewall — auditable and updateable across the deslint ecosystem.'),
  })
  .strict();
export type ShellExecPolicy = z.infer<typeof ShellExecPolicySchema>;

// ── Placeholder schemas for the interceptors coming in v0.10.1+ ─────
//
// Declared now so the policy file's shape is stable from v0.10 onward
// — users can author the WHOLE policy upfront and the firewall
// progressively starts enforcing each section as we ship the
// corresponding interceptor. This avoids the "every month the schema
// changes and the policy needs editing" trap.

const OutboundRequestPolicySchema = z
  .object({
    severity: SeveritySchema.optional(),
    deny: z.array(MatchPatternSchema).default([]),
    allow: z.array(MatchPatternSchema).default([]),
    defaultAction: z.enum(['allow', 'warn', 'deny']).default('warn'),
    /** Block requests to internal/private/loopback/metadata IPs
     *  (SSRF surface) regardless of user config. */
    blockPrivateIps: z.boolean().default(true),
  })
  .strict();

const FileReadPolicySchema = z
  .object({
    severity: SeveritySchema.optional(),
    deny: z.array(MatchPatternSchema).default([]),
    allow: z.array(MatchPatternSchema).default([]),
    defaultAction: z.enum(['allow', 'warn', 'deny']).default('allow'),
    /** Block reads outside the project root unless explicitly
     *  allowed. Set to false for tooling that genuinely needs
     *  access to ~/.cache or similar. */
    confineToProjectRoot: z.boolean().default(true),
  })
  .strict();

const SecretAccessPolicySchema = z
  .object({
    severity: SeveritySchema.optional(),
    deny: z.array(MatchPatternSchema).default([]),
    allow: z.array(MatchPatternSchema).default([]),
    defaultAction: z.enum(['allow', 'warn', 'deny']).default('warn'),
  })
  .strict();

const GitOpPolicySchema = z
  .object({
    severity: SeveritySchema.optional(),
    /** Operations always blocked regardless of branch. */
    deny: z.array(z.enum(['force-push', 'history-rewrite', 'tag-delete'])).default(['history-rewrite']),
    /** Protected branches: pushes to these require explicit override. */
    protectedBranches: z.array(z.string()).default(['main', 'master', 'release/*']),
  })
  .strict();

// ── Top-level policy file ────────────────────────────────────────────

export const FirewallPolicySchema = z
  .object({
    /** Schema version. Currently `1`. Incremented on breaking shape
     *  changes; the loader uses this to route to a migrator. */
    version: z.literal(1).default(1),
    /** Optional human-readable name for the policy. Surfaced in the
     *  firewall's report when an action is blocked, so the agent
     *  output reads "blocked by `acme-corp/strict`" rather than just
     *  "blocked by policy". */
    name: z.string().min(1).max(120).optional(),
    /** Default severity applied to every section that doesn't
     *  override it. Defaults to `warn` — the firewall is advisory
     *  by default until the org promotes individual sections. */
    severity: SeveritySchema.default('warn'),

    shellExec: ShellExecPolicySchema.optional(),
    outboundRequest: OutboundRequestPolicySchema.optional(),
    fileRead: FileReadPolicySchema.optional(),
    secretAccess: SecretAccessPolicySchema.optional(),
    gitOp: GitOpPolicySchema.optional(),
  })
  .strict()
  .describe(
    'Top-level Agent Action Firewall policy. Each section is optional — a missing section means "no policy" on that interceptor (the firewall stays opt-in per action type).',
  );
export type FirewallPolicy = z.infer<typeof FirewallPolicySchema>;

/**
 * Effective severity for a section: section-level override wins,
 * top-level fallback otherwise. Used by every interceptor so the
 * resolution logic stays in one place.
 */
export function resolveSeverity(
  policy: FirewallPolicy,
  section: Exclude<keyof FirewallPolicy, 'version' | 'name' | 'severity'>,
): Severity {
  const sectionPolicy = policy[section] as { severity?: Severity } | undefined;
  return sectionPolicy?.severity ?? policy.severity;
}

/**
 * Parse a raw object (e.g. loaded from a YAML or JSON file) into a
 * validated FirewallPolicy. Throws ZodError on malformed input — the
 * loader is expected to catch and report nicely. Mirrors
 * `parseConfig` in `config-schema.ts`.
 */
export function parsePolicy(raw: unknown): FirewallPolicy {
  return FirewallPolicySchema.parse(raw);
}

export function safeParsePolicy(raw: unknown): z.SafeParseReturnType<unknown, FirewallPolicy> {
  return FirewallPolicySchema.safeParse(raw);
}
