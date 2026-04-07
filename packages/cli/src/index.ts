#!/usr/bin/env node

/**
 * @vizlint/cli — Design quality analysis CLI.
 *
 * Commands:
 *   vizlint scan [dir]              — Scan project, report Design Health Score
 *   vizlint fix [dir]               — Fix violations (--all, --interactive, --dry-run)
 *   vizlint generate-config <target> — Generate AI tool config (cursor, claude, agents)
 */

import { Command } from 'commander';
import { resolve } from 'node:path';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import chalk from 'chalk';
import { safeParseConfig, evaluateQualityGate, formatGateResult } from '@vizlint/shared';
import type { VizlintConfig, GateScanSnapshot } from '@vizlint/shared';
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
import { buildTokenSuggestions, formatSuggestTokens } from './suggest-tokens.js';
import {
  loadHistory,
  analyzeTrend,
  formatTrendText,
  formatTrendJson,
} from './trend.js';

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
export { runLint } from './lint-runner.js';
export type { LintResult, RuleCategory } from './lint-runner.js';

/**
 * Load .vizlintrc.json from project directory.
 */
function loadConfig(projectDir: string): VizlintConfig | undefined {
  const configPath = resolve(projectDir, '.vizlintrc.json');
  if (!existsSync(configPath)) return undefined;

  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
    const result = safeParseConfig(raw);
    if (result.success) return result.data;
    console.error(chalk.red(`  Invalid .vizlintrc.json: ${result.error.message}`));
  } catch {
    console.error(chalk.red('  Failed to read .vizlintrc.json'));
  }
  return undefined;
}

/**
 * Resolve rule overrides from config, applying profile if specified.
 */
function resolveRules(
  config: VizlintConfig | undefined,
  profile?: string,
): Record<string, any> | undefined {
  if (!config) return undefined;

  // If a profile is specified, use its rules
  if (profile && config.profiles?.[profile]) {
    return config.profiles[profile].rules;
  }

  return config.rules;
}

// ── CLI Setup ────────────────────────────────────────────────────────

const program = new Command();

program
  .name('vizlint')
  .description('Design quality gate for AI-generated frontend code')
  .version(VERSION);

// ── scan command ─────────────────────────────────────────────────────

program
  .command('scan')
  .description('Scan project for design quality violations and report Design Health Score')
  .argument('[dir]', 'Project directory to scan', '.')
  .option('-f, --format <format>', 'Output format: text, json, sarif', 'text')
  .option('--min-score <score>', 'Fail if score is below this threshold')
  .option('--profile <name>', 'Use a named severity profile from .vizlintrc.json')
  .option('--no-history', 'Do not save score to history file')
  .action(async (dir: string, opts: { format: string; minScore?: string; profile?: string; history: boolean }) => {
    try {
      const cwd = resolve(dir);
      const config = loadConfig(cwd);
      const rules = resolveRules(config, opts.profile);

      const files = await discoverFiles({
        cwd,
        ignorePatterns: config?.ignore,
      });

      if (files.length === 0) {
        console.log(chalk.yellow('\n  No files found to scan.\n'));
        process.exit(0);
      }

      const lintResult = await runLint({ files, ruleOverrides: rules, cwd });
      const scoreResult = calculateScore(lintResult);
      const debtResult = calculateDebt(lintResult);

      const outputFormat = opts.format as OutputFormat;
      console.log(format(outputFormat, lintResult, scoreResult, cwd));

      // Quality gate evaluation (opt-in via .vizlintrc.json `qualityGate`).
      // Reads previous score from history (if any) for regression detection
      // BEFORE the new entry is appended.
      let previousSnapshot: GateScanSnapshot | undefined;
      if (config?.qualityGate) {
        const historyPath = resolve(cwd, '.vizlint', 'history.json');
        if (existsSync(historyPath)) {
          try {
            const history: HistoryEntry[] = JSON.parse(readFileSync(historyPath, 'utf-8'));
            const last = history[history.length - 1];
            if (last) {
              previousSnapshot = {
                overall: last.overall,
                categories: last.categories,
                totalViolations: last.totalViolations,
                debtMinutes: 0, // pre-debt history entries lack this
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

      // Save history (unless --no-history)
      if (opts.history && outputFormat === 'text') {
        saveHistory(cwd, lintResult, scoreResult);
      }

      // Always generate HTML report (unless JSON/SARIF output — piping mode)
      if (outputFormat === 'text') {
        generateHtmlReport(lintResult, scoreResult, cwd);
        console.log(chalk.gray(`  Full report: .vizlint/report.html`));
        console.log('');
      }

      // Exit code logic
      if (opts.minScore) {
        const minScore = parseInt(opts.minScore, 10);
        if (scoreResult.overall < minScore) {
          console.error(
            chalk.red(`  Score ${scoreResult.overall} is below minimum threshold ${minScore}`),
          );
          process.exit(1);
        }
      }

      // Quality gate enforcement — only when opt-in `enforce: true` is set.
      // Default behavior is warn-only so v0.1.0 users see no breaking change.
      if (gateResult.enforced && !gateResult.passed) {
        process.exit(1);
      }

      // Exit with code 1 if any errors present
      if (lintResult.bySeverity.errors > 0) {
        process.exit(1);
      }
    } catch (err) {
      console.error(chalk.red(`  Error: ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }
  });

// ── fix command ──────────────────────────────────────────────────────

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
      const rules = resolveRules(config, opts.profile);

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
        // Default: interactive mode
        await fixInteractive({ files, ruleOverrides: rules, cwd });
      }
    } catch (err) {
      console.error(chalk.red(`  Error: ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }
  });

// ── generate-config command ──────────────────────────────────────────

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

// ── init command ────────────────────────────────────────────────────

program
  .command('init')
  .description('Set up Vizlint in your project with an interactive wizard')
  .action(async () => {
    try {
      await initWizard({ cwd: process.cwd() });
    } catch (err) {
      console.error(chalk.red(`  Error: ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }
  });

// ── suggest-tokens command ───────────────────────────────────────────

program
  .command('suggest-tokens')
  .description('Group unfixable arbitrary values and generate a ready-to-paste @theme CSS block')
  .argument('[dir]', 'Project directory to scan', '.')
  .option('--profile <name>', 'Use a named severity profile from .vizlintrc.json')
  .action(async (dir: string, opts: { profile?: string }) => {
    try {
      const cwd = resolve(dir);
      const config = loadConfig(cwd);
      const rules = resolveRules(config, opts.profile);

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

// ── trend command ────────────────────────────────────────────────────

program
  .command('trend')
  .description('Show Design Health Score trend over time from .vizlint/history.json')
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

      // Non-zero exit if regressions were detected (informational — does not
      // block CI unless user wires it into their pipeline explicitly).
      if (summary.regressions.length > 0) {
        process.exitCode = 1;
      }
    } catch (err) {
      console.error(chalk.red(`  Error: ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }
  });

// ── report command ──────────────────────────────────────────────────

program
  .command('report')
  .description('Open the latest HTML report in your browser')
  .argument('[dir]', 'Project directory', '.')
  .action(async (dir: string) => {
    const cwd = resolve(dir);
    const reportPath = resolve(cwd, '.vizlint', 'report.html');

    if (!existsSync(reportPath)) {
      console.log(chalk.yellow('\n  No report found. Run `vizlint scan` first.\n'));
      process.exit(1);
    }

    // Open in default browser
    const { exec } = await import('node:child_process');
    const platform = process.platform;
    const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${cmd} "${reportPath}"`, (err) => {
      if (err) {
        console.log(chalk.gray(`  Report: ${reportPath}`));
      } else {
        console.log(chalk.green(`  Opened report in browser`));
      }
    });
  });

// ── Parse and run ────────────────────────────────────────────────────

// Only parse args when running as CLI binary (not when imported as library)
// Check if we're being run directly via the vizlint bin entry
const runningAsCli =
  process.argv[1]?.endsWith('/dist/index.js') ||
  process.argv[1]?.endsWith('/cli/dist/index.js') ||
  process.argv[1]?.endsWith('vizlint');

if (runningAsCli) {
  program.parse();
}

export { program };
