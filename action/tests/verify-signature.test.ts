import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifySignature, formatSignatureSection } from '../src/verify-signature.js';
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
});
