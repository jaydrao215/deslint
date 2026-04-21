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
 *
 * Signer-identity policy: callers can pin an expected subject (regex)
 * and/or issuer (exact). A cryptographically valid bundle signed by
 * an out-of-policy identity is rejected with `reason` kind
 * `signer-mismatch` so consumers can render a targeted error.
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

export interface SignerPolicy {
  /** Regex (string) that the cert's SAN must match. */
  expectedSubject?: string;
  /** Exact-match issuer URL. */
  expectedIssuer?: string;
}

export type VerifyStatus =
  | { ok: true; signer: VerifiedSigner }
  | {
      ok: false;
      reason: string;
      /** 'crypto' = signature/TUF failure. 'signer-mismatch' = valid
       *  signature from an out-of-policy identity. */
      kind?: 'crypto' | 'signer-mismatch';
      /** Populated on 'signer-mismatch' so callers can render a
       *  targeted diff of what was expected vs. seen. */
      signer?: VerifiedSigner;
    };

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
  /** Signer-identity policy. When unset, any valid signer passes. */
  policy?: SignerPolicy;
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
      kind: 'crypto',
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
      kind: 'crypto',
    };
  }

  return verifyBundle(bundle, attestationBytes, deps, options.policy);
}

/**
 * Verify a bundle against payload bytes. Pure — no disk I/O.
 */
export async function verifyBundle(
  bundle: SerializedBundle,
  payload: Buffer,
  deps: VerifierDeps = {},
  policy?: SignerPolicy,
): Promise<VerifyStatus> {
  const verifyFn = deps.verify ?? defaultVerify;
  let signer: VerifiedSigner;
  try {
    signer = await verifyFn(bundle, payload);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { ok: false, reason, kind: 'crypto' };
  }

  const mismatch = checkPolicy(signer, policy);
  if (mismatch) {
    return { ok: false, reason: mismatch, kind: 'signer-mismatch', signer };
  }
  return { ok: true, signer };
}

/**
 * Compare an observed signer against a policy. Returns a
 * human-readable mismatch reason, or `null` when the signer is in
 * policy (or no policy is set).
 */
export function checkPolicy(
  signer: VerifiedSigner,
  policy?: SignerPolicy,
): string | null {
  if (!policy) return null;
  const { expectedSubject, expectedIssuer } = policy;
  if (expectedSubject) {
    let re: RegExp;
    try {
      re = new RegExp(expectedSubject);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return `Invalid signer-identity regex: ${msg}`;
    }
    if (!re.test(signer.subject)) {
      return (
        `Signer subject does not match policy. ` +
        `Observed: ${signer.subject || '(empty)'}. ` +
        `Expected (regex): ${expectedSubject}.`
      );
    }
  }
  if (expectedIssuer && signer.issuer !== expectedIssuer) {
    return (
      `Signer issuer does not match policy. ` +
      `Observed: ${signer.issuer || '(empty)'}. ` +
      `Expected (exact): ${expectedIssuer}.`
    );
  }
  return null;
}

/**
 * Given an observed signer, propose a `signer-identity` regex that
 * would accept it. For GitHub Actions SANs we drop the trailing
 * `@refs/...` and the workflow-file segment so the suggestion matches
 * any branch/workflow in the same repo — the common case. Otherwise
 * we emit a regex-escaped exact match.
 */
export function suggestSignerIdentity(signer: VerifiedSigner): string {
  const gh = signer.subject.match(
    /^(https:\/\/github\.com\/[^/]+\/[^/]+\/\.github\/workflows\/)[^@]+@refs\/.+$/,
  );
  if (gh) {
    return `^${escapeRegex(gh[1])}.+$`;
  }
  return `^${escapeRegex(signer.subject)}$`;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
