import type { DesignSystem } from '@vizlint/shared';

/**
 * Generate an AGENTS.md design quality section.
 * Cross-tool compatible — works with any AI coding assistant
 * that reads AGENTS.md (Codex, Devin, etc.).
 */
export function generateAgentsMd(designSystem?: DesignSystem): string {
  const lines: string[] = [];

  lines.push(`# Design Quality Agent Rules — Vizlint

## Purpose
These rules ensure AI-generated frontend code meets the project's design system standards. All agents modifying UI code MUST follow these constraints.

## Rules

### 1. No Arbitrary Colors
Use Tailwind design tokens, never hardcoded hex/rgb values in utility classes.
- Forbidden: \`bg-[#FF0000]\`, \`text-[rgb(0,0,0)]\`, \`border-[#abc]\`
- Required: \`bg-red-500\`, \`text-black\`, \`border-gray-300\``);

  if (designSystem?.colors && Object.keys(designSystem.colors).length > 0) {
    lines.push('');
    lines.push('Project color tokens:');
    for (const [name, value] of Object.entries(designSystem.colors)) {
      lines.push(`  ${name}: ${value}`);
    }
  }

  lines.push(`
### 2. No Arbitrary Spacing
Use Tailwind's spacing scale, never hardcoded pixel/rem values.
- Forbidden: \`p-[13px]\`, \`m-[7px]\`, \`gap-[22px]\`
- Required: \`p-3\`, \`m-2\`, \`gap-5\``);

  if (designSystem?.spacing && Object.keys(designSystem.spacing).length > 0) {
    lines.push('');
    lines.push('Project spacing tokens:');
    for (const [name, value] of Object.entries(designSystem.spacing)) {
      lines.push(`  ${name}: ${value}`);
    }
  }

  lines.push(`
### 3. No Arbitrary Typography
Use Tailwind's type scale, never hardcoded font sizes or weights.
- Forbidden: \`text-[17px]\`, \`font-[450]\`, \`leading-[22px]\`
- Required: \`text-base\`, \`font-medium\`, \`leading-relaxed\``);

  if (designSystem?.fonts) {
    const fontEntries = Object.entries(designSystem.fonts).filter(([, v]) => v);
    if (fontEntries.length > 0) {
      lines.push('');
      lines.push('Project fonts:');
      for (const [name, value] of fontEntries) {
        lines.push(`  ${name}: ${value}`);
      }
    }
  }

  lines.push(`
### 4. Responsive Breakpoints Required
Fixed-width layout containers (>= 64px) must include responsive variants.
- Forbidden: \`<div class="w-[800px]">\` (no breakpoints)
- Required: \`<div class="w-[800px] sm:w-full md:w-auto">\`

### 5. Consistent Component Spacing
Same-type components must use identical spacing patterns within a file.
- Forbidden: \`<Card class="p-4">\` and \`<Card class="p-6">\` in the same file
- Required: All Card instances use \`p-4\`

## Validation

After modifying UI code, run:
\`\`\`bash
npx eslint --plugin vizlint .
\`\`\`

Fix all violations before considering the task complete.`);

  return lines.join('\n') + '\n';
}
