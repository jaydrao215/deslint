/**
 * `deslint attest` — emit a Git-native attestation artifact for a scan.
 *
 * Design intent (v0.6): the attestation is an **OSS, committable JSON file**
 * that gives regulated buyers a reproducible audit trail without requiring
 * any SaaS. It is Deslint's answer to "prove this release met its design
 * quality bar at merge time, long after the fact."
 *
 * The schema is intentionally small and deterministic:
 *  - `schema`            — `"deslint.attestation/v1"`. Bumps require care.
 *  - `createdAt`         — ISO timestamp (pass `DESLINT_ATTEST_NOW` for
 *                          byte-reproducible outputs; defaults to
 *                          scan-epoch for humans).
 *  - `deslint`           — version of the CLI that produced the artifact.
 *  - `projectDir`        — absolute path that was scanned (informational).
 *  - `rulesetHash`       — sha256 of the user-declared rule overrides from
 *                          `.deslintrc.json` (matches the trailer hash).
 *  - `score`             — Design Health Score at attestation time.
 *  - `categories`        — per-category scores and violation counts.
 *  - `totalViolations`   — total violations across the scan.
 *  - `debtMinutes`       — estimated remediation effort.
 *  - `budget`            — `{ path?, passed, enforced, breaches }` if a
 *                          budget file was found or `--budget` was
 *                          passed; `undefined` otherwise.
 *  - `files`             — `[{ path, sha256 }]`, sorted by path, for an
 *                          immutable manifest of what was scanned. Paths
 *                          are relative to `projectDir` for portability.
 *  - `signer`            — informational: the value of
 *                          `DESLINT_ATTEST_SIGNER` if set. Real signing is
 *                          deferred to v0.7 under the Teams tier; the v0.6
 *                          OSS artifact is unsigned but cryptographically
 *                          reproducible.
 *
 * Reproducibility contract: two invocations against the same source
 * tree, same `.deslintrc.json`, and same budget file MUST produce
 * byte-identical JSON. Tests enforce this by running the command twice
 * and comparing the output.
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import {
  computeRulesetHash,
  safeParseConfig,
  loadBudget,
  evaluateBudget,
  effortForRule,
} from '@deslint/shared';
import type { BudgetScanSnapshot } from '@deslint/shared';
import { discoverFiles } from './discover.js';
import { runLint } from './lint-runner.js';
import { calculateScore } from './score.js';
import { VERSION } from './index.js';

/** JSON shape written to disk. */
export interface DeslintAttestation {
  schema: 'deslint.attestation/v1';
  createdAt: string;
  deslint: { version: string };
  projectDir: string;
  rulesetHash: string;
  score: {
    overall: number;
    grade: string;
    categories: Record<string, { score: number; violations: number }>;
    totalViolations: number;
    debtMinutes: number;
  };
  budget?: {
    path?: string;
    passed: boolean;
    enforced: boolean;
    breaches: Array<{
      condition: string;
      message: string;
      threshold: number;
      actual: number;
      category?: string;
      ruleId?: string;
    }>;
  };
  files: Array<{ path: string; sha256: string }>;
  signer?: string;
}

export interface AttestOptions {
  projectDir: string;
  budgetPath?: string;
  /** Override the timestamp for reproducible builds (e.g. `SOURCE_DATE_EPOCH`
   *  style). Accepts an ISO string. */
  now?: string;
}

/** Build an attestation in-memory without writing to disk. */
export async function buildAttestation(
  options: AttestOptions,
): Promise<DeslintAttestation> {
  const projectDir = resolve(options.projectDir);

  // Load user-declared rule overrides. Same source the trailer hashes.
  let userRules: Record<string, unknown> = {};
  const rcPath = resolve(projectDir, '.deslintrc.json');
  if (existsSync(rcPath)) {
    try {
      const raw = JSON.parse(readFileSync(rcPath, 'utf-8'));
      const parsed = safeParseConfig(raw);
      if (parsed.success) {
        userRules = (parsed.data.rules ?? {}) as Record<string, unknown>;
      } else {
        userRules = (raw?.rules ?? {}) as Record<string, unknown>;
      }
    } catch {
      /* leave userRules empty */
    }
  }

  const files = await discoverFiles({ cwd: projectDir });

  if (files.length === 0) {
    const emptyAttestation: DeslintAttestation = {
      schema: 'deslint.attestation/v1',
      createdAt: options.now ?? new Date().toISOString(),
      deslint: { version: VERSION },
      projectDir,
      rulesetHash: computeRulesetHash(userRules),
      score: {
        overall: 100,
        grade: 'pass',
        categories: {},
        totalViolations: 0,
        debtMinutes: 0,
      },
      files: [],
    };
    const signer = process.env.DESLINT_ATTEST_SIGNER;
    if (signer) emptyAttestation.signer = signer;
    return emptyAttestation;
  }

  const lintResult = await runLint({
    files,
    cwd: projectDir,
    ruleOverrides: userRules,
  });
  const scoreResult = calculateScore(lintResult);

  // Compute debt minutes from per-rule counts.
  let debtMinutes = 0;
  for (const [ruleId, count] of Object.entries(lintResult.byRule)) {
    debtMinutes += effortForRule(ruleId) * count;
  }

  // Load budget (if any) and evaluate so the attestation records the
  // gate decision that was in effect at attestation time.
  const loaded = await loadBudget({ explicitPath: options.budgetPath, cwd: projectDir });
  const budgetSnap: BudgetScanSnapshot = {
    overall: scoreResult.overall,
    categories: {
      colors: scoreResult.categories.colors.score,
      spacing: scoreResult.categories.spacing.score,
      typography: scoreResult.categories.typography.score,
      responsive: scoreResult.categories.responsive.score,
      consistency: scoreResult.categories.consistency.score,
    },
    totalViolations: lintResult.totalViolations,
    debtMinutes,
    byRule: lintResult.byRule,
  };
  const budgetResult = evaluateBudget(loaded?.budget, budgetSnap);

  // File manifest: relative path + sha256, sorted by path for determinism.
  const manifest = files
    .map((absPath) => {
      const data = readFileSync(absPath);
      const sha256 = createHash('sha256').update(data).digest('hex');
      return { path: relative(projectDir, absPath), sha256 };
    })
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  const categories: Record<string, { score: number; violations: number }> = {};
  for (const [cat, data] of Object.entries(scoreResult.categories)) {
    categories[cat] = { score: data.score, violations: data.violations };
  }

  const attestation: DeslintAttestation = {
    schema: 'deslint.attestation/v1',
    createdAt: options.now ?? new Date().toISOString(),
    deslint: { version: VERSION },
    projectDir,
    rulesetHash: computeRulesetHash(userRules),
    score: {
      overall: scoreResult.overall,
      grade: scoreResult.grade,
      categories,
      totalViolations: lintResult.totalViolations,
      debtMinutes,
    },
    files: manifest,
  };

  if (loaded || options.budgetPath || budgetResult.conditionsChecked > 0) {
    attestation.budget = {
      path: loaded?.path,
      passed: budgetResult.passed,
      enforced: budgetResult.enforced,
      breaches: budgetResult.breaches.map((b) => ({
        condition: b.condition,
        message: b.message,
        threshold: b.threshold,
        actual: b.actual,
        category: b.category,
        ruleId: b.ruleId,
      })),
    };
  }

  const signer = process.env.DESLINT_ATTEST_SIGNER;
  if (signer) attestation.signer = signer;

  return attestation;
}

/**
 * Serialize the attestation to a stable, byte-reproducible JSON string.
 * Uses 2-space indent and a trailing newline so generators and grep both
 * stay happy.
 */
export function serializeAttestation(a: DeslintAttestation): string {
  return JSON.stringify(a, null, 2) + '\n';
}

/** Write an attestation to disk, creating parent directories as needed. */
export function writeAttestation(path: string, a: DeslintAttestation): void {
  const abs = resolve(path);
  const dir = dirname(abs);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(abs, serializeAttestation(a));
}
