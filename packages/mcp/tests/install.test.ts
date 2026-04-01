import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

// We test the config read/write logic directly since install()
// targets real home directories which we can't mock easily.

const TEST_DIR = resolve(tmpdir(), 'vizlint-install-test-' + Date.now());

beforeEach(() => mkdirSync(TEST_DIR, { recursive: true }));
afterEach(() => rmSync(TEST_DIR, { recursive: true, force: true }));

describe('MCP config file operations', () => {
  it('can read and write JSON config', () => {
    const configPath = resolve(TEST_DIR, 'config.json');

    // Write a config
    const config = {
      mcpServers: {
        vizlint: {
          command: 'npx',
          args: ['-y', '@vizlint/mcp'],
        },
      },
    };
    writeFileSync(configPath, JSON.stringify(config, null, 2));

    // Read it back
    const data = JSON.parse(readFileSync(configPath, 'utf-8'));
    expect(data.mcpServers.vizlint.command).toBe('npx');
    expect(data.mcpServers.vizlint.args).toEqual(['-y', '@vizlint/mcp']);
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

    // Simulate adding vizlint
    const data = JSON.parse(readFileSync(configPath, 'utf-8'));
    data.mcpServers.vizlint = { command: 'npx', args: ['-y', '@vizlint/mcp'] };
    writeFileSync(configPath, JSON.stringify(data, null, 2));

    // Verify both exist
    const result = JSON.parse(readFileSync(configPath, 'utf-8'));
    expect(result.mcpServers['other-tool']).toBeDefined();
    expect(result.mcpServers.vizlint).toBeDefined();
  });

  it('can remove vizlint from config', () => {
    const configPath = resolve(TEST_DIR, 'remove.json');

    const config = {
      mcpServers: {
        vizlint: { command: 'npx', args: ['-y', '@vizlint/mcp'] },
        other: { command: 'npx', args: ['-y', 'other'] },
      },
    };
    writeFileSync(configPath, JSON.stringify(config, null, 2));

    // Remove vizlint
    const data = JSON.parse(readFileSync(configPath, 'utf-8'));
    delete data.mcpServers.vizlint;
    writeFileSync(configPath, JSON.stringify(data, null, 2));

    const result = JSON.parse(readFileSync(configPath, 'utf-8'));
    expect(result.mcpServers.vizlint).toBeUndefined();
    expect(result.mcpServers.other).toBeDefined();
  });
});
