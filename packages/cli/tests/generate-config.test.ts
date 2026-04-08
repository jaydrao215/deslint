import { describe, it, expect } from 'vitest';
import {
  generateConfig,
  isValidTarget,
  getOutputFilename,
} from '../src/generate-config.js';
import { generateCursorRules } from '../src/templates/cursorrules.js';
import { generateClaudeMd } from '../src/templates/claude-md.js';
import { generateAgentsMd } from '../src/templates/agents-md.js';
import type { DesignSystem } from '@deslint/shared';

describe('isValidTarget', () => {
  it('accepts valid targets', () => {
    expect(isValidTarget('cursor')).toBe(true);
    expect(isValidTarget('claude')).toBe(true);
    expect(isValidTarget('agents')).toBe(true);
  });

  it('rejects invalid targets', () => {
    expect(isValidTarget('invalid')).toBe(false);
    expect(isValidTarget('')).toBe(false);
    expect(isValidTarget('copilot')).toBe(false);
  });
});

describe('getOutputFilename', () => {
  it('returns correct filenames', () => {
    expect(getOutputFilename('cursor')).toBe('.cursor/rules/deslint-design-quality.mdc');
    expect(getOutputFilename('claude')).toBe('CLAUDE.md');
    expect(getOutputFilename('agents')).toBe('AGENTS.md');
  });
});

describe('generateConfig', () => {
  it('delegates to correct template generator', () => {
    const cursorOutput = generateConfig('cursor');
    expect(cursorOutput).toContain('Design Quality Rules');
    expect(cursorOutput).toContain('alwaysApply: true');

    const claudeOutput = generateConfig('claude');
    expect(claudeOutput).toContain('Checkpoint-Gated Workflow');

    const agentsOutput = generateConfig('agents');
    expect(agentsOutput).toContain('Design Quality Agent Rules');
  });
});

describe('generateCursorRules', () => {
  it('generates valid .mdc file without design system', () => {
    const output = generateCursorRules();
    expect(output).toContain('---');
    expect(output).toContain('description: Design quality rules');
    expect(output).toContain('globs:');
    expect(output).toContain('## Color Tokens Only');
    expect(output).toContain('## Spacing Scale Only');
    expect(output).toContain('## Typography Scale Only');
    expect(output).toContain('## Responsive Design Required');
    expect(output).toContain('## Consistent Component Spacing');
    expect(output).toContain('npm install -D @deslint/eslint-plugin');
  });

  it('includes custom color tokens when provided', () => {
    const ds: DesignSystem = {
      colors: { 'brand-navy': '#1E3A5F', 'brand-gold': '#FFD700' },
    };
    const output = generateCursorRules(ds);
    expect(output).toContain('### Project Color Tokens');
    expect(output).toContain('`brand-navy`: `#1E3A5F`');
    expect(output).toContain('`brand-gold`: `#FFD700`');
  });

  it('includes custom spacing tokens when provided', () => {
    const ds: DesignSystem = {
      spacing: { sm: '0.5rem', md: '1rem' },
    };
    const output = generateCursorRules(ds);
    expect(output).toContain('### Project Spacing Tokens');
    expect(output).toContain('`sm`: `0.5rem`');
  });

  it('includes custom fonts when provided', () => {
    const ds: DesignSystem = {
      fonts: { body: 'Inter', heading: 'DM Sans' },
    };
    const output = generateCursorRules(ds);
    expect(output).toContain('### Project Fonts');
    expect(output).toContain('body: `Inter`');
    expect(output).toContain('heading: `DM Sans`');
  });

  it('omits sections when design system fields are empty', () => {
    const ds: DesignSystem = { colors: {} };
    const output = generateCursorRules(ds);
    expect(output).not.toContain('### Project Color Tokens');
  });
});

describe('generateClaudeMd', () => {
  it('generates valid CLAUDE.md content without design system', () => {
    const output = generateClaudeMd();
    expect(output).toContain('# Design Quality Rules');
    expect(output).toContain('### Checkpoint-Gated Workflow');
    expect(output).toContain('### Color Tokens Only');
    expect(output).toContain('### Spacing Scale Only');
    expect(output).toContain('### Typography Scale Only');
    expect(output).toContain('### Responsive Design Required');
    expect(output).toContain('### Consistent Component Spacing');
    expect(output).toContain('npx eslint --plugin deslint');
  });

  it('includes project color tokens', () => {
    const ds: DesignSystem = {
      colors: { primary: '#1A5276' },
    };
    const output = generateClaudeMd(ds);
    expect(output).toContain('**Project color tokens:**');
    expect(output).toContain('`primary` = `#1A5276`');
  });

  it('includes project spacing tokens', () => {
    const ds: DesignSystem = {
      spacing: { lg: '2rem' },
    };
    const output = generateClaudeMd(ds);
    expect(output).toContain('**Project spacing tokens:**');
    expect(output).toContain('`lg` = `2rem`');
  });

  it('includes project fonts', () => {
    const ds: DesignSystem = {
      fonts: { mono: 'JetBrains Mono' },
    };
    const output = generateClaudeMd(ds);
    expect(output).toContain('**Project fonts:**');
    expect(output).toContain('mono: `JetBrains Mono`');
  });
});

describe('generateAgentsMd', () => {
  it('generates valid AGENTS.md content without design system', () => {
    const output = generateAgentsMd();
    expect(output).toContain('# Design Quality Agent Rules');
    expect(output).toContain('### 1. No Arbitrary Colors');
    expect(output).toContain('### 2. No Arbitrary Spacing');
    expect(output).toContain('### 3. No Arbitrary Typography');
    expect(output).toContain('### 4. Responsive Breakpoints Required');
    expect(output).toContain('### 5. Consistent Component Spacing');
    expect(output).toContain('npx eslint --plugin deslint');
  });

  it('includes project color tokens', () => {
    const ds: DesignSystem = {
      colors: { error: '#E74C3C', success: '#27AE60' },
    };
    const output = generateAgentsMd(ds);
    expect(output).toContain('Project color tokens:');
    expect(output).toContain('error: #E74C3C');
    expect(output).toContain('success: #27AE60');
  });

  it('includes project spacing tokens', () => {
    const ds: DesignSystem = {
      spacing: { xs: '0.25rem' },
    };
    const output = generateAgentsMd(ds);
    expect(output).toContain('Project spacing tokens:');
    expect(output).toContain('xs: 0.25rem');
  });

  it('includes project fonts', () => {
    const ds: DesignSystem = {
      fonts: { body: 'Inter', heading: 'DM Sans' },
    };
    const output = generateAgentsMd(ds);
    expect(output).toContain('Project fonts:');
    expect(output).toContain('body: Inter');
    expect(output).toContain('heading: DM Sans');
  });

  it('all three templates cover all 5 Deslint rules', () => {
    const cursor = generateCursorRules();
    const claude = generateClaudeMd();
    const agents = generateAgentsMd();

    for (const output of [cursor, claude, agents]) {
      // Each template must reference all 5 rule concepts
      expect(output).toMatch(/color/i);
      expect(output).toMatch(/spacing/i);
      expect(output).toMatch(/typography|font/i);
      expect(output).toMatch(/responsive/i);
      expect(output).toMatch(/consistent.*spacing|component.*spacing/i);
    }
  });

  it('all three templates include validation command', () => {
    const cursor = generateCursorRules();
    const claude = generateClaudeMd();
    const agents = generateAgentsMd();

    for (const output of [cursor, claude, agents]) {
      expect(output).toContain('eslint --plugin deslint');
    }
  });
});
