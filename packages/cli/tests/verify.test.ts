import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  verifyFromDisk,
  verifyBundle,
  checkPolicy,
  suggestSignerIdentity,
} from '../src/verify.js';
import type { SerializedBundle } from '@sigstore/bundle';

const FAKE_BUNDLE = { mediaType: 'application/vnd.dev.sigstore.bundle.v0.3+json' } as SerializedBundle;

describe('verifyBundle', () => {
  it('returns ok=true with signer identity on success', async () => {
    const result = await verifyBundle(FAKE_BUNDLE, Buffer.from('payload'), {
      verify: async () => ({
        subject: 'https://github.com/example/repo/.github/workflows/ci.yml@refs/heads/main',
        issuer: 'https://token.actions.githubusercontent.com',
      }),
    });
    expect(result).toEqual({
      ok: true,
      signer: {
        subject: 'https://github.com/example/repo/.github/workflows/ci.yml@refs/heads/main',
        issuer: 'https://token.actions.githubusercontent.com',
      },
    });
  });

  it('returns ok=false with reason on verification failure', async () => {
    const result = await verifyBundle(FAKE_BUNDLE, Buffer.from('payload'), {
      verify: async () => {
        throw new Error('signature does not match payload');
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/signature does not match/);
  });

  it('forwards bundle and payload to the verify function', async () => {
    const seen: { bundle?: SerializedBundle; data?: Buffer } = {};
    await verifyBundle(FAKE_BUNDLE, Buffer.from('hello', 'utf-8'), {
      verify: async (bundle, data) => {
        seen.bundle = bundle;
        seen.data = data;
        return { subject: 'x', issuer: 'y' };
      },
    });
    expect(seen.bundle).toBe(FAKE_BUNDLE);
    expect(seen.data?.toString('utf-8')).toBe('hello');
  });
});

describe('verifyFromDisk', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'deslint-verify-'));
  });
  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it('returns a clear error when the attestation is missing', async () => {
    const result = await verifyFromDisk({
      attestationPath: join(tmp, 'does-not-exist.json'),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/Attestation not found/);
  });

  it('returns a clear error when the sidecar is missing', async () => {
    const attestationPath = join(tmp, 'attestation.json');
    await writeFile(attestationPath, '{"schema":"deslint.attestation/v1"}\n');
    const result = await verifyFromDisk({ attestationPath });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/Sidecar bundle not found/);
  });

  it('returns ok=true when attestation + sidecar + verify all succeed', async () => {
    const attestationPath = join(tmp, 'attestation.json');
    const payload = '{"schema":"deslint.attestation/v1"}\n';
    await writeFile(attestationPath, payload);
    await writeFile(attestationPath + '.sigstore', JSON.stringify(FAKE_BUNDLE));

    const result = await verifyFromDisk({ attestationPath }, {
      verify: async (_bundle, data) => {
        expect(data.toString('utf-8')).toBe(payload);
        return { subject: 'user@example.com', issuer: 'https://accounts.google.com' };
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.signer.subject).toBe('user@example.com');
      expect(result.signer.issuer).toBe('https://accounts.google.com');
    }
  });

  it('falls through verify failures with the original reason', async () => {
    const attestationPath = join(tmp, 'attestation.json');
    await writeFile(attestationPath, '{"schema":"deslint.attestation/v1"}\n');
    await writeFile(attestationPath + '.sigstore', JSON.stringify(FAKE_BUNDLE));

    const result = await verifyFromDisk({ attestationPath }, {
      verify: async () => {
        throw new Error('certificate has expired');
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/certificate has expired/);
  });

  it('resolves the sidecar relative to the attestation path', async () => {
    const sub = join(tmp, 'nested');
    await mkdir(sub, { recursive: true });
    const attestationPath = join(sub, 'attestation.json');
    await writeFile(attestationPath, 'payload');
    await writeFile(attestationPath + '.sigstore', '{}');
    const result = await verifyFromDisk({ attestationPath }, {
      verify: async () => ({ subject: 's', issuer: 'i' }),
    });
    expect(result.ok).toBe(true);
  });
});

describe('checkPolicy', () => {
  const signer = {
    subject: 'https://github.com/acme/app/.github/workflows/ci.yml@refs/heads/main',
    issuer: 'https://token.actions.githubusercontent.com',
  };

  it('returns null when no policy is set', () => {
    expect(checkPolicy(signer)).toBeNull();
    expect(checkPolicy(signer, {})).toBeNull();
  });

  it('returns null when subject matches the expected regex', () => {
    expect(
      checkPolicy(signer, {
        expectedSubject: '^https://github\\.com/acme/app/\\.github/workflows/.+$',
      }),
    ).toBeNull();
  });

  it('rejects with observed + expected inline when subject does not match', () => {
    const reason = checkPolicy(signer, {
      expectedSubject: '^https://github\\.com/other/repo/.+$',
    });
    expect(reason).not.toBeNull();
    expect(reason).toMatch(/Observed: https:\/\/github\.com\/acme\/app/);
    expect(reason).toMatch(/Expected \(regex\): \^https:\/\/github\\\.com\/other\/repo/);
  });

  it('rejects when issuer does not match exactly', () => {
    const reason = checkPolicy(signer, {
      expectedIssuer: 'https://accounts.google.com',
    });
    expect(reason).not.toBeNull();
    expect(reason).toMatch(/Observed: https:\/\/token\.actions\.githubusercontent\.com/);
    expect(reason).toMatch(/Expected \(exact\): https:\/\/accounts\.google\.com/);
  });

  it('returns null when issuer matches exactly', () => {
    expect(
      checkPolicy(signer, {
        expectedIssuer: 'https://token.actions.githubusercontent.com',
      }),
    ).toBeNull();
  });

  it('surfaces an invalid-regex error rather than crashing', () => {
    const reason = checkPolicy(signer, { expectedSubject: '[unclosed' });
    expect(reason).toMatch(/Invalid signer-identity regex/);
  });

  it('requires both subject and issuer when both are set', () => {
    const r1 = checkPolicy(signer, {
      expectedSubject: '^https://github\\.com/acme/app/.+$',
      expectedIssuer: 'https://accounts.google.com',
    });
    expect(r1).toMatch(/issuer does not match/);
  });
});

describe('verifyBundle with policy', () => {
  it('returns ok=true when signer is in policy', async () => {
    const result = await verifyBundle(
      { mediaType: 'm' } as SerializedBundle,
      Buffer.from('p'),
      {
        verify: async () => ({
          subject: 'https://github.com/acme/app/.github/workflows/ci.yml@refs/heads/main',
          issuer: 'https://token.actions.githubusercontent.com',
        }),
      },
      {
        expectedSubject: '^https://github\\.com/acme/app/\\.github/workflows/.+$',
        expectedIssuer: 'https://token.actions.githubusercontent.com',
      },
    );
    expect(result.ok).toBe(true);
  });

  it('returns ok=false with kind=signer-mismatch and includes the signer', async () => {
    const result = await verifyBundle(
      { mediaType: 'm' } as SerializedBundle,
      Buffer.from('p'),
      {
        verify: async () => ({
          subject: 'https://github.com/attacker/fork/.github/workflows/ci.yml@refs/heads/main',
          issuer: 'https://token.actions.githubusercontent.com',
        }),
      },
      {
        expectedSubject: '^https://github\\.com/acme/app/.+$',
      },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe('signer-mismatch');
      expect(result.signer?.subject).toMatch(/attacker\/fork/);
      expect(result.reason).toMatch(/does not match policy/);
    }
  });

  it('returns ok=false with kind=crypto on verify failure', async () => {
    const result = await verifyBundle(
      { mediaType: 'm' } as SerializedBundle,
      Buffer.from('p'),
      {
        verify: async () => {
          throw new Error('cert expired');
        },
      },
      { expectedSubject: '.*' },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe('crypto');
      expect(result.signer).toBeUndefined();
    }
  });
});

describe('suggestSignerIdentity', () => {
  it('collapses a GitHub Actions SAN to a repo-scoped regex', () => {
    const s = suggestSignerIdentity({
      subject: 'https://github.com/acme/app/.github/workflows/release.yml@refs/heads/main',
      issuer: 'https://token.actions.githubusercontent.com',
    });
    expect(s).toBe('^https://github\\.com/acme/app/\\.github/workflows/.+$');
  });

  it('escapes + exact-matches non-GitHub SANs', () => {
    const s = suggestSignerIdentity({
      subject: 'user+tag@example.com',
      issuer: 'https://accounts.google.com',
    });
    expect(s).toBe('^user\\+tag@example\\.com$');
  });

  it('round-trips: suggestion + signer pass checkPolicy', () => {
    const signer = {
      subject: 'https://github.com/acme/app/.github/workflows/ci.yml@refs/heads/main',
      issuer: 'https://token.actions.githubusercontent.com',
    };
    const suggestion = suggestSignerIdentity(signer);
    expect(checkPolicy(signer, { expectedSubject: suggestion })).toBeNull();
  });
});
