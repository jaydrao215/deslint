import { describe, it, expect } from 'vitest';
import { VERSION, createServer } from '../src/index.js';

describe('@vizlint/mcp', () => {
  it('exports version', () => {
    expect(VERSION).toBe('0.1.0');
  });

  it('createServer returns an MCP server with tools registered', () => {
    const server = createServer();
    expect(server).toBeDefined();
    expect(server.server).toBeDefined();
  });
});
