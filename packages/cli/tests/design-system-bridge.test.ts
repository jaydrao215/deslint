import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig, buildEffectiveRules } from '../src/index.js';
import { runLint } from '../src/lint-runner.js';

/**
 * End-to-end verification that `designSystem` in `.deslintrc.json` actually
 * drives rule behaviour through the CLI's effective-rules pipeline.
 *
 * This is the proof that M1 works: without the bridge, colors/spacing in
 * `.deslintrc.json` are inert — the rules never see them. With the bridge,
 * an imported token like `brand-primary: #1A5276` shows up as a suggestion
 * in the violation message for `bg-[#1A5276]`.
 */
describe('designSystem → rule bridge (CLI e2e)', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'deslint-ds-bridge-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  async function writeProject(files: Record<string, string>) {
    for (const [relPath, content] of Object.entries(files)) {
      const full = join(tmpDir, relPath);
      await mkdir(join(full, '..'), { recursive: true });
      await writeFile(full, content);
    }
  }

  it('surfaces designSystem.colors to no-arbitrary-colors.customTokens', async () => {
    await writeProject({
      '.deslintrc.json': JSON.stringify({
        designSystem: {
          colors: {
            'brand-primary': '#1A5276',
            'brand-accent': '#27AE60',
          },
        },
      }),
      'App.tsx':
        `const App = () => <div className="bg-[#1A5276] text-white">Hi</div>;\nexport default App;\n`,
    });

    const config = loadConfig(tmpDir);
    expect(config?.designSystem?.colors?.['brand-primary']).toBe('#1A5276');

    const rules = buildEffectiveRules(config);
    expect(rules?.['deslint/no-arbitrary-colors']).toEqual([
      'warn',
      {
        customTokens: {
          'brand-primary': '#1A5276',
          'brand-accent': '#27AE60',
        },
      },
    ]);

    const result = await runLint({
      files: [join(tmpDir, 'App.tsx')],
      ruleOverrides: rules,
      cwd: tmpDir,
    });

    const colorViolations = result.results[0].messages.filter(
      (m) => m.ruleId === 'deslint/no-arbitrary-colors',
    );
    expect(colorViolations).toHaveLength(1);
    // Proof the bridge worked: the token NAME must be in the suggestion
    // message, which only happens when customTokens was populated.
    expect(colorViolations[0].message).toContain('brand-primary');
  });

  it('surfaces designSystem.spacing to no-arbitrary-spacing.customScale with unit conversion', async () => {
    await writeProject({
      // md: 1.5rem = 24px. Tailwind default for 24px is p-6, so if we see
      // `p-md` in the suggestion, we know the bridge fed the custom scale
      // and overrode the default lookup.
      '.deslintrc.json': JSON.stringify({
        designSystem: {
          spacing: { sm: '0.5rem', md: '1.5rem' },
        },
      }),
      'Card.tsx':
        `const Card = () => <div className="p-[24px]">card</div>;\nexport default Card;\n`,
    });

    const config = loadConfig(tmpDir);
    const rules = buildEffectiveRules(config);
    expect(rules?.['deslint/no-arbitrary-spacing']).toEqual([
      'warn',
      { customScale: { sm: 8, md: 24 } },
    ]);

    const result = await runLint({
      files: [join(tmpDir, 'Card.tsx')],
      ruleOverrides: rules,
      cwd: tmpDir,
    });

    const spacingViolations = result.results[0].messages.filter(
      (m) => m.ruleId === 'deslint/no-arbitrary-spacing',
    );
    expect(spacingViolations).toHaveLength(1);
    expect(spacingViolations[0].message).toContain('p-md');
  });

  it('falls back to default Tailwind scale when designSystem.spacing is absent', async () => {
    await writeProject({
      '.deslintrc.json': JSON.stringify({}),
      'Card.tsx':
        `const Card = () => <div className="p-[24px]">card</div>;\nexport default Card;\n`,
    });

    const config = loadConfig(tmpDir);
    const rules = buildEffectiveRules(config);
    expect(rules?.['deslint/no-arbitrary-spacing']).toBeUndefined();

    const result = await runLint({
      files: [join(tmpDir, 'Card.tsx')],
      ruleOverrides: rules,
      cwd: tmpDir,
    });

    const spacingViolations = result.results[0].messages.filter(
      (m) => m.ruleId === 'deslint/no-arbitrary-spacing',
    );
    expect(spacingViolations).toHaveLength(1);
    // Default Tailwind scale: 24px → p-6
    expect(spacingViolations[0].message).toContain('p-6');
  });

  it('preserves explicit user customTokens over the design system', async () => {
    await writeProject({
      '.deslintrc.json': JSON.stringify({
        rules: {
          'no-arbitrary-colors': [
            'warn',
            { customTokens: { 'user-override': '#1A5276' } },
          ],
        },
        designSystem: {
          colors: { 'brand-primary': '#1A5276' },
        },
      }),
      'App.tsx':
        `const App = () => <div className="bg-[#1A5276]">hi</div>;\nexport default App;\n`,
    });

    const config = loadConfig(tmpDir);
    const rules = buildEffectiveRules(config);

    const result = await runLint({
      files: [join(tmpDir, 'App.tsx')],
      ruleOverrides: rules,
      cwd: tmpDir,
    });

    const colorViolations = result.results[0].messages.filter(
      (m) => m.ruleId === 'deslint/no-arbitrary-colors',
    );
    expect(colorViolations).toHaveLength(1);
    // User's explicit token name must win over designSystem.
    expect(colorViolations[0].message).toContain('user-override');
    expect(colorViolations[0].message).not.toContain('brand-primary');
  });

  it('skips design system wiring when the rule is disabled', async () => {
    await writeProject({
      '.deslintrc.json': JSON.stringify({
        rules: { 'no-arbitrary-colors': 'off' },
        designSystem: { colors: { brand: '#1A5276' } },
      }),
      'App.tsx':
        `const App = () => <div className="bg-[#1A5276]">hi</div>;\nexport default App;\n`,
    });

    const config = loadConfig(tmpDir);
    const rules = buildEffectiveRules(config);

    const result = await runLint({
      files: [join(tmpDir, 'App.tsx')],
      ruleOverrides: rules,
      cwd: tmpDir,
    });

    const colorViolations = result.results[0].messages.filter(
      (m) => m.ruleId === 'deslint/no-arbitrary-colors',
    );
    expect(colorViolations).toHaveLength(0);
  });

  it('returns undefined rules when there is no config at all', async () => {
    // No .deslintrc.json written; loadConfig walks up from tmpDir and may
    // find an ancestor — so explicitly assert against an undefined config.
    const rules = buildEffectiveRules(undefined);
    expect(rules).toBeUndefined();
  });

  // ── Typography (M1.5) ──────────────────────────────────────────────

  it('surfaces designSystem.typography.fontSize to no-arbitrary-typography.customScale', async () => {
    await writeProject({
      // body=1rem=16px. Without the bridge, text-[36px] suggests text-4xl
      // (the Tailwind default). With the bridge, it suggests text-h1 (the
      // imported token name).
      '.deslintrc.json': JSON.stringify({
        designSystem: {
          typography: { fontSize: { body: '1rem', h1: '2.25rem' } },
        },
      }),
      'Heading.tsx': `const H = () => <h1 className="text-[36px]">Hi</h1>;\nexport default H;\n`,
    });

    const config = loadConfig(tmpDir);
    const rules = buildEffectiveRules(config);
    expect(rules?.['deslint/no-arbitrary-typography']).toEqual([
      'warn',
      { customScale: { fontSize: { body: 16, h1: 36 } } },
    ]);

    const result = await runLint({
      files: [join(tmpDir, 'Heading.tsx')],
      ruleOverrides: rules,
      cwd: tmpDir,
    });
    const violations = result.results[0].messages.filter(
      (m) => m.ruleId === 'deslint/no-arbitrary-typography',
    );
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain('text-h1');
  });

  // ── Border radius (M1.5) ────────────────────────────────────────────

  it('surfaces designSystem.borderRadius to no-arbitrary-border-radius.customScale', async () => {
    await writeProject({
      '.deslintrc.json': JSON.stringify({
        designSystem: { borderRadius: { card: '0.75rem' } }, // 12px
      }),
      'Card.tsx':
        `const Card = () => <div className="rounded-[12px]">card</div>;\nexport default Card;\n`,
    });

    const config = loadConfig(tmpDir);
    const rules = buildEffectiveRules(config);
    expect(rules?.['deslint/no-arbitrary-border-radius']).toEqual([
      'warn',
      { customScale: { card: 12 } },
    ]);

    const result = await runLint({
      files: [join(tmpDir, 'Card.tsx')],
      ruleOverrides: rules,
      cwd: tmpDir,
    });
    const violations = result.results[0].messages.filter(
      (m) => m.ruleId === 'deslint/no-arbitrary-border-radius',
    );
    expect(violations).toHaveLength(1);
    // Custom token name 'card' wins over default Tailwind 'xl'
    expect(violations[0].message).toContain('rounded-card');
  });

  it('falls back to default radius scale when designSystem.borderRadius is absent', async () => {
    await writeProject({
      '.deslintrc.json': JSON.stringify({}),
      'Card.tsx':
        `const Card = () => <div className="rounded-[12px]">card</div>;\nexport default Card;\n`,
    });

    const config = loadConfig(tmpDir);
    const rules = buildEffectiveRules(config);
    expect(rules?.['deslint/no-arbitrary-border-radius']).toBeUndefined();

    const result = await runLint({
      files: [join(tmpDir, 'Card.tsx')],
      ruleOverrides: rules,
      cwd: tmpDir,
    });
    const violations = result.results[0].messages.filter(
      (m) => m.ruleId === 'deslint/no-arbitrary-border-radius',
    );
    expect(violations).toHaveLength(1);
    // 12px → Tailwind 'xl'
    expect(violations[0].message).toContain('rounded-xl');
  });
});
