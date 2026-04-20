/**
 * Verify a Deslint attestation sidecar inside the Action.
 *
 * Wraps `sigstore.verify` so the Action can gate a merge on a valid
 * Sigstore bundle signed over the `.deslint/attestation.json` payload.
 * DI-friendly: tests inject a stub `verify` to exercise branching
 * without touching Sigstore's trust root.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { verify as sigstoreVerify } from 'sigstore';
import type { SerializedBundle } from '@sigstore/bundle';

export type SignatureStatus =
  | 'verified'
  | 'missing'
  | 'invalid'
  | 'attestation-missing'
  | 'skipped';

export interface SignatureVerification {
  status: SignatureStatus;
  /** Cert SAN when status === 'verified'. */
  subject?: string;
  /** Cert issuer when status === 'verified'. */
  issuer?: string;
  /** Human-readable one-liner for the PR comment + logs. */
  message: string;
}

export interface VerifySignatureInput {
  /** Repo root in the Action runner. `.deslint/attestation.json` is
   *  looked up relative to this. */
  workingDirectory: string;
  /** Attestation file path (relative or absolute). Default:
   *  `.deslint/attestation.json`. */
  attestationPath?: string;
}

export interface SignatureDeps {
  verify?: (
    bundle: SerializedBundle,
    data: Buffer,
  ) => Promise<{ subject: string; issuer: string }>;
}

const DEFAULT_ATTESTATION = '.deslint/attestation.json';
const SIDECAR_SUFFIX = '.sigstore';

export async function verifySignature(
  input: VerifySignatureInput,
  deps: SignatureDeps = {},
): Promise<SignatureVerification> {
  const cwd = path.resolve(input.workingDirectory);
  const relAttestation = input.attestationPath ?? DEFAULT_ATTESTATION;
  const attestationPath = path.resolve(cwd, relAttestation);
  const bundlePath = attestationPath + SIDECAR_SUFFIX;

  if (!fs.existsSync(attestationPath)) {
    return {
      status: 'attestation-missing',
      message: `No attestation at \`${relAttestation}\` — nothing to verify.`,
    };
  }

  if (!fs.existsSync(bundlePath)) {
    return {
      status: 'missing',
      message:
        `Attestation is present but no sidecar \`${relAttestation}${SIDECAR_SUFFIX}\` ` +
        `was found. Re-run \`deslint attest\` with \`DESLINT_ATTEST_SIGNER=sigstore\` ` +
        `and \`permissions: id-token: write\`.`,
    };
  }

  let bundle: SerializedBundle;
  try {
    bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf-8')) as SerializedBundle;
  } catch (err) {
    return {
      status: 'invalid',
      message: `Sidecar bundle is not parseable JSON: ${errMsg(err)}.`,
    };
  }

  const payload = fs.readFileSync(attestationPath);
  const verifyFn = deps.verify ?? defaultVerify;
  try {
    const signer = await verifyFn(bundle, payload);
    return {
      status: 'verified',
      subject: signer.subject,
      issuer: signer.issuer,
      message:
        `Sigstore signature verified ` +
        `(signer: ${signer.subject || '(unknown)'}).`,
    };
  } catch (err) {
    return {
      status: 'invalid',
      message: `Sigstore verification failed: ${errMsg(err)}.`,
    };
  }
}

export function formatSignatureSection(v: SignatureVerification): string {
  const prefix =
    v.status === 'verified'
      ? '\u2705'
      : v.status === 'attestation-missing'
        ? '\u2139\ufe0f'
        : v.status === 'missing'
          ? '\u26a0\ufe0f'
          : '\u274c';
  const identity =
    v.status === 'verified' && v.subject
      ? `\n\n\`${v.subject}\``
      : '';
  return [
    '',
    '### Attestation signature',
    '',
    `${prefix} ${v.message}${identity}`,
    '',
  ].join('\n');
}

async function defaultVerify(
  bundle: SerializedBundle,
  data: Buffer,
): Promise<{ subject: string; issuer: string }> {
  const signer = (await sigstoreVerify(bundle, data)) as {
    subjectAlternativeName?: string;
    issuer?: string;
  };
  return {
    subject: signer.subjectAlternativeName ?? '',
    issuer: signer.issuer ?? '',
  };
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
