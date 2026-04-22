import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  writeFileSync,
  mkdirSync,
  rmSync,
  readFileSync,
  existsSync,
  readdirSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { writeJsonFile } from '../src/install.js';

// We test the config read/write logic directly since install()
// targets real home directories which we can't mock easily.

const TEST_DIR = resolve(tmpdir(), 'deslint-install-test-' + Date.now());

beforeEach(() => mkdirSync(TEST_DIR, { recursive: true }));
afterEach(() => rmSync(TEST_DIR, { recursive: true, force: true }));

describe('MCP config file operations', () => {
  it('can read and write JSON config', () => {
    const configPath = resolve(TEST_DIR, 'config.json');

    // Write a config
    const config = {
      mcpServers: {
        deslint: {
          command: 'npx',
          args: ['-y', '@deslint/mcp'],
        },
      },
    };
    writeFileSync(configPath, JSON.stringify(config, null, 2));

    // Read it back
    const data = JSON.parse(readFileSync(configPath, 'utf-8'));
    expect(data.mcpServers.deslint.command).toBe('npx');
    expect(data.mcpServers.deslint.args).toEqual(['-y', '@deslint/mcp']);
  });

  it('merges with existing config without overwriting other servers', () => {
    const configPath = resolve(TEST_DIR, 'existing.json');

    // Pre-existing config with another server
    const existing = {
      mcpServers: {
        'other-tool': { command: 'npx', args: ['-y', 'other-mcp'] },
      },
    };
    writeFileSync(configPath, JSON.stringify(existing, null, 2));

    // Simulate adding deslint
    const data = JSON.parse(readFileSync(configPath, 'utf-8'));
    data.mcpServers.deslint = { command: 'npx', args: ['-y', '@deslint/mcp'] };
    writeFileSync(configPath, JSON.stringify(data, null, 2));

    // Verify both exist
    const result = JSON.parse(readFileSync(configPath, 'utf-8'));
    expect(result.mcpServers['other-tool']).toBeDefined();
    expect(result.mcpServers.deslint).toBeDefined();
  });

  it('can remove deslint from config', () => {
    const configPath = resolve(TEST_DIR, 'remove.json');

    const config = {
      mcpServers: {
        deslint: { command: 'npx', args: ['-y', '@deslint/mcp'] },
        other: { command: 'npx', args: ['-y', 'other'] },
      },
    };
    writeFileSync(configPath, JSON.stringify(config, null, 2));

    // Remove deslint
    const data = JSON.parse(readFileSync(configPath, 'utf-8'));
    delete data.mcpServers.deslint;
    writeFileSync(configPath, JSON.stringify(data, null, 2));

    const result = JSON.parse(readFileSync(configPath, 'utf-8'));
    expect(result.mcpServers.deslint).toBeUndefined();
    expect(result.mcpServers.other).toBeDefined();
  });
});

// Release-safety guard (0.7.0): a crash or disk-full mid-write must
// never leave Claude Desktop / Cursor with a partial, invalid-JSON
// config. writeJsonFile routes through a temp sibling + renameSync so
// the target is replaced atomically.
describe('writeJsonFile atomic write', () => {
  it('creates the config file on first write', () => {
    const configPath = resolve(TEST_DIR, 'first.json');
    writeJsonFile(configPath, {
      mcpServers: { deslint: { command: 'npx', args: ['-y', '@deslint/mcp'] } },
    });
    expect(existsSync(configPath)).toBe(true);
    const data = JSON.parse(readFileSync(configPath, 'utf-8'));
    expect(data.mcpServers.deslint.command).toBe('npx');
  });

  it('leaves no .tmp sibling after a successful write', () => {
    const configPath = resolve(TEST_DIR, 'clean.json');
    writeJsonFile(configPath, { mcpServers: {} });
    const leftovers = readdirSync(TEST_DIR).filter((f) => f.endsWith('.tmp'));
    expect(leftovers).toEqual([]);
  });

  it('atomically replaces an existing file', () => {
    const configPath = resolve(TEST_DIR, 'replace.json');
    writeJsonFile(configPath, {
      mcpServers: { old: { command: 'old', args: [] } },
    });
    writeJsonFile(configPath, {
      mcpServers: { fresh: { command: 'fresh', args: [] } },
    });
    const data = JSON.parse(readFileSync(configPath, 'utf-8'));
    expect(data.mcpServers.old).toBeUndefined();
    expect(data.mcpServers.fresh).toBeDefined();
  });

  it('creates the parent directory if it does not exist', () => {
    const configPath = resolve(TEST_DIR, 'nested/sub/dir/config.json');
    writeJsonFile(configPath, { mcpServers: {} });
    expect(existsSync(configPath)).toBe(true);
  });
});
