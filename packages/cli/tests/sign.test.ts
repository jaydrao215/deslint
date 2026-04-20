import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { signPayload, decodeOidcToken, serializeBundle, SIDECAR_SUFFIX } from '../src/sign.js';
import type { SerializedBundle } from '@sigstore/bundle';

function makeJwt(claims: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${header}.${payload}.signature`;
}

const FAKE_BUNDLE: SerializedBundle = {
  mediaType: 'application/vnd.dev.sigstore.bundle.v0.3+json',
  verificationMaterial: {} as SerializedBundle['verificationMaterial'],
  messageSignature: {
    messageDigest: { algorithm: 'SHA2_256', digest: 'ZmFrZQ==' },
    signature: 'ZmFrZXNpZw==',
  },
} as SerializedBundle;

describe('decodeOidcToken', () => {
  it('extracts iss and sub from a well-formed JWT', () => {
    const token = makeJwt({
      iss: 'https://token.actions.githubusercontent.com',
      sub: 'repo:jaydrao215/deslint:ref:refs/heads/main',
    });
    expect(decodeOidcToken(token)).toEqual({
      issuer: 'https://token.actions.githubusercontent.com',
      subject: 'repo:jaydrao215/deslint:ref:refs/heads/main',
    });
  });

  it('throws on a non-JWT string', () => {
    expect(() => decodeOidcToken('not.a.jwt')).toThrow(/not decodable JSON|missing required/);
  });

  it('throws when required claims are missing', () => {
    const token = makeJwt({ iss: 'https://example' });
    expect(() => decodeOidcToken(token)).toThrow(/missing required/);
  });

  it('throws when the token has the wrong number of parts', () => {
    expect(() => decodeOidcToken('header.payload')).toThrow(/well-formed JWT/);
  });
});

describe('signPayload', () => {
  let prev: { sigstore?: string; actions?: string };
  beforeEach(() => {
    prev = {
      sigstore: process.env.SIGSTORE_ID_TOKEN,
      actions: process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN,
    };
    delete process.env.SIGSTORE_ID_TOKEN;
    delete process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
    delete process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  });
  afterEach(() => {
    if (prev.sigstore !== undefined) process.env.SIGSTORE_ID_TOKEN = prev.sigstore;
    if (prev.actions !== undefined) process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN = prev.actions;
  });

  it('errors with remediation hint when no OIDC token is available', async () => {
    await expect(signPayload(Buffer.from('payload'))).rejects.toThrow(
      /needs an OIDC token/,
    );
  });

  it('forwards the payload and injected token to the sign function', async () => {
    const token = makeJwt({ iss: 'https://example', sub: 'user@example.com' });
    const seen: { payload?: Buffer; identityToken?: string } = {};
    const bundle = await signPayload(Buffer.from('hello', 'utf-8'), {
      getToken: async () => token,
      sign: async (payload, opts) => {
        seen.payload = payload;
        seen.identityToken = opts.identityToken;
        return FAKE_BUNDLE;
      },
    });
    expect(bundle).toBe(FAKE_BUNDLE);
    expect(seen.payload?.toString('utf-8')).toBe('hello');
    expect(seen.identityToken).toBe(token);
  });

  it('prefers SIGSTORE_ID_TOKEN over the CI provider', async () => {
    const token = makeJwt({ iss: 'https://example', sub: 'user@example.com' });
    process.env.SIGSTORE_ID_TOKEN = token;
    const bundle = await signPayload(Buffer.from('x'), {
      sign: async () => FAKE_BUNDLE,
    });
    expect(bundle).toBe(FAKE_BUNDLE);
  });
});

describe('serializeBundle', () => {
  it('produces byte-stable JSON with trailing newline', () => {
    const s = serializeBundle(FAKE_BUNDLE);
    expect(s.endsWith('\n')).toBe(true);
    expect(JSON.parse(s)).toEqual(FAKE_BUNDLE);
  });
});

describe('SIDECAR_SUFFIX', () => {
  it('uses the canonical .sigstore suffix', () => {
    expect(SIDECAR_SUFFIX).toBe('.sigstore');
  });
});
