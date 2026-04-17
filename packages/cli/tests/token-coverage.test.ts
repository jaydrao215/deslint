import { describe, it, expect } from 'vitest';
import { computeTokenCoverage } from '../src/token-coverage.js';
import { renderCoverageHtml } from '../src/token-coverage-html.js';

/**
 * In-memory tests: we inject a readFile stub so there's no disk I/O.
 * These exercise the classifier directly and verify the contract
 * downstream tooling (the HTML renderer, the MCP server) depends on.
 */

function scan(
  sources: Record<string, string>,
  designSystem?: Parameters<typeof computeTokenCoverage>[0]['designSystem'],
) {
  return computeTokenCoverage({
    files: Object.keys(sources),
    designSystem,
    readFile: (p) => sources[p] ?? '',
  });
}

describe('computeTokenCoverage — classification', () => {
  it('returns zeros when no files are provided', () => {
    const result = computeTokenCoverage({ files: [], readFile: () => '' });
    expect(result.totalClassUsages).toBe(0);
    expect(result.overallOnScalePct).toBe(0);
    expect(result.categories.colors.total).toBe(0);
    expect(result.hasDesignSystem).toBe(false);
  });

  it('flags hasDesignSystem true when tokens are present', () => {
    const result = scan(
      { 'a.tsx': `<div className="bg-white" />` },
      { colors: { brand: '#1A5276' } },
    );
    expect(result.hasDesignSystem).toBe(true);
  });

  it('flags hasDesignSystem false for an empty design system', () => {
    const result = scan({ 'a.tsx': `<div className="bg-white" />` }, {});
    expect(result.hasDesignSystem).toBe(false);
  });

  // ── Colors ────────────────────────────────────────────────────────

  it('classifies a hex arbitrary colour as drift', () => {
    const result = scan({
      'a.tsx': `<div className="bg-[#1A5276]" />`,
    });
    expect(result.categories.colors.total).toBe(1);
    expect(result.categories.colors.arbitrary).toBe(1);
    expect(result.categories.colors.driftPct).toBe(100);
    expect(result.categories.colors.topDrift[0]).toEqual({
      value: 'bg-[#1A5276]',
      count: 1,
    });
  });

  it('classifies a design-system token colour as token', () => {
    const result = scan(
      { 'a.tsx': `<div className="bg-brand-primary text-brand-primary" />` },
      { colors: { 'brand-primary': '#1A5276' } },
    );
    expect(result.categories.colors.token).toBe(2);
    expect(result.categories.colors.tokenPct).toBe(100);
    expect(result.categories.colors.topTokens[0].count).toBe(2);
  });

  it('classifies default Tailwind palette as default', () => {
    const result = scan({
      'a.tsx': `<div className="bg-red-500 text-white border-slate-200" />`,
    });
    expect(result.categories.colors.default).toBe(3);
    expect(result.categories.colors.token).toBe(0);
    expect(result.categories.colors.arbitrary).toBe(0);
  });

  it('computes onScalePct as (token + default) / total', () => {
    const result = scan(
      {
        'a.tsx': `<div className="bg-brand bg-red-500 bg-[#FF0000] bg-[#000000]" />`,
      },
      { colors: { brand: '#1A5276' } },
    );
    const c = result.categories.colors;
    expect(c.total).toBe(4);
    expect(c.token).toBe(1);
    expect(c.default).toBe(1);
    expect(c.arbitrary).toBe(2);
    expect(c.onScalePct).toBe(50);
    expect(c.tokenPct).toBe(25);
  });

  // ── Spacing ──────────────────────────────────────────────────────

  it('classifies an arbitrary spacing value as drift', () => {
    const result = scan({
      'a.tsx': `<div className="p-[13px] m-[1.5rem]" />`,
    });
    expect(result.categories.spacing.arbitrary).toBe(2);
    expect(result.categories.spacing.topDrift).toHaveLength(2);
  });

  it('classifies a user spacing token as token', () => {
    const result = scan(
      { 'a.tsx': `<div className="p-md gap-lg" />` },
      { spacing: { md: '1rem', lg: '1.5rem' } },
    );
    expect(result.categories.spacing.token).toBe(2);
    const names = result.categories.spacing.topTokens.map((t) => t.name).sort();
    expect(names).toEqual(['lg', 'md']);
  });

  it('classifies default spacing scale as default', () => {
    const result = scan({
      'a.tsx': `<div className="p-4 mx-auto w-full gap-8" />`,
    });
    expect(result.categories.spacing.default).toBe(4);
  });

  // ── Border radius ────────────────────────────────────────────────

  it('classifies arbitrary radius as drift', () => {
    const result = scan({
      'a.tsx': `<div className="rounded-[8px] rounded-tl-[12px]" />`,
    });
    expect(result.categories.borderRadius.arbitrary).toBe(2);
    expect(result.categories.borderRadius.topDrift[0].value).toMatch(/rounded/);
  });

  it('classifies user radius token and default scale', () => {
    const result = scan(
      { 'a.tsx': `<div className="rounded-card rounded-lg rounded" />` },
      { borderRadius: { card: '0.75rem' } },
    );
    expect(result.categories.borderRadius.token).toBe(1);
    expect(result.categories.borderRadius.default).toBe(2);
  });

  // ── Typography ────────────────────────────────────────────────────

  it('classifies arbitrary font size as drift (not as color)', () => {
    const result = scan({
      'a.tsx': `<div className="text-[17px]" />`,
    });
    expect(result.categories.typography.arbitrary).toBe(1);
    expect(result.categories.colors.total).toBe(0);
  });

  it('does not confuse text-red-500 (color) with typography', () => {
    const result = scan({
      'a.tsx': `<div className="text-red-500 text-xl" />`,
    });
    expect(result.categories.colors.default).toBe(1);
    expect(result.categories.typography.default).toBe(1);
  });

  it('classifies user fontSize token as token', () => {
    const result = scan(
      { 'a.tsx': `<div className="text-h1" />` },
      { typography: { fontSize: { h1: '2.25rem' } } },
    );
    expect(result.categories.typography.token).toBe(1);
    expect(result.categories.typography.topTokens[0].name).toBe('text-h1');
  });

  it('classifies tracking em arbitrary and token', () => {
    const result = scan(
      { 'a.tsx': `<div className="tracking-[0.05em] tracking-tight tracking-brand" />` },
      { typography: { tracking: { brand: '-0.02em' } } },
    );
    const t = result.categories.typography;
    expect(t.arbitrary).toBe(1);
    expect(t.default).toBe(1); // tracking-tight
    expect(t.token).toBe(1); // tracking-brand
  });

  it('classifies font-weight arbitrary and default', () => {
    const result = scan({
      'a.tsx': `<div className="font-[450] font-bold font-sans" />`,
    });
    // font-sans is a family utility → not counted
    expect(result.categories.typography.arbitrary).toBe(1);
    expect(result.categories.typography.default).toBe(1);
  });

  // ── Variants ──────────────────────────────────────────────────────

  it('strips responsive/state variants before classifying', () => {
    const result = scan({
      'a.tsx': `<div className="md:p-4 hover:bg-red-500 sm:p-[13px]" />`,
    });
    expect(result.categories.spacing.default).toBe(1); // md:p-4
    expect(result.categories.spacing.arbitrary).toBe(1); // sm:p-[13px]
    expect(result.categories.colors.default).toBe(1); // hover:bg-red-500
  });

  // ── Aggregation ──────────────────────────────────────────────────

  it('computes overall percentages across all categories', () => {
    const result = scan(
      {
        'a.tsx': `<div className="bg-brand p-md text-h1 rounded-card" />`,
        'b.tsx': `<div className="bg-red-500 p-[13px] text-[17px] rounded-[8px]" />`,
      },
      {
        colors: { brand: '#1A5276' },
        spacing: { md: '1rem' },
        typography: { fontSize: { h1: '2.25rem' } },
        borderRadius: { card: '0.75rem' },
      },
    );
    // 8 classes total: 4 token + 1 default + 3 arbitrary
    // token% = 4/8 = 50, onScale = 5/8 = 62.5
    expect(result.overallTokenPct).toBe(50);
    expect(result.overallOnScalePct).toBe(62.5);
  });

  it('extracts classes from class="..." in HTML/Vue/Svelte', () => {
    const result = scan({
      'a.vue': `<template><div class="p-4 bg-red-500"></div></template>`,
    });
    expect(result.categories.spacing.default).toBe(1);
    expect(result.categories.colors.default).toBe(1);
  });

  it('extracts classes from :class="..." (Vue binding)', () => {
    const result = scan({
      'a.vue': `<template><div :class="'p-4 bg-red-500'"></div></template>`,
    });
    expect(result.categories.spacing.default).toBe(1);
    expect(result.categories.colors.default).toBe(1);
  });

  it('ignores classes in code that is not a class attribute', () => {
    const result = scan({
      'a.tsx': `const x = "p-4"; // not in className\nreturn <div>hi</div>;`,
    });
    expect(result.totalClassUsages).toBe(0);
  });
});

describe('renderCoverageHtml', () => {
  it('renders a valid HTML document with the score and categories', () => {
    const result = scan(
      { 'a.tsx': `<div className="bg-brand p-4 text-xl" />` },
      { colors: { brand: '#1A5276' } },
    );
    const html = renderCoverageHtml(result, {
      projectName: 'demo',
      version: '0.5.0',
    });
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('Token Coverage');
    expect(html).toContain('demo');
    expect(html).toContain('deslint 0.5.0');
    expect(html).toContain('Colors');
    expect(html).toContain('Spacing');
    expect(html).toContain('Typography');
    expect(html).toContain('Border radius');
  });

  it('surfaces the no-design-system call-to-action when appropriate', () => {
    const result = scan({ 'a.tsx': `<div className="bg-red-500" />` });
    const html = renderCoverageHtml(result, {
      projectName: 'demo',
      version: '0.5.0',
    });
    expect(html).toContain('No design system detected');
    expect(html).toContain('deslint import-tokens');
  });

  it('escapes HTML-unsafe characters in drift values', () => {
    const result = scan({
      'a.tsx': `<div className="bg-[rgb(1,2,3)]" />`,
    });
    const html = renderCoverageHtml(result, {
      projectName: '<script>',
      version: '0.5.0',
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
