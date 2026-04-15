import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  buildAttestation,
  serializeAttestation,
  writeAttestation,
} from '../src/attest.js';

describe('buildAttestation', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'deslint-attest-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  async function writeTsx(name: string, content: string): Promise<void> {
    await writeFile(join(tmpDir, name), content);
  }

  it('produces a schema-stamped attestation on an empty project', async () => {
    const a = await buildAttestation({ projectDir: tmpDir });
    expect(a.schema).toBe('deslint.attestation/v1');
    expect(a.score.overall).toBe(100);
    expect(a.score.totalViolations).toBe(0);
    expect(a.files).toEqual([]);
    expect(a.rulesetHash).toHaveLength(64);
  });

  it('includes a sha256 file manifest sorted by path', async () => {
    await writeTsx('b.tsx', `const B = () => <div className="p-4">b</div>;\nexport default B;\n`);
    await writeTsx('a.tsx', `const A = () => <div className="p-4">a</div>;\nexport default A;\n`);

    const a = await buildAttestation({ projectDir: tmpDir });
    expect(a.files.length).toBe(2);
    expect(a.files[0].path).toBe('a.tsx');
    expect(a.files[1].path).toBe('b.tsx');
    for (const entry of a.files) {
      expect(entry.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('records violations and debt when the scan finds issues', async () => {
    await writeTsx('Bad.tsx', `const Bad = () => <div className="bg-[#FF0000] p-[13px]">hi</div>;\nexport default Bad;\n`);
    const a = await buildAttestation({ projectDir: tmpDir });
    expect(a.score.totalViolations).toBeGreaterThan(0);
    expect(a.score.debtMinutes).toBeGreaterThan(0);
  });

  it('omits budget block when no budget is present', async () => {
    const a = await buildAttestation({ projectDir: tmpDir });
    expect(a.budget).toBeUndefined();
  });

  it('includes budget block when a budget file is found', async () => {
    await writeTsx('Ok.tsx', `const Ok = () => <div className="p-4">ok</div>;\nexport default Ok;\n`);
    await mkdir(join(tmpDir, '.deslint'), { recursive: true });
    await writeFile(
      join(tmpDir, '.deslint', 'budget.json'),
      JSON.stringify({ enforce: true, minOverallScore: 0 }),
    );
    const a = await buildAttestation({ projectDir: tmpDir });
    expect(a.budget).toBeDefined();
    expect(a.budget?.enforced).toBe(true);
    expect(a.budget?.passed).toBe(true);
  });

  it('honors options.now for reproducible timestamps', async () => {
    const a = await buildAttestation({
      projectDir: tmpDir,
      now: '2026-04-15T00:00:00.000Z',
    });
    expect(a.createdAt).toBe('2026-04-15T00:00:00.000Z');
  });

  it('is byte-reproducible across two runs with the same inputs', async () => {
    await writeTsx('App.tsx', `const A = () => <div className="bg-[#123456]">x</div>;\nexport default A;\n`);
    const now = '2026-04-15T00:00:00.000Z';
    const a = await buildAttestation({ projectDir: tmpDir, now });
    const b = await buildAttestation({ projectDir: tmpDir, now });
    expect(serializeAttestation(a)).toBe(serializeAttestation(b));
  });

  it('reflects rulesetHash changes when .deslintrc.json rules change', async () => {
    const withRule = { rules: { 'deslint/no-arbitrary-colors': 'error' } };
    await writeFile(join(tmpDir, '.deslintrc.json'), JSON.stringify(withRule));
    const a = await buildAttestation({ projectDir: tmpDir });

    await writeFile(
      join(tmpDir, '.deslintrc.json'),
      JSON.stringify({ rules: { 'deslint/no-arbitrary-colors': 'warn' } }),
    );
    const b = await buildAttestation({ projectDir: tmpDir });

    expect(a.rulesetHash).not.toBe(b.rulesetHash);
  });

  it('sets signer informationally when DESLINT_ATTEST_SIGNER is set', async () => {
    const prev = process.env.DESLINT_ATTEST_SIGNER;
    try {
      process.env.DESLINT_ATTEST_SIGNER = 'cosign:./keys/deslint.pub';
      const a = await buildAttestation({ projectDir: tmpDir });
      expect(a.signer).toBe('cosign:./keys/deslint.pub');
    } finally {
      if (prev === undefined) delete process.env.DESLINT_ATTEST_SIGNER;
      else process.env.DESLINT_ATTEST_SIGNER = prev;
    }
  });

  it('omits signer when env var is not set', async () => {
    const prev = process.env.DESLINT_ATTEST_SIGNER;
    try {
      delete process.env.DESLINT_ATTEST_SIGNER;
      const a = await buildAttestation({ projectDir: tmpDir });
      expect(a.signer).toBeUndefined();
    } finally {
      if (prev !== undefined) process.env.DESLINT_ATTEST_SIGNER = prev;
    }
  });
});

describe('serializeAttestation', () => {
  it('emits 2-space indented JSON with a trailing newline', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'deslint-attest-'));
    try {
      const a = await buildAttestation({
        projectDir: tmp,
        now: '2026-04-15T00:00:00.000Z',
      });
      const s = serializeAttestation(a);
      expect(s.endsWith('\n')).toBe(true);
      expect(s).toMatch(/\n  "schema":/);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});

describe('writeAttestation', () => {
  it('writes to disk, creating parent directories', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'deslint-attest-'));
    try {
      const a = await buildAttestation({
        projectDir: tmp,
        now: '2026-04-15T00:00:00.000Z',
      });
      const out = join(tmp, 'nested', 'dir', 'attestation.json');
      writeAttestation(out, a);
      const read = await readFile(out, 'utf-8');
      expect(read).toBe(serializeAttestation(a));
      const parsed = JSON.parse(read);
      expect(parsed.schema).toBe('deslint.attestation/v1');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});
