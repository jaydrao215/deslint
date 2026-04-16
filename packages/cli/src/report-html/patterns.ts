import type { ViolationEntry, VisualPattern } from './types.js';

/**
 * Group identical-shape violations so the report can render one card per
 * pattern instead of one per violation. The shape key is derived from the
 * fields the preview renderer needs (e.g. text+bg classes for contrast,
 * className+suggested for spacing) — violations with different context but
 * the same shape collapse into a single `VisualPattern` with a count.
 */
export function extractPatterns(violations: ViolationEntry[]): VisualPattern[] {
  const map = new Map<string, VisualPattern>();

  for (const v of violations) {
    let key = '';
    const data: Record<string, string> = {};

    if (v.ruleId === 'deslint/a11y-color-contrast') {
      const m = v.message.match(/Contrast ratio ([\d.]+):1 between `([^`]+)` and `([^`]+)` fails WCAG AA \(needs ([\d.]+):1\)/);
      if (m) {
        data.ratio = m[1]; data.textClass = m[2]; data.bgClass = m[3]; data.required = m[4];
        const sugM = v.message.match(/Try `([^`]+)` on `([^`]+)` \(ratio ([\d.]+):1\)/);
        if (sugM) { data.suggestedText = sugM[1]; data.suggestedBg = sugM[2]; data.suggestedRatio = sugM[3]; }
        key = `contrast:${data.textClass}|${data.bgClass}`;
      }
    } else if (v.ruleId === 'deslint/no-arbitrary-spacing') {
      const m = v.message.match(/Arbitrary spacing `([^`]+)` detected/);
      if (m) {
        data.className = m[1];
        const sugM = v.message.match(/Suggested: `([^`]+)`/);
        if (sugM) data.suggested = sugM[1];
        key = `spacing:${data.className}→${data.suggested ?? '?'}`;
      }
    } else if (v.ruleId === 'deslint/no-arbitrary-typography') {
      const m = v.message.match(/Arbitrary typography `([^`]+)` detected/);
      if (m) {
        data.className = m[1];
        const sugM = v.message.match(/Suggested: `([^`]+)`/);
        if (sugM) data.suggested = sugM[1];
        key = `typo:${data.className}→${data.suggested ?? '?'}`;
      }
    } else if (v.ruleId === 'deslint/no-arbitrary-colors') {
      const m = v.message.match(/Arbitrary color `([^`]+)` detected/);
      if (m) {
        data.className = m[1];
        const sugM = v.message.match(/Suggested: `([^`]+)`/);
        if (sugM) data.suggested = sugM[1];
        key = `color:${data.className}→${data.suggested ?? '?'}`;
      }
    } else if (v.ruleId === 'deslint/dark-mode-coverage') {
      const m = v.message.match(/`([^`]+)` has no `dark:` variant\. Add `([^`]+)`/);
      if (m) {
        data.className = m[1]; data.suggested = m[2];
        key = `dark:${data.className}→${data.suggested}`;
      }
    } else if (v.ruleId === 'deslint/consistent-border-radius') {
      const m = v.message.match(/`([^`]+)` uses `([^`]+)` but (\d+) of (\d+) instances use `([^`]+)`/);
      if (m) {
        data.component = m[1]; data.actual = m[2]; data.count = m[3]; data.total = m[4]; data.dominant = m[5];
        key = `radius:${data.component}:${data.actual}|${data.dominant}`;
      }
    } else if (v.ruleId === 'deslint/consistent-component-spacing') {
      const m = v.message.match(/`([^`]+)` uses ([^ ]+) `([^`]+)` but (\d+) of (\d+) instances use `([^`]+)`/);
      if (m) {
        data.component = m[1]; data.category = m[2]; data.actual = m[3]; data.count = m[4]; data.total = m[5]; data.dominant = m[6];
        key = `cspacing:${data.component}:${data.actual}|${data.dominant}`;
      }
    } else if (v.ruleId === 'deslint/missing-states') {
      const m = v.message.match(/`<(\w+)>` is missing (disabled state|error state|required indicator)/);
      if (m) {
        data.element = m[1]; data.stateType = m[2];
        key = `states:${data.element}:${data.stateType}`;
      }
    } else if (v.ruleId === 'deslint/responsive-required') {
      const m = v.message.match(/`([^`]+)` sets a fixed ([^ ]+) of (\d+)px/);
      if (m) {
        data.className = m[1]; data.prefix = m[2]; data.px = m[3];
        key = `responsive:${data.className}`;
      }
    } else if (v.ruleId === 'deslint/no-arbitrary-zindex') {
      const m = v.message.match(/Arbitrary z-index `([^`]+)` detected\. Use scale value `([^`]+)`/);
      if (m) {
        data.className = m[1]; data.suggested = m[2];
        key = `zindex:${data.className}→${data.suggested}`;
      }
    } else if (v.ruleId === 'deslint/no-magic-numbers-layout') {
      const m = v.message.match(/Arbitrary layout value `([^`]+)` detected\. Use Tailwind scale value `([^`]+)`/);
      if (m) {
        data.className = m[1]; data.suggested = m[2];
        key = `magic:${data.className}→${data.suggested}`;
      }
    } else if (v.ruleId === 'deslint/image-alt-text') {
      const m = v.message.match(/`<(\w+)>` (?:is missing an `alt`|has an empty `alt`|has meaningless alt text)/);
      if (m) {
        data.element = m[1];
        const altM = v.message.match(/meaningless alt text "([^"]+)"/);
        data.issue = altM ? `meaningless: "${altM[1]}"` : v.message.includes('empty') ? 'empty' : 'missing';
        key = `alt:${data.element}:${data.issue}`;
      }
    }

    if (!key) continue;

    if (!map.has(key)) {
      map.set(key, { key, ruleId: v.ruleId, count: 0, files: new Set(), data });
    }
    const p = map.get(key)!;
    p.count++;
    p.files.add(v.file);
  }

  return [...map.values()].sort((a, b) => b.count - a.count);
}
