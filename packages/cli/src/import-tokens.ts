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

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import chalk from 'chalk';
import {
  figmaVariablesToDTCG,
  parseW3CTokens,
  type FigmaVariablesResponse,
  type FigmaTransformResult,
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
      | 'http_forbidden'
      | 'http_not_found'
      | 'http_rate_limited'
      | 'http_other'
      | 'network_error'
      | 'invalid_response'
      | 'no_variables',
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
      'invalid_response',
    );
  }

  const token = options.token ?? process.env.FIGMA_TOKEN;
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
    excludeHidden: options.includeHidden ? false : true,
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
      lastNetworkError = err;
      if (attempt === MAX_ATTEMPTS) {
        throw new ImportTokensError(
          `Figma API request failed after ${MAX_ATTEMPTS} attempts${
            err instanceof Error ? `: ${err.message}` : '.'
          }`,
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
  throw new ImportTokensError(
    `Figma API request failed after ${MAX_ATTEMPTS} attempts${
      lastNetworkError instanceof Error ? `: ${lastNetworkError.message}` : '.'
    }`,
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
function toDeslintRcFragment(transform: FigmaTransformResult): string {
  const parsed = parseW3CTokens(transform.dtcg);
  const fragment = {
    // We deliberately don't emit any other config keys — the user's
    // existing .deslintrc.json is the source of truth for rules,
    // severity profiles, and quality gates. This is just tokens.
    designSystem: parsed.designSystem,
  };
  return JSON.stringify(fragment, null, 2) + '\n';
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
    // but keep the absolute path available if it's outside cwd.
    const rel = result.outputPath.startsWith(cwd + '/')
      ? result.outputPath.slice(cwd.length + 1)
      : result.outputPath;
    console.log(chalk.green(`  ✓ Wrote ${rel}`));
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

