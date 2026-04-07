import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  safeParseConfig,
  importTailwindConfig,
  mergeDesignSystems,
  findW3CTokensFile,
  loadW3CTokensFile,
} from '@vizlint/shared';
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

  // Try W3C Design Tokens (DTCG) auto-import — .tokens.json / tokens.json
  let w3cDesignSystem: DesignSystem | undefined;
  try {
    const tokensFile = findW3CTokensFile(projectDir);
    if (tokensFile) {
      const parsed = loadW3CTokensFile(tokensFile, projectDir);
      w3cDesignSystem = parsed?.designSystem;
    }
  } catch {
    // Malformed tokens file — ignore, fall back to Tailwind/manual
  }

  // Merge priority (lowest → highest): Tailwind → W3C tokens → manual .vizlintrc.json
  const manual = config?.designSystem;
  let merged: DesignSystem | undefined;
  if (tailwindDesignSystem) merged = tailwindDesignSystem;
  if (w3cDesignSystem) {
    merged = merged ? mergeDesignSystems(merged, w3cDesignSystem) : w3cDesignSystem;
  }
  if (manual) {
    merged = merged ? mergeDesignSystems(merged, manual) : manual;
  }
  return merged;
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
