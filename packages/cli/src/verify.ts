/**
 * v0.7 Sigstore verification for Deslint attestations.
 *
 * Verifies `.deslint/attestation.json.sigstore` against the serialized
 * bytes of `.deslint/attestation.json`. On success returns the cert's
 * SAN identity; on failure returns a human-readable reason.
 *
 * Tests pass a stub verifier via `VerifierDeps` to stay network-free;
 * production flows through `sigstore.verify` which fetches Sigstore's
 * public-good trust root via TUF.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { verify as sigstoreVerify } from 'sigstore';
import type { SerializedBundle } from '@sigstore/bundle';
import { SIDECAR_SUFFIX } from './sign.js';

export interface VerifiedSigner {
  /** SAN pulled off the Sigstore cert (URI or email). */
  subject: string;
  /** OIDC issuer (cert extension). */
  issuer: string;
}

export type VerifyStatus =
  | { ok: true; signer: VerifiedSigner }
  | { ok: false; reason: string };

export interface VerifierDeps {
  verify?: (
    bundle: SerializedBundle,
    data: Buffer,
  ) => Promise<VerifiedSigner>;
}

export interface VerifyFromDiskOptions {
  /** Absolute path to `.deslint/attestation.json`. */
  attestationPath: string;
  /** Absolute path to the sidecar; defaults to `<attestation>.sigstore`. */
  bundlePath?: string;
}

/**
 * Load attestation + sidecar from disk and verify.
 */
export async function verifyFromDisk(
  options: VerifyFromDiskOptions,
  deps: VerifierDeps = {},
): Promise<VerifyStatus> {
  const attestationPath = resolve(options.attestationPath);
  const bundlePath = resolve(
    options.bundlePath ?? attestationPath + SIDECAR_SUFFIX,
  );

  let attestationBytes: Buffer;
  try {
    attestationBytes = readFileSync(attestationPath);
  } catch {
    return {
      ok: false,
      reason: `Attestation not found at ${attestationPath}.`,
    };
  }

  let bundle: SerializedBundle;
  try {
    const raw = readFileSync(bundlePath, 'utf-8');
    bundle = JSON.parse(raw) as SerializedBundle;
  } catch {
    return {
      ok: false,
      reason: `Sidecar bundle not found at ${bundlePath}.`,
    };
  }

  return verifyBundle(bundle, attestationBytes, deps);
}

/**
 * Verify a bundle against payload bytes. Pure — no disk I/O.
 */
export async function verifyBundle(
  bundle: SerializedBundle,
  payload: Buffer,
  deps: VerifierDeps = {},
): Promise<VerifyStatus> {
  const verifyFn = deps.verify ?? defaultVerify;
  try {
    const signer = await verifyFn(bundle, payload);
    return { ok: true, signer };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { ok: false, reason };
  }
}

/** Production verify: calls Sigstore public-good trust root via TUF. */
async function defaultVerify(
  bundle: SerializedBundle,
  data: Buffer,
): Promise<VerifiedSigner> {
  const signerResult = await sigstoreVerify(bundle, data);
  return extractIdentity(signerResult);
}

/**
 * Pull `{ subject, issuer }` off a verify-returned `Signer` without
 * coupling our types to `@sigstore/verify` internals.
 */
function extractIdentity(signer: unknown): VerifiedSigner {
  const s = signer as {
    subjectAlternativeName?: string;
    issuer?: string;
  } | undefined;
  return {
    subject: s?.subjectAlternativeName ?? '',
    issuer: s?.issuer ?? '',
  };
}
