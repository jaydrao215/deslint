import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { importStitch, ImportTokensError } from '../src/import-tokens.js';

describe('importStitch', () => {
  let workDir: string;

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'deslint-import-stitch-'));
  });
  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  function write(relPath: string, contents: unknown): string {
    const abs = join(workDir, relPath);
    mkdirSync(join(abs, '..'), { recursive: true });
    writeFileSync(
      abs,
      typeof contents === 'string' ? contents : JSON.stringify(contents),
      'utf-8',
    );
    return abs;
  }

  it('writes a DTCG file from a flat Material 3 tokens JSON', () => {
    write('stitch.json', {
      'md.sys.color.primary': { value: '#6750A4', type: 'color' },
      'md.sys.color.secondary': { value: '#625B71', type: 'color' },
    });
    const result = importStitch({ source: 'stitch.json', cwd: workDir });
    expect(result.transform.tokenCount).toBe(2);
    const written = JSON.parse(readFileSync(result.outputPath, 'utf-8'));
    expect(written.md.sys.color.primary.$value).toBe('#6750A4');
    expect(written.md.sys.color.primary.$type).toBe('color');
  });

  it('applies --tier sys filter when requested', () => {
    write('stitch.json', {
      'md.ref.palette.primary60': { value: '#6750A4', type: 'color' },
      'md.sys.color.primary': {
        value: '{md.ref.palette.primary60}',
        type: 'color',
      },
    });
    const result = importStitch({
      source: 'stitch.json',
      tier: 'sys',
      cwd: workDir,
    });
    expect(result.transform.tokenCount).toBe(1);
    const written = JSON.parse(readFileSync(result.outputPath, 'utf-8'));
    expect(written.md.sys).toBeDefined();
    expect(written.md.ref).toBeUndefined();
  });

  it('emits a .deslintrc fragment when format=deslintrc', () => {
    write('stitch.json', {
      'md.sys.color.primary': { value: '#6750A4', type: 'color' },
      'md.sys.spacing.md': { value: '16px', type: 'spacing' },
    });
    const result = importStitch({
      source: 'stitch.json',
      format: 'deslintrc',
      output: 'fragment.json',
      cwd: workDir,
    });
    const written = JSON.parse(readFileSync(result.outputPath, 'utf-8'));
    expect(written.designSystem).toBeDefined();
    expect(Object.keys(written.designSystem.colors ?? {})).toHaveLength(1);
    expect(Object.keys(written.designSystem.spacing ?? {})).toHaveLength(1);
  });

  it('throws source_not_found when the path does not exist', () => {
    try {
      importStitch({ source: 'missing.json', cwd: workDir });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ImportTokensError);
      expect((err as ImportTokensError).code).toBe('source_not_found');
    }
  });

  it('refuses a directory source (single-file only)', () => {
    mkdirSync(join(workDir, 'stitchdir'), { recursive: true });
    try {
      importStitch({ source: 'stitchdir', cwd: workDir });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ImportTokensError);
      expect((err as ImportTokensError).code).toBe('source_invalid_shape');
    }
  });

  it('throws source_not_json on malformed JSON', () => {
    write('bad.json', '{ not json');
    try {
      importStitch({ source: 'bad.json', cwd: workDir });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ImportTokensError);
      expect((err as ImportTokensError).code).toBe('source_not_json');
    }
  });

  it('throws source_invalid_shape when the JSON is not an object', () => {
    write('arr.json', JSON.stringify([1, 2, 3]));
    try {
      importStitch({ source: 'arr.json', cwd: workDir });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ImportTokensError);
      expect((err as ImportTokensError).code).toBe('source_invalid_shape');
    }
  });

  it('throws no_variables with a helpful message when tier filter empties the import', () => {
    write('stitch.json', {
      'md.ref.palette.primary60': { value: '#6750A4', type: 'color' },
    });
    try {
      importStitch({ source: 'stitch.json', tier: 'sys', cwd: workDir });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ImportTokensError);
      expect((err as ImportTokensError).code).toBe('no_variables');
      expect((err as ImportTokensError).message).toMatch(/md\.sys/);
    }
  });
});
