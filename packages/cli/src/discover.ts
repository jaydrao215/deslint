import { glob } from 'glob';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

/** Default file extensions Deslint scans */
const DEFAULT_EXTENSIONS = ['tsx', 'jsx', 'vue', 'svelte', 'html'];

/** Skip files larger than this during discovery. ESLint loads each
 *  file fully into memory AND generates an AST whose footprint can
 *  be 10-20× the source size. A single adversarial 6 MB `.tsx` with
 *  hundreds of thousands of class tokens crashed the scanner with
 *  SIGABRT at ~30 s. 2 MB is already generous for a real handwritten
 *  source file (the largest file in the React repo is ~800 KB); a
 *  generated i18n bundle or similar should be on .deslintignore
 *  rather than fed through the design-linter. Users who really want
 *  to scan larger files can work around this by widening the cap in
 *  `.deslintrc.json`'s ignorePatterns and accepting the risk. */
const MAX_SCANNABLE_BYTES = 2 * 1024 * 1024;

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
  /** Additional ignore patterns from .deslintrc.json */
  ignorePatterns?: string[];
}

/**
 * Discover all frontend files in a project that Deslint should scan.
 * Respects ignore patterns from config and .deslintignore.
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

  // Add .deslintignore file patterns
  const ignorePath = resolve(options.cwd, '.deslintignore');
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
    // Don't follow symlinks out of the project tree. A symlink
    // pointing at `/etc/passwd` (or any file outside the repo) would
    // otherwise be fed to the parser — the lint attempt produces a
    // parse error, but the symlink resolution itself is an unintended
    // read of a file the user didn't author.
    follow: false,
  });

  // Filter oversized files at discovery time so the lint pass never
  // tries to buffer them. Announced to the user on stderr so they
  // know why their giant generated file disappeared from the report.
  const safe: string[] = [];
  for (const file of files) {
    try {
      const size = statSync(file).size;
      if (size > MAX_SCANNABLE_BYTES) {
        process.stderr.write(
          `  Skipping ${file} (${(size / 1024 / 1024).toFixed(1)} MB exceeds ` +
            `${MAX_SCANNABLE_BYTES / 1024 / 1024} MB cap). Add an ignore ` +
            `pattern in .deslintrc.json if you want to silence this notice.\n`,
        );
        continue;
      }
    } catch {
      // Unreadable (permission / race / stale symlink) — just skip.
      continue;
    }
    safe.push(file);
  }

  return safe.sort();
}
