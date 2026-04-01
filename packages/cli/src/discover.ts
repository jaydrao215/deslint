import { glob } from 'glob';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** Default file extensions Vizlint scans */
const DEFAULT_EXTENSIONS = ['tsx', 'jsx', 'vue', 'svelte', 'html'];

/** Default ignore patterns */
const DEFAULT_IGNORE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/.nuxt/**',
  '**/coverage/**',
  '**/*.min.*',
];

export interface DiscoverOptions {
  /** Project root directory */
  cwd: string;
  /** File extensions to scan (default: tsx, jsx, vue, svelte, html) */
  extensions?: string[];
  /** Additional ignore patterns from .vizlintrc.json */
  ignorePatterns?: string[];
}

/**
 * Discover all frontend files in a project that Vizlint should scan.
 * Respects ignore patterns from config and .vizlintignore.
 */
export async function discoverFiles(options: DiscoverOptions): Promise<string[]> {
  const extensions = options.extensions ?? DEFAULT_EXTENSIONS;
  const extGlob = extensions.length === 1
    ? `**/*.${extensions[0]}`
    : `**/*.{${extensions.join(',')}}`;

  // Merge ignore sources
  const ignore = [...DEFAULT_IGNORE];

  // Add config ignore patterns
  if (options.ignorePatterns) {
    ignore.push(...options.ignorePatterns);
  }

  // Add .vizlintignore file patterns
  const ignorePath = resolve(options.cwd, '.vizlintignore');
  if (existsSync(ignorePath)) {
    const lines = readFileSync(ignorePath, 'utf-8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));
    ignore.push(...lines);
  }

  const files = await glob(extGlob, {
    cwd: options.cwd,
    absolute: true,
    ignore,
  });

  return files.sort();
}
