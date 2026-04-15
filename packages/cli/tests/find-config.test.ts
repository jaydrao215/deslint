/**
 * Tests for findConfigFile — walks up from startDir to find the nearest
 * .deslintrc.json. Matches ESLint / Prettier / TypeScript / Biome behaviour so
 * developers can run `deslint` from any subdirectory of a monorepo.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { findConfigFile } from '../src/index.js';

describe('findConfigFile', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'deslint-findcfg-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('returns undefined when no config exists anywhere up to FS root', async () => {
    const nested = join(root, 'a', 'b', 'c');
    await mkdir(nested, { recursive: true });
    // No .deslintrc.json anywhere inside `root` — may still find one on the
    // host filesystem above tmpdir, which is acceptable; at minimum the path
    // must NOT be under `root`.
    const found = findConfigFile(nested);
    if (found !== undefined) {
      expect(found.startsWith(root)).toBe(false);
    }
  });

  it('finds config in the start directory itself', async () => {
    const cfg = join(root, '.deslintrc.json');
    await writeFile(cfg, '{ "rules": {} }', 'utf-8');
    expect(findConfigFile(root)).toBe(cfg);
  });

  it('walks up to find config in a parent directory (monorepo leaf case)', async () => {
    const cfg = join(root, '.deslintrc.json');
    await writeFile(cfg, '{ "rules": {} }', 'utf-8');
    const leaf = join(root, 'packages', 'web', 'src', 'components');
    await mkdir(leaf, { recursive: true });
    expect(findConfigFile(leaf)).toBe(cfg);
  });

  it('prefers the nearest ancestor when multiple configs exist', async () => {
    const outer = join(root, '.deslintrc.json');
    await writeFile(outer, '{ "rules": {} }', 'utf-8');

    const nested = join(root, 'apps', 'web');
    await mkdir(nested, { recursive: true });
    const inner = join(nested, '.deslintrc.json');
    await writeFile(inner, '{ "rules": {} }', 'utf-8');

    const leaf = join(nested, 'src', 'components');
    await mkdir(leaf, { recursive: true });
    expect(findConfigFile(leaf)).toBe(inner);
  });
});
