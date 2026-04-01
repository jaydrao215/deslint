/**
 * VIZ-023: Auto-configure Vizlint MCP server for Cursor and Claude Code.
 *
 * Detects environment (Cursor vs Claude Desktop) and injects the
 * Vizlint MCP server configuration into the appropriate settings file.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { homedir, platform } from 'node:os';

interface McpConfig {
  mcpServers?: Record<string, {
    command: string;
    args?: string[];
    env?: Record<string, string>;
  }>;
  [key: string]: unknown;
}

const VIZLINT_SERVER_KEY = 'vizlint';

/**
 * Get the path to the MCP server entry point.
 * Uses `npx` for portability so it works without global install.
 */
function getServerCommand(): { command: string; args: string[] } {
  return {
    command: 'npx',
    args: ['-y', '@vizlint/mcp'],
  };
}

/**
 * Get platform-specific config file paths.
 */
function getConfigPaths(): { name: string; path: string }[] {
  const home = homedir();
  const os = platform();
  const paths: { name: string; path: string }[] = [];

  // Claude Desktop / Claude Code
  if (os === 'darwin') {
    paths.push({
      name: 'Claude Desktop (macOS)',
      path: resolve(home, 'Library/Application Support/Claude/claude_desktop_config.json'),
    });
  } else if (os === 'win32') {
    paths.push({
      name: 'Claude Desktop (Windows)',
      path: resolve(home, 'AppData/Roaming/Claude/claude_desktop_config.json'),
    });
  } else {
    paths.push({
      name: 'Claude Desktop (Linux)',
      path: resolve(home, '.config/Claude/claude_desktop_config.json'),
    });
  }

  // Cursor — stores MCP config in its settings directory
  if (os === 'darwin') {
    paths.push({
      name: 'Cursor (macOS)',
      path: resolve(home, '.cursor/mcp.json'),
    });
  } else if (os === 'win32') {
    paths.push({
      name: 'Cursor (Windows)',
      path: resolve(home, '.cursor/mcp.json'),
    });
  } else {
    paths.push({
      name: 'Cursor (Linux)',
      path: resolve(home, '.cursor/mcp.json'),
    });
  }

  return paths;
}

function readJsonFile(path: string): McpConfig {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return {};
  }
}

function writeJsonFile(path: string, data: McpConfig): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

/**
 * Install Vizlint MCP server into all detected config files.
 */
export function install(): void {
  const configs = getConfigPaths();
  const server = getServerCommand();
  let installed = 0;

  for (const cfg of configs) {
    const data = readJsonFile(cfg.path);

    if (!data.mcpServers) {
      data.mcpServers = {};
    }

    if (data.mcpServers[VIZLINT_SERVER_KEY]) {
      console.log(`  Already configured: ${cfg.name}`);
      console.log(`    ${cfg.path}`);
      installed++;
      continue;
    }

    data.mcpServers[VIZLINT_SERVER_KEY] = {
      command: server.command,
      args: server.args,
    };

    writeJsonFile(cfg.path, data);
    console.log(`  Configured: ${cfg.name}`);
    console.log(`    ${cfg.path}`);
    installed++;
  }

  if (installed > 0) {
    console.log('');
    console.log('  Vizlint MCP server installed successfully.');
    console.log('  Restart your editor to activate.');
  } else {
    console.log('  No supported editors detected.');
    console.log('  Manually add to your MCP config:');
    console.log('');
    console.log(`  "vizlint": {`);
    console.log(`    "command": "${server.command}",`);
    console.log(`    "args": ${JSON.stringify(server.args)}`);
    console.log(`  }`);
  }
}

/**
 * Remove Vizlint MCP server from all detected config files.
 */
export function uninstall(): void {
  const configs = getConfigPaths();
  let removed = 0;

  for (const cfg of configs) {
    if (!existsSync(cfg.path)) continue;

    const data = readJsonFile(cfg.path);
    if (!data.mcpServers?.[VIZLINT_SERVER_KEY]) continue;

    delete data.mcpServers[VIZLINT_SERVER_KEY];

    // Clean up empty mcpServers object
    if (Object.keys(data.mcpServers).length === 0) {
      delete data.mcpServers;
    }

    writeJsonFile(cfg.path, data);
    console.log(`  Removed from: ${cfg.name}`);
    console.log(`    ${cfg.path}`);
    removed++;
  }

  if (removed > 0) {
    console.log('');
    console.log('  Vizlint MCP server uninstalled. Restart your editor.');
  } else {
    console.log('  No Vizlint MCP configuration found.');
  }
}
