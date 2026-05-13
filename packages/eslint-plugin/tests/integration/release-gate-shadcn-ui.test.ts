/**
 * Release-gate integration test for the eslint plugin.
 *
 * Question this answers: before we cut 0.9.0 and announce on X, do we
 * trust that:
 *   (a) the rules don't crash on real production-shaped code;
 *   (b) per-rule fire counts haven't drifted unexpectedly from the
 *       last release (a regression alarm);
 *   (c) the framework matrix we claim coverage for actually works.
 *
 * Strategy: clone the canonical real-world React+Tailwind codebase
 * (`shadcn-ui/ui` at a pinned tag — the registry components are what
 * every user pastes into their own project), lint every component
 * with the `recommended` preset, and snapshot the per-rule fire
 * counts. Any future commit that makes a rule 10× noisier or that
 * introduces a parse-error will fail this test loudly.
 *
 * Why shadcn-ui specifically: it uses `cva()` + `cn()` + Tailwind
 * arbitrary values + dark: variants + Radix primitives — every
 * idiom our class-visitor and element-visitor are designed for. If
 * deslint works on shadcn, it works on the codebases that copy from
 * shadcn (which is most of them).
 *
 * Skipping behavior: if the clone fails (offline / sandboxed CI),
 * every assertion is skipped with a console note. The snapshot
 * file is committed under tests/integration/snapshots/ so anyone can
 * see exactly what the last good run looked like.
 */
import { describe, it, beforeAll, expect } from 'vitest';
import { Linter } from 'eslint';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import * as tsParser from '@typescript-eslint/parser';
import deslint from '../../src/index.js';

const REPO_URL = 'https://github.com/shadcn-ui/ui.git';
const REPO_REF = 'shadcn@4.7.0';
const SPARSE_PATHS = ['apps/v4/registry/new-york-v4'] as const;

let CLONE_DIR: string | null = null;
let NO_CLONE = false;

beforeAll(() => {
  const dir = mkdtempSync(join(tmpdir(), 'deslint-shadcn-'));
  try {
    execFileSync('git', ['init', '-q', dir], { stdio: 'ignore', timeout: 10_000 });
    execFileSync('git', ['-C', dir, 'remote', 'add', 'origin', REPO_URL], { stdio: 'ignore', timeout: 10_000 });
    execFileSync('git', ['-C', dir, '-c', 'protocol.version=2', 'fetch', '--depth', '1', '--quiet', 'origin', 'tag', REPO_REF], {
      stdio: 'ignore',
      timeout: 120_000,
    });
    execFileSync('git', ['-C', dir, 'sparse-checkout', 'init', '--cone'], { stdio: 'ignore', timeout: 10_000 });
    execFileSync('git', ['-C', dir, 'sparse-checkout', 'set', ...SPARSE_PATHS], {
      stdio: 'ignore',
      timeout: 10_000,
    });
    execFileSync('git', ['-C', dir, 'checkout', '-q', 'FETCH_HEAD'], { stdio: 'ignore', timeout: 30_000 });
    CLONE_DIR = dir;
  } catch (err) {
    NO_CLONE = true;
    // eslint-disable-next-line no-console
    console.warn(
      `[release-gate] Skipping shadcn-ui clone: ${err instanceof Error ? err.message : String(err)}`,
    );
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}, 180_000);

function walkComponentFiles(root: string): string[] {
  const out: string[] = [];
  function recurse(dir: string): void {
    let entries: string[];
    try { entries = readdirSync(dir); } catch { return; }
    for (const name of entries) {
      if (name === 'node_modules' || name === '.git') continue;
      const path = join(dir, name);
      let st;
      try { st = statSync(path); } catch { continue; }
      if (st.isDirectory()) { recurse(path); continue; }
      if (st.isFile() && /\.(tsx?|jsx?)$/.test(path)) out.push(path);
    }
  }
  recurse(root);
  return out;
}

/**
 * Lint a single source file with the recommended preset and return
 * the messages. We use the underlying `Linter` rather than the
 * full `ESLint` engine for speed (no file discovery, no ignore
 * resolution — the test already curated the file list).
 */
function lintWithRecommended(linter: Linter, source: string, filename: string): any[] {
  const recommendedRules = (deslint.configs.recommended as { rules: Record<string, any> }).rules;
  // Mirror what `runLint` (the CLI engine) does: TS parser for
  // .ts/.tsx, espree for plain .js/.jsx. Without this, real shadcn
  // components don't parse — `type X = …` and `interface Y` are TS
  // syntax that espree can't handle.
  return linter.verify(
    source,
    [
      {
        files: ['**/*.{ts,tsx}'],
        plugins: { deslint: deslint as any },
        rules: recommendedRules,
        languageOptions: {
          parser: tsParser as any,
          parserOptions: { ecmaFeatures: { jsx: true }, project: false },
        },
      },
      {
        files: ['**/*.{js,jsx,mjs,cjs}'],
        plugins: { deslint: deslint as any },
        rules: recommendedRules,
        languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
      },
    ],
    filename,
  );
}

describe(`release-gate: shadcn-ui/ui ${REPO_REF}`, () => {
  it('clone succeeded (skip if offline)', () => {
    if (NO_CLONE) return;
    expect(CLONE_DIR).not.toBeNull();
  });

  it('zero parse errors across the registry', () => {
    if (NO_CLONE || !CLONE_DIR) return;
    const root = join(CLONE_DIR, 'apps/v4/registry/new-york-v4');
    expect(existsSync(root)).toBe(true);

    const linter = new Linter({ cwd: CLONE_DIR });
    const files = walkComponentFiles(root);
    expect(files.length).toBeGreaterThan(50); // sanity: pinned tag yields >50 components

    const parseErrors: Array<{ file: string; line: number; message: string }> = [];
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      const rel = relative(CLONE_DIR, file);
      const messages = lintWithRecommended(linter, source, rel);
      for (const m of messages) {
        if (m.fatal) {
          parseErrors.push({ file: rel, line: m.line ?? 0, message: m.message });
        }
      }
    }

    if (parseErrors.length > 0) {
      const sample = parseErrors.slice(0, 5).map((p) => `  ${p.file}:${p.line}  ${p.message}`).join('\n');
      throw new Error(
        `Expected zero parse errors across shadcn-ui ${REPO_REF}, found ${parseErrors.length}:\n${sample}${parseErrors.length > 5 ? `\n  …and ${parseErrors.length - 5} more` : ''}`,
      );
    }
  }, 120_000);

  it('per-rule fire counts match the committed snapshot (regression alarm)', () => {
    if (NO_CLONE || !CLONE_DIR) return;
    const root = join(CLONE_DIR, 'apps/v4/registry/new-york-v4');
    const linter = new Linter({ cwd: CLONE_DIR });
    const files = walkComponentFiles(root);

    const counts: Record<string, number> = {};
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      const rel = relative(CLONE_DIR, file);
      const messages = lintWithRecommended(linter, source, rel);
      for (const m of messages) {
        if (m.fatal) continue; // parse errors covered by the prior test
        const id = m.ruleId ?? '<unknown>';
        counts[id] = (counts[id] ?? 0) + 1;
      }
    }

    // Sort for deterministic snapshot output regardless of file order.
    const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
    // Snapshot the (rule → count) table. To bless a new baseline after
    // an intentional change, run `pnpm test -- -u`.
    expect({
      repo: 'shadcn-ui/ui',
      ref: REPO_REF,
      filesLinted: files.length,
      ruleFireCounts: sorted,
    }).toMatchSnapshot();
  }, 120_000);

  it('rules that must NEVER fire on a UI library report zero violations', () => {
    if (NO_CLONE || !CLONE_DIR) return;
    const root = join(CLONE_DIR, 'apps/v4/registry/new-york-v4');
    const linter = new Linter({ cwd: CLONE_DIR });
    const files = walkComponentFiles(root);

    // Backend-safety + AI-coding rules that have no business firing on
    // a pure React component library. If any of these fire on shadcn,
    // it's strong evidence we have a false positive — the rule is
    // recognising the wrong shape.
    const NEVER_FIRE = new Set<string>([
      'deslint/no-hardcoded-secrets',
      'deslint/no-sql-injection',
      'deslint/no-shell-injection',
      'deslint/no-path-traversal',
      'deslint/no-ssrf',
      'deslint/no-permissive-cors',
      'deslint/no-disabled-tls',
      'deslint/no-eval',
      'deslint/safe-redirect',
      'deslint/no-floating-promise-handler',
      'deslint/no-unsafe-mass-assignment',
      'deslint/no-leaked-stack-trace',
      'deslint/secure-cookies',
      'deslint/require-jwt-expiry',
      'deslint/no-hardcoded-localhost',
    ]);

    const offenders: Array<{ rule: string; file: string; line: number; message: string }> = [];
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      const rel = relative(CLONE_DIR, file);
      const messages = lintWithRecommended(linter, source, rel);
      for (const m of messages) {
        if (m.fatal) continue;
        if (m.ruleId && NEVER_FIRE.has(m.ruleId)) {
          offenders.push({ rule: m.ruleId, file: rel, line: m.line ?? 0, message: m.message });
        }
      }
    }

    if (offenders.length > 0) {
      const sample = offenders.slice(0, 10).map((o) => `  ${o.rule} @ ${o.file}:${o.line}  — ${o.message}`).join('\n');
      throw new Error(
        `Backend-safety / AI-coding rules fired on a pure UI library (probable false positives):\n${sample}${offenders.length > 10 ? `\n  …and ${offenders.length - 10} more` : ''}`,
      );
    }
  }, 120_000);
});
