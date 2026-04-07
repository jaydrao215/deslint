import { describe, it, expect } from 'vitest';
import { analyzeTrend, sparkline } from '../src/trend.js';
import type { HistoryEntry } from '../src/score.js';

function entry(overall: number, offsetDays = 0, categories?: Partial<HistoryEntry['categories']>): HistoryEntry {
  const base = new Date('2026-04-01T00:00:00Z').getTime();
  return {
    timestamp: new Date(base + offsetDays * 86_400_000).toISOString(),
    overall,
    categories: {
      colors: 80,
      spacing: 80,
      typography: 80,
      responsive: 80,
      consistency: 80,
      ...categories,
    },
    totalFiles: 100,
    totalViolations: Math.max(0, 100 - overall),
  };
}

describe('analyzeTrend', () => {
  it('returns zero values for an empty history', () => {
    const summary = analyzeTrend([]);
    expect(summary.totalEntries).toBe(0);
    expect(summary.windowEntries).toBe(0);
    expect(summary.scoreDelta).toBe(0);
    expect(summary.regressions).toEqual([]);
  });

  it('handles a single entry without computing deltas', () => {
    const summary = analyzeTrend([entry(85)]);
    expect(summary.windowEntries).toBe(1);
    expect(summary.scoreDelta).toBe(0);
    expect(summary.highScore).toBe(85);
    expect(summary.lowScore).toBe(85);
    expect(summary.averageScore).toBe(85);
  });

  it('computes score delta across the window', () => {
    const summary = analyzeTrend([entry(70, 0), entry(75, 1), entry(85, 2)]);
    expect(summary.scoreDelta).toBe(15);
    expect(summary.highScore).toBe(85);
    expect(summary.lowScore).toBe(70);
    expect(summary.averageScore).toBe(77);
  });

  it('honors the limit option and only looks at the tail', () => {
    const history = Array.from({ length: 20 }, (_, i) => entry(50 + i, i));
    const summary = analyzeTrend(history, { limit: 5 });
    expect(summary.totalEntries).toBe(20);
    expect(summary.windowEntries).toBe(5);
    // first-in-window = index 15 (score 65), latest = index 19 (score 69)
    expect(summary.first?.overall).toBe(65);
    expect(summary.latest?.overall).toBe(69);
    expect(summary.scoreDelta).toBe(4);
  });

  it('computes per-category deltas from first to latest', () => {
    const summary = analyzeTrend([
      entry(80, 0, { colors: 90, spacing: 70 }),
      entry(85, 1, { colors: 95, spacing: 65 }),
    ]);
    expect(summary.categoryDeltas.colors).toBe(5);
    expect(summary.categoryDeltas.spacing).toBe(-5);
    expect(summary.categoryDeltas.typography).toBe(0);
  });

  it('flags regressions that meet the alert threshold', () => {
    const summary = analyzeTrend(
      [entry(90, 0), entry(80, 1), entry(78, 2), entry(60, 3)],
      { alertThreshold: 5 },
    );
    // Drops: 90→80 (10), 80→78 (2, ignored), 78→60 (18)
    expect(summary.regressions).toHaveLength(2);
    expect(summary.regressions[0].delta).toBe(10);
    expect(summary.regressions[1].delta).toBe(18);
  });

  it('respects a custom alert threshold', () => {
    const summary = analyzeTrend(
      [entry(90, 0), entry(87, 1), entry(84, 2)],
      { alertThreshold: 2 },
    );
    expect(summary.regressions).toHaveLength(2);
  });

  it('does not flag improvements as regressions', () => {
    const summary = analyzeTrend([entry(60), entry(70), entry(80)]);
    expect(summary.regressions).toHaveLength(0);
    expect(summary.scoreDelta).toBe(20);
  });
});

describe('sparkline', () => {
  it('returns an empty string for empty input', () => {
    expect(sparkline([])).toBe('');
  });

  it('produces a character per data point', () => {
    const out = sparkline([10, 20, 30, 40, 50]);
    expect(out).toHaveLength(5);
  });

  it('uses the lowest bar for the minimum value', () => {
    const out = sparkline([50, 100, 75]);
    expect(out[0]).toBe('▁');
    expect(out[1]).toBe('█');
  });

  it('handles identical values without dividing by zero', () => {
    const out = sparkline([80, 80, 80]);
    expect(out).toHaveLength(3);
    // All equal → all use lowest index, which is the first char
    expect(new Set(out.split(''))).toEqual(new Set(['▁']));
  });
});
