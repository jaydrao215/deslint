/**
 * VIZ-017: Init Command & Config Wizard
 *
 * `npx deslint init` — zero-friction setup that:
 * 1. Auto-detects framework from package.json
 * 2. Imports Tailwind design tokens
 * 3. Asks for strictness profile
 * 4. Writes .deslintrc.json
 * 5. Writes eslint.config.js (framework-aware)
 * 6. Adds npm scripts (deslint / deslint:tokens) to package.json
 * 7. Runs a quick-scan preview
 *
 * After init, the user only needs two commands:
 *   npm run deslint            — see violations
 *   npx deslint fix --interactive — review fixes one at a time
 */

import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import chalk from 'chalk';
import * as prompts from '@clack/prompts';
import { detectFramework, importTailwindConfig } from '@deslint/shared';
import type { DeslintConfig, DesignSystem, Severity } from '@deslint/shared';

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
 * Attempt to inject `deslint.configs.recommended` into an existing
 * `eslint.config.js` source string without clobbering user-defined rules,
 * parsers, or plugins.
 *
 * Returns `{ merged, changed }`:
 *   - `changed: false` — file already imports `@deslint/eslint-plugin`
 *     (idempotent: nothing to do).
 *   - `changed: true`, `merged` non-null — successfully added the import and
 *     injected `deslint.configs.recommended` into the default export array.
 *   - `merged: null` — file uses a syntactic shape we refuse to edit
 *     blindly (no ES `import`, no top-level `export default [`, CommonJS,
 *     etc.). Caller should fall back to showing the manual snippet.
 *
 * This is intentionally conservative: we would rather ask the user to edit by
 * hand than silently corrupt a file we can't fully parse textually.
 *
 * Exported for tests.
 */
export function mergeEslintConfig(
  source: string,
): { merged: string | null; changed: boolean } {
  // Already wired up — be idempotent.
  if (/@deslint\/eslint-plugin/.test(source)) {
    return { merged: source, changed: false };
  }

  // We support the common flat-config shape: ESM imports at the top, then
  // `export default [ ... ];`. Anything else (CommonJS, named exports,
  // `defineConfig()` wrappers, TS `satisfies`) we leave alone.
  const hasEsmImport = /^\s*import\s+/m.test(source);
  const exportArrayMatch = /export\s+default\s*\[/.exec(source);
  if (!hasEsmImport || !exportArrayMatch) {
    return { merged: null, changed: false };
  }

  // Insert the import after the last existing `import ... from '...'` line so
  // we don't split off imports from their block.
  const importLineRegex = /^\s*import[^\n]*\n/gm;
  let lastImportEnd = 0;
  let m: RegExpExecArray | null;
  while ((m = importLineRegex.exec(source)) !== null) {
    lastImportEnd = m.index + m[0].length;
  }

  const deslintImport = `import deslint from '@deslint/eslint-plugin';\n`;
  const before = source.slice(0, lastImportEnd);
  const after = source.slice(lastImportEnd);

  // Insert `deslint.configs.recommended,` immediately after `export default [`.
  const injectAt = exportArrayMatch.index + exportArrayMatch[0].length - before.length;
  const patchedAfter =
    after.slice(0, injectAt) +
    `\n  deslint.configs.recommended,` +
    after.slice(injectAt);

  return { merged: before + deslintImport + patchedAfter, changed: true };
}

/**
 * Generate eslint.config.js content for the detected framework.
 */
function generateEslintConfig(framework: string): string {
  if (framework === 'angular') {
    return `// @ts-check
import deslint from '@deslint/eslint-plugin';
import angularTemplateParser from '@angular-eslint/template-parser';

/** @type {import('eslint').Linter.Config[]} */
export default [
  // TypeScript component files
  {
    files: ['**/*.ts'],
    ...deslint.configs.recommended,
  },
  // Angular HTML templates
  {
    files: ['**/*.html'],
    plugins: { deslint },
    languageOptions: { parser: angularTemplateParser },
    rules: deslint.configs.recommended.rules,
  },
  {
    ignores: ['dist/**', 'node_modules/**', '.angular/**', 'e2e/**'],
  },
];
`;
  }

  if (framework === 'vue') {
    return `// @ts-check
import deslint from '@deslint/eslint-plugin';
import vueParser from 'vue-eslint-parser';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ['**/*.vue'],
    plugins: { deslint },
    languageOptions: { parser: vueParser },
    rules: deslint.configs.recommended.rules,
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    ...deslint.configs.recommended,
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
];
`;
  }

  if (framework === 'svelte') {
    return `// @ts-check
import deslint from '@deslint/eslint-plugin';
import svelteParser from 'svelte-eslint-parser';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ['**/*.svelte'],
    plugins: { deslint },
    languageOptions: { parser: svelteParser },
    rules: deslint.configs.recommended.rules,
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    ...deslint.configs.recommended,
  },
  {
    ignores: ['dist/**', 'node_modules/**', '.svelte-kit/**'],
  },
];
`;
  }

  // React / Next.js / default
  return `// @ts-check
import deslint from '@deslint/eslint-plugin';

/** @type {import('eslint').Linter.Config[]} */
export default [
  deslint.configs.recommended,
  {
    ignores: ['dist/**', 'node_modules/**', '.next/**', 'build/**'],
  },
];
`;
}

/**
 * Add deslint scripts to package.json without touching existing scripts.
 *
 * Historically this function also wrote `"deslint:fix": "deslint fix . --all"`.
 * We no longer do that: running `fix . --all` non-interactively across a whole
 * codebase will silently apply every autofix including accessibility wrappers,
 * dark-mode class inversion, arbitrary-colour rewrites and z-index clamping.
 * Those have caused real visual regressions for users. The interactive path
 * (`deslint fix --interactive`) stays available and is documented as the
 * intended workflow.
 *
 * What we still add:
 *   - `deslint`         — safe, read-only scan
 *   - `deslint:tokens`  — advisory, does not modify source files
 *
 * Exported for tests.
 */
export function addNpmScripts(cwd: string): boolean {
  const pkgPath = resolve(cwd, 'package.json');
  if (!existsSync(pkgPath)) return false;

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    if (!pkg.scripts) pkg.scripts = {};

    let changed = false;
    if (!pkg.scripts['deslint']) {
      pkg.scripts['deslint'] = 'deslint scan .';
      changed = true;
    }
    if (!pkg.scripts['deslint:tokens']) {
      pkg.scripts['deslint:tokens'] = 'deslint suggest-tokens .';
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

  prompts.intro(chalk.bold.cyan('Deslint') + chalk.bold(' — Design quality gate'));

  // ── Step 1: Check for existing config ──
  const configPath = resolve(cwd, '.deslintrc.json');
  if (existsSync(configPath)) {
    const overwrite = await prompts.confirm({
      message: '.deslintrc.json already exists. Overwrite?',
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
    message: 'How strict should Deslint be?',
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

  // ── Step 5: Build and write .deslintrc.json ──
  const selectedProfile = PROFILES[profileChoice as string];
  const config: DeslintConfig = {
    $schema: 'https://deslint.com/schema.json',
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
  prompts.log.success(`Created ${chalk.cyan('.deslintrc.json')}`);

  // ── Step 6: Write or merge eslint.config.js ──
  //
  // Historically this step offered to OVERWRITE an existing eslint.config.js,
  // which was catastrophic for projects with hand-tuned rules, parsers, or
  // plugins. The new flow is additive:
  //   1. If no config exists: write our template.
  //   2. If a config exists and already imports @deslint/eslint-plugin: no-op.
  //   3. If a config exists and mergeEslintConfig can safely inject: ask, then
  //      patch in place — keeping every line of the user's config intact.
  //   4. If we can't parse the shape textually (CommonJS, defineConfig(),
  //      named exports): show a copy-paste snippet. NEVER overwrite.
  const eslintConfigPath = resolve(cwd, 'eslint.config.js');
  const eslintExists = existsSync(eslintConfigPath);

  if (!eslintExists) {
    writeFileSync(eslintConfigPath, generateEslintConfig(frameworkLabel));
    prompts.log.success(`Created ${chalk.cyan('eslint.config.js')}`);
  } else {
    const existingSource = readFileSync(eslintConfigPath, 'utf-8');
    const { merged, changed } = mergeEslintConfig(existingSource);

    if (merged !== null && !changed) {
      // Already wired up — idempotent, nothing to do.
      prompts.log.info(
        `${chalk.cyan('eslint.config.js')} already imports ${chalk.cyan('@deslint/eslint-plugin')} — leaving it alone.`,
      );
    } else if (merged !== null && changed) {
      const appendOk = await prompts.confirm({
        message: 'Append Deslint to your existing eslint.config.js? (no rules will be removed)',
        initialValue: true,
      });
      if (!prompts.isCancel(appendOk) && appendOk) {
        writeFileSync(eslintConfigPath, merged);
        prompts.log.success(
          `Merged ${chalk.cyan('deslint.configs.recommended')} into ${chalk.cyan('eslint.config.js')}`,
        );
      } else {
        prompts.log.info(
          `Skipped eslint.config.js — your existing config is unchanged. Run ${chalk.cyan('npx deslint scan')} anyway; deslint uses its own parser internally.`,
        );
      }
    } else {
      // Shape we refuse to edit blindly — show a manual snippet.
      const isTypeScript = existsSync(resolve(cwd, 'tsconfig.json'));
      if (isTypeScript) {
        prompts.log.warn(
          `Could not safely merge into ${chalk.cyan('eslint.config.js')} (CommonJS, ${chalk.cyan('defineConfig()')}, or non-standard shape).\n` +
          `  ${chalk.bold('deslint scan')} runs its own parser config and will still work. To also wire it into the ESLint extension and ${chalk.cyan('npx eslint')}, add this by hand:\n\n` +
          chalk.dim(
            `  import deslint from '@deslint/eslint-plugin';\n` +
            `  import tsParser from '@typescript-eslint/parser';\n\n` +
            `  export default [\n` +
            `    { files: ['**/*.ts', '**/*.tsx'], languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } } } },\n` +
            `    deslint.configs.recommended,\n` +
            `    { ignores: ['dist/**', 'node_modules/**'] },\n` +
            `  ];`,
          ),
        );
      } else {
        prompts.log.warn(
          `Could not safely merge into ${chalk.cyan('eslint.config.js')} — add ${chalk.cyan("import deslint from '@deslint/eslint-plugin'")} and spread ${chalk.cyan('deslint.configs.recommended')} into your default export manually.`,
        );
      }
    }
  }

  // ── Step 7: Add npm scripts ──
  const scriptsAdded = addNpmScripts(cwd);
  if (scriptsAdded) {
    prompts.log.success(
      `Added scripts to ${chalk.cyan('package.json')}: ${chalk.dim('deslint')}, ${chalk.dim('deslint:tokens')}`,
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
            `${chalk.yellow(String(result.totalViolations))} violations found — run ${chalk.cyan('npx deslint fix --interactive')} to review fixes one at a time.`,
          );
        }
      }
    } catch {
      prompts.log.warn('Preview scan failed — run npm run deslint manually.');
    }
  }

  // ── Done ──
  prompts.outro(
    [
      chalk.bold('All set! Three commands to know:'),
      '',
      `  ${chalk.cyan('npm run deslint')}             — see all violations`,
      `  ${chalk.cyan('npx deslint fix --interactive')} — review each fix before applying`,
      `  ${chalk.cyan('npm run deslint:tokens')}      — design guidance for custom values`,
    ].join('\n'),
  );
}
