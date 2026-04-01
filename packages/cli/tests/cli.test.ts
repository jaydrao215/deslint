import { describe, it, expect } from 'vitest';
import { VERSION, program } from '../src/index.js';

describe('@vizlint/cli', () => {
  it('exports version', () => {
    expect(VERSION).toBe('0.1.0');
  });

  it('exports Commander program', () => {
    expect(program).toBeDefined();
    expect(program.name()).toBe('vizlint');
  });

  it('has scan command', () => {
    const commands = program.commands.map((c) => c.name());
    expect(commands).toContain('scan');
  });

  it('has fix command', () => {
    const commands = program.commands.map((c) => c.name());
    expect(commands).toContain('fix');
  });

  it('has generate-config command', () => {
    const commands = program.commands.map((c) => c.name());
    expect(commands).toContain('generate-config');
  });
});
