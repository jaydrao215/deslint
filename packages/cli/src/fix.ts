import { readFileSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import chalk from 'chalk';
import * as prompts from '@clack/prompts';
import { runLint, RULE_CATEGORY_MAP } from './lint-runner.js';
import type { LintResult, LintMessage } from './lint-runner.js';

export interface FixAllOptions {
  files: string[];
  ruleOverrides?: Record<string, any>;
  dryRun?: boolean;
  cwd: string;
}

export interface FixInteractiveOptions {
  files: string[];
  ruleOverrides?: Record<string, any>;
  cwd: string;
}

/**
 * Apply all auto-fixable violations at once.
 * With --dry-run, shows a diff preview without modifying files.
 */
export async function fixAll(options: FixAllOptions): Promise<LintResult> {
  if (options.dryRun) {
    return fixAllDryRun(options);
  }

  // Run ESLint with fix: true — it writes fixed files automatically
  const result = await runLint({
    files: options.files,
    ruleOverrides: options.ruleOverrides,
    fix: true,
  });

  // Count how many fixes were applied
  let fixedCount = 0;
  let fixedFiles = 0;
  for (const r of result.results) {
    if (r.output !== undefined) {
      fixedFiles++;
      // output exists means the file was modified
      // Count the original violations that had fixes
      fixedCount += r.messages.filter((m) => m.fix).length +
        (r.fixableErrorCount ?? 0) + (r.fixableWarningCount ?? 0);
    }
  }

  console.log('');
  if (fixedFiles > 0) {
    console.log(chalk.green(`  ✓ Fixed violations in ${fixedFiles} file${fixedFiles !== 1 ? 's' : ''}`));
  } else {
    console.log(chalk.green('  ✓ No fixable violations found'));
  }

  // Show remaining violations
  if (result.totalViolations > 0) {
    console.log(chalk.yellow(`  ${result.totalViolations} violation${result.totalViolations !== 1 ? 's' : ''} remaining (not auto-fixable)`));
  }
  console.log('');

  return result;
}

/**
 * Dry run — show what would change without modifying files.
 */
async function fixAllDryRun(options: FixAllOptions): Promise<LintResult> {
  // Run with fix to get the proposed changes, but don't write
  const result = await runLint({
    files: options.files,
    ruleOverrides: options.ruleOverrides,
    fix: true,
  });

  console.log('');
  console.log(chalk.bold('  Dry run — no files modified'));
  console.log('');

  let changedFiles = 0;
  for (const r of result.results) {
    if (r.output !== undefined) {
      changedFiles++;
      const filePath = relative(options.cwd, r.filePath);
      console.log(chalk.underline(filePath));

      // Show a simple summary of what would change
      const original = readFileSync(r.filePath, 'utf-8');
      const originalLines = original.split('\n');
      const fixedLines = r.output.split('\n');

      let changes = 0;
      const maxLines = Math.max(originalLines.length, fixedLines.length);
      for (let i = 0; i < maxLines; i++) {
        if (originalLines[i] !== fixedLines[i]) {
          changes++;
          if (originalLines[i] !== undefined) {
            console.log(chalk.red(`  - ${originalLines[i].trim()}`));
          }
          if (fixedLines[i] !== undefined) {
            console.log(chalk.green(`  + ${fixedLines[i].trim()}`));
          }
        }
      }
      console.log(chalk.gray(`  ${changes} line${changes !== 1 ? 's' : ''} would change`));
      console.log('');
    }
  }

  if (changedFiles === 0) {
    console.log(chalk.green('  No fixable violations found'));
  } else {
    console.log(chalk.gray(`  ${changedFiles} file${changedFiles !== 1 ? 's' : ''} would be modified`));
    console.log(chalk.gray('  Run without --dry-run to apply fixes'));
  }
  console.log('');

  // Don't write fixes — this was a dry run
  return result;
}

/**
 * Interactive fix mode — walk through each violation one by one.
 * User chooses per-violation: apply, skip, apply-all-similar, ignore-rule, quit.
 */
export async function fixInteractive(options: FixInteractiveOptions): Promise<void> {
  // First, scan to find all violations
  const lintResult = await runLint({
    files: options.files,
    ruleOverrides: options.ruleOverrides,
    fix: false,
  });

  if (lintResult.totalViolations === 0) {
    console.log(chalk.green('\n  ✓ No violations found!\n'));
    return;
  }

  prompts.intro(chalk.bold('Vizlint Interactive Fix'));

  // Collect all fixable violations across files
  interface Violation {
    file: string;
    filePath: string;
    message: LintMessage;
  }

  const violations: Violation[] = [];
  for (const result of lintResult.results) {
    for (const msg of result.messages) {
      violations.push({
        file: relative(options.cwd, result.filePath),
        filePath: result.filePath,
        message: msg,
      });
    }
  }

  console.log(chalk.gray(`  Found ${violations.length} violation${violations.length !== 1 ? 's' : ''}`));
  console.log('');

  const ignoredRules = new Set<string>();
  const applyAllRules = new Set<string>();
  let applied = 0;
  let skipped = 0;

  for (const v of violations) {
    const ruleId = v.message.ruleId ?? 'unknown';

    // Skip ignored rules
    if (ignoredRules.has(ruleId)) {
      skipped++;
      continue;
    }

    // Auto-apply if user chose "apply all similar"
    if (applyAllRules.has(ruleId)) {
      if (v.message.fix) {
        applyFix(v.filePath, v.message.fix);
        applied++;
      }
      continue;
    }

    const hasFix = !!v.message.fix;
    const fixLabel = hasFix ? '' : chalk.gray(' (not auto-fixable)');

    const category = RULE_CATEGORY_MAP[ruleId];
    const categoryStr = category ? chalk.gray(` [${category}]`) : '';

    console.log(`  ${chalk.underline(v.file)}:${v.message.line}:${v.message.column}${categoryStr}`);
    console.log(`  ${v.message.message}${fixLabel}`);
    console.log('');

    type Choice = 'apply' | 'skip' | 'apply-all' | 'ignore-rule' | 'quit';

    const actionOptions: { value: Choice; label: string }[] = [];
    if (hasFix) {
      actionOptions.push({ value: 'apply', label: 'Apply fix' });
    }
    actionOptions.push(
      { value: 'skip', label: 'Skip' },
    );
    if (hasFix) {
      actionOptions.push({ value: 'apply-all', label: `Apply all ${ruleId} fixes` });
    }
    actionOptions.push(
      { value: 'ignore-rule', label: `Ignore all ${ruleId} violations` },
      { value: 'quit', label: 'Quit' },
    );

    const action = await prompts.select<Choice>({
      message: 'What would you like to do?',
      options: actionOptions,
    });

    if (prompts.isCancel(action) || action === 'quit') {
      break;
    }

    switch (action) {
      case 'apply':
        if (v.message.fix) {
          applyFix(v.filePath, v.message.fix);
          applied++;
        }
        break;

      case 'skip':
        skipped++;
        break;

      case 'apply-all':
        applyAllRules.add(ruleId);
        if (v.message.fix) {
          applyFix(v.filePath, v.message.fix);
          applied++;
        }
        break;

      case 'ignore-rule':
        ignoredRules.add(ruleId);
        skipped++;
        break;
    }
  }

  console.log('');
  prompts.outro(
    `${chalk.green(`${applied} fixed`)}${chalk.gray(', ')}${chalk.yellow(`${skipped} skipped`)}`,
  );
}

/**
 * Apply a single ESLint fix to a file.
 */
function applyFix(filePath: string, fix: { range: [number, number]; text: string }): void {
  const source = readFileSync(filePath, 'utf-8');
  const patched = source.slice(0, fix.range[0]) + fix.text + source.slice(fix.range[1]);
  writeFileSync(filePath, patched);
}
