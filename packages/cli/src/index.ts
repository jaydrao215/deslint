#!/usr/bin/env node

/**
 * @deslint/cli — Design quality analysis CLI.
 *
 * Commands:
 *   deslint scan [dir]              — Scan project, report Design Health Score
 *   deslint fix [dir]               — Fix violations (--all, --interactive, --dry-run)
 *   deslint generate-config <target> — Generate AI tool config (cursor, claude, agents)
 */

import { Command } from 'commander';
import { resolve } from 'node:path';
import { writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
import chalk from 'chalk';
import {
  safeParseConfig,
  evaluateQualityGate,
  formatGateResult,
  loadBudget,
  evaluateBudget,
  formatBudgetResult,
  applyDesignSystemToRules,
} from '@deslint/shared';
import type {
  DeslintConfig,
  GateScanSnapshot,
  BudgetScanSnapshot,
} from '@deslint/shared';
import { readFileSync } from 'node:fs';

import { discoverFiles } from './discover.js';
import { runLint } from './lint-runner.js';
import { calculateScore, saveHistory } from './score.js';
import type { HistoryEntry } from './score.js';
import { calculateDebt } from './debt.js';
import { format } from './formatters.js';
import type { OutputFormat } from './formatters.js';
import { fixAll, fixInteractive } from './fix.js';
import { generateHtmlReport } from './report-html.js';
import {
  generateConfig,
  loadDesignSystem,
  getOutputFilename,
  isValidTarget,
} from './generate-config.js';
import { initWizard } from './init.js';
import {
  runImportTokens,
  runImportStyleDictionary,
  runImportStitch,
} from './import-tokens.js';
import { buildTokenSuggestions, formatSuggestTokens } from './suggest-tokens.js';
import { computeTokenCoverage } from './token-coverage.js';
import { renderCoverageHtml } from './token-coverage-html.js';
import {
  loadHistory,
  analyzeTrend,
  formatTrendText,
  formatTrendJson,
} from './trend.js';
import {
  buildComplianceResult,
  renderComplianceHtml,
} from './compliance-report.js';
import { formatComplianceSummary } from '@deslint/shared';
import { basename } from 'node:path';

import { createRequire } from 'node:module';
const _require = createRequire(import.meta.url);
const _pkg = _require('../package.json') as { version: string };

export const VERSION = _pkg.version;

// Re-exports for library usage
export { generateConfig, loadDesignSystem, getOutputFilename, isValidTarget } from './generate-config.js';
export type { Target } from './generate-config.js';
export { generateCursorRules } from './templates/cursorrules.js';
export { generateClaudeMd } from './templates/claude-md.js';
export { generateAgentsMd } from './templates/agents-md.js';
export { calculateScore } from './score.js';
export type { ScoreResult, CategoryScore, HistoryEntry } from './score.js';
export { discoverFiles } from './discover.js';
export { runLint, aggregateResults } from './lint-runner.js';
export type { LintResult, LintFileResult, LintMessage, RuleCategory } from './lint-runner.js';
export { computeTokenCoverage } from './token-coverage.js';
export type {
  TokenCoverageResult,
  CategoryCoverage,
  CoverageCategory,
  ComputeCoverageInput,
} from './token-coverage.js';
export { renderCoverageHtml } from './token-coverage-html.js';
export {
  gitDiffAddedRanges,
  parseUnifiedDiff,
  filterLintResultByHunks,
  messageInScope,
  lineInRanges,
} from './git-diff.js';
export type { DiffScope, AddedRange } from './git-diff.js';

/**
 * Walk from `startDir` up to the filesystem root looking for `.deslintrc.json`.
 * Returns the absolute path of the first match, or undefined if none found.
 *
 * Behaviour matches ESLint, Prettier, TypeScript, Biome etc.: developers expect
 * to be able to run `deslint scan src/components` from a monorepo leaf and have
 * the tool pick up the nearest `.deslintrc.json` in an ancestor.
 *
 * Exported for tests.
 */
export function findConfigFile(startDir: string): string | undefined {
  let current = resolve(startDir);
  for (let i = 0; i < 64; i++) {
    const candidate = resolve(current, '.deslintrc.json');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
  return undefined;
}

/**
 * Load .deslintrc.json. Searches `projectDir` first, then walks up ancestors.
 * Exported for tests.
 */
export function loadConfig(projectDir: string): DeslintConfig | undefined {
  const configPath = findConfigFile(projectDir);
  if (!configPath) return undefined;

  try {
    const { size } = statSync(configPath);
    if (size > 1024 * 1024) {
      console.error(chalk.red('  .deslintrc.json exceeds 1 MB size limit'));
      return undefined;
    }
    const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
    const result = safeParseConfig(raw);
    if (result.success) return result.data;
    console.error(chalk.red(`  Invalid .deslintrc.json: ${result.error.message}`));
  } catch {
    console.error(chalk.red('  Failed to read .deslintrc.json'));
  }
  return undefined;
}

function resolveRules(
  config: DeslintConfig | undefined,
  profile?: string,
): Record<string, any> | undefined {
  if (!config) return undefined;
  if (profile && config.profiles?.[profile]) {
    return config.profiles[profile].rules;
  }
  return config.rules;
}

/**
 * Resolve the rule map used for a scan: user rules (from `.deslintrc.json`
 * or a profile) plus the design-system bridge that wires
 * `config.designSystem.colors`/`spacing` into the rules that consume those
 * tokens. The bridge preserves user severity and any hand-authored options
 * — see `applyDesignSystemToRules` — so explicit `customTokens`/
 * `customScale` always win.
 *
 * Warnings (unparseable spacing tokens etc.) are surfaced to stderr so
 * they're visible without polluting stdout formats like `--format json`.
 */
export function buildEffectiveRules(
  config: DeslintConfig | undefined,
  profile?: string,
): Record<string, any> | undefined {
  const userRules = resolveRules(config, profile);
  const { rules: bridged, warnings } = applyDesignSystemToRules(
    config?.designSystem,
    { existingRules: userRules },
  );
  for (const msg of warnings) {
    console.error(chalk.yellow(`  [deslint] ${msg}`));
  }
  if (!userRules && Object.keys(bridged).length === 0) return undefined;
  return { ...(userRules ?? {}), ...bridged };
}

const program = new Command();

program
  .name('deslint')
  .description('Design quality gate for AI-generated frontend code')
  .version(VERSION);

program.addHelpText(
  'afterAll',
  () =>
    '\n' +
    chalk.dim(
      'Local-first · zero telemetry · your code never leaves your machine.',
    ),
);

program
  .command('scan')
  .description('Scan project for design quality violations and report Design Health Score')
  .argument('[dir]', 'Project directory to scan', '.')
  .option('-f, --format <format>', 'Output format: text, json, sarif', 'text')
  .option('--min-score <score>', 'Fail if score is below this threshold')
  .option('--profile <name>', 'Use a named severity profile from .deslintrc.json')
  .option('--no-history', 'Do not save score to history file')
  .option(
    '--diff <ref>',
    'Only report violations on lines changed since <ref> (e.g. origin/main, HEAD~1). Requires git.',
  )
  .option(
    '--budget <path>',
    'Evaluate against an error budget file (defaults to .deslint/budget.yml, falls back to .deslint/budget.json).',
  )
  .action(async (dir: string, opts: { format: string; minScore?: string; profile?: string; history: boolean; diff?: string; budget?: string }) => {
    try {
      const cwd = resolve(dir);
      const config = loadConfig(cwd);
      const rules = buildEffectiveRules(config, opts.profile);

      const { gitDiffAddedRanges, filterLintResultByHunks } = await import('./git-diff.js');
      const diffScope = opts.diff ? gitDiffAddedRanges(opts.diff, cwd) : undefined;

      const allFiles = await discoverFiles({
        cwd,
        ignorePatterns: config?.ignore,
      });

      const files = diffScope
        ? allFiles.filter((f) => diffScope.files.has(f))
        : allFiles;

      if (files.length === 0) {
        if (diffScope) {
          console.log(chalk.yellow(`\n  No frontend files changed since ${opts.diff}.\n`));
        } else {
          console.log(chalk.yellow('\n  No files found to scan.\n'));
        }
        process.exit(0);
      }

      const rawLintResult = await runLint({ files, ruleOverrides: rules, cwd });
      const lintResult = diffScope
        ? filterLintResultByHunks(rawLintResult, diffScope)
        : rawLintResult;
      const scoreResult = calculateScore(lintResult);
      const debtResult = calculateDebt(lintResult);

      const outputFormat = opts.format as OutputFormat;
      if (diffScope && outputFormat === 'text') {
        console.log(
          chalk.cyan(
            `\n  Diff mode: scoped to ${files.length} changed file(s) since ${opts.diff}.`,
          ),
        );
      }
      console.log(format(outputFormat, lintResult, scoreResult, cwd));

      let previousSnapshot: GateScanSnapshot | undefined;
      if (config?.qualityGate) {
        const historyPath = resolve(cwd, '.deslint', 'history.json');
        if (existsSync(historyPath)) {
          try {
            const history: HistoryEntry[] = JSON.parse(readFileSync(historyPath, 'utf-8'));
            const last = history[history.length - 1];
            if (last) {
              previousSnapshot = {
                overall: last.overall,
                categories: last.categories,
                totalViolations: last.totalViolations,
                debtMinutes: 0,
              };
            }
          } catch { /* ignore */ }
        }
      }

      const gateResult = evaluateQualityGate(
        config?.qualityGate,
        {
          overall: scoreResult.overall,
          categories: {
            colors: scoreResult.categories.colors.score,
            spacing: scoreResult.categories.spacing.score,
            typography: scoreResult.categories.typography.score,
            responsive: scoreResult.categories.responsive.score,
            consistency: scoreResult.categories.consistency.score,
          },
          totalViolations: lintResult.totalViolations,
          debtMinutes: debtResult.totalMinutes,
        },
        previousSnapshot,
      );

      if (gateResult.conditionsChecked > 0 && outputFormat === 'text') {
        const colorFn = gateResult.passed ? chalk.green : chalk.red;
        console.log(colorFn(`  ${formatGateResult(gateResult)}`));
        console.log('');
      }

      // Budget evaluation (opt-in via .deslint/budget.yml or --budget <path>).
      // Diff mode intentionally skips budget evaluation — a partial scan cannot
      // be meaningfully compared to full-repo caps.
      const loaded = diffScope
        ? undefined
        : await loadBudget({ explicitPath: opts.budget, cwd }).catch((err) => {
            console.error(
              chalk.red(
                `  Error loading budget: ${err instanceof Error ? err.message : String(err)}`,
              ),
            );
            process.exit(1);
          });

      const budgetSnapshot: BudgetScanSnapshot = {
        overall: scoreResult.overall,
        categories: {
          colors: scoreResult.categories.colors.score,
          spacing: scoreResult.categories.spacing.score,
          typography: scoreResult.categories.typography.score,
          responsive: scoreResult.categories.responsive.score,
          consistency: scoreResult.categories.consistency.score,
        },
        totalViolations: lintResult.totalViolations,
        debtMinutes: debtResult.totalMinutes,
        byRule: lintResult.byRule,
      };

      const previousBudgetSnapshot: BudgetScanSnapshot | undefined = previousSnapshot
        ? {
            ...previousSnapshot,
            byRule: {},
          }
        : undefined;
      if (previousBudgetSnapshot) {
        try {
          const historyPath = resolve(cwd, '.deslint', 'history.json');
          if (existsSync(historyPath)) {
            const history: HistoryEntry[] = JSON.parse(readFileSync(historyPath, 'utf-8'));
            const last = history[history.length - 1];
            if (last?.byRule) previousBudgetSnapshot.byRule = last.byRule;
          }
        } catch { /* ignore */ }
      }

      const budgetResult = evaluateBudget(
        loaded?.budget,
        budgetSnapshot,
        previousBudgetSnapshot,
      );

      if (budgetResult.conditionsChecked > 0 && outputFormat === 'text') {
        const colorFn = budgetResult.passed ? chalk.green : chalk.red;
        console.log(colorFn(`  ${formatBudgetResult(budgetResult)}`));
        if (loaded) {
          console.log(chalk.gray(`  Budget file: ${loaded.path}`));
        }
        console.log('');
      }

      if (opts.history && outputFormat === 'text' && !diffScope) {
        saveHistory(cwd, lintResult, scoreResult);
      }

      if (outputFormat === 'text') {
        generateHtmlReport(lintResult, scoreResult, cwd);
        console.log(chalk.gray(`  Full report: .deslint/report.html`));
        console.log('');

        // Install-to-value: tell the user the literal next command to
        // run. Without this, a first-time user finishes `scan` with no
        // idea whether to fix, gate in CI, or re-import tokens.
        const fixableCount = lintResult.results.reduce(
          (sum, r) =>
            sum + (r.fixableErrorCount ?? 0) + (r.fixableWarningCount ?? 0),
          0,
        );
        if (lintResult.totalViolations === 0) {
          console.log(chalk.bold('  Next:'));
          console.log(
            chalk.gray(
              '    Ship it. Gate this in CI with ' +
                '`npx deslint scan --min-score 85 --format sarif`',
            ),
          );
          console.log('');
        } else {
          console.log(chalk.bold('  Next:'));
          if (fixableCount > 0) {
            console.log(
              chalk.gray(
                `    ${fixableCount} auto-fixable. Review with ` +
                  '`npx deslint fix --interactive`',
              ),
            );
            console.log(
              chalk.gray(
                '    Or apply every safe fix: `npx deslint fix --all`',
              ),
            );
          } else {
            console.log(
              chalk.gray(
                '    Walk the remaining violations with ' +
                  '`npx deslint fix --interactive`',
              ),
            );
          }
          console.log('');
        }
      }

      if (opts.minScore) {
        const minScore = parseInt(opts.minScore, 10);
        if (scoreResult.overall < minScore) {
          console.error(
            chalk.red(`  Score ${scoreResult.overall} is below minimum threshold ${minScore}`),
          );
          process.exit(1);
        }
      }

      if (gateResult.enforced && !gateResult.passed) {
        process.exit(1);
      }

      if (budgetResult.enforced && !budgetResult.passed) {
        process.exit(1);
      }

      if (lintResult.bySeverity.errors > 0) {
        process.exit(1);
      }
    } catch (err) {
      console.error(chalk.red(`  Error: ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }
  });

program
  .command('fix')
  .description('Fix design quality violations')
  .argument('[dir]', 'Project directory', '.')
  .option('--all', 'Apply all auto-fixable violations at once')
  .option('--interactive', 'Walk through violations one by one')
  .option('--dry-run', 'Show what would change without modifying files')
  .option('--profile <name>', 'Use a named severity profile')
  .action(async (dir: string, opts: { all?: boolean; interactive?: boolean; dryRun?: boolean; profile?: string }) => {
    try {
      const cwd = resolve(dir);
      const config = loadConfig(cwd);
      const rules = buildEffectiveRules(config, opts.profile);

      const files = await discoverFiles({
        cwd,
        ignorePatterns: config?.ignore,
      });

      if (files.length === 0) {
        console.log(chalk.yellow('\n  No files found to scan.\n'));
        process.exit(0);
      }

      if (opts.interactive) {
        await fixInteractive({ files, ruleOverrides: rules, cwd });
      } else if (opts.all || opts.dryRun) {
        await fixAll({ files, ruleOverrides: rules, dryRun: opts.dryRun, cwd });
      } else {
        await fixInteractive({ files, ruleOverrides: rules, cwd });
      }
    } catch (err) {
      console.error(chalk.red(`  Error: ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }
  });

program
  .command('generate-config')
  .description('Generate AI tool config files from your design system')
  .argument('<target>', 'Target: cursor, claude, or agents')
  .option('-o, --output <path>', 'Output file path (default: target-specific)')
  .option('--stdout', 'Print to stdout instead of writing a file')
  .action(async (target: string, opts: { output?: string; stdout?: boolean }) => {
    try {
      if (!isValidTarget(target)) {
        console.error(chalk.red(`  Invalid target "${target}". Use: cursor, claude, or agents`));
        process.exit(1);
      }

      const cwd = process.cwd();
      const designSystem = await loadDesignSystem(cwd);
      const content = generateConfig(target, designSystem);

      if (opts.stdout) {
        console.log(content);
        return;
      }

      const outputPath = resolve(cwd, opts.output ?? getOutputFilename(target));
      const outputDir = dirname(outputPath);
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }
      writeFileSync(outputPath, content);
      console.log(chalk.green(`  ✓ Generated ${outputPath}`));
    } catch (err) {
      console.error(chalk.red(`  Error: ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }
  });

program
  .command('import-tokens')
  .description(
    'Import design tokens from a Figma file, a Style Dictionary source, or a Stitch / Material 3 export',
  )
  .option('--figma <file-id>', 'Figma file key (from the file URL)')
  .option(
    '--style-dictionary <path>',
    'Path to a Style Dictionary JSON file or directory',
  )
  .option(
    '--stitch <path>',
    'Path to a Google Stitch / Material 3 tokens JSON file',
  )
  .option('--token <token>', 'Figma personal access token (or set FIGMA_TOKEN env var)')
  .option('--mode <name>', 'Mode name to read (e.g. "Light", "Dark"). Case-insensitive.')
  .option('--tier <tier>', 'For --stitch: restrict to md.sys | md.ref | md.comp')
  .option('-o, --output <path>', 'Output file path', 'tokens.json')
  .option('--format <format>', 'Output format: dtcg (W3C tokens) or deslintrc', 'dtcg')
  .option('--include-hidden', 'Include variables marked hidden-from-publishing')
  .action(
    async (opts: {
      figma?: string;
      styleDictionary?: string;
      stitch?: string;
      token?: string;
      mode?: string;
      tier?: string;
      output: string;
      format: string;
      includeHidden?: boolean;
    }) => {
      if (opts.format !== 'dtcg' && opts.format !== 'deslintrc') {
        console.error(
          chalk.red(`  Invalid --format "${opts.format}". Use: dtcg, deslintrc`),
        );
        process.exit(1);
      }
      // Exactly one source must be chosen. Mutually exclusive so the
      // CLI stays predictable — no silent precedence rules.
      const sources = [opts.figma, opts.styleDictionary, opts.stitch].filter(
        Boolean,
      );
      if (sources.length > 1) {
        console.error(
          chalk.red(
            '  --figma, --style-dictionary, and --stitch are mutually exclusive. Choose one source.',
          ),
        );
        process.exit(1);
      }
      if (sources.length === 0) {
        console.error(
          chalk.red(
            '  One of --figma <file-id>, --style-dictionary <path>, or --stitch <path> is required.',
          ),
        );
        process.exit(1);
      }
      if (opts.stitch) {
        if (
          opts.tier !== undefined &&
          opts.tier !== 'sys' &&
          opts.tier !== 'ref' &&
          opts.tier !== 'comp'
        ) {
          console.error(
            chalk.red(`  Invalid --tier "${opts.tier}". Use: sys, ref, comp`),
          );
          process.exit(1);
        }
        runImportStitch({
          source: opts.stitch,
          output: opts.output,
          format: opts.format,
          tier: opts.tier as 'sys' | 'ref' | 'comp' | undefined,
          cwd: process.cwd(),
        });
        return;
      }
      if (opts.styleDictionary) {
        runImportStyleDictionary({
          source: opts.styleDictionary,
          output: opts.output,
          format: opts.format,
          cwd: process.cwd(),
        });
        return;
      }
      await runImportTokens({
        figma: opts.figma!,
        token: opts.token,
        mode: opts.mode,
        output: opts.output,
        format: opts.format,
        includeHidden: opts.includeHidden,
        cwd: process.cwd(),
      });
    },
  );

program
  .command('init')
  .description('Set up Deslint in your project with an interactive wizard')
  .action(async () => {
    try {
      await initWizard({ cwd: process.cwd() });
    } catch (err) {
      console.error(chalk.red(`  Error: ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }
  });

program
  .command('suggest-tokens')
  .description('Group unfixable arbitrary values and generate a ready-to-paste @theme CSS block')
  .argument('[dir]', 'Project directory to scan', '.')
  .option('--profile <name>', 'Use a named severity profile from .deslintrc.json')
  .action(async (dir: string, opts: { profile?: string }) => {
    try {
      const cwd = resolve(dir);
      const config = loadConfig(cwd);
      const rules = buildEffectiveRules(config, opts.profile);

      const files = await discoverFiles({
        cwd,
        ignorePatterns: config?.ignore,
      });

      if (files.length === 0) {
        console.log(chalk.yellow('\n  No files found to scan.\n'));
        process.exit(0);
      }

      const lintResult = await runLint({ files, ruleOverrides: rules, cwd });
      const { suggestions, fixable } = buildTokenSuggestions(lintResult, cwd);

      console.log(formatSuggestTokens(suggestions, fixable));
    } catch (err) {
      console.error(chalk.red(`  Error: ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }
  });

program
  .command('trend')
  .description('Show Design Health Score trend over time from .deslint/history.json')
  .argument('[dir]', 'Project directory', '.')
  .option('-l, --limit <n>', 'Number of recent entries to include', '10')
  .option('-f, --format <format>', 'Output format: text, json', 'text')
  .option('--alert-threshold <n>', 'Flag score drops of this many points or more', '5')
  .action(async (dir: string, opts: { limit: string; format: string; alertThreshold: string }) => {
    try {
      const cwd = resolve(dir);
      const history = loadHistory(cwd);
      const limit = parseInt(opts.limit, 10);
      const alertThreshold = parseInt(opts.alertThreshold, 10);
      const summary = analyzeTrend(history, { limit, alertThreshold });

      if (opts.format === 'json') {
        console.log(formatTrendJson(summary));
      } else {
        console.log(formatTrendText(summary, history, { limit, alertThreshold }));
      }

      if (summary.regressions.length > 0) {
        process.exitCode = 1;
      }
    } catch (err) {
      console.error(chalk.red(`  Error: ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }
  });

program
  .command('compliance')
  .description('Generate a WCAG 2.2 conformance report (HTML or JSON)')
  .argument('[dir]', 'Project directory', '.')
  .option('-f, --format <format>', 'Output format: html, json, text', 'html')
  .option('-o, --output <path>', 'Output file path (default: .deslint/compliance.html)')
  .option('--profile <name>', 'Use a named severity profile from .deslintrc.json')
  .action(async (dir: string, opts: { format: string; output?: string; profile?: string }) => {
    try {
      const cwd = resolve(dir);
      const config = loadConfig(cwd);
      const rules = buildEffectiveRules(config, opts.profile);

      const files = await discoverFiles({ cwd, ignorePatterns: config?.ignore });
      if (files.length === 0) {
        console.log(chalk.yellow('\n  No files found to scan.\n'));
        process.exit(0);
      }

      const lintResult = await runLint({ files, ruleOverrides: rules, cwd });
      const compliance = buildComplianceResult(lintResult);

      if (opts.format === 'json') {
        const out = opts.output
          ? resolve(cwd, opts.output)
          : resolve(cwd, '.deslint', 'compliance.json');
        mkdirSync(dirname(out), { recursive: true });
        writeFileSync(out, JSON.stringify(compliance, null, 2));
        console.log(chalk.green(`  ✓ Wrote ${out}`));
        return;
      }

      if (opts.format === 'text') {
        console.log(formatComplianceSummary(compliance));
        return;
      }

      const html = renderComplianceHtml({
        projectName: basename(cwd),
        scannedAt: new Date(),
        totalFiles: files.length,
        lintResult,
      });
      const out = opts.output
        ? resolve(cwd, opts.output)
        : resolve(cwd, '.deslint', 'compliance.html');
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, html);

      console.log(formatComplianceSummary(compliance));
      console.log(chalk.gray(`  Report: ${out}`));
    } catch (err) {
      console.error(chalk.red(`  Error: ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }
  });

program
  .command('attest')
  .description(
    'Emit a reproducible, committable attestation JSON for the current scan ' +
      '(v0.6 OSS: unsigned; v0.7 Teams: Sigstore-signed).',
  )
  .argument('[dir]', 'Project directory to scan', '.')
  .option('-o, --output <path>', 'Output file path', '.deslint/attestation.json')
  .option('--budget <path>', 'Budget file to evaluate and include in the attestation')
  .option('--stdout', 'Print the attestation to stdout instead of writing a file')
  .action(
    async (
      dir: string,
      opts: { output: string; budget?: string; stdout?: boolean },
    ) => {
      try {
        const { buildAttestation, serializeAttestation, writeAttestation } =
          await import('./attest.js');
        const cwd = resolve(dir);
        const attestation = await buildAttestation({
          projectDir: cwd,
          budgetPath: opts.budget,
          now: process.env.DESLINT_ATTEST_NOW,
        });

        if (opts.stdout) {
          process.stdout.write(serializeAttestation(attestation));
          return;
        }

        const outputPath = resolve(cwd, opts.output);
        writeAttestation(outputPath, attestation);
        console.log(chalk.green(`  ✓ Wrote ${outputPath}`));
        console.log(
          chalk.gray(
            `  Schema: ${attestation.schema} · ruleset: ${attestation.rulesetHash.slice(0, 16)} · files: ${attestation.files.length}`,
          ),
        );
      } catch (err) {
        console.error(
          chalk.red(`  Error: ${err instanceof Error ? err.message : String(err)}`),
        );
        process.exit(1);
      }
    },
  );

program
  .command('coverage')
  .description(
    'Token Coverage Report: measure how much of your Tailwind usage comes ' +
      'from imported design-system tokens vs. default scale vs. arbitrary ' +
      'drift. Renders HTML at .deslint/coverage.html (print to PDF).',
  )
  .argument('[dir]', 'Project directory to scan', '.')
  .option('-f, --format <format>', 'Output format: html, json, text', 'html')
  .option('-o, --output <path>', 'Output file path (default: .deslint/coverage.html)')
  .action(async (dir: string, opts: { format: string; output?: string }) => {
    try {
      const cwd = resolve(dir);
      const config = loadConfig(cwd);

      const files = await discoverFiles({ cwd, ignorePatterns: config?.ignore });
      if (files.length === 0) {
        console.log(chalk.yellow('\n  No files found to scan.\n'));
        process.exit(0);
      }

      const result = computeTokenCoverage({
        files,
        designSystem: config?.designSystem,
      });

      if (opts.format === 'json') {
        const out = opts.output
          ? resolve(cwd, opts.output)
          : resolve(cwd, '.deslint', 'coverage.json');
        mkdirSync(dirname(out), { recursive: true });
        writeFileSync(out, JSON.stringify(result, null, 2));
        console.log(chalk.green(`  ✓ Wrote ${out}`));
        return;
      }

      if (opts.format === 'text') {
        console.log('');
        console.log(chalk.bold(`  Token Coverage — ${basename(cwd)}`));
        console.log(
          chalk.gray(
            `  ${result.totalClassUsages.toLocaleString()} class usages across ${result.totalFiles} files`,
          ),
        );
        console.log('');
        const pctColor = (p: number) =>
          p >= 70 ? chalk.green : p >= 40 ? chalk.yellow : chalk.red;
        console.log(
          `  On scale:  ${pctColor(result.overallOnScalePct)(result.overallOnScalePct.toFixed(1) + '%')}`,
        );
        console.log(
          `  Tokens:    ${chalk.cyan(result.overallTokenPct.toFixed(1) + '%')}`,
        );
        if (!result.hasDesignSystem) {
          console.log(
            chalk.yellow(
              '\n  No designSystem in .deslintrc.json — token % will be 0. ' +
                'Run `deslint import-tokens` to populate it.',
            ),
          );
        }
        console.log('');
        for (const cat of ['colors', 'spacing', 'typography', 'borderRadius'] as const) {
          const c = result.categories[cat];
          const label = cat.padEnd(14);
          console.log(
            `  ${label} ${pctColor(c.onScalePct)(c.onScalePct.toFixed(1).padStart(5) + '%')} on scale  ` +
              chalk.gray(
                `(${c.token} token / ${c.default} default / ${c.arbitrary} arbitrary)`,
              ),
          );
        }
        console.log('');
        return;
      }

      if (opts.format !== 'html') {
        console.error(
          chalk.red(`  Invalid --format "${opts.format}". Use: html, json, text`),
        );
        process.exit(1);
      }

      const html = renderCoverageHtml(result, {
        projectName: basename(cwd),
        version: VERSION,
      });
      const out = opts.output
        ? resolve(cwd, opts.output)
        : resolve(cwd, '.deslint', 'coverage.html');
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, html);

      console.log('');
      const pctColor = (p: number) =>
        p >= 70 ? chalk.green : p >= 40 ? chalk.yellow : chalk.red;
      console.log(
        `  On scale: ${pctColor(result.overallOnScalePct)(result.overallOnScalePct.toFixed(1) + '%')} · ` +
          `Tokens: ${chalk.cyan(result.overallTokenPct.toFixed(1) + '%')} · ` +
          chalk.gray(`${result.totalClassUsages.toLocaleString()} class usages`),
      );
      console.log(chalk.gray(`  Report: ${out}`));
      console.log(chalk.gray('  Print to PDF via your browser (Ctrl/Cmd+P).'));
      console.log('');
    } catch (err) {
      console.error(chalk.red(`  Error: ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }
  });

program
  .command('report')
  .description('Open the latest HTML report in your browser')
  .argument('[dir]', 'Project directory', '.')
  .action(async (dir: string) => {
    const cwd = resolve(dir);
    const reportPath = resolve(cwd, '.deslint', 'report.html');

    if (!existsSync(reportPath)) {
      console.log(chalk.yellow('\n  No report found. Run `deslint scan` first.\n'));
      process.exit(1);
    }

    const { execFile } = await import('node:child_process');
    const platform = process.platform;
    const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
    execFile(cmd, [reportPath], (err) => {
      if (err) {
        console.log(chalk.gray(`  Report: ${reportPath}`));
      } else {
        console.log(chalk.green(`  Opened report in browser`));
      }
    });
  });

const runningAsCli =
  process.argv[1]?.endsWith('/dist/index.js') ||
  process.argv[1]?.endsWith('/cli/dist/index.js') ||
  process.argv[1]?.endsWith('deslint');

if (runningAsCli) {
  program.parse();
}

export { program };
