/**
 * `deslint import-tokens --figma <file-id>`
 *
 * Pulls Variables from a Figma file (read-only API) and writes them
 * to disk as a W3C DTCG tokens document that the rest of Deslint
 * already understands. The transform itself lives in
 * `@deslint/shared/tokens/figma` — this module is the I/O + CLI shell
 * around it.
 *
 * Scope (sprint 12 cap): read-only Variables API only. We call
 *   GET https://api.figma.com/v1/files/{fileKey}/variables/local
 * and nothing else. No write endpoints, no OAuth flow, no team
 * library walks. Users authenticate with a personal access token
 * (https://help.figma.com/hc/en-us/articles/8085703771159) that
 * grants read-only file access.
 *
 * Privacy: the token is read once from env or argv, sent in the
 * `X-Figma-Token` header, and never logged or persisted. We print a
 * single-line "fetching from Figma…" notice before the network call
 * so the action is visible, matching the local-first positioning.
 */

import {
  writeFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  existsSync,
} from 'node:fs';
import { resolve, dirname, relative, isAbsolute, join } from 'node:path';
import chalk from 'chalk';
import {
  figmaVariablesToDTCG,
  parseW3CTokens,
  styleDictionaryToDTCG,
  stitchTokensToDTCG,
  type FigmaVariablesResponse,
  type FigmaTransformResult,
  type StyleDictionaryTransformResult,
  type StitchTransformResult,
} from '@deslint/shared';

export interface ImportTokensOptions {
  /** Figma file key (the part of the URL after /file/ or /design/). */
  figma: string;
  /** Personal access token. Falls back to FIGMA_TOKEN env var. */
  token?: string;
  /** Mode name to prefer (e.g. "Light", "Dark"). Case-insensitive. */
  mode?: string;
  /** Output file path. Defaults to ./tokens.json. */
  output?: string;
  /** Output format. `dtcg` = W3C tokens JSON; `deslintrc` = .deslintrc.json fragment. */
  format?: 'dtcg' | 'deslintrc';
  /**
   * Include variables flagged `hiddenFromPublishing`. Default: false
   * (hidden work-in-progress tokens are excluded, matching the Figma UI).
   */
  includeHidden?: boolean;
  /** Override the working directory (for tests). */
  cwd?: string;
  /** Override the fetch implementation (for tests). */
  fetchImpl?: typeof fetch;
}

/** Result of a successful import, returned so tests can inspect it. */
export interface ImportTokensResult {
  outputPath: string;
  transform: FigmaTransformResult;
}

/**
 * Thin error type so the CLI can translate known failure modes into
 * friendly messages without parsing strings.
 */
export class ImportTokensError extends Error {
  constructor(
    message: string,
    public code:
      | 'missing_token'
      | 'invalid_file_key'
      | 'http_forbidden'
      | 'http_not_found'
      | 'http_rate_limited'
      | 'http_other'
      | 'network_error'
      | 'invalid_response'
      | 'no_variables'
      | 'source_not_found'
      | 'source_not_json'
      | 'source_empty'
      | 'source_invalid_shape',
  ) {
    super(message);
    this.name = 'ImportTokensError';
  }
}

/** Only allow [A-Za-z0-9-_] in a Figma file key. */
const FILE_KEY_REGEX = /^[A-Za-z0-9_-]+$/;

export async function importTokens(
  options: ImportTokensOptions,
): Promise<ImportTokensResult> {
  const cwd = options.cwd ?? process.cwd();
  const format = options.format ?? 'dtcg';
  const outputPath = resolve(cwd, options.output ?? 'tokens.json');

  // 1. Validate inputs so we fail loudly *before* doing any network I/O.
  if (!options.figma || !FILE_KEY_REGEX.test(options.figma)) {
    throw new ImportTokensError(
      'Invalid --figma file key. Expected the portion of the Figma URL after /file/ or /design/, e.g. "abc123XYZ".',
      'invalid_file_key',
    );
  }

  // `||` rather than `??` so an empty-string --token (e.g. from a shell
  // alias with an unset variable) falls through to the env var.
  const token = options.token || process.env.FIGMA_TOKEN;
  if (!token) {
    throw new ImportTokensError(
      'Missing Figma token. Pass --token or set the FIGMA_TOKEN environment variable. Create a read-only personal access token at https://help.figma.com/hc/en-us/articles/8085703771159',
      'missing_token',
    );
  }

  // 2. Fetch. Three retries on transient 5xx, with linear backoff.
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new ImportTokensError(
      'No global fetch available. Deslint requires Node 18+.',
      'network_error',
    );
  }

  const url = `https://api.figma.com/v1/files/${encodeURIComponent(
    options.figma,
  )}/variables/local`;

  const response = await fetchWithRetry(fetchImpl, url, token);
  const raw = (await safeJson(response)) as FigmaVariablesResponse;

  // 3. Transform.
  const transform = figmaVariablesToDTCG(raw, {
    mode: options.mode,
    excludeHidden: !options.includeHidden,
  });

  if (transform.tokenCount === 0) {
    throw new ImportTokensError(
      'Figma file contains no importable Variables. Check that the file uses local Variables (not styles), that your token has access, and that at least one variable is not hidden from publishing.',
      'no_variables',
    );
  }

  // 4. Emit.
  const serialized =
    format === 'deslintrc'
      ? toDeslintRcFragment(transform)
      : JSON.stringify(transform.dtcg, null, 2) + '\n';

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, serialized, 'utf-8');

  return { outputPath, transform };
}

// ── HTTP helpers ─────────────────────────────────────────────────────

async function fetchWithRetry(
  fetchImpl: typeof fetch,
  url: string,
  token: string,
): Promise<Response> {
  const MAX_ATTEMPTS = 3;
  let lastNetworkError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res: Response;
    try {
      res = await fetchImpl(url, {
        method: 'GET',
        headers: {
          'X-Figma-Token': token,
          accept: 'application/json',
        },
      });
    } catch (err) {
      // True network-layer failure (DNS, TCP reset, abort). Retry.
      // We deliberately DON'T interpolate err.message into the user-
      // facing error — fetch error messages can include the full URL
      // (and in some runtimes the request headers), and we'd rather
      // not surface the Figma token by accident. Callers who need the
      // underlying cause can inspect `Error.cause`.
      lastNetworkError = err;
      if (attempt === MAX_ATTEMPTS) {
        throw new ImportTokensError(
          `Figma API request failed after ${MAX_ATTEMPTS} attempts (network error). Check your connection and try again.`,
          'network_error',
        );
      }
      await sleep(500 * attempt);
      continue;
    }

    if (res.ok) return res;

    // 4xx (except 429): non-retryable. Translate into typed errors.
    if (res.status === 403) {
      throw new ImportTokensError(
        "Figma returned 403. Your token doesn't have access to this file, or the token is invalid.",
        'http_forbidden',
      );
    }
    if (res.status === 404) {
      throw new ImportTokensError(
        'Figma returned 404. File not found, or your token is scoped to a different team.',
        'http_not_found',
      );
    }
    if (res.status >= 400 && res.status < 500 && res.status !== 429) {
      throw new ImportTokensError(
        `Figma API returned HTTP ${res.status}.`,
        'http_other',
      );
    }

    // 429 / 5xx: retry on all but the last attempt.
    if (attempt === MAX_ATTEMPTS) {
      if (res.status === 429) {
        throw new ImportTokensError(
          'Figma API rate-limited the request (429). Try again in a minute.',
          'http_rate_limited',
        );
      }
      throw new ImportTokensError(
        `Figma API returned HTTP ${res.status}.`,
        'http_other',
      );
    }

    await sleep(500 * attempt);
  }

  // Unreachable: the loop either returns on res.ok or throws on final
  // attempt. Kept as a safety throw for the typechecker.
  void lastNetworkError;
  throw new ImportTokensError(
    `Figma API request failed after ${MAX_ATTEMPTS} attempts (network error).`,
    'network_error',
  );
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new ImportTokensError(
      "Figma response was not valid JSON. This usually means the endpoint is unavailable or the token is being rejected by an upstream proxy.",
      'invalid_response',
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Output formatting ────────────────────────────────────────────────

/**
 * Emit a `.deslintrc.json`-compatible fragment wrapping the parsed
 * DesignSystem under the `designSystem` key. Users can merge this
 * into their existing `.deslintrc.json` by hand, or pipe it in.
 */
function toDeslintRcFragment(
  transform:
    | FigmaTransformResult
    | StyleDictionaryTransformResult
    | StitchTransformResult,
): string {
  const parsed = parseW3CTokens(transform.dtcg);
  const fragment = {
    // We deliberately don't emit any other config keys — the user's
    // existing .deslintrc.json is the source of truth for rules,
    // severity profiles, and quality gates. This is just tokens.
    designSystem: parsed.designSystem,
  };
  return JSON.stringify(fragment, null, 2) + '\n';
}

/**
 * Print an install-to-value summary after a successful import: count
 * the tokens per DesignSystem bucket and tell the user which rules now
 * enforce those tokens, plus the literal next command to run. The goal
 * is that a first-time user never has to read the docs to know what
 * they just unlocked.
 *
 * `format === 'deslintrc'` means the output file is ready to merge;
 * DTCG needs one more step (the user points their `.deslintrc.json` at
 * the tokens file, or re-runs with `--format deslintrc`).
 */
function printPostImportSummary(
  transform:
    | FigmaTransformResult
    | StyleDictionaryTransformResult
    | StitchTransformResult,
  outputDisplay: string,
  format: 'dtcg' | 'deslintrc',
): void {
  const ds = parseW3CTokens(transform.dtcg).designSystem;
  const rows: { label: string; count: number; rules: string[] }[] = [];

  const colorCount = Object.keys(ds.colors ?? {}).length;
  if (colorCount > 0) {
    rows.push({
      label: 'colors',
      count: colorCount,
      rules: ['no-arbitrary-colors', 'no-legacy-color', 'consistent-color-semantics'],
    });
  }
  const spacingCount = Object.keys(ds.spacing ?? {}).length;
  if (spacingCount > 0) {
    rows.push({
      label: 'spacing',
      count: spacingCount,
      rules: ['no-arbitrary-spacing', 'consistent-component-spacing'],
    });
  }
  const radiusCount = Object.keys(ds.borderRadius ?? {}).length;
  if (radiusCount > 0) {
    rows.push({
      label: 'radii',
      count: radiusCount,
      rules: ['no-arbitrary-border-radius', 'consistent-border-radius'],
    });
  }
  const fontCount = Object.keys(ds.fonts ?? {}).length;
  if (fontCount > 0) {
    rows.push({
      label: 'fonts',
      count: fontCount,
      rules: ['no-arbitrary-font-family'],
    });
  }
  const typography = ds.typography ?? {};
  const typeCount =
    Object.keys(typography.fontSize ?? {}).length +
    Object.keys(typography.fontWeight ?? {}).length +
    Object.keys(typography.leading ?? {}).length +
    Object.keys(typography.tracking ?? {}).length;
  if (typeCount > 0) {
    rows.push({
      label: 'typography',
      count: typeCount,
      rules: ['no-arbitrary-typography'],
    });
  }

  if (rows.length === 0) return;

  console.log('');
  console.log(chalk.bold('  Your design system is ready:'));
  const pad = Math.max(...rows.map((r) => String(r.count).length));
  for (const r of rows) {
    const n = String(r.count).padStart(pad);
    console.log(
      `    ${chalk.cyan(n)} ${r.label.padEnd(11)} ${chalk.gray('→ ' + r.rules.join(', '))}`,
    );
  }

  console.log('');
  console.log(chalk.bold('  Next:'));
  if (format === 'deslintrc') {
    console.log(
      chalk.gray(`    1. Merge ${outputDisplay} into your .deslintrc.json`),
    );
    console.log(chalk.gray('    2. Run `npx deslint scan` to see drift'));
  } else {
    console.log(
      chalk.gray(
        `    1. Re-run with \`--format deslintrc\` to emit a .deslintrc fragment, or`,
      ),
    );
    console.log(
      chalk.gray(
        `       point your .deslintrc.json \`designSystem\` at ${outputDisplay}`,
      ),
    );
    console.log(chalk.gray('    2. Run `npx deslint scan` to see drift'));
  }
  console.log('');
}

// ── CLI action ───────────────────────────────────────────────────────

/**
 * CLI-facing wrapper. Handles friendly console output + exit codes.
 * Separated from `importTokens` so the pure function stays testable.
 */
export async function runImportTokens(
  options: ImportTokensOptions,
): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  // Visible action notice — matches the local-first trust positioning.
  console.log(
    chalk.gray('  Fetching Variables from Figma (read-only)…'),
  );

  try {
    const result = await importTokens(options);

    const collections =
      result.transform.collectionsSeen.length > 0
        ? ` from ${result.transform.collectionsSeen.length} collection(s): ${result.transform.collectionsSeen.join(', ')}`
        : '';
    console.log(
      chalk.green(
        `  ✓ Imported ${result.transform.tokenCount} token(s)${collections}`,
      ),
    );
    if (result.transform.skipped.length > 0) {
      console.log(
        chalk.gray(
          `  ${result.transform.skipped.length} variable(s) skipped (unsupported type, hidden, or remote).`,
        ),
      );
      // Print up to 5 examples so users can debug without noise.
      const preview = result.transform.skipped.slice(0, 5);
      for (const s of preview) {
        console.log(chalk.gray(`    - ${s.name} (${s.reason})`));
      }
      if (result.transform.skipped.length > preview.length) {
        console.log(
          chalk.gray(
            `    … and ${result.transform.skipped.length - preview.length} more`,
          ),
        );
      }
    }
    // Use a relative path in the success message for readability,
    // but keep the absolute path when the output sits outside cwd
    // (where `relative()` would start with ../). Works on Windows too.
    const relPath = relative(cwd, result.outputPath);
    const display =
      relPath && !relPath.startsWith('..') && !isAbsolute(relPath)
        ? relPath
        : result.outputPath;
    console.log(chalk.green(`  ✓ Wrote ${display}`));
    printPostImportSummary(
      result.transform,
      display,
      (options.format ?? 'dtcg') as 'dtcg' | 'deslintrc',
    );
  } catch (err) {
    if (err instanceof ImportTokensError) {
      console.error(chalk.red(`  Error: ${err.message}`));
    } else {
      console.error(
        chalk.red(
          `  Error: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────
// Style Dictionary importer
// ─────────────────────────────────────────────────────────────────────

/**
 * `deslint import-tokens --style-dictionary <path>`
 *
 * Reads a Style Dictionary token source — either a single JSON file or
 * a directory of JSON files — and writes the equivalent W3C DTCG
 * document (or `.deslintrc.json` fragment) to disk.
 *
 * Style Dictionary is the most widely adopted token format in the
 * wild; matching it removes a whole class of "my tokens are in Style
 * Dictionary, not DTCG" adoption blockers. The transform itself lives
 * in `@deslint/shared/tokens/style-dictionary` — this module is the
 * file-I/O + CLI shell around it.
 *
 * Local-only: no network, no telemetry, identical privacy stance to
 * the Figma path.
 */

export interface ImportStyleDictionaryOptions {
  /** Path to a Style Dictionary JSON file, or a directory of them. */
  source: string;
  /** Output file path. Defaults to ./tokens.json. */
  output?: string;
  /** Output format. `dtcg` = W3C tokens JSON; `deslintrc` = fragment. */
  format?: 'dtcg' | 'deslintrc';
  /**
   * Normalise legacy type labels (`size`, `spacing`, `border-radius`,
   * etc.) to DTCG types. Defaults to true.
   */
  normalizeTypes?: boolean;
  /** Override the working directory (for tests). */
  cwd?: string;
}

export interface ImportStyleDictionaryResult {
  outputPath: string;
  transform: StyleDictionaryTransformResult;
  /** Absolute paths of the files that were merged. */
  filesRead: string[];
}

export function importStyleDictionary(
  options: ImportStyleDictionaryOptions,
): ImportStyleDictionaryResult {
  const cwd = options.cwd ?? process.cwd();
  const format = options.format ?? 'dtcg';
  const outputPath = resolve(cwd, options.output ?? 'tokens.json');
  const sourcePath = resolve(cwd, options.source);

  // 1. Load the source. A directory is merged in breadth-first, then
  //    alphabetical order so the output is deterministic — two runs
  //    against the same directory produce byte-identical output.
  if (!existsSync(sourcePath)) {
    throw new ImportTokensError(
      `Style Dictionary source not found: ${options.source}`,
      'source_not_found',
    );
  }

  const filesRead: string[] = [];
  let merged: Record<string, unknown> = {};
  const st = statSync(sourcePath);
  if (st.isDirectory()) {
    for (const file of collectJsonFiles(sourcePath)) {
      merged = deepMerge(merged, readJsonFile(file));
      filesRead.push(file);
    }
    if (filesRead.length === 0) {
      throw new ImportTokensError(
        `No JSON files found under ${options.source}.`,
        'source_empty',
      );
    }
  } else {
    merged = readJsonFile(sourcePath);
    filesRead.push(sourcePath);
  }

  if (!merged || typeof merged !== 'object' || Array.isArray(merged)) {
    throw new ImportTokensError(
      `Style Dictionary source must be a JSON object at the top level.`,
      'source_invalid_shape',
    );
  }

  // 2. Transform to DTCG.
  const transform = styleDictionaryToDTCG(merged, {
    normalizeTypes: options.normalizeTypes,
  });

  if (transform.tokenCount === 0) {
    throw new ImportTokensError(
      'No tokens found in the Style Dictionary source. Confirm the file(s) contain leaves with `value` or `$value`.',
      'no_variables',
    );
  }

  // 3. Emit.
  const serialized =
    format === 'deslintrc'
      ? toDeslintRcFragment(transform)
      : JSON.stringify(transform.dtcg, null, 2) + '\n';

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, serialized, 'utf-8');

  return { outputPath, transform, filesRead };
}

function readJsonFile(path: string): Record<string, unknown> {
  let contents: string;
  try {
    contents = readFileSync(path, 'utf-8');
  } catch (err) {
    throw new ImportTokensError(
      `Could not read ${path}: ${err instanceof Error ? err.message : String(err)}`,
      'source_not_found',
    );
  }
  try {
    const parsed = JSON.parse(contents);
    if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new ImportTokensError(
        `${path}: expected a JSON object at the top level.`,
        'source_invalid_shape',
      );
    }
    return parsed as Record<string, unknown>;
  } catch (err) {
    if (err instanceof ImportTokensError) throw err;
    throw new ImportTokensError(
      `${path}: not valid JSON (${err instanceof Error ? err.message : String(err)}).`,
      'source_not_json',
    );
  }
}

/**
 * Recursively enumerate every `.json` file under `dir`. Sorted so a
 * directory import is deterministic run-to-run. We intentionally skip
 * dotfiles, `node_modules`, and the build artefact dirs Style
 * Dictionary consumers commonly ship (`build`, `dist`) so imports
 * against a real repo don't accidentally pull in an already-built
 * copy of the tokens.
 */
function collectJsonFiles(dir: string): string[] {
  const out: string[] = [];
  const stack: string[] = [dir];
  while (stack.length > 0) {
    const current = stack.pop()!;
    const entries = readdirSync(current, { withFileTypes: true }).sort(
      (a, b) => a.name.localeCompare(b.name),
    );
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      if (
        entry.name === 'node_modules' ||
        entry.name === 'build' ||
        entry.name === 'dist'
      ) {
        continue;
      }
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
        out.push(full);
      }
    }
  }
  return out.sort();
}

/**
 * Deep-merge two plain objects. Later values override earlier ones at
 * the same path, except when both sides are objects — in which case we
 * recurse. Arrays and primitives are replaced whole (Style Dictionary
 * files don't use arrays for token groups, so this is safe).
 */
function deepMerge(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...a };
  for (const [key, value] of Object.entries(b)) {
    const existing = out[key];
    if (
      existing &&
      typeof existing === 'object' &&
      !Array.isArray(existing) &&
      value &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      out[key] = deepMerge(
        existing as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else {
      out[key] = value;
    }
  }
  return out;
}

/** CLI-facing wrapper for `importStyleDictionary`. */
export function runImportStyleDictionary(
  options: ImportStyleDictionaryOptions,
): void {
  const cwd = options.cwd ?? process.cwd();
  console.log(
    chalk.gray('  Reading Style Dictionary tokens (local files)…'),
  );

  try {
    const result = importStyleDictionary(options);
    const fileCount = result.filesRead.length;
    console.log(
      chalk.green(
        `  ✓ Imported ${result.transform.tokenCount} token(s) from ${fileCount} file(s)`,
      ),
    );
    if (result.transform.skipped.length > 0) {
      console.log(
        chalk.gray(
          `  ${result.transform.skipped.length} leaf/leaves skipped (empty value or unsupported shape).`,
        ),
      );
      const preview = result.transform.skipped.slice(0, 5);
      for (const s of preview) {
        console.log(chalk.gray(`    - ${s.path} (${s.reason})`));
      }
      if (result.transform.skipped.length > preview.length) {
        console.log(
          chalk.gray(
            `    … and ${result.transform.skipped.length - preview.length} more`,
          ),
        );
      }
    }
    const relPath = relative(cwd, result.outputPath);
    const display =
      relPath && !relPath.startsWith('..') && !isAbsolute(relPath)
        ? relPath
        : result.outputPath;
    console.log(chalk.green(`  ✓ Wrote ${display}`));
    printPostImportSummary(
      result.transform,
      display,
      (options.format ?? 'dtcg') as 'dtcg' | 'deslintrc',
    );
  } catch (err) {
    if (err instanceof ImportTokensError) {
      console.error(chalk.red(`  Error: ${err.message}`));
    } else {
      console.error(
        chalk.red(
          `  Error: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────
// Google Stitch / Material 3 tokens importer
// ─────────────────────────────────────────────────────────────────────

/**
 * `deslint import-tokens --stitch <path>`
 *
 * Reads a Google Stitch (Material 3) tokens JSON file and writes the
 * equivalent DTCG document to disk. Stitch emits the Material 3 token
 * shape — flat dotted keys like `md.sys.color.primary` wrapping a
 * `{ value, type }` leaf. The adapter expands those into a nested tree
 * and hands off to the Style Dictionary pipeline, whose leaf
 * normalisation is already identical.
 *
 * Local-only: no network, no telemetry, identical privacy stance to
 * the Figma and Style Dictionary paths.
 */

export interface ImportStitchOptions {
  /** Path to a Stitch / MD3 tokens JSON file. */
  source: string;
  /** Output file path. Defaults to ./tokens.json. */
  output?: string;
  /** Output format. */
  format?: 'dtcg' | 'deslintrc';
  /** Restrict to an MD3 tier (`sys`, `ref`, `comp`). Imports all if unset. */
  tier?: 'sys' | 'ref' | 'comp';
  /** Normalise legacy type labels. Defaults to true. */
  normalizeTypes?: boolean;
  /** Override the working directory (for tests). */
  cwd?: string;
}

export interface ImportStitchResult {
  outputPath: string;
  transform: StitchTransformResult;
  sourcePath: string;
}

export function importStitch(
  options: ImportStitchOptions,
): ImportStitchResult {
  const cwd = options.cwd ?? process.cwd();
  const format = options.format ?? 'dtcg';
  const outputPath = resolve(cwd, options.output ?? 'tokens.json');
  const sourcePath = resolve(cwd, options.source);

  if (!existsSync(sourcePath)) {
    throw new ImportTokensError(
      `Stitch tokens source not found: ${options.source}`,
      'source_not_found',
    );
  }

  // Stitch export is always a single JSON file (not a directory of
  // files like Style Dictionary). If the user hands us a directory,
  // refuse rather than silently grabbing the first json we find.
  const st = statSync(sourcePath);
  if (st.isDirectory()) {
    throw new ImportTokensError(
      `--stitch expects a single JSON file, not a directory. Got: ${options.source}`,
      'source_invalid_shape',
    );
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(sourcePath, 'utf-8'));
  } catch (err) {
    throw new ImportTokensError(
      `${options.source}: not valid JSON (${err instanceof Error ? err.message : String(err)}).`,
      'source_not_json',
    );
  }
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ImportTokensError(
      `Stitch tokens source must be a JSON object at the top level.`,
      'source_invalid_shape',
    );
  }

  const transform = stitchTokensToDTCG(raw, {
    tier: options.tier,
    normalizeTypes: options.normalizeTypes,
  });

  if (transform.tokenCount === 0) {
    throw new ImportTokensError(
      options.tier
        ? `No tokens found under md.${options.tier}.*. Try --tier sys (or omit --tier for all tiers).`
        : 'No tokens found in the Stitch source. Confirm the file contains leaves with `value` or `$value`.',
      'no_variables',
    );
  }

  const serialized =
    format === 'deslintrc'
      ? toDeslintRcFragment(transform)
      : JSON.stringify(transform.dtcg, null, 2) + '\n';

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, serialized, 'utf-8');

  return { outputPath, transform, sourcePath };
}

/** CLI-facing wrapper for `importStitch`. */
export function runImportStitch(options: ImportStitchOptions): void {
  const cwd = options.cwd ?? process.cwd();
  console.log(
    chalk.gray('  Reading Stitch / Material 3 tokens (local file)…'),
  );

  try {
    const result = importStitch(options);
    const relSource = relative(cwd, result.sourcePath);
    const sourceDisplay =
      relSource && !relSource.startsWith('..') && !isAbsolute(relSource)
        ? relSource
        : result.sourcePath;
    console.log(
      chalk.green(
        `  ✓ Imported ${result.transform.tokenCount} token(s) from ${sourceDisplay}`,
      ),
    );
    if (result.transform.skipped.length > 0) {
      console.log(
        chalk.gray(
          `  ${result.transform.skipped.length} leaf/leaves skipped (empty value or unsupported shape).`,
        ),
      );
      const preview = result.transform.skipped.slice(0, 5);
      for (const s of preview) {
        console.log(chalk.gray(`    - ${s.path} (${s.reason})`));
      }
      if (result.transform.skipped.length > preview.length) {
        console.log(
          chalk.gray(
            `    … and ${result.transform.skipped.length - preview.length} more`,
          ),
        );
      }
    }
    const relPath = relative(cwd, result.outputPath);
    const display =
      relPath && !relPath.startsWith('..') && !isAbsolute(relPath)
        ? relPath
        : result.outputPath;
    console.log(chalk.green(`  ✓ Wrote ${display}`));
    printPostImportSummary(
      result.transform,
      display,
      (options.format ?? 'dtcg') as 'dtcg' | 'deslintrc',
    );
  } catch (err) {
    if (err instanceof ImportTokensError) {
      console.error(chalk.red(`  Error: ${err.message}`));
    } else {
      console.error(
        chalk.red(
          `  Error: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
    process.exit(1);
  }
}

