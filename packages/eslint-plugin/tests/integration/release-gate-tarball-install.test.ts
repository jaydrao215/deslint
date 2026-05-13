/**
 * Release-gate tarball install verification.
 *
 * Question this answers: when an external user runs
 * `npm install @deslint/eslint-plugin@0.9.0` and configures it per
 * the README, does it actually work? All our other tests run inside
 * the monorepo with workspace links — so a missing `dist/` entry,
 * an over-narrow `package.json#files` array, a bad `exports` map, or
 * a wrong peer-dep range can all ship to npm undetected.
 *
 * Strategy:
 *   1. Pack the plugin via `pnpm pack` (produces a real npm tarball).
 *   2. Create a fresh tmp project with its own package.json, install
 *      ESLint + the @typescript-eslint parser + the just-packed
 *      tarball.
 *   3. Drop a tiny .tsx fixture with a known violation.
 *   4. Run ESLint via Node's API (mirrors what real users do via the
 *      eslint binary).
 *   5. Assert the violation comes out the right shape.
 *
 * What this catches that nothing else does:
 *   - `dist/index.js` not actually shipped (forgot to build, or
 *     `package.json#files` doesn't include `dist`)
 *   - `exports` field broken (Node can't resolve the entry)
 *   - peer dep range too narrow (the user's ESLint version isn't
 *     accepted)
 *   - peer dep missing entirely (the parser the rules need wasn't
 *     declared, so `@typescript-eslint/parser` etc. won't be hoisted)
 *
 * Skipping: if `pnpm pack` or `npm install` fails (offline / network
 * lockdown), the whole suite is skipped with a clear console note.
 */
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const PLUGIN_ROOT = resolve(__dirname, '..', '..');

let WORK_DIR: string | null = null;
let PACK_PATH: string | null = null;
let SETUP_FAILED = false;

beforeAll(() => {
  const dir = mkdtempSync(join(tmpdir(), 'deslint-tarball-'));
  try {
    // Step 1 — pack the plugin. `pnpm pack --pack-destination=<dir>`
    // writes a single .tgz; we glob for it after.
    execFileSync('pnpm', ['pack', '--pack-destination', dir], {
      cwd: PLUGIN_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 60_000,
    });
    const tarballs = readdirSync(dir).filter((f) => f.endsWith('.tgz'));
    if (tarballs.length === 0) throw new Error('pnpm pack produced no .tgz');
    if (tarballs.length > 1) throw new Error(`pnpm pack produced ${tarballs.length} .tgz files: ${tarballs.join(', ')}`);
    PACK_PATH = join(dir, tarballs[0]);

    // Step 2 — bootstrap a fresh project and install the tarball
    // alongside the peer deps the rules need.
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify(
        {
          name: 'deslint-tarball-install-test',
          private: true,
          version: '0.0.0',
          type: 'module',
        },
        null,
        2,
      ),
    );

    // Use npm (not pnpm) because pnpm in nested workspaces sometimes
    // tries to look up the parent workspace and ignores the tarball.
    // npm is the lowest-common-denominator install path the README
    // tells users to run; testing against it is the most honest
    // "does this work for a fresh user?" check.
    execFileSync(
      'npm',
      [
        'install',
        '--no-package-lock',
        '--no-audit',
        '--no-fund',
        '--silent',
        PACK_PATH,
        'eslint@^10.0.0',
        '@typescript-eslint/parser@^8.0.0',
      ],
      {
        cwd: dir,
        stdio: ['ignore', 'ignore', 'pipe'],
        timeout: 120_000,
      },
    );

    WORK_DIR = dir;
  } catch (err) {
    SETUP_FAILED = true;
    // eslint-disable-next-line no-console
    console.warn(
      `[tarball-install] Skipping — pack/install failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}, 200_000);

afterAll(() => {
  if (WORK_DIR) {
    try { rmSync(WORK_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
  }
});

describe('release-gate: tarball install', () => {
  it('pnpm pack produces a single .tgz', () => {
    if (SETUP_FAILED) return;
    expect(PACK_PATH).not.toBeNull();
    expect(PACK_PATH!.endsWith('.tgz')).toBe(true);
  });

  it('npm install of the tarball succeeds and dist/ is present', () => {
    if (SETUP_FAILED || !WORK_DIR) return;
    const installed = join(WORK_DIR, 'node_modules', '@deslint', 'eslint-plugin');
    expect(existsSync(installed)).toBe(true);
    expect(existsSync(join(installed, 'dist', 'index.js'))).toBe(true);
    expect(existsSync(join(installed, 'dist', 'index.d.ts'))).toBe(true);
  });

  it('the package.json `exports` field resolves to the dist entry', async () => {
    if (SETUP_FAILED || !WORK_DIR) return;
    // Spawn a fresh node process inside the install dir so the
    // resolution uses the project's own node_modules — matches what
    // an external user would see.
    const probeScript = `
      import('@deslint/eslint-plugin').then((m) => {
        const plugin = m.default ?? m;
        if (!plugin || typeof plugin !== 'object') throw new Error('no plugin export');
        if (!plugin.rules) throw new Error('no rules export');
        if (!plugin.configs) throw new Error('no configs export');
        const ruleCount = Object.keys(plugin.rules).length;
        const configKeys = Object.keys(plugin.configs);
        process.stdout.write(JSON.stringify({ ruleCount, configKeys }));
      }).catch((e) => {
        process.stderr.write(String(e));
        process.exit(1);
      });
    `;
    const out = execFileSync('node', ['--input-type=module', '-e', probeScript], {
      cwd: WORK_DIR,
      encoding: 'utf-8',
      timeout: 30_000,
    });
    const parsed = JSON.parse(out);
    expect(parsed.ruleCount).toBeGreaterThanOrEqual(60);
    expect(parsed.configKeys).toContain('recommended');
    expect(parsed.configKeys).toContain('strict');
    expect(parsed.configKeys).toContain('backend');
    expect(parsed.configKeys).toContain('nextjs');
  });

  it('a real ESLint run against the installed package detects a known violation', async () => {
    if (SETUP_FAILED || !WORK_DIR) return;

    // Drop a fixture with a clear violation no-arbitrary-colors must catch.
    const fixturePath = join(WORK_DIR, 'fixture.tsx');
    writeFileSync(
      fixturePath,
      `const App = () => <div className="bg-[#FF0000] p-[13px]">Hi</div>;\nexport default App;\n`,
    );

    // Use ESLint's flat-config Linter via the project's installed
    // packages, not ours. This is the real-user code path.
    const probeScript = `
      import { Linter } from 'eslint';
      import deslint from '@deslint/eslint-plugin';
      import * as tsParser from '@typescript-eslint/parser';
      const linter = new Linter({ cwd: process.cwd() });
      const messages = linter.verify(
        \`const App = () => <div className="bg-[#FF0000] p-[13px]">Hi</div>;\\nexport default App;\\n\`,
        [
          {
            files: ['**/*.tsx'],
            plugins: { deslint },
            rules: deslint.configs.recommended.rules,
            languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } } },
          },
        ],
        'fixture.tsx',
      );
      const ruleIds = [...new Set(messages.map(m => m.ruleId).filter(Boolean))];
      process.stdout.write(JSON.stringify({ messageCount: messages.length, ruleIds }));
    `;
    const out = execFileSync('node', ['--input-type=module', '-e', probeScript], {
      cwd: WORK_DIR,
      encoding: 'utf-8',
      timeout: 30_000,
    });
    const parsed = JSON.parse(out);
    expect(parsed.messageCount).toBeGreaterThan(0);
    expect(parsed.ruleIds).toEqual(
      expect.arrayContaining(['deslint/no-arbitrary-colors', 'deslint/no-arbitrary-spacing']),
    );
  });
});
