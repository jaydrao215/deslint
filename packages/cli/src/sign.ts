/**
 * v0.7 Sigstore signing for Deslint attestations.
 *
 * Produces a Sigstore bundle written as sidecar
 * `.deslint/attestation.json.sigstore` over the byte-exact serialized
 * `.deslint/attestation.json` payload. Signing requires an OIDC token:
 *   - In GitHub Actions: automatic via `permissions: id-token: write`
 *     (read from `ACTIONS_ID_TOKEN_REQUEST_TOKEN` / `ACTIONS_ID_TOKEN_REQUEST_URL`).
 *   - Otherwise: user-provided `SIGSTORE_ID_TOKEN` for a Fulcio-accepted issuer.
 *
 * No interactive local fallback in v0.7 by design. If no OIDC token is
 * discoverable we error with a clear remediation hint; interactive local
 * signing lands in v0.7.1.
 *
 * Signer identity: the Sigstore cert inside the bundle carries the
 * authoritative signer (SAN + issuer OID). We do NOT embed signer
 * identity in the attestation JSON — that would chicken-and-egg the
 * SAN, which Fulcio derives from OIDC claims at sign time. `deslint
 * verify` and the Action extract the identity from the cert after a
 * successful crypto verify.
 */

import { sign as sigstoreSign } from 'sigstore';
import type { SerializedBundle } from '@sigstore/bundle';
import { CIContextProvider } from '@sigstore/sign';

export interface SignerIdentity {
  issuer: string;
  subject: string;
}

/**
 * Dependency injection surface for tests. Production calls real Sigstore;
 * tests pass stubs so the suite is network-free.
 */
export interface SignerDeps {
  /** Returns the OIDC token, or undefined if none is discoverable. */
  getToken?: () => Promise<string | undefined>;
  /** Signs a payload and returns a Sigstore bundle. */
  sign?: (
    payload: Buffer,
    options: { identityToken: string },
  ) => Promise<SerializedBundle>;
}

/**
 * Sign the serialized attestation payload. Caller passes bytes (the
 * canonical JSON from `serializeAttestation`) so the same bytes that
 * land on disk are what got signed.
 */
export async function signPayload(
  payload: Buffer,
  deps: SignerDeps = {},
): Promise<SerializedBundle> {
  const token = await (deps.getToken ?? defaultGetToken)();
  if (!token) {
    throw new Error(
      'DESLINT_ATTEST_SIGNER=sigstore needs an OIDC token.\n' +
        '  • In GitHub Actions, add  permissions:\n' +
        '                               id-token: write\n' +
        '    to the job. The Action runner will inject ACTIONS_ID_TOKEN_REQUEST_TOKEN.\n' +
        '  • Locally, set SIGSTORE_ID_TOKEN to a JWT from a Fulcio-accepted issuer.\n' +
        '  • Interactive local signing is planned for v0.7.1.',
    );
  }

  const signFn = deps.sign ?? defaultSign;
  return signFn(payload, { identityToken: token });
}

export function decodeOidcToken(token: string): SignerIdentity {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('OIDC token is not a well-formed JWT (expected 3 parts).');
  }
  let claims: { iss?: string; sub?: string };
  try {
    const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
    claims = JSON.parse(payload) as { iss?: string; sub?: string };
  } catch {
    throw new Error('OIDC token payload is not decodable JSON.');
  }
  if (!claims.iss || !claims.sub) {
    throw new Error('OIDC token is missing required `iss` or `sub` claim.');
  }
  return { issuer: claims.iss, subject: claims.sub };
}

/**
 * Default OIDC discovery. Order:
 *   1. `SIGSTORE_ID_TOKEN` — explicit opt-in (CI or dev).
 *   2. GitHub Actions — `CIContextProvider` reads `ACTIONS_ID_TOKEN_REQUEST_*`.
 *
 * Returns `undefined` if nothing is available; callers surface the error.
 */
async function defaultGetToken(): Promise<string | undefined> {
  const explicit = process.env.SIGSTORE_ID_TOKEN;
  if (explicit) return explicit;
  const provider = new CIContextProvider('sigstore');
  try {
    const token = await provider.getToken();
    return token || undefined;
  } catch {
    return undefined;
  }
}

async function defaultSign(
  payload: Buffer,
  options: { identityToken: string },
): Promise<SerializedBundle> {
  return sigstoreSign(payload, { identityToken: options.identityToken });
}

/** Byte-stable bundle serialization (2-space indent + trailing newline). */
export function serializeBundle(bundle: SerializedBundle): string {
  return JSON.stringify(bundle, null, 2) + '\n';
}

/** Filename convention for the sidecar bundle. */
export const SIDECAR_SUFFIX = '.sigstore';
