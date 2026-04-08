#!/usr/bin/env node

/**
 * @deslint/mcp CLI entry point.
 *
 * Usage:
 *   npx @deslint/mcp          — Start MCP server (stdio)
 *   npx @deslint/mcp install  — Auto-configure Cursor/Claude Code
 *   npx @deslint/mcp uninstall — Remove configuration
 */

import { startServer } from './server.js';

const command = process.argv[2];

if (!command || command === 'serve') {
  // Default: start MCP server
  startServer().catch((err) => {
    console.error('Failed to start Deslint MCP server:', err);
    process.exit(1);
  });
} else if (command === 'install') {
  import('./install.js').then((m) => m.install()).catch((err) => {
    console.error('Install failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
} else if (command === 'uninstall') {
  import('./install.js').then((m) => m.uninstall()).catch((err) => {
    console.error('Uninstall failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
} else {
  console.error(`Unknown command: ${command}`);
  console.error('Usage: @deslint/mcp [serve|install|uninstall]');
  process.exit(1);
}
