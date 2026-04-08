import type { DesignSystem } from '@deslint/shared';

/**
 * Generate a CLAUDE.md design quality section.
 * Intended to be appended to or included in a project's CLAUDE.md file
 * so that Claude Code follows design system constraints.
 */
export function generateClaudeMd(designSystem?: DesignSystem): string {
  const lines: string[] = [];

  lines.push(`# Design Quality Rules — Deslint

## Design System Enforcement

When generating or modifying UI code, follow these constraints. After each code generation step, run \`npx eslint --plugin deslint .\` to validate.

### Checkpoint-Gated Workflow
1. Generate UI code following the rules below
2. Run \`npx eslint --plugin deslint .\` to check for violations
3. Fix any violations before proceeding
4. Repeat for each component or page

### Color Tokens Only
- NEVER use arbitrary hex colors: \`bg-[#FF0000]\`, \`text-[#333]\`
- ALWAYS use Tailwind design tokens: \`bg-red-500\`, \`text-gray-700\`
- If custom tokens exist in \`.deslintrc.json\` or \`tailwind.config.js\`, prefer those`);

  if (designSystem?.colors && Object.keys(designSystem.colors).length > 0) {
    lines.push('');
    lines.push('**Project color tokens:**');
    for (const [name, value] of Object.entries(designSystem.colors)) {
      lines.push(`- \`${name}\` = \`${value}\``);
    }
  }

  lines.push(`
### Spacing Scale Only
- NEVER use arbitrary spacing: \`p-[13px]\`, \`m-[7px]\`, \`gap-[22px]\`
- ALWAYS use Tailwind scale: \`p-3\`, \`m-2\`, \`gap-5\` (multiples of 4px)`);

  if (designSystem?.spacing && Object.keys(designSystem.spacing).length > 0) {
    lines.push('');
    lines.push('**Project spacing tokens:**');
    for (const [name, value] of Object.entries(designSystem.spacing)) {
      lines.push(`- \`${name}\` = \`${value}\``);
    }
  }

  lines.push(`
### Typography Scale Only
- NEVER use arbitrary font sizes: \`text-[17px]\`, \`font-[450]\`
- ALWAYS use Tailwind typography: \`text-base\`, \`font-medium\`, \`leading-relaxed\``);

  if (designSystem?.fonts) {
    const fontEntries = Object.entries(designSystem.fonts).filter(([, v]) => v);
    if (fontEntries.length > 0) {
      lines.push('');
      lines.push('**Project fonts:**');
      for (const [name, value] of fontEntries) {
        lines.push(`- ${name}: \`${value}\``);
      }
    }
  }

  lines.push(`
### Responsive Design Required
- Every layout container with fixed width (>= 64px) MUST have responsive breakpoints
- Include at least \`sm:\` and \`md:\` variants: \`w-[800px] sm:w-full md:w-auto\`

### Consistent Component Spacing
- All instances of the same component type must use identical spacing
- Example: all \`<Card>\` components should use the same padding value

### Validation
After generating code, always verify:
\`\`\`bash
npx eslint --plugin deslint .
\`\`\``);

  return lines.join('\n') + '\n';
}
