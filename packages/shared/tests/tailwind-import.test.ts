import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseV3Config } from '../src/tailwind/parse-v3-config.js';
import { parseV4Theme } from '../src/tailwind/parse-v4-theme.js';
import { parseCssVars } from '../src/tailwind/parse-css-vars.js';
import { mergeDesignSystems } from '../src/tailwind/merge.js';
import { importTailwindConfig } from '../src/tailwind/import-tailwind-config.js';

const FIXTURES = resolve(import.meta.dirname!, 'fixtures');

// ── Tailwind v3 Config Reader ───────────────────────────────────────

describe('parseV3Config', () => {
  it('reads custom colors from theme.extend.colors', async () => {
    const mod = await import('./fixtures/tailwind.config.js');
    const config = mod.default;
    const ds = parseV3Config(config);

    expect(ds.colors?.['brand']).toBe('#1E3A5F');
    expect(ds.colors?.['brand-light']).toBe('#2E5A8F');
    expect(ds.colors?.['brand-dark']).toBe('#0E2A3D');
    expect(ds.colors?.['accent']).toBe('#27AE60');
  });

  it('reads font families from theme.extend.fontFamily', async () => {
    const mod = await import('./fixtures/tailwind.config.js');
    const ds = parseV3Config(mod.default);

    expect(ds.fonts?.sans).toContain('Inter');
    expect(ds.fonts?.mono).toContain('JetBrains Mono');
  });

  it('reads spacing from theme.extend.spacing', async () => {
    const mod = await import('./fixtures/tailwind.config.js');
    const ds = parseV3Config(mod.default);

    expect(ds.spacing?.['18']).toBe('4.5rem');
    expect(ds.spacing?.['72']).toBe('18rem');
  });

  it('reads borderRadius from theme.extend.borderRadius', async () => {
    const mod = await import('./fixtures/tailwind.config.js');
    const ds = parseV3Config(mod.default);

    expect(ds.borderRadius?.['4xl']).toBe('2rem');
  });

  it('returns empty designSystem for empty config', () => {
    const ds = parseV3Config({});
    expect(ds).toEqual({});
  });

  it('handles flat color values (non-nested)', () => {
    const ds = parseV3Config({
      theme: { extend: { colors: { primary: '#FF0000' } } },
    });
    expect(ds.colors?.primary).toBe('#FF0000');
  });
});

// ── Tailwind v4 @theme Parser ───────────────────────────────────────

describe('parseV4Theme', () => {
  it('reads custom colors from @theme block', () => {
    const css = readFileSync(resolve(FIXTURES, 'v4-theme.css'), 'utf-8');
    const ds = parseV4Theme(css);

    expect(ds.colors?.brand).toBe('#1E3A5F');
    expect(ds.colors?.['brand-light']).toBe('#2E5A8F');
    expect(ds.colors?.accent).toBe('#27AE60');
  });

  it('reads fonts from @theme block', () => {
    const css = readFileSync(resolve(FIXTURES, 'v4-theme.css'), 'utf-8');
    const ds = parseV4Theme(css);

    expect(ds.fonts?.sans).toContain('Inter');
    expect(ds.fonts?.mono).toContain('JetBrains Mono');
  });

  it('reads spacing from @theme block', () => {
    const css = readFileSync(resolve(FIXTURES, 'v4-theme.css'), 'utf-8');
    const ds = parseV4Theme(css);

    expect(ds.spacing?.['18']).toBe('4.5rem');
  });

  it('reads borderRadius from @theme block', () => {
    const css = readFileSync(resolve(FIXTURES, 'v4-theme.css'), 'utf-8');
    const ds = parseV4Theme(css);

    expect(ds.borderRadius?.['4xl']).toBe('2rem');
  });

  it('returns empty designSystem when no @theme block found', () => {
    const ds = parseV4Theme('body { color: red; }');
    expect(ds).toEqual({});
  });

  it('handles multiple @theme blocks', () => {
    const css = `
      @theme { --color-a: #111; }
      @theme { --color-b: #222; }
    `;
    const ds = parseV4Theme(css);
    expect(ds.colors?.a).toBe('#111');
    expect(ds.colors?.b).toBe('#222');
  });
});

// ── CSS :root Custom Properties Parser ──────────────────────────────

describe('parseCssVars', () => {
  it('reads CSS custom properties from :root block', () => {
    const css = readFileSync(resolve(FIXTURES, 'root-vars.css'), 'utf-8');
    const ds = parseCssVars(css);

    expect(ds.colors?.primary).toBe('#1A5276');
    expect(ds.colors?.secondary).toBe('#27AE60');
  });

  it('reads font properties from :root', () => {
    const css = readFileSync(resolve(FIXTURES, 'root-vars.css'), 'utf-8');
    const ds = parseCssVars(css);

    expect(ds.fonts?.body).toContain('Inter');
  });

  it('reads spacing from :root', () => {
    const css = readFileSync(resolve(FIXTURES, 'root-vars.css'), 'utf-8');
    const ds = parseCssVars(css);

    expect(ds.spacing?.sm).toBe('0.5rem');
    expect(ds.spacing?.md).toBe('1rem');
  });

  it('reads borderRadius from :root', () => {
    const css = readFileSync(resolve(FIXTURES, 'root-vars.css'), 'utf-8');
    const ds = parseCssVars(css);

    expect(ds.borderRadius?.lg).toBe('0.75rem');
  });

  it('returns empty designSystem when no :root block found', () => {
    const ds = parseCssVars('.foo { color: red; }');
    expect(ds).toEqual({});
  });
});

// ── Merge Logic ─────────────────────────────────────────────────────

describe('mergeDesignSystems', () => {
  it('manual .deslintrc.json colors override auto-imported colors', () => {
    const auto = { colors: { brand: '#1E3A5F', accent: '#27AE60' } };
    const manual = { colors: { brand: '#FF0000' } };
    const merged = mergeDesignSystems(auto, manual);

    expect(merged.colors?.brand).toBe('#FF0000');
    expect(merged.colors?.accent).toBe('#27AE60');
  });

  it('merges non-overlapping keys', () => {
    const a = { colors: { red: '#F00' }, spacing: { sm: '0.5rem' } };
    const b = { fonts: { body: 'Inter' }, borderRadius: { lg: '0.75rem' } };
    const merged = mergeDesignSystems(a, b);

    expect(merged.colors?.red).toBe('#F00');
    expect(merged.fonts?.body).toBe('Inter');
    expect(merged.spacing?.sm).toBe('0.5rem');
    expect(merged.borderRadius?.lg).toBe('0.75rem');
  });

  it('returns undefined for empty categories', () => {
    const merged = mergeDesignSystems({}, {});
    expect(merged.colors).toBeUndefined();
    expect(merged.fonts).toBeUndefined();
  });
});

// ── importTailwindConfig (integration) ──────────────────────────────

describe('importTailwindConfig', () => {
  it('returns empty designSystem gracefully if no Tailwind config found', async () => {
    const result = await importTailwindConfig('/tmp/nonexistent-project-dir');
    expect(result.designSystem).toEqual({});
    expect(result.sources).toEqual([]);
    expect(result.files).toEqual([]);
  });
});
