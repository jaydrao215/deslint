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
import { safeParseConfig } from '@vizlint/shared';
import type { VizlintConfig } from '@vizlint/shared';
import { readFileSync } from 'node:fs';

import { discoverFiles } from './discover.js';
import { runLint } from './lint-runner.js';
import { calculateScore, saveHistory } from './score.js';
import { format } from './formatters.js';
import type { OutputFormat } from './formatters.js';
import { fixAll, fixInteractive } from './fix.js';
import {
  generateConfig,
  loadDesignSystem,
  getOutputFilename,
  isValidTarget,
} from './generate-config.js';

export const VERSION = '0.1.0';

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

      const lintResult = await runLint({ files, ruleOverrides: rules });
      const scoreResult = calculateScore(lintResult);

      const outputFormat = opts.format as OutputFormat;
      console.log(format(outputFormat, lintResult, scoreResult, cwd));

      // Save history (unless --no-history)
      if (opts.history && outputFormat === 'text') {
        saveHistory(cwd, lintResult, scoreResult);
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
