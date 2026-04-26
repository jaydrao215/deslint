/**
 * Verify a Deslint attestation sidecar inside the Action.
 *
 * Wraps `sigstore.verify` so the Action can gate a merge on a valid
 * Sigstore bundle signed over the `.deslint/attestation.json` payload.
 * DI-friendly: tests inject a stub `verify` to exercise branching
 * without touching Sigstore's trust root.
 *
 * Signer-identity policy: the caller can pin an expected subject
 * (regex) and/or issuer (exact). A cryptographically valid bundle
 * signed by an out-of-policy identity is rejected with
 * `status: 'signer-mismatch'` so the PR comment can render a targeted
 * expected-vs-observed diff plus a copy-pasteable policy suggestion.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { verify as sigstoreVerify } from 'sigstore';
import type { SerializedBundle } from '@sigstore/bundle';

export type SignatureStatus =
  | 'verified'
  | 'missing'
  | 'invalid'
  | 'signer-mismatch'
  | 'attestation-missing'
  | 'skipped';

export interface SignatureVerification {
  status: SignatureStatus;
  /** Cert SAN when the cryptographic verify succeeded (covers both
   *  'verified' and 'signer-mismatch'). */
  subject?: string;
  /** Cert issuer when the cryptographic verify succeeded. */
  issuer?: string;
  /** Human-readable one-liner for the PR comment + logs. */
  message: string;
  /** Populated on 'signer-mismatch': a `signer-identity` regex that
   *  would have accepted the observed signer, ready to paste into
   *  `action.yml`. */
  suggestedSignerIdentity?: string;
}

export interface SignerPolicy {
  /** Regex (string) that the cert's SAN must match. */
  expectedSubject?: string;
  /** Exact-match issuer URL. */
  expectedIssuer?: string;
}

export interface VerifySignatureInput {
  /** Repo root in the Action runner. `.deslint/attestation.json` is
   *  looked up relative to this. */
  workingDirectory: string;
  /** Attestation file path (relative or absolute). Default:
   *  `.deslint/attestation.json`. */
  attestationPath?: string;
  /** Signer-identity policy. When unset, any valid signer passes
   *  (back-compat with v0.7.0 — callers that pass `require-signed:
   *  true` without a policy get a separate warning upstream). */
  policy?: SignerPolicy;
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
  let signer: { subject: string; issuer: string };
  try {
    signer = await verifyFn(bundle, payload);
  } catch (err) {
    return {
      status: 'invalid',
      message: `Sigstore verification failed: ${errMsg(err)}.`,
    };
  }

  const mismatch = checkPolicy(signer, input.policy);
  if (mismatch) {
    return {
      status: 'signer-mismatch',
      subject: signer.subject,
      issuer: signer.issuer,
      message: mismatch,
      suggestedSignerIdentity: suggestSignerIdentity(signer),
    };
  }

  return {
    status: 'verified',
    subject: signer.subject,
    issuer: signer.issuer,
    message:
      `Sigstore signature verified ` +
      `(signer: ${signer.subject || '(unknown)'}).`,
  };
}

/**
 * Compare an observed signer against a policy. Returns a
 * human-readable mismatch reason (with the observed + expected values
 * inline), or `null` when the signer is in policy or no policy is set.
 */
export function checkPolicy(
  signer: { subject: string; issuer: string },
  policy?: SignerPolicy,
): string | null {
  if (!policy) return null;
  const { expectedSubject, expectedIssuer } = policy;
  if (expectedSubject) {
    let re: RegExp;
    try {
      re = new RegExp(expectedSubject);
    } catch (err) {
      return `Invalid signer-identity regex: ${errMsg(err)}.`;
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
 * Propose a `signer-identity` regex that would accept the observed
 * signer. GitHub Actions SANs collapse to a repo-scoped pattern; all
 * others get a regex-escaped exact match.
 */
export function suggestSignerIdentity(signer: {
  subject: string;
  issuer: string;
}): string {
  const gh = signer.subject.match(
    /^(https:\/\/github\.com\/[^/]+\/[^/]+\/\.github\/workflows\/)[^@]+@refs\/.+$/,
  );
  if (gh) {
    return `^${escapeRegex(gh[1])}.+$`;
  }
  return `^${escapeRegex(signer.subject)}$`;
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

  // signer-mismatch gets an expected-vs-observed block plus a
  // copy-pasteable policy suggestion — the whole point of the feature
  // is to be zero-guesswork when it rejects.
  if (v.status === 'signer-mismatch') {
    const lines = [
      '',
      '### Attestation signature',
      '',
      `${prefix} Signature is valid, but signer does not match your policy.`,
      '',
      '**Observed signer:**',
      '',
      `- subject: \`${v.subject || '(empty)'}\``,
      `- issuer: \`${v.issuer || '(empty)'}\``,
      '',
    ];
    if (v.suggestedSignerIdentity) {
      lines.push(
        'If you trust this signer, accept it by setting the `signer-identity` input:',
        '',
        '```yaml',
        `signer-identity: '${v.suggestedSignerIdentity}'`,
        '```',
        '',
      );
    }
    return lines.join('\n');
  }

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

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
