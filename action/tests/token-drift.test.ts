import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  flattenDesignSystem,
  diffTokens,
  computeTokenDrift,
  formatTokenDriftSection,
} from '../src/token-drift.js';

describe('flattenDesignSystem', () => {
  it('returns [] for undefined', () => {
    expect(flattenDesignSystem(undefined)).toEqual([]);
  });

  it('flattens colors, spacing, borderRadius', () => {
    const out = flattenDesignSystem({
      colors: { primary: '#1A5276', accent: '#E74C3C' },
      spacing: { sm: '0.5rem' },
      borderRadius: { lg: '0.75rem' },
    });
    expect(out).toEqual([
      { path: 'borderRadius.lg', value: '0.75rem' },
      { path: 'colors.accent', value: '#E74C3C' },
      { path: 'colors.primary', value: '#1A5276' },
      { path: 'spacing.sm', value: '0.5rem' },
    ]);
  });

  it('flattens typography subtrees and stringifies numeric fontWeight', () => {
    const out = flattenDesignSystem({
      typography: {
        fontSize: { body: '1rem' },
        fontWeight: { bold: 700 },
        leading: { tight: '1.25rem' },
        tracking: { tight: '-0.02em' },
      },
    });
    expect(out).toEqual([
      { path: 'typography.fontSize.body', value: '1rem' },
      { path: 'typography.fontWeight.bold', value: '700' },
      { path: 'typography.leading.tight', value: '1.25rem' },
      { path: 'typography.tracking.tight', value: '-0.02em' },
    ]);
  });
});

describe('diffTokens', () => {
  it('returns empty drift when lists are identical', () => {
    const entries = [
      { path: 'colors.a', value: '#000' },
      { path: 'colors.b', value: '#fff' },
    ];
    expect(diffTokens(entries, entries)).toEqual({ added: [], removed: [], changed: [] });
  });

  it('detects added tokens', () => {
    const d = diffTokens(
      [{ path: 'colors.a', value: '#000' }],
      [
        { path: 'colors.a', value: '#000' },
        { path: 'colors.b', value: '#fff' },
      ],
    );
    expect(d.added).toEqual([{ path: 'colors.b', value: '#fff' }]);
    expect(d.removed).toEqual([]);
    expect(d.changed).toEqual([]);
  });

  it('detects removed tokens', () => {
    const d = diffTokens(
      [
        { path: 'colors.a', value: '#000' },
        { path: 'colors.b', value: '#fff' },
      ],
      [{ path: 'colors.a', value: '#000' }],
    );
    expect(d.removed).toEqual([{ path: 'colors.b', value: '#fff' }]);
  });

  it('detects changed tokens with from/to', () => {
    const d = diffTokens(
      [{ path: 'colors.primary', value: '#1A5276' }],
      [{ path: 'colors.primary', value: '#2C3E50' }],
    );
    expect(d.changed).toEqual([
      { path: 'colors.primary', from: '#1A5276', to: '#2C3E50' },
    ]);
  });

  it('sorts each bucket alphabetically by path', () => {
    const d = diffTokens(
      [
        { path: 'colors.z', value: '1' },
        { path: 'colors.a', value: '2' },
      ],
      [
        { path: 'colors.m', value: 'x' },
        { path: 'colors.a', value: 'y' },
      ],
    );
    expect(d.added.map((e) => e.path)).toEqual(['colors.m']);
    expect(d.changed.map((c) => c.path)).toEqual(['colors.a']);
    expect(d.removed.map((e) => e.path)).toEqual(['colors.z']);
  });
});

describe('computeTokenDrift', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'deslint-drift-'));
  });
  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  const baseRef = 'deadbeef';

  it('returns skipped when neither side has a config', () => {
    const r = computeTokenDrift(
      { workingDirectory: tmp, baseRef },
      { readRef: () => null, readFile: () => null },
    );
    expect(r.status).toBe('skipped');
  });

  it('returns ok and treats the head as all-added when the base is absent', () => {
    const r = computeTokenDrift(
      { workingDirectory: tmp, baseRef },
      {
        readRef: () => null,
        readFile: () =>
          JSON.stringify({
            designSystem: { colors: { primary: '#1A5276' } },
          }),
      },
    );
    expect(r.status).toBe('ok');
    expect(r.drift.added).toEqual([{ path: 'colors.primary', value: '#1A5276' }]);
    expect(r.drift.changed).toEqual([]);
    expect(r.drift.removed).toEqual([]);
  });

  it('returns unchanged when base and head tokens match', () => {
    const cfg = JSON.stringify({ designSystem: { colors: { primary: '#1A5276' } } });
    const r = computeTokenDrift(
      { workingDirectory: tmp, baseRef },
      { readRef: () => cfg, readFile: () => cfg },
    );
    expect(r.status).toBe('unchanged');
    expect(r.drift).toEqual({ added: [], removed: [], changed: [] });
  });

  it('detects changed + added + removed in one PR', () => {
    const base = JSON.stringify({
      designSystem: {
        colors: { primary: '#1A5276', deprecated: '#111' },
        spacing: { sm: '0.5rem' },
      },
    });
    const head = JSON.stringify({
      designSystem: {
        colors: { primary: '#2C3E50', accent: '#E74C3C' },
        spacing: { sm: '0.5rem' },
      },
    });
    const r = computeTokenDrift(
      { workingDirectory: tmp, baseRef },
      { readRef: () => base, readFile: () => head },
    );
    expect(r.status).toBe('ok');
    expect(r.drift.changed).toEqual([
      { path: 'colors.primary', from: '#1A5276', to: '#2C3E50' },
    ]);
    expect(r.drift.added).toEqual([{ path: 'colors.accent', value: '#E74C3C' }]);
    expect(r.drift.removed).toEqual([{ path: 'colors.deprecated', value: '#111' }]);
  });

  it('flags no-head-config when the PR removes the config', () => {
    const r = computeTokenDrift(
      { workingDirectory: tmp, baseRef },
      {
        readRef: () => JSON.stringify({ designSystem: { colors: { a: '#000' } } }),
        readFile: () => null,
      },
    );
    expect(r.status).toBe('no-head-config');
    expect(r.message).toMatch(/was removed on this PR/);
  });

  it('flags base-ref-unavailable when readRef throws (shallow checkout)', () => {
    const r = computeTokenDrift(
      { workingDirectory: tmp, baseRef },
      {
        readRef: () => {
          const err = new Error('fatal: bad object');
          (err as unknown as { status: number }).status = 128;
          throw err;
        },
        readFile: () => JSON.stringify({ designSystem: { colors: { a: '#000' } } }),
      },
    );
    expect(r.status).toBe('base-ref-unavailable');
    expect(r.message).toMatch(/fetch-depth: 0/);
  });

  it('flags config-malformed when the head JSON is unparseable', () => {
    const r = computeTokenDrift(
      { workingDirectory: tmp, baseRef },
      { readRef: () => null, readFile: () => '{not json' },
    );
    expect(r.status).toBe('config-malformed');
    expect(r.message).toMatch(/malformed/);
  });

  it('salvages a token snapshot when root schema fails but designSystem is intact', () => {
    // `rules` with a bogus severity → safeParseConfig fails, but the
    // designSystem subtree is intact, so we still surface the tokens.
    const head = JSON.stringify({
      rules: { 'deslint/no-arbitrary-colors': 'oops' },
      designSystem: { colors: { primary: '#2C3E50' } },
    });
    const r = computeTokenDrift(
      { workingDirectory: tmp, baseRef },
      { readRef: () => null, readFile: () => head },
    );
    expect(r.status).toBe('ok');
    expect(r.drift.added).toEqual([{ path: 'colors.primary', value: '#2C3E50' }]);
  });

  it('uses default readFile when no deps supplied and config file exists', async () => {
    const cfgPath = join(tmp, '.deslintrc.json');
    await writeFile(
      cfgPath,
      JSON.stringify({ designSystem: { colors: { primary: '#1A5276' } } }),
    );
    // stub readRef only — default readFile picks up the tmp file
    const r = computeTokenDrift(
      { workingDirectory: tmp, baseRef },
      { readRef: () => null },
    );
    expect(r.status).toBe('ok');
    expect(r.drift.added[0].path).toBe('colors.primary');
  });
});

describe('formatTokenDriftSection', () => {
  it('returns "" when unchanged', () => {
    expect(
      formatTokenDriftSection({
        status: 'unchanged',
        drift: { added: [], removed: [], changed: [] },
      }),
    ).toBe('');
  });

  it('returns "" when skipped', () => {
    expect(
      formatTokenDriftSection({
        status: 'skipped',
        drift: { added: [], removed: [], changed: [] },
      }),
    ).toBe('');
  });

  it('renders a full section with changed + added + removed', () => {
    const out = formatTokenDriftSection({
      status: 'ok',
      drift: {
        changed: [{ path: 'colors.primary', from: '#1A5276', to: '#2C3E50' }],
        added: [{ path: 'colors.accent', value: '#E74C3C' }],
        removed: [{ path: 'colors.deprecated', value: '#111' }],
      },
    });
    expect(out).toMatch(/Token drift/);
    expect(out).toMatch(/Tokens changed on this PR:/);
    expect(out).toMatch(/\| Token \| Before \| After \|/);
    expect(out).toMatch(/colors\.primary.*#1A5276.*#2C3E50/);
    expect(out).toMatch(/\*\*Added\*\*/);
    expect(out).toMatch(/colors\.accent.*#E74C3C/);
    expect(out).toMatch(/\*\*Removed\*\*/);
    expect(out).toMatch(/colors\.deprecated.*#111/);
  });

  it('shows a warning hint for base-ref-unavailable', () => {
    const out = formatTokenDriftSection({
      status: 'base-ref-unavailable',
      drift: { added: [], removed: [], changed: [] },
      message: 'Token drift: base ref X is not available. Add fetch-depth: 0.',
    });
    expect(out).toMatch(/Token drift/);
    expect(out).toMatch(/\u26a0\ufe0f/);
    expect(out).toMatch(/fetch-depth: 0/);
  });

  it('shows info hint for no-head-config', () => {
    const out = formatTokenDriftSection({
      status: 'no-head-config',
      drift: { added: [], removed: [], changed: [] },
      message: '`.deslintrc.json` was removed on this PR.',
    });
    expect(out).toMatch(/\u2139\ufe0f/);
    expect(out).toMatch(/was removed/);
  });
});
