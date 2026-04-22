import { glob } from 'glob';
import { readFileSync, existsSync, statSync, lstatSync } from 'node:fs';
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
    // Glob's `follow: false` prevents traversal through symlinked
    // directories, but still returns file-level symlinks whose
    // basename matches the extension pattern. The real containment
    // happens in the lstat check below — we drop any path that is
    // itself a symlink so the parser never reads through it.
    follow: false,
  });

  // Filter at discovery time:
  //   1. Symlinks — dropped entirely. A symlink whose target lives
  //      outside the project tree would otherwise be read by the
  //      parser (parse error on a non-source file, or — worse — a
  //      successful read of a file the project author never
  //      committed).
  //   2. Oversized files — skipped with a visible stderr notice so
  //      the ESLint parse pass never buffers a file large enough to
  //      exhaust heap (a single adversarial .tsx of a few MB with
  //      hundreds of thousands of tokens can crash the scanner).
  const safe: string[] = [];
  for (const file of files) {
    try {
      const ls = lstatSync(file);
      if (ls.isSymbolicLink()) {
        continue;
      }
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
