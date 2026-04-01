/**
 * VIZ-017: Init Command & Config Wizard
 *
 * `npx vizlint init` — interactive setup wizard that:
 * 1. Auto-detects framework from package.json
 * 2. Runs Tailwind config auto-import
 * 3. Asks for strictness profile (prototype/production/custom)
 * 4. Generates .vizlintrc.json
 * 5. Shows quick-scan preview score
 */

import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import chalk from 'chalk';
import * as prompts from '@clack/prompts';
import { detectFramework, importTailwindConfig } from '@vizlint/shared';
import type { VizlintConfig, DesignSystem, Severity } from '@vizlint/shared';

/** Default severity profiles per v1.2 spec */
const PROFILES: Record<string, { description: string; rules: Record<string, Severity> }> = {
  prototype: {
    description: 'Relaxed rules for rapid prototyping and vibe coding',
    rules: {
      'no-arbitrary-colors': 'warn',
      'no-arbitrary-spacing': 'warn',
      'no-arbitrary-typography': 'off',
      'responsive-required': 'off',
      'consistent-component-spacing': 'off',
      'a11y-color-contrast': 'warn',
      'max-component-lines': 'off',
      'missing-states': 'off',
      'dark-mode-coverage': 'off',
      'no-arbitrary-zindex': 'warn',
    },
  },
  production: {
    description: 'Strict rules for shipping to real users',
    rules: {
      'no-arbitrary-colors': 'error',
      'no-arbitrary-spacing': 'error',
      'no-arbitrary-typography': 'error',
      'responsive-required': 'error',
      'consistent-component-spacing': 'warn',
      'a11y-color-contrast': 'error',
      'max-component-lines': 'warn',
      'missing-states': 'error',
      'dark-mode-coverage': 'warn',
      'no-arbitrary-zindex': 'error',
    },
  },
};

export interface InitOptions {
  cwd: string;
}

/**
 * Run the init wizard.
 */
export async function initWizard(options: InitOptions): Promise<void> {
  const { cwd } = options;

  prompts.intro(chalk.bold('Vizlint Setup'));

  // ── Step 1: Check for existing config ──
  const configPath = resolve(cwd, '.vizlintrc.json');
  if (existsSync(configPath)) {
    const overwrite = await prompts.confirm({
      message: '.vizlintrc.json already exists. Overwrite?',
    });
    if (prompts.isCancel(overwrite) || !overwrite) {
      prompts.outro('Setup cancelled.');
      return;
    }
  }

  // ── Step 2: Detect framework ──
  const framework = await detectFramework(cwd);
  if (framework && framework !== 'unknown') {
    prompts.log.success(`Detected framework: ${chalk.cyan(framework)}`);
  } else {
    prompts.log.info('No specific framework detected. Using generic configuration.');
  }

  // ── Step 3: Tailwind config auto-import ──
  let designSystem: DesignSystem | undefined;
  const tailwindResult = await importTailwindConfig(cwd);

  if (tailwindResult.designSystem) {
    const ds = tailwindResult.designSystem;
    const colorCount = ds.colors ? Object.keys(ds.colors).length : 0;
    const fontCount = ds.fonts ? Object.keys(ds.fonts).length : 0;
    const spacingCount = ds.spacing ? Object.keys(ds.spacing).length : 0;

    if (colorCount > 0 || fontCount > 0 || spacingCount > 0) {
      prompts.log.success(
        `Tailwind config imported: ${chalk.cyan(colorCount)} colors, ${chalk.cyan(fontCount)} fonts, ${chalk.cyan(spacingCount)} spacing tokens`,
      );
      designSystem = ds;
    }
  }

  if (tailwindResult.sources.length > 0) {
    prompts.log.info(`Sources: ${chalk.dim(tailwindResult.sources.join(', '))}`);
  }

  // ── Step 4: Profile selection ──
  const profileChoice = await prompts.select({
    message: 'How strict should Vizlint be?',
    options: [
      {
        value: 'prototype',
        label: 'Prototype',
        hint: 'Relaxed — ideal for vibe coding and rapid iteration',
      },
      {
        value: 'production',
        label: 'Production',
        hint: 'Strict — for shipping to real users',
      },
      {
        value: 'custom',
        label: 'Custom',
        hint: 'Configure each rule individually',
      },
    ],
  });

  if (prompts.isCancel(profileChoice)) {
    prompts.outro('Setup cancelled.');
    return;
  }

  // ── Step 5: Build config ──
  const config: VizlintConfig = {
    $schema: 'https://vizlint.dev/schema.json',
  };

  // Set rules based on profile
  if (profileChoice === 'custom') {
    // For custom, default all to warn
    config.rules = {} as Record<string, Severity>;
    for (const ruleName of Object.keys(PROFILES.production.rules)) {
      config.rules[ruleName] = 'warn' as const;
    }
  } else {
    // Save as a named profile
    const selectedProfile = PROFILES[profileChoice as string];
    config.profiles = {
      [profileChoice as string]: { rules: selectedProfile.rules },
    };
    config.rules = { ...selectedProfile.rules };
  }

  // Add design system if detected
  if (designSystem) {
    config.designSystem = designSystem;
  }

  // Add default ignore patterns
  config.ignore = [
    'node_modules/**',
    'dist/**',
    'build/**',
    '.next/**',
    '**/*.test.tsx',
    '**/*.test.ts',
    '**/*.stories.tsx',
  ];

  // ── Step 6: Write config ──
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  prompts.log.success(`Generated ${chalk.cyan('.vizlintrc.json')}`);

  // ── Step 7: Show ESLint config instructions ──
  prompts.log.step(chalk.bold('Add to your eslint.config.js:'));
  prompts.log.message(chalk.dim(`
  import vizlint from 'eslint-plugin-vizlint';

  export default [
    vizlint.configs.recommended,
    // ... your other config
  ];
  `));

  // ── Step 8: Quick-scan preview ──
  const runPreview = await prompts.confirm({
    message: 'Run a quick scan to preview your Design Health Score?',
  });

  if (!prompts.isCancel(runPreview) && runPreview) {
    try {
      const { discoverFiles } = await import('./discover.js');
      const { runLint } = await import('./lint-runner.js');
      const { calculateScore } = await import('./score.js');

      const files = await discoverFiles({
        cwd,
        ignorePatterns: config.ignore,
      });

      if (files.length === 0) {
        prompts.log.warn('No frontend files found to scan.');
      } else {
        // Quick scan: limit to first 20 files for speed
        const previewFiles = files.slice(0, 20);
        const result = await runLint({ files: previewFiles });
        const score = calculateScore(result);

        const scoreColor = score.overall >= 80
          ? chalk.green
          : score.overall >= 60
            ? chalk.yellow
            : chalk.red;

        prompts.log.success(
          `Based on a quick scan of ${previewFiles.length} files, your project scores ~${scoreColor(String(score.overall))}/100`,
        );
      }
    } catch {
      prompts.log.warn('Could not run preview scan. Run `vizlint scan` manually.');
    }
  }

  prompts.outro(
    `Run ${chalk.cyan('vizlint scan')} to see your full Design Health Score.`,
  );
}
