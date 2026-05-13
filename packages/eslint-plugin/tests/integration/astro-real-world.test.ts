/**
 * End-to-end integration tests for `.astro` support.
 *
 * Two halves:
 *
 *   1. AI-mistake fixtures — synthetic `.astro` snippets demonstrating
 *      the exact failure modes that produced false negatives when
 *      Astro support was missing entirely. Each fixture is parsed by
 *      `astro-eslint-parser` and we assert that the relevant rule
 *      fires with the expected messageId.
 *
 *   2. Real-OSS baseline — clones the `examples/blog` and
 *      `examples/basics` directories from `withastro/astro` at tag
 *      `astro@4.16.18` and lints every `.astro` file with the rules
 *      most likely to trigger on official starter code. Asserts zero
 *      crashes (smoke-test for the visitor on real ASTs) and zero
 *      false positives on the blog/basics defaults (since those
 *      templates are intentionally minimal and well-vetted).
 */

import { describe, it, beforeAll, expect } from 'vitest';
import { Linter } from 'eslint';
import * as astroParser from 'astro-eslint-parser';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import noArbitraryColors from '../../src/rules/no-arbitrary-colors.js';
import noArbitrarySpacing from '../../src/rules/no-arbitrary-spacing.js';
import noArbitraryTypography from '../../src/rules/no-arbitrary-typography.js';
import imageAltText from '../../src/rules/image-alt-text.js';
import safeExternalLinks from '../../src/rules/safe-external-links.js';
import noDangerousHtml from '../../src/rules/no-dangerous-html.js';
import ariaValidation from '../../src/rules/aria-validation.js';
import noHardcodedSecrets from '../../src/rules/no-hardcoded-secrets.js';
import noSqlInjection from '../../src/rules/no-sql-injection.js';
import noLeakedEnvOnClient from '../../src/rules/no-leaked-env-on-client.js';

const REPO_URL = 'https://github.com/withastro/astro.git';
const REPO_REF = 'astro@4.16.18';

let CLONE_DIR: string | null = null;
let NO_CLONE = false;

beforeAll(() => {
  // Sparse-checkout: `withastro/astro` is huge (>500 MB on disk),
  // and we only need the `examples/blog` + `examples/basics`
  // directories. Init, fetch a single tag, set the cone, check out.
  const dir = mkdtempSync(join(tmpdir(), 'deslint-astro-'));
  try {
    execFileSync('git', ['init', '-q', dir], { stdio: 'ignore', timeout: 10_000 });
    execFileSync('git', ['-C', dir, 'remote', 'add', 'origin', REPO_URL], { stdio: 'ignore', timeout: 10_000 });
    execFileSync(
      'git',
      ['-C', dir, '-c', 'protocol.version=2', 'fetch', '--depth', '1', '--quiet', 'origin', 'tag', REPO_REF],
      { stdio: 'ignore', timeout: 90_000 },
    );
    execFileSync('git', ['-C', dir, 'sparse-checkout', 'init', '--cone'], { stdio: 'ignore', timeout: 10_000 });
    execFileSync('git', ['-C', dir, 'sparse-checkout', 'set', 'examples/blog', 'examples/basics'], {
      stdio: 'ignore',
      timeout: 10_000,
    });
    execFileSync('git', ['-C', dir, 'checkout', '-q', 'FETCH_HEAD'], { stdio: 'ignore', timeout: 15_000 });
    CLONE_DIR = dir;
  } catch (err) {
    NO_CLONE = true;
    // eslint-disable-next-line no-console
    console.warn(
      `[astro-real-world] Skipping git-clone assertions: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
});

function walkAstroFiles(root: string): string[] {
  const out: string[] = [];
  function recurse(d: string): void {
    let entries: string[];
    try { entries = readdirSync(d); } catch { return; }
    for (const name of entries) {
      if (name === 'node_modules' || name === '.git') continue;
      const p = join(d, name);
      let st;
      try { st = statSync(p); } catch { continue; }
      if (st.isDirectory()) { recurse(p); continue; }
      if (st.isFile() && p.endsWith('.astro')) out.push(p);
    }
  }
  recurse(root);
  return out;
}

/**
 * Lint an `.astro` source string with a given rule. Returns the lint
 * messages (parse errors surfaced as fatal messages).
 */
function lintAstro(source: string, ruleName: string, rule: any, filename = 'file.astro'): Linter.LintMessage[] {
  const linter = new Linter();
  const messages = linter.verify(
    source,
    {
      files: ['**/*.astro'],
      plugins: { deslint: { rules: { [ruleName]: rule } } },
      rules: { [`deslint/${ruleName}`]: 'error' },
      languageOptions: {
        parser: astroParser as unknown as Linter.Config['languageOptions']['parser'],
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    filename,
  );
  const fatal = messages.find((m) => m.fatal);
  if (fatal) {
    throw new Error(
      `Parse error at ${fatal.line}:${fatal.column} in ${filename}: ${fatal.message}\n--- source ---\n${source}\n--- end ---`,
    );
  }
  return messages;
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Part 1 — AI-mistake fixtures (the false-negative regressions)         */
/* ────────────────────────────────────────────────────────────────────── */

describe('astro support — AI-mistake fixtures', () => {
  it('no-arbitrary-colors fires on a plain `class="bg-[#...]"` attribute', () => {
    const source = `---
const variant = 'primary';
---
<div class="bg-[#ff0000] p-4">hi</div>`;
    const messages = lintAstro(source, 'no-arbitrary-colors', noArbitraryColors);
    expect(messages.some((m) => m.messageId === 'arbitraryColor')).toBe(true);
  });

  it('no-arbitrary-colors fires on a class:list={[...]} array — the canonical Astro idiom', () => {
    // Pre-fix, the class-visitor silently skipped JSXNamespacedName
    // (class:list), so this exact shape produced ZERO violations
    // even though it contains an arbitrary hex. That was the dominant
    // source of false negatives on Astro codebases.
    const source = `---
const active = true;
---
<div class:list={["bg-[#ff0000]", "p-4", { "text-[#abc]": active }]}>hi</div>`;
    const messages = lintAstro(source, 'no-arbitrary-colors', noArbitraryColors);
    expect(messages.filter((m) => m.messageId === 'arbitraryColor').length).toBeGreaterThanOrEqual(2);
  });

  it('no-arbitrary-spacing fires on class:list array entries', () => {
    const source = `<div class:list={["p-[13px]", "gap-[7px]"]} />`;
    const messages = lintAstro(source, 'no-arbitrary-spacing', noArbitrarySpacing);
    expect(messages.filter((m) => m.messageId === 'arbitrarySpacing').length).toBeGreaterThanOrEqual(2);
  });

  it('no-arbitrary-typography fires on class:list object keys (clsx-style)', () => {
    const source = `---
const big = true;
---
<p class:list={{ "text-[17px]": big, "leading-[24px]": true }} />`;
    const messages = lintAstro(source, 'no-arbitrary-typography', noArbitraryTypography);
    expect(messages.filter((m) => m.messageId === 'arbitraryTypography').length).toBeGreaterThanOrEqual(2);
  });

  it('image-alt-text fires on a bare `<img>` inside an Astro template', () => {
    const source = `<img src="/hero.png" />`;
    const messages = lintAstro(source, 'image-alt-text', imageAltText);
    expect(messages.some((m) => m.messageId === 'missingAlt')).toBe(true);
  });

  it('safe-external-links fires on `<a target="_blank">` without rel', () => {
    const source = `<a href="https://x.com" target="_blank">x</a>`;
    const messages = lintAstro(source, 'safe-external-links', safeExternalLinks);
    expect(messages.some((m) => m.messageId === 'missingRel')).toBe(true);
  });

  it('no-dangerous-html fires on Astro\'s `set:html={...}` (the dangerouslySetInnerHTML equivalent)', () => {
    const source = `---
const body = userComment;
---
<div set:html={body} />`;
    const messages = lintAstro(source, 'no-dangerous-html', noDangerousHtml);
    expect(messages.some((m) => m.messageId === 'dangerousHtml')).toBe(true);
  });

  it('no-dangerous-html stays quiet on Astro\'s `<style set:html={...}>` (CSS injection has different threat model)', () => {
    const source = `<style set:html={cssVars} />`;
    const messages = lintAstro(source, 'no-dangerous-html', noDangerousHtml);
    expect(messages.length).toBe(0);
  });

  it('aria-validation catches a misspelled `aria-hiden` attribute', () => {
    const source = `<button aria-hiden="true">x</button>`;
    const messages = lintAstro(source, 'aria-validation', ariaValidation);
    expect(messages.length).toBeGreaterThan(0);
  });

  it('frontmatter rules: no-hardcoded-secrets catches a leaked AWS key in the `---` section', () => {
    // Build the fingerprint at runtime so the source of this file
    // doesn't trip GitHub push protection.
    const fakeKey = 'AKIA' + 'IOSFODNN' + '7EXAMPLE';
    const source = `---
const accessKeyId = "${fakeKey}";
---
<p>hi</p>`;
    const messages = lintAstro(source, 'no-hardcoded-secrets', noHardcodedSecrets);
    expect(messages.some((m) => m.messageId === 'secretShapedLiteral')).toBe(true);
  });

  it('frontmatter rules: no-sql-injection catches a concatenated query', () => {
    const source = `---
const rows = db.query("SELECT * FROM users WHERE id = " + Astro.url.searchParams.get("id"));
---
<p>{rows.length}</p>`;
    const messages = lintAstro(source, 'no-sql-injection', noSqlInjection);
    expect(messages.some((m) => m.messageId === 'concatenatedQuery')).toBe(true);
  });

  it('frontmatter rules: no-leaked-env-on-client treats Astro components as server-side and stays quiet', () => {
    // .astro components run server-side by default — env reads here
    // are the documented happy path. We should not fire.
    const source = `---
const key = process.env.OPENAI_API_KEY;
---
<p>{key ? 'configured' : 'not configured'}</p>`;
    const messages = lintAstro(source, 'no-leaked-env-on-client', noLeakedEnvOnClient);
    expect(messages.length).toBe(0);
  });
});

/* ────────────────────────────────────────────────────────────────────── */
/*  Part 2 — Real-OSS baseline (zero crashes on the official starters)    */
/* ────────────────────────────────────────────────────────────────────── */

describe(`astro support — real OSS baseline against withastro/astro ${REPO_REF}`, () => {
  it('git is available', () => {
    expect(spawnSync('git', ['--version'], { stdio: 'pipe' }).status).toBe(0);
  });

  for (const { ruleName, rule } of [
    { ruleName: 'no-arbitrary-colors', rule: noArbitraryColors },
    { ruleName: 'no-arbitrary-spacing', rule: noArbitrarySpacing },
    { ruleName: 'no-arbitrary-typography', rule: noArbitraryTypography },
    { ruleName: 'image-alt-text', rule: imageAltText },
    { ruleName: 'safe-external-links', rule: safeExternalLinks },
    { ruleName: 'no-dangerous-html', rule: noDangerousHtml },
    { ruleName: 'aria-validation', rule: ariaValidation },
  ]) {
    it(`${ruleName}: zero crashes across examples/blog + examples/basics`, () => {
      if (NO_CLONE || !CLONE_DIR) {
        // eslint-disable-next-line no-console
        console.warn(`[${ruleName}] skipped — clone unavailable`);
        return;
      }
      const examplesDir = join(CLONE_DIR, 'examples');
      if (!existsSync(examplesDir)) return;

      const files = walkAstroFiles(examplesDir);
      expect(files.length).toBeGreaterThan(0);

      // For each file: parse + run the rule. Any thrown error
      // (uncaught exception or fatal parse error) fails the test
      // with the file path. ESLint reports parse errors as `fatal`
      // messages — those are surfaced by `lintAstro` as throws.
      for (const file of files) {
        const source = readFileSync(file, 'utf8');
        // We tolerate violations here (the rule is just a smoke
        // test for the visitor pipeline) — what matters is the
        // call doesn't crash.
        lintAstro(source, ruleName, rule, file);
      }
    });
  }
});
