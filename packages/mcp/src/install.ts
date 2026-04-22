/**
 * VIZ-023: Auto-configure Deslint MCP server for Cursor and Claude Code.
 *
 * Detects environment (Cursor vs Claude Desktop) and injects the
 * Deslint MCP server configuration into the appropriate settings file.
 *
 * 0.7.1: after the MCP wiring, optionally runs a post-install
 * onboarding flow (see `install-onboarding.ts`) that gives first-time
 * users a concrete sense of what Deslint does — scan preview,
 * Tailwind-token seed, agent-rules nudge. All three are opt-in and
 * silently skipped in non-TTY environments so CI installs are
 * unchanged.
 */

import {
  existsSync,
  readFileSync,
  writeFileSync,
  renameSync,
  unlinkSync,
  mkdirSync,
} from 'node:fs';
import { resolve, dirname } from 'node:path';
import { homedir, platform } from 'node:os';
import { randomBytes } from 'node:crypto';
import type { AgentKind } from './install-onboarding.js';

interface McpConfig {
  mcpServers?: Record<string, {
    command: string;
    args?: string[];
    env?: Record<string, string>;
  }>;
  [key: string]: unknown;
}

const DESLINT_SERVER_KEY = 'deslint';

/**
 * Get the path to the MCP server entry point.
 * Uses `npx` for portability so it works without global install.
 */
function getServerCommand(): { command: string; args: string[] } {
  return {
    command: 'npx',
    args: ['-y', '@deslint/mcp'],
  };
}

/**
 * Get platform-specific config file paths. The `agent` field drives
 * the post-install onboarding — we remember which editors we wired
 * up so the rules-file nudge step can target the right files.
 */
function getConfigPaths(): { name: string; path: string; agent: AgentKind }[] {
  const home = homedir();
  const os = platform();
  const paths: { name: string; path: string; agent: AgentKind }[] = [];

  // Claude Desktop / Claude Code
  if (os === 'darwin') {
    paths.push({
      name: 'Claude Desktop (macOS)',
      path: resolve(home, 'Library/Application Support/Claude/claude_desktop_config.json'),
      agent: 'claude',
    });
  } else if (os === 'win32') {
    paths.push({
      name: 'Claude Desktop (Windows)',
      path: resolve(home, 'AppData/Roaming/Claude/claude_desktop_config.json'),
      agent: 'claude',
    });
  } else {
    paths.push({
      name: 'Claude Desktop (Linux)',
      path: resolve(home, '.config/Claude/claude_desktop_config.json'),
      agent: 'claude',
    });
  }

  // Cursor — stores MCP config in its settings directory
  paths.push({
    name: `Cursor (${os === 'darwin' ? 'macOS' : os === 'win32' ? 'Windows' : 'Linux'})`,
    path: resolve(home, '.cursor/mcp.json'),
    agent: 'cursor',
  });

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

/**
 * Atomically replace the agent's config file. A crash or disk-full
 * mid-write must never leave Claude Desktop / Cursor with a partial,
 * invalid-JSON config — that's the difference between "restart your
 * editor" and "your editor won't start." We serialize into a temp
 * sibling, fsync-equivalent is handled by the OS on the rename, then
 * `renameSync` atomically replaces the target on POSIX (and on
 * Windows NTFS for same-volume moves, which our paths always are).
 * Tmp is cleaned up on error so a crashed run doesn't leave droppings.
 *
 * Exported for direct test coverage — not part of the public API.
 */
export function writeJsonFile(path: string, data: McpConfig): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const payload = JSON.stringify(data, null, 2) + '\n';
  const tmp = `${path}.deslint-${randomBytes(6).toString('hex')}.tmp`;
  try {
    writeFileSync(tmp, payload);
    renameSync(tmp, path);
  } catch (err) {
    try {
      if (existsSync(tmp)) unlinkSync(tmp);
    } catch {
      /* best-effort cleanup */
    }
    throw err;
  }
}

/**
 * Install Deslint MCP server into all detected config files, then
 * run the opt-in post-install onboarding (scan preview + Tailwind
 * seed + agent-rules nudge). The onboarding is a silent no-op in
 * non-TTY environments so CI / piped / Docker installs keep the
 * pre-0.7.1 behaviour.
 */
export async function install(): Promise<void> {
  const configs = getConfigPaths();
  const server = getServerCommand();
  let installed = 0;
  const wiredAgents: AgentKind[] = [];

  for (const cfg of configs) {
    const data = readJsonFile(cfg.path);

    if (!data.mcpServers) {
      data.mcpServers = {};
    }

    if (data.mcpServers[DESLINT_SERVER_KEY]) {
      console.log(`  Already configured: ${cfg.name}`);
      console.log(`    ${cfg.path}`);
      installed++;
      if (!wiredAgents.includes(cfg.agent)) wiredAgents.push(cfg.agent);
      continue;
    }

    data.mcpServers[DESLINT_SERVER_KEY] = {
      command: server.command,
      args: server.args,
    };

    writeJsonFile(cfg.path, data);
    console.log(`  Configured: ${cfg.name}`);
    console.log(`    ${cfg.path}`);
    installed++;
    if (!wiredAgents.includes(cfg.agent)) wiredAgents.push(cfg.agent);
  }

  if (installed > 0) {
    console.log('');
    console.log('  Deslint MCP server installed successfully.');
    console.log('  Restart your editor to activate.');
  } else {
    console.log('  No supported editors detected.');
    console.log('  Manually add to your MCP config:');
    console.log('');
    console.log(`  "deslint": {`);
    console.log(`    "command": "${server.command}",`);
    console.log(`    "args": ${JSON.stringify(server.args)}`);
    console.log(`  }`);
    return; // Nothing to onboard if we couldn't wire anything.
  }

  // Post-install onboarding — opt-in prompts, TTY-only, silent on CI.
  await runPostInstallOnboarding(wiredAgents);
}

/** Wire the onboarding module to real-world implementations. Split
 *  out so tests of the core install flow can skip the onboarding
 *  call entirely. */
async function runPostInstallOnboarding(wiredAgents: AgentKind[]): Promise<void> {
  const [
    { detectProjectContext, runOnboarding },
    prompts,
  ] = await Promise.all([
    import('./install-onboarding.js'),
    import('@clack/prompts'),
  ]);

  const cwd = process.cwd();
  const ctx = detectProjectContext(cwd, wiredAgents);

  // Short-circuit before we even create the prompt deps — saves the
  // no-op path a few dozen ms + avoids rendering any @clack UI chrome
  // in CI or in a non-project directory.
  if (!process.stdin.isTTY || !ctx.isProject) return;

  await runOnboarding(ctx, {
    isTTY: true,
    confirm: async (message: string) => {
      const result = await prompts.confirm({ message, initialValue: true });
      return typeof result === 'boolean' ? result : false;
    },
    runScan: async (runCwd: string) => {
      const { discoverFiles, runLint, calculateScore } = await import('@deslint/cli');
      const files = await discoverFiles({ cwd: runCwd });
      const capped = files.slice(0, 1000);
      const lint = await runLint({ files: capped, cwd: runCwd, ruleOverrides: {} });
      const score = calculateScore(lint);
      const topRules = Object.entries(lint.byRule)
        .filter(([id]) => id !== 'null' && id !== 'unknown')
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([ruleId, count]) => ({ ruleId, count }));
      return {
        score: score.overall,
        grade: score.grade,
        totalFiles: lint.totalFiles,
        filesWithViolations: lint.filesWithViolations,
        totalViolations: lint.totalViolations,
        errors: lint.bySeverity.errors,
        warnings: lint.bySeverity.warnings,
        parseErrors: lint.parseErrors ?? 0,
        topRules,
      };
    },
    importTokens: async (tokenCwd: string) => {
      const { importTailwindConfig } = await import('@deslint/shared');
      const result = await importTailwindConfig(tokenCwd);
      const ds = result.designSystem as Record<string, unknown>;
      return ds && Object.keys(ds).length > 0 ? ds : null;
    },
    log: (line: string) => console.log(line),
  });
}

/**
 * Remove Deslint MCP server from all detected config files.
 */
export function uninstall(): void {
  const configs = getConfigPaths();
  let removed = 0;

  for (const cfg of configs) {
    if (!existsSync(cfg.path)) continue;

    const data = readJsonFile(cfg.path);
    if (!data.mcpServers?.[DESLINT_SERVER_KEY]) continue;

    delete data.mcpServers[DESLINT_SERVER_KEY];

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
    console.log('  Deslint MCP server uninstalled. Restart your editor.');
  } else {
    console.log('  No Deslint MCP configuration found.');
  }
}
