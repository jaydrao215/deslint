#!/usr/bin/env node

/**
 * @vizlint/cli — Design quality analysis CLI.
 * Implements: vizlint scan, vizlint fix, vizlint init (Sprint 5 — VIZ-012)
 * Implements: vizlint generate-config (Sprint 4 — VIZ-010B)
 */

export const VERSION = '0.1.0';

export {
  generateConfig,
  loadDesignSystem,
  getOutputFilename,
  isValidTarget,
} from './generate-config.js';

export type { Target } from './generate-config.js';

export {
  generateCursorRules,
  generateClaudeMd,
  generateAgentsMd,
} from './templates/index.js';
