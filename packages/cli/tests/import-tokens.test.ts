import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  importTokens,
  ImportTokensError,
} from '../src/import-tokens.js';

/**
 * Build a mock fetch that returns a predetermined sequence of responses.
 * Useful for exercising the retry branch (5xx → 200, 429 → 200, etc.).
 * Each call consumes the next entry; if the list is exhausted, the
 * mock throws — so tests catch "called more than expected" regressions.
 */
function queuedFetch(
  responses: Array<
    | { status: number; body: unknown }
    | { throwError: Error }
  >,
): {
  fn: typeof fetch;
  calls: Array<{ url: string; token: string | undefined }>;
  remaining: () => number;
} {
  const calls: Array<{ url: string; token: string | undefined }> = [];
  let i = 0;
  const fn: typeof fetch = async (input, init) => {
    if (i >= responses.length) {
      throw new Error('queuedFetch: no more responses queued');
    }
    const next = responses[i++]!;
    const headers = (init?.headers ?? {}) as Record<string, string>;
    calls.push({
      url: String(input),
      token: headers['X-Figma-Token'],
    });
    if ('throwError' in next) {
      throw next.throwError;
    }
    return new Response(JSON.stringify(next.body), {
      status: next.status,
      headers: { 'content-type': 'application/json' },
    });
  };
  return { fn, calls, remaining: () => responses.length - i };
}

// A minimal happy-path Figma response with a single COLOR variable.
function happyResponse() {
  return {
    status: 200,
    error: false,
    meta: {
      variableCollections: {
        c1: {
          id: 'c1',
          name: 'Primitives',
          modes: [{ modeId: 'm1', name: 'Light' }],
          defaultModeId: 'm1',
        },
      },
      variables: {
        v1: {
          id: 'v1',
          name: 'brand/primary',
          variableCollectionId: 'c1',
          resolvedType: 'COLOR',
          valuesByMode: { m1: { r: 0, g: 0, b: 0 } },
        },
      },
    },
  };
}

describe('importTokens', () => {
  let workDir: string;

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'deslint-import-tokens-'));
  });
  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it('writes a W3C DTCG JSON file on the happy path', async () => {
    const { fn, calls } = queuedFetch([{ status: 200, body: happyResponse() }]);
    const result = await importTokens({
      figma: 'ABC123',
      token: 'fk-test',
      cwd: workDir,
      fetchImpl: fn,
    });

    expect(result.transform.tokenCount).toBe(1);
    expect(result.outputPath).toBe(join(workDir, 'tokens.json'));
    expect(calls).toHaveLength(1);
    expect(calls[0]!.token).toBe('fk-test');
    expect(calls[0]!.url).toBe(
      'https://api.figma.com/v1/files/ABC123/variables/local',
    );

    const written = JSON.parse(readFileSync(result.outputPath, 'utf-8'));
    // The emitted DTCG tree should have primitives.brand.primary.$value
    expect(written.primitives.brand.primary.$value).toBe('#000000');
    expect(written.primitives.brand.primary.$type).toBe('color');
  });

  it('URL-encodes the figma file key', async () => {
    const { fn, calls } = queuedFetch([{ status: 200, body: happyResponse() }]);
    // File keys are restricted to [A-Za-z0-9_-], but encodeURIComponent
    // is defense-in-depth: if the regex ever loosens, we still emit a
    // valid URL.
    await importTokens({
      figma: 'ABC-123_xyz',
      token: 'fk',
      cwd: workDir,
      fetchImpl: fn,
    });
    expect(calls[0]!.url).toContain('/files/ABC-123_xyz/variables/local');
  });

  it('writes a .deslintrc-compatible fragment when format=deslintrc', async () => {
    const { fn } = queuedFetch([{ status: 200, body: happyResponse() }]);
    const result = await importTokens({
      figma: 'ABC123',
      token: 'fk',
      format: 'deslintrc',
      output: 'deslint-tokens.json',
      cwd: workDir,
      fetchImpl: fn,
    });
    const written = JSON.parse(readFileSync(result.outputPath, 'utf-8'));
    expect(written).toHaveProperty('designSystem');
    expect(written.designSystem.colors).toBeDefined();
    // #000000 appears under a collection-namespaced key.
    expect(Object.values(written.designSystem.colors)).toContain('#000000');
  });

  it('creates nested output directories when needed', async () => {
    const { fn } = queuedFetch([{ status: 200, body: happyResponse() }]);
    const result = await importTokens({
      figma: 'ABC123',
      token: 'fk',
      output: 'nested/deep/tokens.json',
      cwd: workDir,
      fetchImpl: fn,
    });
    expect(result.outputPath).toBe(join(workDir, 'nested/deep/tokens.json'));
    // File exists and is valid JSON
    expect(JSON.parse(readFileSync(result.outputPath, 'utf-8'))).toBeTruthy();
  });

  it('honours the FIGMA_TOKEN env var when --token is absent', async () => {
    const { fn, calls } = queuedFetch([{ status: 200, body: happyResponse() }]);
    process.env.FIGMA_TOKEN = 'env-token';
    try {
      await importTokens({
        figma: 'ABC123',
        cwd: workDir,
        fetchImpl: fn,
      });
      expect(calls[0]!.token).toBe('env-token');
    } finally {
      delete process.env.FIGMA_TOKEN;
    }
  });

  it('prefers --token over FIGMA_TOKEN when both are set', async () => {
    const { fn, calls } = queuedFetch([{ status: 200, body: happyResponse() }]);
    process.env.FIGMA_TOKEN = 'env-token';
    try {
      await importTokens({
        figma: 'ABC123',
        token: 'arg-token',
        cwd: workDir,
        fetchImpl: fn,
      });
      expect(calls[0]!.token).toBe('arg-token');
    } finally {
      delete process.env.FIGMA_TOKEN;
    }
  });

  it('throws missing_token when neither arg nor env var is set', async () => {
    const { fn } = queuedFetch([]);
    delete process.env.FIGMA_TOKEN;
    await expect(
      importTokens({ figma: 'ABC123', cwd: workDir, fetchImpl: fn }),
    ).rejects.toMatchObject({
      name: 'ImportTokensError',
      code: 'missing_token',
    });
  });

  it('rejects an invalid file key before making any network calls', async () => {
    const { fn, calls } = queuedFetch([]);
    await expect(
      importTokens({
        figma: 'has spaces/and slashes',
        token: 'fk',
        cwd: workDir,
        fetchImpl: fn,
      }),
    ).rejects.toMatchObject({ code: 'invalid_response' });
    expect(calls).toEqual([]);
  });

  it('classifies 403 as http_forbidden and does not retry', async () => {
    const { fn, calls } = queuedFetch([
      { status: 403, body: { err: 'Forbidden' } },
    ]);
    await expect(
      importTokens({
        figma: 'ABC123',
        token: 'bad',
        cwd: workDir,
        fetchImpl: fn,
      }),
    ).rejects.toMatchObject({ code: 'http_forbidden' });
    expect(calls).toHaveLength(1);
  });

  it('classifies 404 as http_not_found and does not retry', async () => {
    const { fn, calls } = queuedFetch([
      { status: 404, body: { err: 'Not Found' } },
    ]);
    await expect(
      importTokens({
        figma: 'NOPE',
        token: 'fk',
        cwd: workDir,
        fetchImpl: fn,
      }),
    ).rejects.toMatchObject({ code: 'http_not_found' });
    expect(calls).toHaveLength(1);
  });

  it('does not retry other 4xx statuses (e.g. 401)', async () => {
    const { fn, calls } = queuedFetch([
      { status: 401, body: { err: 'Unauthorized' } },
    ]);
    await expect(
      importTokens({
        figma: 'ABC123',
        token: 'fk',
        cwd: workDir,
        fetchImpl: fn,
      }),
    ).rejects.toMatchObject({ code: 'http_other' });
    expect(calls).toHaveLength(1);
  });

  it('retries 5xx up to 3 times and then succeeds', async () => {
    const { fn, calls } = queuedFetch([
      { status: 500, body: { err: 'down' } },
      { status: 502, body: { err: 'down' } },
      { status: 200, body: happyResponse() },
    ]);
    const result = await importTokens({
      figma: 'ABC123',
      token: 'fk',
      cwd: workDir,
      fetchImpl: fn,
    });
    expect(result.transform.tokenCount).toBe(1);
    expect(calls).toHaveLength(3);
  }, 10_000);

  it('gives up after 3 consecutive 5xx and throws http_other', async () => {
    const { fn, calls } = queuedFetch([
      { status: 500, body: {} },
      { status: 502, body: {} },
      { status: 503, body: {} },
    ]);
    await expect(
      importTokens({
        figma: 'ABC123',
        token: 'fk',
        cwd: workDir,
        fetchImpl: fn,
      }),
    ).rejects.toMatchObject({ code: 'http_other' });
    expect(calls).toHaveLength(3);
  }, 10_000);

  it('treats 429 as retryable but throws http_rate_limited on final attempt', async () => {
    const { fn, calls } = queuedFetch([
      { status: 429, body: {} },
      { status: 429, body: {} },
      { status: 429, body: {} },
    ]);
    await expect(
      importTokens({
        figma: 'ABC123',
        token: 'fk',
        cwd: workDir,
        fetchImpl: fn,
      }),
    ).rejects.toMatchObject({ code: 'http_rate_limited' });
    expect(calls).toHaveLength(3);
  }, 10_000);

  it('retries network errors and eventually classifies them as network_error', async () => {
    const { fn, calls } = queuedFetch([
      { throwError: new Error('ECONNRESET') },
      { throwError: new Error('ECONNRESET') },
      { throwError: new Error('ECONNRESET') },
    ]);
    await expect(
      importTokens({
        figma: 'ABC123',
        token: 'fk',
        cwd: workDir,
        fetchImpl: fn,
      }),
    ).rejects.toMatchObject({ code: 'network_error' });
    expect(calls).toHaveLength(3);
  }, 10_000);

  it('throws no_variables when the file has zero importable tokens', async () => {
    const { fn } = queuedFetch([
      {
        status: 200,
        body: {
          status: 200,
          error: false,
          meta: { variables: {}, variableCollections: {} },
        },
      },
    ]);
    await expect(
      importTokens({
        figma: 'ABC123',
        token: 'fk',
        cwd: workDir,
        fetchImpl: fn,
      }),
    ).rejects.toMatchObject({ code: 'no_variables' });
  });

  it('passes the mode option through to the transform', async () => {
    const responseWithModes = {
      status: 200,
      error: false,
      meta: {
        variableCollections: {
          c1: {
            id: 'c1',
            name: 'Semantic',
            modes: [
              { modeId: 'm1', name: 'Light' },
              { modeId: 'm2', name: 'Dark' },
            ],
            defaultModeId: 'm1',
          },
        },
        variables: {
          v1: {
            id: 'v1',
            name: 'bg',
            variableCollectionId: 'c1',
            resolvedType: 'COLOR',
            valuesByMode: {
              m1: { r: 1, g: 1, b: 1 }, // Light = white
              m2: { r: 0, g: 0, b: 0 }, // Dark = black
            },
          },
        },
      },
    };
    const { fn } = queuedFetch([{ status: 200, body: responseWithModes }]);
    const result = await importTokens({
      figma: 'ABC123',
      token: 'fk',
      mode: 'Dark',
      cwd: workDir,
      fetchImpl: fn,
    });
    const written = JSON.parse(readFileSync(result.outputPath, 'utf-8'));
    expect(written.semantic.bg.$value).toBe('#000000');
  });

  it('ImportTokensError is instanceof Error and exposes the code field', () => {
    const err = new ImportTokensError('boom', 'http_forbidden');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ImportTokensError');
    expect(err.code).toBe('http_forbidden');
  });
});
