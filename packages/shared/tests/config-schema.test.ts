import { describe, it, expect } from 'vitest';
import { parseConfig, safeParseConfig, DeslintConfigSchema } from '../src/config-schema.js';

describe('DeslintConfigSchema', () => {
  // ── Valid configs ─────────────────────────────────────────────────

  it('accepts an empty config', () => {
    expect(() => parseConfig({})).not.toThrow();
  });

  it('accepts a minimal rules config', () => {
    const config = parseConfig({
      rules: {
        'no-arbitrary-colors': 'warn',
        'typography-scale': 'error',
        'responsive-required': 'off',
      },
    });
    expect(config.rules?.['no-arbitrary-colors']).toBe('warn');
  });

  it('accepts rule tuples with options', () => {
    const config = parseConfig({
      rules: {
        'no-arbitrary-colors': ['error', { allowlist: ['#FF0000'] }],
      },
    });
    expect(config.rules?.['no-arbitrary-colors']).toEqual([
      'error',
      { allowlist: ['#FF0000'] },
    ]);
  });

  it('accepts a full design system', () => {
    const config = parseConfig({
      designSystem: {
        colors: {
          'brand-primary': '#1A5276',
          'brand-accent': '#27AE60',
        },
        fonts: {
          body: 'Inter',
          heading: 'Inter',
          mono: 'JetBrains Mono',
        },
        spacing: { sm: '0.5rem', md: '1rem', lg: '1.5rem' },
        borderRadius: { sm: '0.25rem', lg: '0.75rem' },
      },
    });
    expect(config.designSystem?.colors?.['brand-primary']).toBe('#1A5276');
    expect(config.designSystem?.fonts?.body).toBe('Inter');
  });

  it('accepts ignore patterns', () => {
    const config = parseConfig({
      ignore: ['**/generated/**', 'dist/**', '**/*.min.js'],
    });
    expect(config.ignore).toHaveLength(3);
  });

  it('accepts severity profiles', () => {
    const config = parseConfig({
      profiles: {
        strict: {
          rules: {
            'no-arbitrary-colors': 'error',
            'typography-scale': 'error',
          },
        },
        relaxed: {
          rules: {
            'no-arbitrary-colors': 'warn',
            'typography-scale': 'off',
          },
        },
      },
    });
    expect(config.profiles?.strict.rules['no-arbitrary-colors']).toBe('error');
    expect(config.profiles?.relaxed.rules['typography-scale']).toBe('off');
  });

  it('accepts $schema field for editor support', () => {
    const config = parseConfig({
      $schema: 'https://deslint.com/schema/deslintrc.json',
      rules: { 'no-arbitrary-colors': 'warn' },
    });
    expect(config.$schema).toBeDefined();
  });

  it('accepts a complete config with all sections', () => {
    const config = parseConfig({
      rules: { 'no-arbitrary-colors': ['error', { allowlist: ['#FFFFFF'] }] },
      designSystem: { colors: { white: '#FFFFFF' } },
      ignore: ['**/vendor/**'],
      profiles: { ci: { rules: { 'no-arbitrary-colors': 'error' } } },
    });
    expect(config.rules).toBeDefined();
    expect(config.designSystem).toBeDefined();
    expect(config.ignore).toBeDefined();
    expect(config.profiles).toBeDefined();
  });

  // ── Invalid configs with clear error messages ─────────────────────

  it('rejects unknown top-level keys', () => {
    const result = safeParseConfig({ unknownKey: true });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes('Unrecognized key'))).toBe(true);
    }
  });

  it('rejects invalid severity value', () => {
    const result = safeParseConfig({
      rules: { 'no-arbitrary-colors': 'critical' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-string color tokens', () => {
    const result = safeParseConfig({
      designSystem: { colors: { primary: 123 } },
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown designSystem keys', () => {
    const result = safeParseConfig({
      designSystem: { shadows: { sm: '0 1px 2px' } },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes('Unrecognized key'))).toBe(true);
    }
  });

  it('rejects non-array ignore field', () => {
    const result = safeParseConfig({ ignore: '**/dist/**' });
    expect(result.success).toBe(false);
  });

  it('rejects profile without rules key', () => {
    const result = safeParseConfig({
      profiles: { strict: { severity: 'error' } },
    });
    expect(result.success).toBe(false);
  });

  it('provides path info in error messages', () => {
    const result = safeParseConfig({
      rules: { 'no-arbitrary-colors': 42 },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths.some((p) => p.includes('no-arbitrary-colors'))).toBe(true);
    }
  });
});
