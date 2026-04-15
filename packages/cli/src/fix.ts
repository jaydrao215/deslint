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

/** An ESLint-style fix: a byte range in the ORIGINAL source + replacement text. */
export interface Fix {
  range: [number, number];
  text: string;
}

/**
 * Apply one or more ESLint fixes to a source string.
 *
 * The key invariant: `fix.range` is always measured against the ORIGINAL source
 * that ESLint parsed. Applying fix #1 shifts every byte after it, which is why
 * the old "readFileSync → slice/splice → writeFileSync per fix" loop silently
 * corrupted files when more than one fix landed in the same file.
 *
 * Correct algorithm:
 *   1. Sort ascending by range start.
 *   2. Drop any fix that overlaps an earlier (already-kept) fix. ESLint uses the
 *      same rule internally: conservative, never mangle bytes twice.
 *   3. Walk in REVERSE so each splice only shifts bytes that no later fix
 *      references.
 *
 * Exported for unit testing.
 */
export function applyFixesToSource(source: string, fixes: Fix[]): string {
  if (fixes.length === 0) return source;

  const sorted = [...fixes].sort((a, b) => a.range[0] - b.range[0]);
  const nonOverlapping: Fix[] = [];
  let lastEnd = -1;
  for (const fix of sorted) {
    // Only keep fixes that start at or after the last kept fix's end.
    if (fix.range[0] >= lastEnd) {
      nonOverlapping.push(fix);
      lastEnd = fix.range[1];
    }
  }

  let out = source;
  for (let i = nonOverlapping.length - 1; i >= 0; i--) {
    const fix = nonOverlapping[i];
    out = out.slice(0, fix.range[0]) + fix.text + out.slice(fix.range[1]);
  }
  return out;
}

/**
 * Apply all auto-fixable violations at once.
 * With --dry-run, shows a diff preview without modifying files.
 */
export async function fixAll(options: FixAllOptions): Promise<LintResult> {
  if (options.dryRun) {
    return fixAllDryRun(options);
  }

  // Capture the pre-fix violation count so we can report accurate "fixed"
  // numbers. ESLint's post-fix `messages` only contains what remains, and
  // `fixableErrorCount`/`fixableWarningCount` on those results are zeros
  // once the fixes have been applied — so we need a separate pre-scan.
  //
  // IMPORTANT: we must forward `cwd` to runLint. Without it runLint falls back
  // to `dirname(options.files[0])`, which silently fails on paths that contain
  // glob-special characters — notably Next.js route groups like
  // `app/(auth)/page.tsx`. The parens trip up ESLint's internal micromatch when
  // the derived cwd IS the parent folder literally containing the parens.
  const preFix = await runLint({
    files: options.files,
    ruleOverrides: options.ruleOverrides,
    cwd: options.cwd,
  });
  const fixableBefore = preFix.results.reduce(
    (sum, r) => sum + r.messages.filter((m) => m.fix).length,
    0,
  );

  // Run ESLint with fix: true — it writes fixed files automatically
  const result = await runLint({
    files: options.files,
    ruleOverrides: options.ruleOverrides,
    fix: true,
    cwd: options.cwd,
  });

  // A file was actually modified iff ESLint produced `output` for it.
  const fixedFiles = result.results.filter((r) => r.output !== undefined).length;

  console.log('');
  if (fixableBefore > 0) {
    console.log(
      chalk.green(
        `  ✓ Fixed ${fixableBefore} violation${fixableBefore !== 1 ? 's' : ''} in ${fixedFiles} file${fixedFiles !== 1 ? 's' : ''}`,
      ),
    );
  } else {
    console.log(chalk.green('  ✓ No fixable violations found'));
  }

  // Show remaining violations (everything still present after the fix pass)
  if (result.totalViolations > 0) {
    console.log(
      chalk.yellow(
        `  ${result.totalViolations} violation${result.totalViolations !== 1 ? 's' : ''} remaining (not auto-fixable)`,
      ),
    );
  }
  console.log('');

  return result;
}

/**
 * Dry run — show what would change without modifying files.
 */
async function fixAllDryRun(options: FixAllOptions): Promise<LintResult> {
  // Compute fixes but do NOT write them to disk. This is a genuine preview:
  // callers must be able to trust that --dry-run never touches the filesystem.
  const result = await runLint({
    files: options.files,
    ruleOverrides: options.ruleOverrides,
    fix: true,
    writeFixes: false,
    cwd: options.cwd,
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
  // First, scan to find all violations. Forward cwd so route-group paths
  // like `app/(auth)/...` resolve correctly (see fixAll for details).
  const lintResult = await runLint({
    files: options.files,
    ruleOverrides: options.ruleOverrides,
    fix: false,
    cwd: options.cwd,
  });

  if (lintResult.totalViolations === 0) {
    console.log(chalk.green('\n  ✓ No violations found!\n'));
    return;
  }

  prompts.intro(chalk.bold('Deslint Interactive Fix'));

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

  // ── Per-file fix accumulator ─────────────────────────────────────────
  // ESLint fix ranges are always measured against the file's ORIGINAL parsed
  // source. Writing each fix immediately means the NEXT fix's range is stale.
  // Instead we snapshot each file's original source once, append fixes to a
  // per-file queue, and on every apply we rewrite the whole file by replaying
  // the queue against the original via applyFixesToSource.
  const originals = new Map<string, string>();
  const queued = new Map<string, Fix[]>();

  const commitFix = (filePath: string, fix: Fix): void => {
    if (!originals.has(filePath)) {
      originals.set(filePath, readFileSync(filePath, 'utf-8'));
    }
    const list = queued.get(filePath) ?? [];
    list.push(fix);
    queued.set(filePath, list);
    const patched = applyFixesToSource(originals.get(filePath) as string, list);
    writeFileSync(filePath, patched);
  };

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
        commitFix(v.filePath, v.message.fix);
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
          commitFix(v.filePath, v.message.fix);
          applied++;
        }
        break;

      case 'skip':
        skipped++;
        break;

      case 'apply-all':
        applyAllRules.add(ruleId);
        if (v.message.fix) {
          commitFix(v.filePath, v.message.fix);
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
