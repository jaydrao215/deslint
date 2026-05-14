/**
 * Tests for the Agent Action Firewall policy DSL.
 *
 * Covers:
 *   - schema parses minimal policy (top-level `version` only)
 *   - shellExec section: deny/allow lists, defaultAction, builtinChecks
 *   - matcher compilation: literal vs regex, RegExp caching, mixed lists
 *   - severity resolution: section override vs top-level fallback
 *   - validation: malformed regex surfaces via validatePatterns
 *   - strict mode: unknown keys rejected
 */
import { describe, it, expect } from 'vitest';
import {
  FirewallPolicySchema,
  parsePolicy,
  safeParsePolicy,
  compileMatchers,
  validatePatterns,
  resolveSeverity,
} from '../src/policy-schema.js';

describe('FirewallPolicySchema', () => {
  it('parses an empty policy with defaults', () => {
    const policy = parsePolicy({});
    expect(policy.version).toBe(1);
    expect(policy.severity).toBe('warn');
    expect(policy.shellExec).toBeUndefined();
  });

  it('parses a policy with a shellExec section', () => {
    const policy = parsePolicy({
      name: 'acme-corp/strict',
      severity: 'error',
      shellExec: {
        deny: ['rm -rf /', 're:^curl .* \\| sh'],
        allow: ['pnpm test', 're:^git (status|diff|log)'],
        defaultAction: 'deny',
      },
    });
    expect(policy.name).toBe('acme-corp/strict');
    expect(policy.severity).toBe('error');
    expect(policy.shellExec?.deny).toHaveLength(2);
    expect(policy.shellExec?.defaultAction).toBe('deny');
  });

  it('rejects unknown top-level keys (strict mode catches typos)', () => {
    const result = safeParsePolicy({ shelExec: {} }); // typo: shelExec
    expect(result.success).toBe(false);
  });

  it('rejects unknown keys inside a section', () => {
    const result = safeParsePolicy({
      shellExec: { denied: ['rm -rf /'] }, // typo: denied vs deny
    });
    expect(result.success).toBe(false);
  });

  it('defaults builtinChecks to the curated safe set', () => {
    const policy = parsePolicy({ shellExec: {} });
    expect(policy.shellExec?.builtinChecks).toEqual([
      'destructive-rm',
      'curl-pipe-shell',
      'reverse-shell',
    ]);
  });

  it('lets users override builtinChecks to opt into more or fewer categories', () => {
    const policy = parsePolicy({
      shellExec: { builtinChecks: ['sudo', 'history-rewrite'] },
    });
    expect(policy.shellExec?.builtinChecks).toEqual(['sudo', 'history-rewrite']);
  });

  it('rejects builtinChecks entries not on the curated list', () => {
    const result = safeParsePolicy({
      shellExec: { builtinChecks: ['nuke-everything'] },
    });
    expect(result.success).toBe(false);
  });
});

describe('compileMatchers', () => {
  it('matches a literal command exactly', () => {
    const m = compileMatchers(['pnpm test']);
    expect(m('pnpm test')).toBe(true);
    expect(m('pnpm test --watch')).toBe(false);
  });

  it('matches a regex when prefixed with `re:`', () => {
    const m = compileMatchers(['re:^pnpm (test|run )']);
    expect(m('pnpm test')).toBe(true);
    expect(m('pnpm run build')).toBe(true);
    expect(m('pnpm install')).toBe(false);
  });

  it('mixes literal and regex matchers in the same list', () => {
    const m = compileMatchers(['ls -la', 're:^git (status|diff)']);
    expect(m('ls -la')).toBe(true);
    expect(m('git status')).toBe(true);
    expect(m('git diff main')).toBe(true);
    expect(m('pwd')).toBe(false);
  });

  it('silently skips malformed regex entries (the firewall must not crash on bad config)', () => {
    const m = compileMatchers(['re:[unclosed', 'pnpm test']);
    // literal still works
    expect(m('pnpm test')).toBe(true);
    // bad regex doesn't match anything
    expect(m('[unclosed')).toBe(false);
  });

  it('returns false for any input when the matcher list is empty', () => {
    const m = compileMatchers([]);
    expect(m('anything')).toBe(false);
  });
});

describe('validatePatterns', () => {
  it('returns empty for a well-formed pattern list', () => {
    expect(validatePatterns(['pnpm test', 're:^git'])).toEqual([]);
  });

  it('surfaces malformed regex entries with the pattern and the parse error', () => {
    const errors = validatePatterns(['pnpm test', 're:[unclosed', 're:valid$']);
    expect(errors).toHaveLength(1);
    expect(errors[0].pattern).toBe('re:[unclosed');
    expect(errors[0].error).toMatch(/Invalid|unterminated|character class/i);
  });

  it('treats non-regex entries as always-valid (literal exact match)', () => {
    const errors = validatePatterns(['[literal-bracket-string]', 'rm -rf /']);
    expect(errors).toEqual([]);
  });

  // ── ReDoS / catastrophic-backtracking guard ────────────────────────
  //
  // The user authoring `.deslint/policy.yml` is implicitly trusted, but
  // not infallible — a pattern copied from Stack Overflow can DoS the
  // firewall and through it the agent loop. Two real classes:
  //   - Nested quantifier:  (a+)+$           -> 2^n on "aaaa…!" inputs
  //   - Alt + repetition:   (a|aa)+$         -> exponential on "a…!"
  // safe-regex2 inspects the AST and rejects both shapes. We test the
  // public surface (validatePatterns surfaces the issue) and the
  // internal contract (compileMatchers silently drops them so the
  // firewall stays up rather than going down on a misconfigured
  // policy).

  it('flags catastrophic-backtracking patterns with a descriptive error', () => {
    const errors = validatePatterns(['re:(a+)+$']);
    expect(errors).toHaveLength(1);
    expect(errors[0].pattern).toBe('re:(a+)+$');
    expect(errors[0].error).toMatch(/unsafe regex/i);
  });

  it('flags another nested-quantifier shape: ((ab)+)+', () => {
    const errors = validatePatterns(['re:((ab)+)+$']);
    expect(errors).toHaveLength(1);
    expect(errors[0].error).toMatch(/unsafe regex/i);
  });

  // KNOWN LIMITATION: safe-regex2 uses a star-height heuristic, not a
  // full ReDoS classifier. It catches nested quantifiers (`(a+)+`,
  // `((ab)+)+`) but NOT alternation-with-shared-prefix
  // (`(a|aa)+`) or the polynomial cases. Document the coverage we
  // actually have rather than claiming what we don't.
  it('documents the heuristic limit: alternation-shared-prefix is NOT caught', () => {
    const errors = validatePatterns(['re:^(a|aa)+$']);
    // safe-regex2 returns true (safe) for this shape even though it
    // is technically exponential. If a future user hits this in
    // anger, the right answer is either re2 (linear engine) or a
    // worker-bounded execution. For now this test pins the known
    // gap so it doesn't get forgotten.
    expect(errors).toEqual([]);
  });

  it('still accepts safe regexes alongside an unsafe one (surfaces only the unsafe)', () => {
    const errors = validatePatterns(['re:^pnpm test', 're:(a+)+$', 'pnpm install']);
    expect(errors).toHaveLength(1);
    expect(errors[0].pattern).toBe('re:(a+)+$');
  });
});

describe('compileMatchers — ReDoS guard', () => {
  it('silently drops a catastrophic-backtracking pattern so the firewall stays up', () => {
    const m = compileMatchers(['re:(a+)+$', 'rm -rf /']);
    // The unsafe regex was dropped; the literal still matches.
    expect(m('rm -rf /')).toBe(true);
    // And the unsafe regex doesn't fire on its trigger input either —
    // it simply isn't compiled into the predicate at all.
    expect(m('aaaa!')).toBe(false);
  });

  it('safe regexes still compile and match after the guard runs', () => {
    const m = compileMatchers(['re:^pnpm (test|run|build)', 're:(a+)+$']);
    expect(m('pnpm test --watch')).toBe(true);
    expect(m('pnpm run lint')).toBe(true);
    expect(m('pnpm build')).toBe(true);
  });

  it('test() returns quickly even when handed a ReDoS trigger input (sanity check)', () => {
    // The whole point: a user-authored unsafe pattern that would hang
    // native RegExp for seconds must not hang the firewall. Because
    // the unsafe pattern is dropped at compile time, the trigger input
    // gets matched against zero regexes — bounded by the literal-set
    // lookup, not by the regex engine.
    const m = compileMatchers(['re:^(a+)+$']);
    const trigger = 'a'.repeat(30) + '!';
    const t0 = performance.now();
    const result = m(trigger);
    const elapsed = performance.now() - t0;
    expect(result).toBe(false);
    expect(elapsed).toBeLessThan(50); // way under native-RegExp ReDoS time
  });
});

describe('resolveSeverity', () => {
  it('falls back to top-level severity when the section has no override', () => {
    const policy = parsePolicy({
      severity: 'error',
      shellExec: { deny: ['rm -rf /'] },
    });
    expect(resolveSeverity(policy, 'shellExec')).toBe('error');
  });

  it('uses section-level severity when set, overriding top-level', () => {
    const policy = parsePolicy({
      severity: 'error',
      shellExec: { deny: ['rm -rf /'], severity: 'warn' },
    });
    expect(resolveSeverity(policy, 'shellExec')).toBe('warn');
  });

  it('returns the top-level default when the section is missing', () => {
    const policy = parsePolicy({ severity: 'error' });
    expect(resolveSeverity(policy, 'shellExec')).toBe('error');
  });
});

describe('default-action semantics', () => {
  it('shellExec defaults to defaultAction:warn when not specified', () => {
    const policy = parsePolicy({ shellExec: {} });
    expect(policy.shellExec?.defaultAction).toBe('warn');
  });

  it('accepts allow / warn / deny on defaultAction; rejects anything else', () => {
    expect(parsePolicy({ shellExec: { defaultAction: 'allow' } }).shellExec?.defaultAction).toBe('allow');
    expect(parsePolicy({ shellExec: { defaultAction: 'warn' } }).shellExec?.defaultAction).toBe('warn');
    expect(parsePolicy({ shellExec: { defaultAction: 'deny' } }).shellExec?.defaultAction).toBe('deny');
    expect(safeParsePolicy({ shellExec: { defaultAction: 'block' } }).success).toBe(false);
  });
});
