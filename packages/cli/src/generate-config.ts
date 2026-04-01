import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { safeParseConfig, importTailwindConfig, mergeDesignSystems } from '@vizlint/shared';
import type { DesignSystem, VizlintConfig } from '@vizlint/shared';
import { generateCursorRules } from './templates/cursorrules.js';
import { generateClaudeMd } from './templates/claude-md.js';
import { generateAgentsMd } from './templates/agents-md.js';

export type Target = 'cursor' | 'claude' | 'agents';

const VALID_TARGETS = new Set<Target>(['cursor', 'claude', 'agents']);

export function isValidTarget(target: string): target is Target {
  return VALID_TARGETS.has(target as Target);
}

/**
 * Load design system from .vizlintrc.json and/or Tailwind config.
 * Merges both sources (manual config overrides auto-imported).
 */
export async function loadDesignSystem(projectDir: string): Promise<DesignSystem | undefined> {
  let config: VizlintConfig | undefined;

  const configPath = resolve(projectDir, '.vizlintrc.json');
  if (existsSync(configPath)) {
    try {
      const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
      const result = safeParseConfig(raw);
      if (result.success) {
        config = result.data;
      }
    } catch {
      // Ignore parse errors — fall through to Tailwind auto-import
    }
  }

  // Try Tailwind auto-import
  let tailwindDesignSystem: DesignSystem | undefined;
  try {
    const imported = await importTailwindConfig(projectDir);
    tailwindDesignSystem = imported.designSystem;
  } catch {
    // No Tailwind config found — that's fine
  }

  // Merge: manual .vizlintrc.json overrides auto-imported Tailwind tokens
  const manual = config?.designSystem;

  if (manual && tailwindDesignSystem) {
    return mergeDesignSystems(tailwindDesignSystem, manual);
  }
  return manual ?? tailwindDesignSystem;
}

/**
 * Generate config content for the specified target.
 */
export function generateConfig(target: Target, designSystem?: DesignSystem): string {
  switch (target) {
    case 'cursor':
      return generateCursorRules(designSystem);
    case 'claude':
      return generateClaudeMd(designSystem);
    case 'agents':
      return generateAgentsMd(designSystem);
  }
}

/**
 * Get the default output filename for each target.
 */
export function getOutputFilename(target: Target): string {
  switch (target) {
    case 'cursor':
      return '.cursor/rules/vizlint-design-quality.mdc';
    case 'claude':
      return 'CLAUDE.md';
    case 'agents':
      return 'AGENTS.md';
  }
}
