import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { VERSION, program } from '../src/index.js';

const _require = createRequire(import.meta.url);
const pkg = _require('../package.json') as { version: string };

describe('@vizlint/cli exports', () => {
  it('exports VERSION matching package.json', () => {
    expect(VERSION).toBe(pkg.version);
  });

  it('VERSION is a valid semver string', () => {
    // semver format: major.minor.patch with optional pre-release
    const semverRegex = /^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/;
    expect(VERSION).toMatch(semverRegex);
  });

  it('exports Commander program', () => {
    expect(program).toBeDefined();
    expect(program.name()).toBe('vizlint');
  });
});

describe('CLI commands', () => {
  function commandNames(): string[] {
    return program.commands.map((c) => c.name());
  }

  it('has scan command', () => {
    expect(commandNames()).toContain('scan');
  });

  it('has fix command', () => {
    expect(commandNames()).toContain('fix');
  });

  it('has generate-config command', () => {
    expect(commandNames()).toContain('generate-config');
  });

  it('has init command', () => {
    expect(commandNames()).toContain('init');
  });

  it('has exactly the expected set of commands', () => {
    const names = commandNames().sort();
    expect(names).toEqual(['compliance', 'fix', 'generate-config', 'init', 'report', 'scan', 'suggest-tokens', 'trend']);
  });

  it('scan command accepts format option', () => {
    const scanCmd = program.commands.find((c) => c.name() === 'scan');
    expect(scanCmd).toBeDefined();
    const formatOpt = scanCmd!.options.find(
      (o) => o.long === '--format',
    );
    expect(formatOpt).toBeDefined();
  });

  it('scan command accepts min-score option', () => {
    const scanCmd = program.commands.find((c) => c.name() === 'scan');
    expect(scanCmd).toBeDefined();
    const minScoreOpt = scanCmd!.options.find(
      (o) => o.long === '--min-score',
    );
    expect(minScoreOpt).toBeDefined();
  });

  it('fix command accepts --all, --interactive, and --dry-run options', () => {
    const fixCmd = program.commands.find((c) => c.name() === 'fix');
    expect(fixCmd).toBeDefined();
    const optNames = fixCmd!.options.map((o) => o.long);
    expect(optNames).toContain('--all');
    expect(optNames).toContain('--interactive');
    expect(optNames).toContain('--dry-run');
  });
});

describe('Library re-exports', () => {
  it('exports runLint function', async () => {
    const mod = await import('../src/index.js');
    expect(typeof mod.runLint).toBe('function');
  });

  it('exports discoverFiles function', async () => {
    const mod = await import('../src/index.js');
    expect(typeof mod.discoverFiles).toBe('function');
  });

  it('exports calculateScore function', async () => {
    const mod = await import('../src/index.js');
    expect(typeof mod.calculateScore).toBe('function');
  });

  it('exports generateConfig function', async () => {
    const mod = await import('../src/index.js');
    expect(typeof mod.generateConfig).toBe('function');
  });
});
