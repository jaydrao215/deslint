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
import noPathTraversal from '../../src/rules/no-path-traversal.js';
import noSsrf from '../../src/rules/no-ssrf.js';
import secureCookies from '../../src/rules/secure-cookies.js';
import noPermissiveCors from '../../src/rules/no-permissive-cors.js';
import noEval from '../../src/rules/no-eval.js';
import noDisabledTls from '../../src/rules/no-disabled-tls.js';
import requireJwtExpiry from '../../src/rules/require-jwt-expiry.js';
import noHydrationMismatch from '../../src/rules/no-hydration-mismatch.js';
import noLeakedEnvOnClient from '../../src/rules/no-leaked-env-on-client.js';
import noAsyncUseEffect from '../../src/rules/no-async-useeffect.js';
import noFloatingPromiseHandler from '../../src/rules/no-floating-promise-handler.js';
import noUnsafeMassAssignment from '../../src/rules/no-unsafe-mass-assignment.js';
import noServerOnlyInClient from '../../src/rules/no-server-only-in-client.js';
import noPlaceholderCode from '../../src/rules/no-placeholder-code.js';
import noHardcodedLocalhost from '../../src/rules/no-hardcoded-localhost.js';
import noEmptyCatch from '../../src/rules/no-empty-catch.js';
import noProdConsole from '../../src/rules/no-prod-console.js';
import noLeakedStackTrace from '../../src/rules/no-leaked-stack-trace.js';
import noMockDataInProd from '../../src/rules/no-mock-data-in-prod.js';

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
  // Auto-detect: if the source uses ESM (`import`/`export`/top-level
  // `await`), use module; otherwise commonjs. Avoids forcing every
  // fixture to declare which mode it's in.
  const usesEsm =
    /\bimport\s/m.test(source) ||
    /\bexport\s/m.test(source) ||
    /^[ \t]*await\s/m.test(source);
  const sourceType: 'module' | 'commonjs' = usesEsm ? 'module' : 'commonjs';
  const messages = linter.verify(source, {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: { deslint: { rules: { [ruleName]: rule } } },
    rules: { [`deslint/${ruleName}`]: ['error', ...options] },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType,
    },
  });
  const parseError = messages.find((m) => m.fatal);
  if (parseError) {
    throw new Error(
      `Parse error at ${parseError.line}:${parseError.column}: ${parseError.message}\nsourceType=${sourceType}\nSource:\n${source}`,
    );
  }
  return messages;
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
    { ruleName: 'no-path-traversal', rule: noPathTraversal },
    { ruleName: 'no-ssrf', rule: noSsrf },
    { ruleName: 'secure-cookies', rule: secureCookies },
    { ruleName: 'no-permissive-cors', rule: noPermissiveCors },
    { ruleName: 'no-eval', rule: noEval },
    { ruleName: 'no-disabled-tls', rule: noDisabledTls },
    { ruleName: 'require-jwt-expiry', rule: requireJwtExpiry },
    { ruleName: 'no-floating-promise-handler', rule: noFloatingPromiseHandler },
    { ruleName: 'no-unsafe-mass-assignment', rule: noUnsafeMassAssignment },
    { ruleName: 'no-placeholder-code', rule: noPlaceholderCode },
    { ruleName: 'no-hardcoded-localhost', rule: noHardcodedLocalhost },
    { ruleName: 'no-empty-catch', rule: noEmptyCatch },
    { ruleName: 'no-leaked-stack-trace', rule: noLeakedStackTrace },
    { ruleName: 'no-mock-data-in-prod', rule: noMockDataInProd },
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

  // ── New backend rules — additional AI-mistake fixtures ──────────────

  it('no-path-traversal catches `fs.readFile(req.query.file)`', () => {
    const source = `
      app.get('/file', (req, res) => {
        fs.readFile(req.query.file, (err, data) => res.send(data));
      });
    `;
    const messages = lintWithRule(source, 'no-path-traversal', noPathTraversal);
    expect(messages.some((m) => m.messageId === 'pathTraversal')).toBe(true);
  });

  it('no-path-traversal catches `res.sendFile(req.params.name)`', () => {
    const source = `app.get('/dl', (req, res) => res.sendFile(req.params.name));`;
    const messages = lintWithRule(source, 'no-path-traversal', noPathTraversal);
    expect(messages.some((m) => m.messageId === 'sendFileTraversal')).toBe(true);
  });

  it('no-path-traversal stays quiet on `res.sendFile(path.join(__dirname, ...))`', () => {
    const source = `res.sendFile(path.join(__dirname, 'public', 'index.html'));`;
    const messages = lintWithRule(source, 'no-path-traversal', noPathTraversal);
    expect(messages.length).toBe(0);
  });

  it('no-ssrf catches `fetch(req.body.url)`', () => {
    const source = `
      app.post('/proxy', async (req, res) => {
        const r = await fetch(req.body.url);
        res.send(await r.text());
      });
    `;
    const messages = lintWithRule(source, 'no-ssrf', noSsrf);
    expect(messages.some((m) => m.messageId === 'ssrf')).toBe(true);
  });

  it('no-ssrf stays quiet on a hardcoded API URL', () => {
    const source = `fetch("https://api.example.com/v1/data");`;
    const messages = lintWithRule(source, 'no-ssrf', noSsrf);
    expect(messages.length).toBe(0);
  });

  it('secure-cookies catches a session cookie missing the security trio', () => {
    const source = `
      app.post('/login', (req, res) => {
        res.cookie('session', token);
        res.redirect('/');
      });
    `;
    const messages = lintWithRule(source, 'secure-cookies', secureCookies);
    expect(messages.some((m) => m.messageId === 'insecureSession')).toBe(true);
  });

  it('secure-cookies stays quiet on a properly configured cookie', () => {
    const source = `
      res.cookie('session', token, { httpOnly: true, secure: true, sameSite: 'lax' });
    `;
    const messages = lintWithRule(source, 'secure-cookies', secureCookies);
    expect(messages.length).toBe(0);
  });

  it('no-permissive-cors catches origin:* with credentials:true', () => {
    const source = `app.use(cors({ origin: "*", credentials: true }));`;
    const messages = lintWithRule(source, 'no-permissive-cors', noPermissiveCors);
    expect(messages.some((m) => m.messageId === 'wildcardWithCredentials')).toBe(true);
  });

  it('no-permissive-cors stays quiet on an allowlist with credentials', () => {
    const source = `app.use(cors({ origin: ["https://app.example.com"], credentials: true }));`;
    const messages = lintWithRule(source, 'no-permissive-cors', noPermissiveCors);
    expect(messages.length).toBe(0);
  });

  it('no-eval catches eval(req.body.code) — the worst RCE shape AI writes', () => {
    const source = `app.post('/run', (req, res) => res.json({ result: eval(req.body.code) }));`;
    const messages = lintWithRule(source, 'no-eval', noEval);
    expect(messages.some((m) => m.messageId === 'evalDynamic')).toBe(true);
  });

  it('no-eval catches new Function(body)', () => {
    const source = `const fn = new Function("ctx", req.body.formula);`;
    const messages = lintWithRule(source, 'no-eval', noEval);
    expect(messages.some((m) => m.messageId === 'newFunctionDynamic')).toBe(true);
  });

  it('no-disabled-tls catches `rejectUnauthorized: false` in an https.Agent', () => {
    const source = `const agent = new https.Agent({ rejectUnauthorized: false });`;
    const messages = lintWithRule(source, 'no-disabled-tls', noDisabledTls);
    expect(messages.some((m) => m.messageId === 'agentInsecureTls')).toBe(true);
  });

  it('no-disabled-tls catches NODE_TLS_REJECT_UNAUTHORIZED = "0"', () => {
    const source = `process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";`;
    const messages = lintWithRule(source, 'no-disabled-tls', noDisabledTls);
    expect(messages.some((m) => m.messageId === 'tlsEnvDisabled')).toBe(true);
  });

  it('require-jwt-expiry catches `jwt.sign(payload, secret)`', () => {
    const source = `const token = jwt.sign({ sub: user.id }, secret);`;
    const messages = lintWithRule(source, 'require-jwt-expiry', requireJwtExpiry);
    expect(messages.some((m) => m.messageId === 'missingExpiry')).toBe(true);
  });

  it('require-jwt-expiry stays quiet on `jwt.sign(payload, secret, { expiresIn })`', () => {
    const source = `const token = jwt.sign({ sub: user.id }, secret, { expiresIn: "15m" });`;
    const messages = lintWithRule(source, 'require-jwt-expiry', requireJwtExpiry);
    expect(messages.length).toBe(0);
  });
});

/* ────────────────────────────────────────────────────────────────────── */
/*  Part 3 — Next.js / React hydration & env-leak fixtures                 */
/* ────────────────────────────────────────────────────────────────────── */

function lintJsx(
  source: string,
  ruleName: string,
  rule: any,
  filename?: string,
): Linter.LintMessage[] {
  const linter = new Linter();
  const messages = linter.verify(
    source,
    {
      // ESLint v10 flat config: with no `files` filter the config only
      // applies to .js. Add an explicit glob so .tsx/.jsx files match.
      files: ['**/*.{js,jsx,ts,tsx}'],
      plugins: { deslint: { rules: { [ruleName]: rule } } },
      rules: { [`deslint/${ruleName}`]: 'error' },
      languageOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
    },
    filename ?? 'file.tsx',
  );
  // If ESLint reports parse errors, surface them so the test fails
  // with a useful message rather than silently returning zero rule hits.
  const parseError = messages.find((m) => m.fatal);
  if (parseError) {
    throw new Error(`Parse error at ${parseError.line}:${parseError.column}: ${parseError.message}`);
  }
  return messages;
}

describe('next.js / react rules — known AI-mistake fixtures', () => {
  it('no-hydration-mismatch catches the Math.random() ID antipattern', () => {
    const source = `
      export default function Card() {
        return <div key={Math.random()}>Hello</div>;
      }
    `;
    const messages = lintJsx(source, 'no-hydration-mismatch', noHydrationMismatch);
    expect(messages.some((m) => m.messageId === 'nonDeterministicInJsx')).toBe(true);
  });

  it('no-hydration-mismatch catches new Date() inline (the "current time" bug)', () => {
    const source = `
      export default function Clock() {
        return <time>{new Date().toLocaleTimeString()}</time>;
      }
    `;
    const messages = lintJsx(source, 'no-hydration-mismatch', noHydrationMismatch);
    expect(messages.some((m) => m.messageId === 'nonDeterministicInJsx')).toBe(true);
  });

  it('no-hydration-mismatch stays quiet inside useEffect', () => {
    const source = `
      export default function Clock() {
        const [now, setNow] = useState("");
        useEffect(() => {
          setNow(new Date().toLocaleTimeString());
        }, []);
        return <time>{now}</time>;
      }
    `;
    const messages = lintJsx(source, 'no-hydration-mismatch', noHydrationMismatch);
    expect(messages.length).toBe(0);
  });

  it('no-leaked-env-on-client catches process.env.SECRET in a "use client" file', () => {
    const source = `
      'use client';
      import React from 'react';
      export function ChatBox() {
        const key = process.env.OPENAI_API_KEY;
        return <div>{key ? 'configured' : 'not configured'}</div>;
      }
    `;
    const messages = lintJsx(source, 'no-leaked-env-on-client', noLeakedEnvOnClient);
    expect(messages.some((m) => m.messageId === 'leakedEnv')).toBe(true);
  });

  it('no-leaked-env-on-client stays quiet on NEXT_PUBLIC_*', () => {
    const source = `
      'use client';
      export function Hero() {
        return <a href={process.env.NEXT_PUBLIC_APP_URL}>Open app</a>;
      }
    `;
    const messages = lintJsx(source, 'no-leaked-env-on-client', noLeakedEnvOnClient);
    expect(messages.length).toBe(0);
  });

  it('no-leaked-env-on-client stays quiet on server files (no "use client" directive)', () => {
    const source = `
      // server component / route handler — full env is fine
      export async function getServerSideProps() {
        return { props: { apiKey: process.env.OPENAI_API_KEY } };
      }
    `;
    const messages = lintJsx(source, 'no-leaked-env-on-client', noLeakedEnvOnClient);
    expect(messages.length).toBe(0);
  });

  // ── New AI-coding-pattern fixtures (wave 3) ────────────────────────

  it('no-async-useeffect catches the canonical async-effect antipattern', () => {
    const source = `
      'use client';
      import { useEffect } from 'react';
      export function Profile() {
        useEffect(async () => {
          const u = await fetch('/api/me').then(r => r.json());
          setUser(u);
        }, []);
        return null;
      }
    `;
    const messages = lintJsx(source, 'no-async-useeffect', noAsyncUseEffect);
    expect(messages.some((m) => m.messageId === 'asyncEffect')).toBe(true);
  });

  it('no-async-useeffect stays quiet on the IIFE-wrapped pattern', () => {
    const source = `
      'use client';
      import { useEffect } from 'react';
      export function Profile() {
        useEffect(() => {
          (async () => { await fetch('/api/me'); })();
        }, []);
        return null;
      }
    `;
    const messages = lintJsx(source, 'no-async-useeffect', noAsyncUseEffect);
    expect(messages.length).toBe(0);
  });

  it('no-floating-promise-handler catches the unwrapped async-handler shape', () => {
    const source = `
      app.get('/users/:id', async (req, res) => {
        const u = await User.findById(req.params.id);
        res.json(u);
      });
    `;
    const messages = lintWithRule(source, 'no-floating-promise-handler', noFloatingPromiseHandler);
    expect(messages.some((m) => m.messageId === 'unwrappedAsyncHandler')).toBe(true);
  });

  it('no-floating-promise-handler stays quiet when wrapped in asyncHandler', () => {
    const source = `
      app.get('/users/:id', asyncHandler(async (req, res) => {
        const u = await User.findById(req.params.id);
        res.json(u);
      }));
    `;
    const messages = lintWithRule(source, 'no-floating-promise-handler', noFloatingPromiseHandler);
    expect(messages.length).toBe(0);
  });

  it('no-unsafe-mass-assignment catches Object.assign(user, req.body)', () => {
    const source = `
      app.patch('/profile', async (req, res) => {
        const u = await User.findById(req.user.id);
        Object.assign(u, req.body);
        await u.save();
        res.json(u);
      });
    `;
    const messages = lintWithRule(source, 'no-unsafe-mass-assignment', noUnsafeMassAssignment);
    expect(messages.some((m) => m.messageId === 'massAssignObject')).toBe(true);
  });

  it('no-unsafe-mass-assignment catches the spread-body shape', () => {
    const source = `
      const updated = { ...user, ...req.body };
      await user.update(updated);
    `;
    const messages = lintWithRule(source, 'no-unsafe-mass-assignment', noUnsafeMassAssignment);
    expect(messages.some((m) => m.messageId === 'massAssignSpread')).toBe(true);
  });

  it('no-server-only-in-client catches `import fs from "fs"` in a client file', () => {
    const source = `
      'use client';
      import fs from 'fs';
      export function FileBrowser() { return null; }
    `;
    const messages = lintJsx(source, 'no-server-only-in-client', noServerOnlyInClient);
    expect(messages.some((m) => m.messageId === 'serverOnlyImport')).toBe(true);
  });

  it('no-placeholder-code catches `throw new Error("not implemented")`', () => {
    const source = `
      export function chargeCustomer(amount) {
        throw new Error('not implemented');
      }
    `;
    const messages = lintWithRule(source, 'no-placeholder-code', noPlaceholderCode);
    expect(messages.some((m) => m.messageId === 'notImplemented')).toBe(true);
  });

  it('no-hardcoded-localhost catches a localhost URL in a fetch call', () => {
    const source = `
      export async function loadUsers() {
        const r = await fetch('http://localhost:3000/api/users');
        return r.json();
      }
    `;
    const messages = lintWithRule(source, 'no-hardcoded-localhost', noHardcodedLocalhost);
    expect(messages.some((m) => m.messageId === 'hardcodedLocalhost')).toBe(true);
  });

  // ── Quality-gate rules (wave 4) — AI-mistake fixtures ─────────────

  it('no-empty-catch catches `try { … } catch {}`', () => {
    const source = `
      app.get('/users', async (req, res) => {
        try { const u = await loadUsers(); res.json(u); } catch {}
      });
    `;
    const messages = lintWithRule(source, 'no-empty-catch', noEmptyCatch);
    expect(messages.some((m) => m.messageId === 'emptyCatch')).toBe(true);
  });

  it('no-empty-catch catches `catch (e) { /* TODO */ }`', () => {
    const source = `
      function safeParse(s) {
        try { return JSON.parse(s); } catch (e) { /* TODO: handle error */ }
      }
    `;
    const messages = lintWithRule(source, 'no-empty-catch', noEmptyCatch);
    expect(messages.some((m) => m.messageId === 'commentOnlyCatch')).toBe(true);
  });

  it('no-prod-console catches a `console.log` left in production source', () => {
    const source = `
      export function chargeCustomer(amount) {
        console.log('charging', amount);
        return billing.charge(amount);
      }
    `;
    const messages = lintWithRule(source, 'no-prod-console', noProdConsole);
    expect(messages.some((m) => m.messageId === 'prodConsole')).toBe(true);
  });

  it('no-prod-console stays quiet on console.error', () => {
    const source = `console.error('Boot failed', err);`;
    const messages = lintWithRule(source, 'no-prod-console', noProdConsole);
    expect(messages.length).toBe(0);
  });

  it('no-leaked-stack-trace catches `res.status(500).send(err.stack)`', () => {
    const source = `
      app.use((err, req, res, next) => {
        res.status(500).send(err.stack);
      });
    `;
    const messages = lintWithRule(source, 'no-leaked-stack-trace', noLeakedStackTrace);
    expect(messages.some((m) => m.messageId === 'leakedStack')).toBe(true);
  });

  it('no-leaked-stack-trace catches `res.json({ error: err })`', () => {
    const source = `
      app.use((err, req, res, next) => {
        res.json({ error: err });
      });
    `;
    const messages = lintWithRule(source, 'no-leaked-stack-trace', noLeakedStackTrace);
    expect(messages.some((m) => m.messageId === 'leakedErrorObject')).toBe(true);
  });

  it('no-mock-data-in-prod catches `const mockUsers = [...]` in production code', () => {
    const source = `
      export const mockUsers = [
        { id: 1, name: 'Alice', email: 'alice@example.com' },
        { id: 2, name: 'Bob', email: 'bob@example.com' },
      ];
      export function listUsers() { return mockUsers; }
    `;
    const messages = lintWithRule(source, 'no-mock-data-in-prod', noMockDataInProd);
    expect(messages.some((m) => m.messageId === 'mockNamedDeclaration')).toBe(true);
  });

  it('no-mock-data-in-prod catches a `john.doe@example.com` literal', () => {
    const source = `
      export const defaultAdmin = { email: "john.doe@example.com", role: "admin" };
    `;
    const messages = lintWithRule(source, 'no-mock-data-in-prod', noMockDataInProd);
    expect(messages.some((m) => m.messageId === 'placeholderEmail')).toBe(true);
  });

  it('no-hardcoded-localhost stays quiet inside test fixture paths', () => {
    const linter = new Linter();
    const source = `await fetch('http://localhost:3000/health');`;
    const messages = linter.verify(
      source,
      {
        files: ['**/*.{js,jsx,ts,tsx}'],
        plugins: { deslint: { rules: { 'no-hardcoded-localhost': noHardcodedLocalhost as any } } },
        rules: { 'deslint/no-hardcoded-localhost': 'error' },
        languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
      },
      'tests/api.spec.ts',
    );
    expect(messages.length).toBe(0);
  });

  it('no-leaked-env-on-client catches the *.client.tsx filename convention', () => {
    const source = `
      import React from 'react';
      export function Inner() {
        return <span>{process.env.STRIPE_SECRET_KEY}</span>;
      }
    `;
    // Use a relative filename so the flat-config `files` glob matches.
    const messages = lintJsx(
      source,
      'no-leaked-env-on-client',
      noLeakedEnvOnClient,
      'app/components/Inner.client.tsx',
    );
    expect(messages.some((m) => m.messageId === 'leakedEnv')).toBe(true);
  });
});
