import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  verifySignature,
  formatSignatureSection,
  checkPolicy,
  suggestSignerIdentity,
} from '../src/verify-signature.js';
import type { SerializedBundle } from '@sigstore/bundle';

const FAKE_BUNDLE = { mediaType: 'application/vnd.dev.sigstore.bundle.v0.3+json' } as SerializedBundle;

describe('verifySignature', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'deslint-action-sig-'));
    await mkdir(join(tmp, '.deslint'), { recursive: true });
  });
  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it('returns attestation-missing when no attestation file exists', async () => {
    const v = await verifySignature({ workingDirectory: tmp });
    expect(v.status).toBe('attestation-missing');
    expect(v.message).toMatch(/No attestation/);
  });

  it('returns missing when attestation exists but no sidecar', async () => {
    await writeFile(
      join(tmp, '.deslint', 'attestation.json'),
      '{"schema":"deslint.attestation/v1"}\n',
    );
    const v = await verifySignature({ workingDirectory: tmp });
    expect(v.status).toBe('missing');
    expect(v.message).toMatch(/no sidecar/);
  });

  it('returns invalid when sidecar is not parseable JSON', async () => {
    await writeFile(
      join(tmp, '.deslint', 'attestation.json'),
      '{"schema":"deslint.attestation/v1"}\n',
    );
    await writeFile(join(tmp, '.deslint', 'attestation.json.sigstore'), '{not json');
    const v = await verifySignature({ workingDirectory: tmp });
    expect(v.status).toBe('invalid');
    expect(v.message).toMatch(/not parseable JSON/);
  });

  it('returns verified on a successful verification and surfaces the signer', async () => {
    const payload = '{"schema":"deslint.attestation/v1"}\n';
    await writeFile(join(tmp, '.deslint', 'attestation.json'), payload);
    await writeFile(
      join(tmp, '.deslint', 'attestation.json.sigstore'),
      JSON.stringify(FAKE_BUNDLE),
    );
    const v = await verifySignature(
      { workingDirectory: tmp },
      {
        verify: async (_b, data) => {
          expect(data.toString('utf-8')).toBe(payload);
          return {
            subject: 'https://github.com/x/y/.github/workflows/ci.yml@refs/heads/main',
            issuer: 'https://token.actions.githubusercontent.com',
          };
        },
      },
    );
    expect(v.status).toBe('verified');
    expect(v.subject).toMatch(/github\.com\/x\/y/);
    expect(v.issuer).toMatch(/actions\.githubusercontent/);
    expect(v.message).toMatch(/Sigstore signature verified/);
  });

  it('returns invalid when verify throws', async () => {
    await writeFile(
      join(tmp, '.deslint', 'attestation.json'),
      '{"schema":"deslint.attestation/v1"}\n',
    );
    await writeFile(
      join(tmp, '.deslint', 'attestation.json.sigstore'),
      JSON.stringify(FAKE_BUNDLE),
    );
    const v = await verifySignature(
      { workingDirectory: tmp },
      {
        verify: async () => {
          throw new Error('signature does not match payload');
        },
      },
    );
    expect(v.status).toBe('invalid');
    expect(v.message).toMatch(/signature does not match payload/);
  });
});

describe('formatSignatureSection', () => {
  it('uses \u2705 on verified and shows the signer identity', () => {
    const section = formatSignatureSection({
      status: 'verified',
      subject: 'https://github.com/x/y@ref',
      issuer: 'https://token.actions.githubusercontent.com',
      message: 'Sigstore signature verified (signer: https://github.com/x/y@ref).',
    });
    expect(section).toMatch(/Attestation signature/);
    expect(section).toMatch(/\u2705/);
    expect(section).toMatch(/github\.com\/x\/y/);
  });

  it('uses \u2139\ufe0f for attestation-missing', () => {
    const section = formatSignatureSection({
      status: 'attestation-missing',
      message: 'No attestation at `.deslint/attestation.json` — nothing to verify.',
    });
    expect(section).toMatch(/\u2139\ufe0f/);
  });

  it('uses \u26a0\ufe0f for missing sidecar', () => {
    const section = formatSignatureSection({
      status: 'missing',
      message: 'Attestation is present but no sidecar was found.',
    });
    expect(section).toMatch(/\u26a0\ufe0f/);
  });

  it('uses \u274c for invalid', () => {
    const section = formatSignatureSection({
      status: 'invalid',
      message: 'Sigstore verification failed: certificate has expired.',
    });
    expect(section).toMatch(/\u274c/);
  });

  it('renders observed signer + copy-pasteable suggestion on signer-mismatch', () => {
    const section = formatSignatureSection({
      status: 'signer-mismatch',
      subject:
        'https://github.com/attacker/fork/.github/workflows/evil.yml@refs/heads/main',
      issuer: 'https://token.actions.githubusercontent.com',
      message:
        'Signer subject does not match policy. Observed: ..., Expected: ...',
      suggestedSignerIdentity:
        '^https://github\\.com/attacker/fork/\\.github/workflows/.+$',
    });
    expect(section).toMatch(/❌/);
    expect(section).toMatch(/Observed signer/);
    expect(section).toMatch(/attacker\/fork/);
    expect(section).toMatch(/signer-identity:/);
  });
});

describe('verifySignature with policy', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'deslint-action-sig-policy-'));
    await mkdir(join(tmp, '.deslint'), { recursive: true });
    await writeFile(
      join(tmp, '.deslint', 'attestation.json'),
      '{"schema":"deslint.attestation/v1"}\n',
    );
    await writeFile(
      join(tmp, '.deslint', 'attestation.json.sigstore'),
      JSON.stringify(FAKE_BUNDLE),
    );
  });
  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it('accepts an in-policy signer', async () => {
    const v = await verifySignature(
      {
        workingDirectory: tmp,
        policy: {
          expectedSubject: '^https://github\\.com/acme/app/.+$',
          expectedIssuer: 'https://token.actions.githubusercontent.com',
        },
      },
      {
        verify: async () => ({
          subject: 'https://github.com/acme/app/.github/workflows/ci.yml@refs/heads/main',
          issuer: 'https://token.actions.githubusercontent.com',
        }),
      },
    );
    expect(v.status).toBe('verified');
  });

  it('rejects an out-of-policy signer with status=signer-mismatch and a suggestion', async () => {
    const v = await verifySignature(
      {
        workingDirectory: tmp,
        policy: {
          expectedSubject: '^https://github\\.com/acme/app/.+$',
        },
      },
      {
        verify: async () => ({
          subject: 'https://github.com/attacker/fork/.github/workflows/evil.yml@refs/heads/main',
          issuer: 'https://token.actions.githubusercontent.com',
        }),
      },
    );
    expect(v.status).toBe('signer-mismatch');
    expect(v.subject).toMatch(/attacker\/fork/);
    expect(v.suggestedSignerIdentity).toBe(
      '^https://github\\.com/attacker/fork/\\.github/workflows/.+$',
    );
    expect(v.message).toMatch(/does not match policy/);
  });

  it('rejects when the issuer is out of policy', async () => {
    const v = await verifySignature(
      {
        workingDirectory: tmp,
        policy: {
          expectedIssuer: 'https://token.actions.githubusercontent.com',
        },
      },
      {
        verify: async () => ({
          subject: 'user@example.com',
          issuer: 'https://accounts.google.com',
        }),
      },
    );
    expect(v.status).toBe('signer-mismatch');
    expect(v.message).toMatch(/issuer does not match/);
  });

  it('treats an absent policy as "any valid signer passes" (back-compat)', async () => {
    const v = await verifySignature(
      { workingDirectory: tmp },
      {
        verify: async () => ({
          subject: 'https://github.com/anyone/anything/.github/workflows/x.yml@refs/heads/main',
          issuer: 'https://token.actions.githubusercontent.com',
        }),
      },
    );
    expect(v.status).toBe('verified');
  });
});

describe('checkPolicy', () => {
  const signer = {
    subject: 'https://github.com/acme/app/.github/workflows/ci.yml@refs/heads/main',
    issuer: 'https://token.actions.githubusercontent.com',
  };

  it('returns null when no policy is set', () => {
    expect(checkPolicy(signer)).toBeNull();
  });

  it('rejects invalid regex with a helpful message', () => {
    const reason = checkPolicy(signer, { expectedSubject: '[' });
    expect(reason).toMatch(/Invalid signer-identity regex/);
  });

  it('returns null for a matching subject + issuer', () => {
    expect(
      checkPolicy(signer, {
        expectedSubject: '^https://github\\.com/acme/app/.+$',
        expectedIssuer: 'https://token.actions.githubusercontent.com',
      }),
    ).toBeNull();
  });
});

describe('suggestSignerIdentity', () => {
  it('produces a repo-scoped regex for GitHub Actions SANs', () => {
    expect(
      suggestSignerIdentity({
        subject: 'https://github.com/acme/app/.github/workflows/ci.yml@refs/heads/main',
        issuer: 'https://token.actions.githubusercontent.com',
      }),
    ).toBe('^https://github\\.com/acme/app/\\.github/workflows/.+$');
  });

  it('regex-escapes non-GitHub subjects for exact match', () => {
    expect(
      suggestSignerIdentity({
        subject: 'user@example.com',
        issuer: 'https://accounts.google.com',
      }),
    ).toBe('^user@example\\.com$');
  });
});
