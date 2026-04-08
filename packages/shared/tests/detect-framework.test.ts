import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { detectFramework } from '../src/detect-framework.js';

function createTmpProject(deps: Record<string, string>): string {
  const dir = join(tmpdir(), `deslint-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ dependencies: deps }));
  return dir;
}

describe('detectFramework', () => {
  it('detects Angular from @angular/core', async () => {
    const dir = createTmpProject({ '@angular/core': '^17.0.0' });
    expect(await detectFramework(dir)).toBe('angular');
    rmSync(dir, { recursive: true });
  });

  it('detects React from react', async () => {
    const dir = createTmpProject({ react: '^18.0.0', 'react-dom': '^18.0.0' });
    expect(await detectFramework(dir)).toBe('react');
    rmSync(dir, { recursive: true });
  });

  it('detects React from next', async () => {
    const dir = createTmpProject({ next: '^14.0.0' });
    expect(await detectFramework(dir)).toBe('react');
    rmSync(dir, { recursive: true });
  });

  it('detects Vue from vue', async () => {
    const dir = createTmpProject({ vue: '^3.4.0' });
    expect(await detectFramework(dir)).toBe('vue');
    rmSync(dir, { recursive: true });
  });

  it('detects Svelte from svelte', async () => {
    const dir = createTmpProject({ svelte: '^4.0.0' });
    expect(await detectFramework(dir)).toBe('svelte');
    rmSync(dir, { recursive: true });
  });

  it('returns unknown when no framework found', async () => {
    const dir = createTmpProject({ express: '^4.0.0' });
    expect(await detectFramework(dir)).toBe('unknown');
    rmSync(dir, { recursive: true });
  });

  it('returns unknown for nonexistent directory', async () => {
    expect(await detectFramework('/tmp/nonexistent-dir-xyz')).toBe('unknown');
  });

  it('Angular takes priority over React if both present', async () => {
    const dir = createTmpProject({ '@angular/core': '^17.0.0', react: '^18.0.0' });
    expect(await detectFramework(dir)).toBe('angular');
    rmSync(dir, { recursive: true });
  });
});
