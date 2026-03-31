import { readFile, access } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import type { DesignSystem } from '../config-schema.js';
import { parseV3Config } from './parse-v3-config.js';
import { parseV4Theme } from './parse-v4-theme.js';
import { parseCssVars } from './parse-css-vars.js';
import { mergeDesignSystems } from './merge.js';

/** Tailwind v3 config file names to search for (in priority order). */
const V3_CONFIG_FILES = [
  'tailwind.config.ts',
  'tailwind.config.js',
  'tailwind.config.mjs',
  'tailwind.config.cjs',
];

/** CSS files that may contain @theme or :root tokens. */
const CSS_ENTRY_FILES = [
  'app/globals.css',
  'src/app/globals.css',
  'src/index.css',
  'src/styles/globals.css',
  'styles/globals.css',
  'global.css',
  'index.css',
];

export interface ImportResult {
  /** The extracted design system tokens. */
  designSystem: DesignSystem;
  /** Which sources contributed tokens. */
  sources: Array<'tailwind-v3' | 'tailwind-v4-theme' | 'css-vars'>;
  /** Absolute paths of files that were read. */
  files: string[];
}

/**
 * Auto-detect and import a Tailwind design system from the project at `projectRoot`.
 *
 * Strategy (all sources are merged, later sources override earlier):
 * 1. Try to read a Tailwind v3 config file (JS/TS)
 * 2. Try to find @theme blocks in CSS files (Tailwind v4)
 * 3. Try to find :root CSS custom properties as fallback
 *
 * Returns an empty designSystem gracefully if nothing is found.
 */
export async function importTailwindConfig(projectRoot: string): Promise<ImportResult> {
  const root = resolve(projectRoot);
  let designSystem: DesignSystem = {};
  const sources: ImportResult['sources'] = [];
  const files: string[] = [];

  // ── 1. Tailwind v3 config ──────────────────────────────────────────
  const v3Result = await tryReadV3Config(root);
  if (v3Result) {
    designSystem = mergeDesignSystems(designSystem, v3Result.designSystem);
    sources.push('tailwind-v3');
    files.push(v3Result.file);
  }

  // ── 2. CSS files: @theme (v4) and :root (fallback) ─────────────────
  for (const relPath of CSS_ENTRY_FILES) {
    const cssPath = join(root, relPath);
    const css = await tryReadFile(cssPath);
    if (css === null) continue;

    const themeDs = parseV4Theme(css);
    if (hasTokens(themeDs)) {
      designSystem = mergeDesignSystems(designSystem, themeDs);
      if (!sources.includes('tailwind-v4-theme')) sources.push('tailwind-v4-theme');
      if (!files.includes(cssPath)) files.push(cssPath);
    }

    const varsDs = parseCssVars(css);
    if (hasTokens(varsDs)) {
      designSystem = mergeDesignSystems(designSystem, varsDs);
      if (!sources.includes('css-vars')) sources.push('css-vars');
      if (!files.includes(cssPath)) files.push(cssPath);
    }
  }

  return { designSystem, sources, files };
}

async function tryReadV3Config(
  root: string,
): Promise<{ designSystem: DesignSystem; file: string } | null> {
  for (const fileName of V3_CONFIG_FILES) {
    const filePath = join(root, fileName);
    if (!(await fileExists(filePath))) continue;

    try {
      // Dynamic import to handle JS/TS config files.
      // For TS files, the project's loader (tsx, ts-node) must be active.
      const mod = await import(filePath);
      const config = mod.default ?? mod;
      if (typeof config === 'object' && config !== null) {
        return { designSystem: parseV3Config(config), file: filePath };
      }
    } catch {
      // Config couldn't be loaded (missing deps, syntax error, etc.)
      // Fall through to CSS-based detection.
      continue;
    }
  }
  return null;
}

async function tryReadFile(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function hasTokens(ds: DesignSystem): boolean {
  return !!(ds.colors || ds.fonts || ds.spacing || ds.borderRadius);
}
