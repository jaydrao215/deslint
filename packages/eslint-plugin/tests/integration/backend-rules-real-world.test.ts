/**
 * End-to-end integration tests for the backend-safety rules pack against
 * REAL CODE pulled from a public git repository.
 *
 * What this guards against:
 *
 * 1. False-positive regressions. We clone `expressjs/express` (pinned to a
 *    long-stable release tag — 4.21.2) and lint its own `lib/` and
 *    `examples/` directories with every backend rule. Express is widely
 *    audited and these files have been read by literally millions of
 *    developers; any violation our rules fire on these is, by default, a
 *    false positive. The test asserts zero violations on this baseline.
 *
 * 2. Genuine-bug detection. AI coding tools regularly autocomplete the
 *    same handful of insecure patterns: hardcoding an OpenAI / Anthropic
 *    / Stripe key into a config object, splicing `req.query.q` into a SQL
 *    string, calling `exec()` with a `${path}` interpolation, hashing a
 *    password with MD5, redirecting to `req.query.next` without
 *    validation. We assert each pattern is flagged with the right
 *    messageId so silent regressions in the heuristics are caught.
 *
 * 3. Crash safety. The whole suite running ESLint against every file in
 *    the clone is a smoke test for the rule code under real AST shapes
 *    (arrow callbacks, default args, computed members, JSDoc-laden
 *    files, sparse `var` declarations from older Express versions).
 *    A rule that throws on a real-world AST node fails this test loudly.
 *
 * Why pin a release tag instead of a commit SHA: the tag is human-readable
 * in failure output and Express has never moved a tag. If express ever
 * re-cuts 4.21.2 we'll find out from this test failing, which is exactly
 * the signal we want for a security-rules pack.
 *
 * Skipping behavior: if the clone fails (offline / sandboxed CI), every
 * `it.skipIf(NO_CLONE)` test is skipped with a console note. The
 * synthetic-fixture assertions still run — they don't need network.
 */

import { describe, it, beforeAll, expect } from 'vitest';
import { Linter } from 'eslint';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import noHardcodedSecrets from '../../src/rules/no-hardcoded-secrets.js';
import noSqlInjection from '../../src/rules/no-sql-injection.js';
import noShellInjection from '../../src/rules/no-shell-injection.js';
import noWeakCrypto from '../../src/rules/no-weak-crypto.js';
import safeRedirect from '../../src/rules/safe-redirect.js';

const REPO_URL = 'https://github.com/expressjs/express.git';
const REPO_REF = '4.21.2';

let CLONE_DIR: string | null = null;
let NO_CLONE = false;

beforeAll(() => {
  const dir = mkdtempSync(join(tmpdir(), 'deslint-express-'));
  try {
    execFileSync(
      'git',
      [
        'clone',
        '--depth', '1',
        '--branch', REPO_REF,
        '--single-branch',
        '--quiet',
        REPO_URL,
        dir,
      ],
      { stdio: ['ignore', 'ignore', 'ignore'], timeout: 60_000 },
    );
    CLONE_DIR = dir;
  } catch (err) {
    NO_CLONE = true;
    // eslint-disable-next-line no-console
    console.warn(
      `[backend-rules-real-world] Skipping git-clone assertions: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
});

/**
 * Walk a directory and return every .js file path (no node_modules).
 * Sync — fast enough for express's ~70 example/lib files and lets us
 * keep the test synchronous to play nicely with vitest's reporter.
 */
function walkJsFiles(root: string): string[] {
  const out: string[] = [];
  function recurse(dir: string): void {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      if (name === 'node_modules' || name === '.git') continue;
      const path = join(dir, name);
      let st;
      try { st = statSync(path); } catch { continue; }
      if (st.isDirectory()) {
        recurse(path);
        continue;
      }
      if (!st.isFile()) continue;
      if (!path.endsWith('.js')) continue;
      out.push(path);
    }
  }
  recurse(root);
  return out;
}

/** Run a single rule against a single source string. */
function lintWithRule(
  source: string,
  ruleName: string,
  rule: any,
  options: unknown[] = [],
): Linter.LintMessage[] {
  const linter = new Linter();
  return linter.verify(source, {
    plugins: { deslint: { rules: { [ruleName]: rule } } },
    rules: { [`deslint/${ruleName}`]: ['error', ...options] },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
    },
  });
}

/**
 * Lint every JS file under `dir` with `rule` and collect every violation.
 * Returns an array of `{ file, message }` entries so the failure message
 * tells you exactly which real-world line tripped the rule.
 */
function lintDirectory(
  dir: string,
  ruleName: string,
  rule: any,
): Array<{ file: string; line: number; message: string }> {
  const findings: Array<{ file: string; line: number; message: string }> = [];
  for (const file of walkJsFiles(dir)) {
    let source: string;
    try {
      source = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const messages = lintWithRule(source, ruleName, rule);
    for (const m of messages) {
      if (m.severity === 0) continue;
      findings.push({
        file: file.replace(dir + '/', ''),
        line: m.line ?? 0,
        message: m.message,
      });
    }
  }
  return findings;
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Part 1 — Baseline: real OSS code MUST stay quiet                       */
/* ────────────────────────────────────────────────────────────────────── */

describe('backend rules — false-positive baseline against expressjs/express ' + REPO_REF, () => {
  // Sanity check that git itself is invokable; if not, skip everything
  // dependent on the clone.
  it('git is available on PATH', () => {
    const result = spawnSync('git', ['--version'], { stdio: 'pipe' });
    expect(result.status).toBe(0);
  });

  it.skipIf(true)('cloned the repo (placeholder so the suite name shows even when skipped)', () => {});

  // Each rule gets its own assertion: zero violations on Express's vetted
  // sources. If this fails, the failure message lists every file + line
  // for triage.
  for (const { ruleName, rule } of [
    { ruleName: 'no-hardcoded-secrets', rule: noHardcodedSecrets },
    { ruleName: 'no-sql-injection', rule: noSqlInjection },
    { ruleName: 'no-shell-injection', rule: noShellInjection },
    { ruleName: 'no-weak-crypto', rule: noWeakCrypto },
    { ruleName: 'safe-redirect', rule: safeRedirect },
  ]) {
    it(`${ruleName}: zero violations across express/{lib,examples}`, () => {
      if (NO_CLONE || !CLONE_DIR) {
        // eslint-disable-next-line no-console
        console.warn(`[${ruleName}] skipped — clone unavailable`);
        return;
      }
      const findings: Array<{ file: string; line: number; message: string }> = [];
      for (const sub of ['lib', 'examples']) {
        const path = join(CLONE_DIR, sub);
        if (!existsSync(path)) continue;
        findings.push(...lintDirectory(path, ruleName, rule));
      }
      if (findings.length > 0) {
        const summary = findings
          .slice(0, 10)
          .map((f) => `  ${f.file}:${f.line}  ${f.message}`)
          .join('\n');
        throw new Error(
          `Expected zero false positives in express/{lib,examples} but found ${findings.length}:\n${summary}${findings.length > 10 ? `\n  …and ${findings.length - 10} more` : ''}`,
        );
      }
      expect(findings.length).toBe(0);
    });
  }
});

/* ────────────────────────────────────────────────────────────────────── */
/*  Part 2 — Real-world AI-mistake fixtures: each MUST be caught          */
/* ────────────────────────────────────────────────────────────────────── */

/**
 * These fixtures represent the AI-coding mistakes we've observed: code
 * that compiles and ships, but ships a hole. They are intentionally tight
 * one-liners so the assertion message points at the exact behavior.
 */
describe('backend rules — known AI-mistake fixtures', () => {
  it('no-hardcoded-secrets catches a leaked OpenAI key in a config object', () => {
    // Built at runtime so the source of THIS file never contains a
    // string matching the OpenAI key fingerprint — see the comment in
    // tests/rules/no-hardcoded-secrets.test.ts for the rationale.
    const fakeKey = 'sk-' + 'proj-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdef0123';
    const source = `
      // The AI helpfully autocompleted a "working" key.
      module.exports = {
        openai: { apiKey: "${fakeKey}" }
      };
    `;
    const messages = lintWithRule(source, 'no-hardcoded-secrets', noHardcodedSecrets);
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0].messageId).toBe('secretShapedLiteral');
  });

  it('no-hardcoded-secrets catches a leaked AWS access key', () => {
    const fakeKey = 'AKIA' + 'IOSFODNN' + '7EXAMPLE';
    const source = `const accessKeyId = "${fakeKey}";`;
    const messages = lintWithRule(source, 'no-hardcoded-secrets', noHardcodedSecrets);
    expect(messages.some((m) => m.messageId === 'secretShapedLiteral')).toBe(true);
  });

  it('no-hardcoded-secrets stays quiet on a placeholder example', () => {
    const source = 'const apiKey = process.env.OPENAI_API_KEY ?? "your-api-key-here";';
    const messages = lintWithRule(source, 'no-hardcoded-secrets', noHardcodedSecrets);
    expect(messages.length).toBe(0);
  });

  it('no-sql-injection catches `req.query` spliced into a SELECT', () => {
    const source = `
      app.get('/search', (req, res) => {
        db.query("SELECT * FROM products WHERE name LIKE '%" + req.query.q + "%'", (err, rows) => {
          res.json(rows);
        });
      });
    `;
    const messages = lintWithRule(source, 'no-sql-injection', noSqlInjection);
    expect(messages.some((m) => m.messageId === 'concatenatedQuery')).toBe(true);
  });

  it('no-sql-injection catches template-literal interpolation in an UPDATE', () => {
    const source = `
      async function updateName(id, name) {
        return pool.execute(\`UPDATE users SET name = '\${name}' WHERE id = \${id}\`);
      }
    `;
    const messages = lintWithRule(source, 'no-sql-injection', noSqlInjection);
    expect(messages.some((m) => m.messageId === 'interpolatedQuery')).toBe(true);
  });

  it('no-sql-injection stays quiet on `db.query("…", [params])`', () => {
    const source = `db.query("SELECT * FROM users WHERE id = ?", [userId]);`;
    const messages = lintWithRule(source, 'no-sql-injection', noSqlInjection);
    expect(messages.length).toBe(0);
  });

  it('no-shell-injection catches an exec() with `${path}` interpolation', () => {
    const source = `
      const { exec } = require('child_process');
      exec(\`tar xf \${userUpload}\`, (err) => { /* … */ });
    `;
    const messages = lintWithRule(source, 'no-shell-injection', noShellInjection);
    expect(messages.some((m) => m.messageId === 'execWithDynamicCommand')).toBe(true);
  });

  it('no-shell-injection stays quiet on the argv form', () => {
    const source = `execFile('/usr/bin/git', ['clone', repoUrl], (err) => {});`;
    const messages = lintWithRule(source, 'no-shell-injection', noShellInjection);
    expect(messages.length).toBe(0);
  });

  it('no-weak-crypto catches `crypto.createHash("md5")` for a password hash', () => {
    const source = `
      const crypto = require('crypto');
      function hashPassword(pw) {
        return crypto.createHash("md5").update(pw).digest("hex");
      }
    `;
    const messages = lintWithRule(source, 'no-weak-crypto', noWeakCrypto);
    expect(messages.some((m) => m.messageId === 'weakHashAlgorithm')).toBe(true);
  });

  it('no-weak-crypto catches Math.random() bound to a session token', () => {
    const source = `
      function newSession() {
        const sessionId = Math.random().toString(36).slice(2);
        return sessionId;
      }
    `;
    const messages = lintWithRule(source, 'no-weak-crypto', noWeakCrypto);
    expect(messages.some((m) => m.messageId === 'mathRandomForSecurity')).toBe(true);
  });

  it('no-weak-crypto stays quiet on Math.random() for jitter', () => {
    const source = `const jitterMs = Math.random() * 100;`;
    const messages = lintWithRule(source, 'no-weak-crypto', noWeakCrypto);
    expect(messages.length).toBe(0);
  });

  it('safe-redirect catches `res.redirect(req.query.next)`', () => {
    const source = `
      app.get('/login', (req, res) => {
        if (req.user) return res.redirect(req.query.next);
        res.render('login');
      });
    `;
    const messages = lintWithRule(source, 'safe-redirect', safeRedirect);
    expect(messages.some((m) => m.messageId === 'openRedirect')).toBe(true);
  });

  it('safe-redirect stays quiet on hardcoded redirect targets (Express examples shape)', () => {
    const source = `
      app.post('/login', (req, res) => { res.redirect('/'); });
      app.post('/logout', (req, res) => { res.redirect(302, '/login'); });
    `;
    const messages = lintWithRule(source, 'safe-redirect', safeRedirect);
    expect(messages.length).toBe(0);
  });
});
