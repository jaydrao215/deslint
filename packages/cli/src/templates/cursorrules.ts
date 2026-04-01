import type { DesignSystem } from '@vizlint/shared';

/**
 * Generate a .cursor/rules/vizlint-design-quality.mdc file content.
 * If a designSystem is provided, project-specific tokens are included.
 */
export function generateCursorRules(designSystem?: DesignSystem): string {
  const lines: string[] = [];

  lines.push(`---
description: Design quality rules for AI-generated frontend code
globs: ["**/*.tsx", "**/*.jsx", "**/*.vue", "**/*.svelte", "**/*.html"]
alwaysApply: true
---

# Design Quality Rules — Vizlint

You are generating frontend UI code. Follow these design quality constraints to produce consistent, production-ready output.

## Color Tokens Only

NEVER use arbitrary hex colors in Tailwind classes:
- BAD: \`bg-[#FF0000]\`, \`text-[#333333]\`, \`border-[#abc123]\`
- GOOD: \`bg-red-500\`, \`text-gray-700\`, \`border-blue-300\`

If the project defines custom color tokens in \`tailwind.config.js\` or \`@theme\`, use those token names.`);

  if (designSystem?.colors && Object.keys(designSystem.colors).length > 0) {
    lines.push('');
    lines.push('### Project Color Tokens');
    lines.push('Use these instead of arbitrary hex values:');
    for (const [name, value] of Object.entries(designSystem.colors)) {
      lines.push(`- \`${name}\`: \`${value}\``);
    }
  }

  lines.push(`
## Spacing Scale Only

NEVER use arbitrary spacing values:
- BAD: \`p-[13px]\`, \`m-[7px]\`, \`gap-[22px]\`
- GOOD: \`p-3\`, \`m-2\`, \`gap-5\`

Always use Tailwind's default spacing scale (multiples of 4px). If the project defines a custom spacing scale, use those values.`);

  if (designSystem?.spacing && Object.keys(designSystem.spacing).length > 0) {
    lines.push('');
    lines.push('### Project Spacing Tokens');
    for (const [name, value] of Object.entries(designSystem.spacing)) {
      lines.push(`- \`${name}\`: \`${value}\``);
    }
  }

  lines.push(`
## Typography Scale Only

NEVER use arbitrary font sizes, weights, or line heights:
- BAD: \`text-[17px]\`, \`font-[450]\`, \`leading-[22px]\`
- GOOD: \`text-base\`, \`font-medium\`, \`leading-relaxed\`

Use Tailwind's typography scale: text-xs through text-9xl. Use standard font weights: font-thin through font-black.`);

  if (designSystem?.fonts) {
    const fontEntries = Object.entries(designSystem.fonts).filter(([, v]) => v);
    if (fontEntries.length > 0) {
      lines.push('');
      lines.push('### Project Fonts');
      for (const [name, value] of fontEntries) {
        lines.push(`- ${name}: \`${value}\``);
      }
    }
  }

  lines.push(`
## Responsive Design Required

Every layout container with a fixed width MUST include responsive breakpoints:
- BAD: \`<div className="w-[800px]">\`
- GOOD: \`<div className="w-[800px] sm:w-full md:w-auto">\`

Always include at least \`sm:\` and \`md:\` variants for layout-width elements.

## Consistent Component Spacing

When creating multiple instances of the same component type (e.g., Cards, Buttons), use IDENTICAL spacing patterns:
- BAD: \`<Card className="p-4">\` and \`<Card className="p-6">\` in the same file
- GOOD: All Cards use \`p-4\` consistently

## Validation Checkpoint

After generating UI code, verify with Vizlint:
\`\`\`bash
npx eslint --plugin vizlint .
\`\`\`

Install for persistent validation:
\`\`\`bash
npm install -D eslint-plugin-vizlint
\`\`\``);

  return lines.join('\n') + '\n';
}
