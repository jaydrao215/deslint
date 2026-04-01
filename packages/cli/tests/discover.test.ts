import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { discoverFiles } from '../src/discover.js';

const TEST_DIR = resolve(tmpdir(), 'vizlint-discover-test');

function createFile(relPath: string, content = ''): void {
  const abs = resolve(TEST_DIR, relPath);
  mkdirSync(resolve(abs, '..'), { recursive: true });
  writeFileSync(abs, content);
}

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('discoverFiles', () => {
  it('discovers .tsx and .jsx files', async () => {
    createFile('src/App.tsx', '<div/>');
    createFile('src/Button.jsx', '<button/>');
    createFile('src/utils.ts', 'export const x = 1;'); // not a UI file

    const files = await discoverFiles({ cwd: TEST_DIR });
    expect(files).toHaveLength(2);
    expect(files.some((f) => f.endsWith('App.tsx'))).toBe(true);
    expect(files.some((f) => f.endsWith('Button.jsx'))).toBe(true);
  });

  it('discovers .vue, .svelte, and .html files', async () => {
    createFile('src/Page.vue', '<template><div/></template>');
    createFile('src/Card.svelte', '<div/>');
    createFile('public/index.html', '<html/>');

    const files = await discoverFiles({ cwd: TEST_DIR });
    expect(files).toHaveLength(3);
  });

  it('ignores node_modules by default', async () => {
    createFile('src/App.tsx', '<div/>');
    createFile('node_modules/lib/Comp.tsx', '<div/>');

    const files = await discoverFiles({ cwd: TEST_DIR });
    expect(files).toHaveLength(1);
    expect(files[0]).toContain('src/App.tsx');
  });

  it('ignores dist and build directories by default', async () => {
    createFile('src/App.tsx');
    createFile('dist/App.tsx');
    createFile('build/App.tsx');

    const files = await discoverFiles({ cwd: TEST_DIR });
    expect(files).toHaveLength(1);
  });

  it('respects custom ignore patterns', async () => {
    createFile('src/App.tsx');
    createFile('src/legacy/Old.tsx');

    const files = await discoverFiles({
      cwd: TEST_DIR,
      ignorePatterns: ['**/legacy/**'],
    });
    expect(files).toHaveLength(1);
    expect(files[0]).toContain('App.tsx');
  });

  it('respects .vizlintignore file', async () => {
    createFile('src/App.tsx');
    createFile('src/emails/Template.tsx');
    createFile('.vizlintignore', '**/emails/**\n');

    const files = await discoverFiles({ cwd: TEST_DIR });
    expect(files).toHaveLength(1);
    expect(files[0]).toContain('App.tsx');
  });

  it('returns empty array for project with no UI files', async () => {
    createFile('src/utils.ts', 'export const x = 1;');
    createFile('src/main.py', 'print("hello")');

    const files = await discoverFiles({ cwd: TEST_DIR });
    expect(files).toHaveLength(0);
  });

  it('returns sorted file paths', async () => {
    createFile('src/Z.tsx');
    createFile('src/A.tsx');
    createFile('src/M.tsx');

    const files = await discoverFiles({ cwd: TEST_DIR });
    const names = files.map((f) => f.split('/').pop());
    expect(names).toEqual(['A.tsx', 'M.tsx', 'Z.tsx']);
  });

  it('supports custom extensions', async () => {
    createFile('src/App.tsx');
    createFile('src/Page.astro');

    const defaultFiles = await discoverFiles({ cwd: TEST_DIR });
    expect(defaultFiles).toHaveLength(1);

    const withAstro = await discoverFiles({
      cwd: TEST_DIR,
      extensions: ['tsx', 'astro'],
    });
    expect(withAstro).toHaveLength(2);
  });
});
