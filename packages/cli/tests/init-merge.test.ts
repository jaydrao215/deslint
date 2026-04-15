/**
 * Tests for init.ts helpers:
 *   - mergeEslintConfig: non-destructive merge of @deslint/eslint-plugin
 *     into an existing flat eslint.config.js. Must be idempotent, must refuse
 *     shapes it can't parse (return merged:null), and must never remove
 *     existing user rules/plugins/imports.
 *   - addNpmScripts: adds `deslint` + `deslint:tokens` scripts only; must NOT
 *     add `deslint:fix` (running `deslint fix --all` non-interactively caused
 *     silent visual regressions in prior versions).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mergeEslintConfig, addNpmScripts } from '../src/init.js';

describe('mergeEslintConfig', () => {
  it('is idempotent when deslint is already imported (changed:false)', () => {
    const source = [
      `import deslint from '@deslint/eslint-plugin';`,
      `export default [deslint.configs.recommended];`,
      ``,
    ].join('\n');
    const { merged, changed } = mergeEslintConfig(source);
    expect(changed).toBe(false);
    expect(merged).toBe(source);
  });

  it('injects the import and the config entry into a plain ESM flat config', () => {
    const source = [
      `import js from '@eslint/js';`,
      `import tseslint from 'typescript-eslint';`,
      ``,
      `export default [`,
      `  js.configs.recommended,`,
      `  ...tseslint.configs.recommended,`,
      `];`,
      ``,
    ].join('\n');
    const { merged, changed } = mergeEslintConfig(source);
    expect(changed).toBe(true);
    expect(merged).not.toBeNull();
    // Preserves all existing imports verbatim
    expect(merged).toContain(`import js from '@eslint/js';`);
    expect(merged).toContain(`import tseslint from 'typescript-eslint';`);
    // Adds the deslint import
    expect(merged).toContain(`import deslint from '@deslint/eslint-plugin';`);
    // Injects the config entry inside the default export array
    expect(merged).toContain(`deslint.configs.recommended`);
    // Preserves the user's existing entries
    expect(merged).toContain(`js.configs.recommended,`);
    expect(merged).toContain(`...tseslint.configs.recommended,`);
  });

  it('refuses to touch CommonJS configs (returns merged:null)', () => {
    const source = [
      `const js = require('@eslint/js');`,
      `module.exports = [js.configs.recommended];`,
      ``,
    ].join('\n');
    const { merged, changed } = mergeEslintConfig(source);
    expect(merged).toBeNull();
    expect(changed).toBe(false);
  });

  it('refuses to touch defineConfig()-wrapped exports (returns merged:null)', () => {
    const source = [
      `import { defineConfig } from 'eslint/config';`,
      `import js from '@eslint/js';`,
      ``,
      `export default defineConfig([js.configs.recommended]);`,
      ``,
    ].join('\n');
    const { merged, changed } = mergeEslintConfig(source);
    expect(merged).toBeNull();
    expect(changed).toBe(false);
  });

  it('refuses to touch configs with no ESM imports (returns merged:null)', () => {
    const source = [
      `export default [`,
      `  { rules: {} },`,
      `];`,
      ``,
    ].join('\n');
    const { merged, changed } = mergeEslintConfig(source);
    expect(merged).toBeNull();
    expect(changed).toBe(false);
  });

  it('places the new import AFTER existing imports (not in the middle of a block)', () => {
    const source = [
      `import a from 'a';`,
      `import b from 'b';`,
      `import c from 'c';`,
      ``,
      `export default [];`,
      ``,
    ].join('\n');
    const { merged } = mergeEslintConfig(source);
    expect(merged).not.toBeNull();
    const lines = (merged as string).split('\n');
    const deslintIdx = lines.findIndex((l) => l.includes(`@deslint/eslint-plugin`));
    const cIdx = lines.findIndex((l) => l.includes(`import c from 'c'`));
    // Our import must come AFTER the last user import, not inside the block.
    expect(deslintIdx).toBeGreaterThan(cIdx);
  });

  it('produces output that would be idempotent on a second pass', () => {
    const source = [
      `import js from '@eslint/js';`,
      `export default [js.configs.recommended];`,
      ``,
    ].join('\n');
    const first = mergeEslintConfig(source);
    expect(first.changed).toBe(true);
    const second = mergeEslintConfig(first.merged as string);
    expect(second.changed).toBe(false);
    expect(second.merged).toBe(first.merged);
  });
});

describe('addNpmScripts', () => {
  let cwd: string;

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'deslint-init-scripts-'));
  });

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true });
  });

  it('adds `deslint` and `deslint:tokens` — but NOT `deslint:fix`', async () => {
    await writeFile(
      join(cwd, 'package.json'),
      JSON.stringify({ name: 'demo', scripts: {} }, null, 2),
      'utf-8',
    );
    const changed = addNpmScripts(cwd);
    expect(changed).toBe(true);
    const pkg = JSON.parse(await readFile(join(cwd, 'package.json'), 'utf-8'));
    expect(pkg.scripts['deslint']).toBe('deslint scan .');
    expect(pkg.scripts['deslint:tokens']).toBe('deslint suggest-tokens .');
    // Historical regression guard: `deslint:fix` ran `deslint fix . --all`
    // which applied every autofix (including dark-mode, z-index clamping,
    // hex rewrites) non-interactively and silently. We must never add it.
    expect(pkg.scripts['deslint:fix']).toBeUndefined();
  });

  it('preserves existing user scripts untouched', async () => {
    await writeFile(
      join(cwd, 'package.json'),
      JSON.stringify(
        {
          name: 'demo',
          scripts: {
            build: 'vite build',
            test: 'vitest',
            lint: 'eslint .',
          },
        },
        null,
        2,
      ),
      'utf-8',
    );
    addNpmScripts(cwd);
    const pkg = JSON.parse(await readFile(join(cwd, 'package.json'), 'utf-8'));
    expect(pkg.scripts.build).toBe('vite build');
    expect(pkg.scripts.test).toBe('vitest');
    expect(pkg.scripts.lint).toBe('eslint .');
    expect(pkg.scripts['deslint']).toBe('deslint scan .');
  });

  it('is idempotent — does not re-overwrite an existing `deslint` script', async () => {
    await writeFile(
      join(cwd, 'package.json'),
      JSON.stringify(
        {
          name: 'demo',
          scripts: {
            deslint: 'deslint scan ./src',
          },
        },
        null,
        2,
      ),
      'utf-8',
    );
    const changed = addNpmScripts(cwd);
    // Only `deslint:tokens` was missing, so it's still a change.
    expect(changed).toBe(true);
    const pkg = JSON.parse(await readFile(join(cwd, 'package.json'), 'utf-8'));
    // User's custom `deslint` value preserved
    expect(pkg.scripts['deslint']).toBe('deslint scan ./src');
    expect(pkg.scripts['deslint:tokens']).toBe('deslint suggest-tokens .');
  });

  it('returns false when no package.json is present', () => {
    expect(addNpmScripts(cwd)).toBe(false);
  });

  it('returns false without throwing when package.json is malformed', async () => {
    await writeFile(join(cwd, 'package.json'), '{ not valid json', 'utf-8');
    expect(addNpmScripts(cwd)).toBe(false);
  });
});
