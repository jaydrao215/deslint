import { VERSION, createServer } from '../src/index.js';

describe('@deslint/mcp', () => {
  it('exports VERSION as a string', () => {
    expect(typeof VERSION).toBe('string');
  });

  it('VERSION is a valid semver-like string', () => {
    // Matches patterns like 0.1.0, 1.0.0, 2.3.4-beta.1
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('VERSION matches package.json version', async () => {
    const { createRequire } = await import('node:module');
    const require = createRequire(import.meta.url);
    const pkg = require('../package.json') as { version: string };
    expect(VERSION).toBe(pkg.version);
  });

  it('createServer returns an object', () => {
    const server = createServer();
    expect(server).toBeDefined();
    expect(typeof server).toBe('object');
  });

  it('createServer returns an MCP server with a server property', () => {
    const server = createServer();
    expect(server.server).toBeDefined();
  });

  it('createServer can be called multiple times independently', () => {
    const server1 = createServer();
    const server2 = createServer();
    expect(server1).not.toBe(server2);
  });
});
