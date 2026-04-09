import { describe, it, expect } from 'vitest';
import { renderComplianceHtml, buildComplianceResult } from '../src/compliance-report.js';
import type { LintResult } from '../src/lint-runner.js';

/**
 * Focused tests on the S5 report-widening additions:
 *   1. Per-level sections (Level A / Level AA headings)
 *   2. WCAG 2.1 equivalence stat + footnote
 *   3. Per-level conformance badges match the evaluator
 *
 * We only assert presence of strings that cannot regress silently —
 * no full snapshot, so cosmetic CSS tweaks don't churn the test.
 */

function fakeLintResult(byRule: Record<string, number> = {}): LintResult {
  return {
    results: [],
    totalFiles: 5,
    totalViolations: Object.values(byRule).reduce((a, b) => a + b, 0),
    bySeverity: { errors: 0, warnings: 0 },
    byRule,
  };
}

describe('renderComplianceHtml — per-level sections (S5)', () => {
  it('renders a Level A section and a Level AA section', () => {
    const html = renderComplianceHtml({
      projectName: 'test',
      scannedAt: new Date('2026-04-09T00:00:00Z'),
      totalFiles: 5,
      lintResult: fakeLintResult(),
    });
    expect(html).toContain('data-level="A"');
    expect(html).toContain('data-level="AA"');
    expect(html).toContain('<h2>Level A');
    expect(html).toContain('<h2>Level AA');
  });

  it('Level A shows Conformant badge when no A-level criterion fails', () => {
    // 1.4.10 Reflow is AA → fails AA but not A
    const html = renderComplianceHtml({
      projectName: 'test',
      scannedAt: new Date('2026-04-09T00:00:00Z'),
      totalFiles: 5,
      lintResult: fakeLintResult({ 'deslint/responsive-required': 1 }),
    });
    // Grab the Level A section block.
    const levelAMatch = html.match(/<section class="level-section" data-level="A">([\s\S]*?)<\/section>/);
    expect(levelAMatch).not.toBeNull();
    expect(levelAMatch![1]).toContain('Conformant');
    // Grab the Level AA block — should be Not conformant.
    const levelAAMatch = html.match(/<section class="level-section" data-level="AA">([\s\S]*?)<\/section>/);
    expect(levelAAMatch).not.toBeNull();
    expect(levelAAMatch![1]).toContain('Not conformant');
  });

  it('both levels Not conformant when an A-level criterion fails', () => {
    const html = renderComplianceHtml({
      projectName: 'test',
      scannedAt: new Date('2026-04-09T00:00:00Z'),
      totalFiles: 5,
      lintResult: fakeLintResult({ 'deslint/image-alt-text': 1 }),
    });
    const levelAMatch = html.match(/<section class="level-section" data-level="A">([\s\S]*?)<\/section>/);
    expect(levelAMatch![1]).toContain('Not conformant');
  });
});

describe('renderComplianceHtml — WCAG 2.1 AA equivalence (S5)', () => {
  it('includes the ADA Title II / WCAG 2.1 note', () => {
    const html = renderComplianceHtml({
      projectName: 'test',
      scannedAt: new Date('2026-04-09T00:00:00Z'),
      totalFiles: 5,
      lintResult: fakeLintResult(),
    });
    expect(html).toContain('ADA Title II note');
    expect(html).toContain('WCAG 2.1');
    expect(html).toContain('wcag21-note');
  });

  it('renders the WCAG 2.1 AA stat card with the equivalence level', () => {
    const html = renderComplianceHtml({
      projectName: 'test',
      scannedAt: new Date('2026-04-09T00:00:00Z'),
      totalFiles: 5,
      lintResult: fakeLintResult(),
    });
    // Card label and the Level AA value must both appear near "WCAG 2.1".
    expect(html).toContain('WCAG 2.1 AA<sup>*</sup>');
    // When clean, both 2.2 and 2.1 show Level AA.
    expect(html.match(/Level AA/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it('WCAG 2.1 stat drops to Not Met when an A-level criterion fails', () => {
    const html = renderComplianceHtml({
      projectName: 'test',
      scannedAt: new Date('2026-04-09T00:00:00Z'),
      totalFiles: 5,
      lintResult: fakeLintResult({ 'deslint/image-alt-text': 1 }),
    });
    // Find the 2.1 stat card and assert Not Met inside it.
    const card = html.match(/WCAG 2\.1 AA<sup>\*<\/sup>[\s\S]*?<\/div>\s*<\/div>/);
    expect(card).not.toBeNull();
    expect(card![0]).toContain('Not Met');
  });
});

describe('buildComplianceResult', () => {
  it('passes byRule through to the evaluator', () => {
    const result = buildComplianceResult(
      fakeLintResult({ 'deslint/image-alt-text': 3 }),
    );
    const nonText = result.criteria.find((c) => c.criterion.id === '1.1.1');
    expect(nonText?.status).toBe('fail');
    expect(nonText?.violations).toBe(3);
  });
});
