/**
 * VIZ-017: Init Command & Config Wizard
 *
 * `npx vizlint init` — zero-friction setup that:
 * 1. Auto-detects framework from package.json
 * 2. Imports Tailwind design tokens
 * 3. Asks for strictness profile
 * 4. Writes .vizlintrc.json
 * 5. Writes eslint.config.js (framework-aware)
 * 6. Adds npm scripts (vizlint / vizlint:fix) to package.json
 * 7. Runs a quick-scan preview
 *
 * After init, the user only needs two commands:
 *   npm run vizlint       — see violations
 *   npm run vizlint:fix   — auto-fix everything fixable
 */

import { existsSync, writeFileSync, readFileSync } from 'node:fs';
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

/**
 * Generate eslint.config.js content for the detected framework.
 */
function generateEslintConfig(framework: string): string {
  if (framework === 'angular') {
    return `// @ts-check
import vizlint from 'eslint-plugin-vizlint';
import angularTemplateParser from '@angular-eslint/template-parser';

/** @type {import('eslint').Linter.Config[]} */
export default [
  // TypeScript component files
  {
    files: ['**/*.ts'],
    ...vizlint.configs.recommended,
  },
  // Angular HTML templates
  {
    files: ['**/*.html'],
    plugins: { vizlint },
    languageOptions: { parser: angularTemplateParser },
    rules: vizlint.configs.recommended.rules,
  },
  {
    ignores: ['dist/**', 'node_modules/**', '.angular/**', 'e2e/**'],
  },
];
`;
  }

  if (framework === 'vue') {
    return `// @ts-check
import vizlint from 'eslint-plugin-vizlint';
import vueParser from 'vue-eslint-parser';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ['**/*.vue'],
    plugins: { vizlint },
    languageOptions: { parser: vueParser },
    rules: vizlint.configs.recommended.rules,
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    ...vizlint.configs.recommended,
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
];
`;
  }

  if (framework === 'svelte') {
    return `// @ts-check
import vizlint from 'eslint-plugin-vizlint';
import svelteParser from 'svelte-eslint-parser';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ['**/*.svelte'],
    plugins: { vizlint },
    languageOptions: { parser: svelteParser },
    rules: vizlint.configs.recommended.rules,
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    ...vizlint.configs.recommended,
  },
  {
    ignores: ['dist/**', 'node_modules/**', '.svelte-kit/**'],
  },
];
`;
  }

  // React / Next.js / default
  return `// @ts-check
import vizlint from 'eslint-plugin-vizlint';

/** @type {import('eslint').Linter.Config[]} */
export default [
  vizlint.configs.recommended,
  {
    ignores: ['dist/**', 'node_modules/**', '.next/**', 'build/**'],
  },
];
`;
}

/**
 * Add vizlint scripts to package.json without touching existing scripts.
 */
function addNpmScripts(cwd: string): boolean {
  const pkgPath = resolve(cwd, 'package.json');
  if (!existsSync(pkgPath)) return false;

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    if (!pkg.scripts) pkg.scripts = {};

    let changed = false;
    if (!pkg.scripts['vizlint']) {
      pkg.scripts['vizlint'] = 'vizlint scan .';
      changed = true;
    }
    if (!pkg.scripts['vizlint:fix']) {
      pkg.scripts['vizlint:fix'] = 'vizlint fix . --all';
      changed = true;
    }
    if (!pkg.scripts['vizlint:tokens']) {
      pkg.scripts['vizlint:tokens'] = 'vizlint suggest-tokens .';
      changed = true;
    }

    if (changed) {
      writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    }
    return changed;
  } catch {
    return false;
  }
}

export interface InitOptions {
  cwd: string;
}

/**
 * Run the init wizard.
 */
export async function initWizard(options: InitOptions): Promise<void> {
  const { cwd } = options;

  prompts.intro(chalk.bold.cyan('Vizlint') + chalk.bold(' — Design quality gate'));

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
  const frameworkLabel = framework && framework !== 'unknown' ? framework : 'react';
  if (framework && framework !== 'unknown') {
    prompts.log.success(`Detected framework: ${chalk.cyan(framework)}`);
  } else {
    prompts.log.info('Framework not detected — using React/Next.js defaults.');
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
        `Design tokens imported: ${chalk.cyan(colorCount)} colors, ${chalk.cyan(fontCount)} fonts, ${chalk.cyan(spacingCount)} spacing`,
      );
      designSystem = ds;
    }
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
    ],
  });

  if (prompts.isCancel(profileChoice)) {
    prompts.outro('Setup cancelled.');
    return;
  }

  // ── Step 5: Build and write .vizlintrc.json ──
  const selectedProfile = PROFILES[profileChoice as string];
  const config: VizlintConfig = {
    $schema: 'https://vizlint.dev/schema.json',
    rules: { ...selectedProfile.rules },
    ignore: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.next/**',
      '.angular/**',
      '.svelte-kit/**',
      '**/*.test.tsx',
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/*.stories.tsx',
    ],
  };

  if (designSystem) {
    config.designSystem = designSystem;
  }

  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  prompts.log.success(`Created ${chalk.cyan('.vizlintrc.json')}`);

  // ── Step 6: Write eslint.config.js ──
  const eslintConfigPath = resolve(cwd, 'eslint.config.js');
  const eslintExists = existsSync(eslintConfigPath);

  if (eslintExists) {
    const overwriteEslint = await prompts.confirm({
      message: 'eslint.config.js already exists. Overwrite with Vizlint config?',
      initialValue: false,
    });
    if (!prompts.isCancel(overwriteEslint) && overwriteEslint) {
      writeFileSync(eslintConfigPath, generateEslintConfig(frameworkLabel));
      prompts.log.success(`Updated ${chalk.cyan('eslint.config.js')}`);
    } else {
      prompts.log.warn(
        `Skipped eslint.config.js — add ${chalk.cyan("import vizlint from 'eslint-plugin-vizlint'")} manually.`,
      );
    }
  } else {
    writeFileSync(eslintConfigPath, generateEslintConfig(frameworkLabel));
    prompts.log.success(`Created ${chalk.cyan('eslint.config.js')}`);
  }

  // ── Step 7: Add npm scripts ──
  const scriptsAdded = addNpmScripts(cwd);
  if (scriptsAdded) {
    prompts.log.success(
      `Added scripts to ${chalk.cyan('package.json')}: ${chalk.dim('vizlint')}, ${chalk.dim('vizlint:fix')}`,
    );
  } else {
    prompts.log.info(
      `npm scripts already exist or no package.json found.`,
    );
  }

  // ── Step 8: Quick-scan preview ──
  const runPreview = await prompts.confirm({
    message: 'Run a quick scan now to see your Design Health Score?',
  });

  if (!prompts.isCancel(runPreview) && runPreview) {
    try {
      const { discoverFiles } = await import('./discover.js');
      const { runLint } = await import('./lint-runner.js');
      const { calculateScore } = await import('./score.js');

      const files = await discoverFiles({ cwd, ignorePatterns: config.ignore });

      if (files.length === 0) {
        prompts.log.warn('No frontend files found to scan.');
      } else {
        const previewFiles = files.slice(0, 30);
        const result = await runLint({ files: previewFiles, cwd });
        const score = calculateScore(result);

        const scoreColor =
          score.overall >= 80 ? chalk.green : score.overall >= 60 ? chalk.yellow : chalk.red;

        prompts.log.success(
          `Quick scan of ${chalk.cyan(String(previewFiles.length))} files → Design Health Score: ${scoreColor.bold(String(score.overall))}/100`,
        );

        if (result.totalViolations > 0) {
          prompts.log.info(
            `${chalk.yellow(String(result.totalViolations))} violations found — run ${chalk.cyan('npm run vizlint:fix')} to auto-fix the easy ones.`,
          );
        }
      }
    } catch {
      prompts.log.warn('Preview scan failed — run npm run vizlint manually.');
    }
  }

  // ── Done ──
  prompts.outro(
    [
      chalk.bold('All set! Three commands to know:'),
      '',
      `  ${chalk.cyan('npm run vizlint')}        — see all violations`,
      `  ${chalk.cyan('npm run vizlint:fix')}    — auto-fix everything fixable`,
      `  ${chalk.cyan('npm run vizlint:tokens')} — design guidance for custom values`,
    ].join('\n'),
  );
}
