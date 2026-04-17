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
import {
  importStyleDictionary,
  ImportTokensError,
} from '../src/import-tokens.js';

describe('importStyleDictionary', () => {
  let workDir: string;

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'deslint-import-sd-'));
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

  it('writes a DTCG JSON file from a single Style Dictionary source', () => {
    write('tokens.sd.json', {
      color: {
        brand: {
          primary: { value: '#1A5276', type: 'color' },
        },
      },
    });
    const result = importStyleDictionary({
      source: 'tokens.sd.json',
      cwd: workDir,
    });
    expect(result.transform.tokenCount).toBe(1);
    expect(result.filesRead).toHaveLength(1);
    const written = JSON.parse(readFileSync(result.outputPath, 'utf-8'));
    expect(written.color.brand.primary.$value).toBe('#1A5276');
    expect(written.color.brand.primary.$type).toBe('color');
  });

  it('merges every JSON file under a directory source (deterministic order)', () => {
    write('tokens/color.json', {
      color: {
        brand: { primary: { value: '#1A5276', type: 'color' } },
      },
    });
    write('tokens/spacing.json', {
      space: {
        md: { value: '16px', type: 'spacing' },
      },
    });
    // A subfolder — the walker should pick this up too.
    write('tokens/nested/radius.json', {
      radius: {
        md: { value: '6px', type: 'border-radius' },
      },
    });

    const result = importStyleDictionary({
      source: 'tokens',
      cwd: workDir,
    });
    expect(result.transform.tokenCount).toBe(3);
    expect(result.filesRead).toHaveLength(3);
    const written = JSON.parse(readFileSync(result.outputPath, 'utf-8'));
    expect(written.color.brand.primary.$value).toBe('#1A5276');
    expect(written.space.md.$value).toBe('16px');
    expect(written.radius.md.$value).toBe('6px');
  });

  it('skips node_modules / build / dist and hidden dirs when walking', () => {
    write('tokens/color.json', {
      color: { brand: { primary: { value: '#1A5276', type: 'color' } } },
    });
    // Decoys that should be ignored:
    write('tokens/node_modules/bad.json', {
      color: { stolen: { value: '#000000', type: 'color' } },
    });
    write('tokens/build/bad.json', {
      color: { built: { value: '#000000', type: 'color' } },
    });
    write('tokens/.cache/bad.json', {
      color: { cached: { value: '#000000', type: 'color' } },
    });

    const result = importStyleDictionary({
      source: 'tokens',
      cwd: workDir,
    });
    expect(result.transform.tokenCount).toBe(1);
    const written = JSON.parse(readFileSync(result.outputPath, 'utf-8'));
    expect(written.color.stolen).toBeUndefined();
    expect(written.color.built).toBeUndefined();
    expect(written.color.cached).toBeUndefined();
  });

  it('emits a .deslintrc.json fragment when format=deslintrc', () => {
    write('tokens.sd.json', {
      color: {
        brand: { primary: { value: '#1A5276', type: 'color' } },
      },
      space: { md: { value: '16px', type: 'spacing' } },
    });
    const result = importStyleDictionary({
      source: 'tokens.sd.json',
      format: 'deslintrc',
      output: 'out.json',
      cwd: workDir,
    });
    const written = JSON.parse(readFileSync(result.outputPath, 'utf-8'));
    expect(written.designSystem).toBeDefined();
    expect(Object.keys(written.designSystem.colors ?? {})).toHaveLength(1);
    expect(Object.keys(written.designSystem.spacing ?? {})).toHaveLength(1);
  });

  it('throws source_not_found when the path does not exist', () => {
    expect(() =>
      importStyleDictionary({ source: 'missing.json', cwd: workDir }),
    ).toThrow(ImportTokensError);
    try {
      importStyleDictionary({ source: 'missing.json', cwd: workDir });
    } catch (err) {
      expect((err as ImportTokensError).code).toBe('source_not_found');
    }
  });

  it('throws source_not_json on malformed JSON', () => {
    write('bad.json', '{ not valid json');
    try {
      importStyleDictionary({ source: 'bad.json', cwd: workDir });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ImportTokensError);
      expect((err as ImportTokensError).code).toBe('source_not_json');
    }
  });

  it('throws source_invalid_shape when the JSON is not an object', () => {
    write('arr.json', JSON.stringify(['color', 'size']));
    try {
      importStyleDictionary({ source: 'arr.json', cwd: workDir });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ImportTokensError);
      expect((err as ImportTokensError).code).toBe('source_invalid_shape');
    }
  });

  it('throws source_empty when the directory has no JSON files', () => {
    mkdirSync(join(workDir, 'empty'), { recursive: true });
    try {
      importStyleDictionary({ source: 'empty', cwd: workDir });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ImportTokensError);
      expect((err as ImportTokensError).code).toBe('source_empty');
    }
  });

  it('throws no_variables when the tree has no leaves with value/$value', () => {
    write('tokens.json', { color: { brand: {} } });
    try {
      importStyleDictionary({ source: 'tokens.json', cwd: workDir });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ImportTokensError);
      expect((err as ImportTokensError).code).toBe('no_variables');
    }
  });

  it('lets later files override values for the same path', () => {
    // Guard that deep-merge does what the docs claim — a later file
    // replaces a token value at the same path rather than producing
    // two siblings.
    write('tokens/a-base.json', {
      color: { brand: { primary: { value: '#000000', type: 'color' } } },
    });
    write('tokens/b-override.json', {
      color: { brand: { primary: { value: '#1A5276', type: 'color' } } },
    });
    const result = importStyleDictionary({
      source: 'tokens',
      cwd: workDir,
    });
    expect(result.transform.tokenCount).toBe(1);
    const written = JSON.parse(readFileSync(result.outputPath, 'utf-8'));
    expect(written.color.brand.primary.$value).toBe('#1A5276');
  });
});
