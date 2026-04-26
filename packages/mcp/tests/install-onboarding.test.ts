import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  mkdirSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  detectProjectContext,
  runOnboarding,
  appendAgentNudge,
  type OnboardingDeps,
  type ScanSummary,
} from '../src/install-onboarding.js';

let workDir: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'deslint-onboarding-'));
});
afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

/** Builder for the onboarding deps. Defaults to TTY=true, every
 *  prompt answered "no" — tests override only what they care about
 *  rather than re-stating the whole object. */
function buildDeps(overrides: Partial<OnboardingDeps> = {}): {
  deps: OnboardingDeps;
  log: string[];
  calls: { confirmMessages: string[]; ranScan: boolean; importedTokens: boolean };
} {
  const log: string[] = [];
  const calls = {
    confirmMessages: [] as string[],
    ranScan: false,
    importedTokens: false,
  };
  const deps: OnboardingDeps = {
    isTTY: true,
    confirm: async (message: string) => {
      calls.confirmMessages.push(message);
      return false;
    },
    runScan: async () => {
      calls.ranScan = true;
      return cleanScanSummary();
    },
    importTokens: async () => {
      calls.importedTokens = true;
      return null;
    },
    log: (line: string) => log.push(line),
    ...overrides,
  };
  return { deps, log, calls };
}

function cleanScanSummary(): ScanSummary {
  return {
    score: 100,
    grade: 'pass',
    totalFiles: 10,
    filesWithViolations: 0,
    totalViolations: 0,
    errors: 0,
    warnings: 0,
    parseErrors: 0,
    topRules: [],
  };
}

function dirtyScanSummary(): ScanSummary {
  return {
    score: 82,
    grade: 'pass',
    totalFiles: 247,
    filesWithViolations: 15,
    totalViolations: 34,
    errors: 0,
    warnings: 34,
    parseErrors: 0,
    topRules: [
      { ruleId: 'deslint/no-arbitrary-colors', count: 12 },
      { ruleId: 'deslint/prefers-reduced-motion', count: 8 },
      { ruleId: 'deslint/link-text', count: 5 },
    ],
  };
}

/** A minimal project that passes the `isProject` gate. */
function makeProjectDir(dir: string): void {
  writeFileSync(join(dir, 'package.json'), '{"name":"test"}\n');
  writeFileSync(join(dir, 'App.tsx'), 'export default () => <div/>;\n');
}

describe('detectProjectContext', () => {
  it('flags a bare tmp dir as not a project', () => {
    const ctx = detectProjectContext(workDir, ['claude']);
    expect(ctx.isProject).toBe(false);
    expect(ctx.hasTailwind).toBe(false);
    expect(ctx.hasDeslintrc).toBe(false);
  });

  it('flags a directory with package.json + .tsx as a project', () => {
    makeProjectDir(workDir);
    const ctx = detectProjectContext(workDir, ['claude']);
    expect(ctx.isProject).toBe(true);
  });

  it('detects Tailwind v3 config', () => {
    makeProjectDir(workDir);
    writeFileSync(join(workDir, 'tailwind.config.js'), 'module.exports = {};');
    const ctx = detectProjectContext(workDir, ['claude']);
    expect(ctx.hasTailwind).toBe(true);
  });

  it('detects Tailwind v4 @theme block in src/app/globals.css', () => {
    makeProjectDir(workDir);
    mkdirSync(join(workDir, 'src', 'app'), { recursive: true });
    writeFileSync(
      join(workDir, 'src', 'app', 'globals.css'),
      '@theme {\n  --color-primary: #534AB7;\n}\n',
    );
    const ctx = detectProjectContext(workDir, ['claude']);
    expect(ctx.hasTailwind).toBe(true);
  });

  it('flags existing .deslintrc.json so the seed prompt is suppressed', () => {
    makeProjectDir(workDir);
    writeFileSync(join(workDir, '.deslintrc.json'), '{}');
    const ctx = detectProjectContext(workDir, ['claude']);
    expect(ctx.hasDeslintrc).toBe(true);
  });

  it('passes the wired-agent list through unchanged', () => {
    makeProjectDir(workDir);
    const ctx = detectProjectContext(workDir, ['claude', 'cursor']);
    expect(ctx.agents).toEqual(['claude', 'cursor']);
  });
});

describe('runOnboarding — gate conditions', () => {
  it('is a silent no-op when isTTY is false (CI / piped install)', async () => {
    makeProjectDir(workDir);
    const ctx = detectProjectContext(workDir, ['claude']);
    const { deps, log, calls } = buildDeps({ isTTY: false });
    await runOnboarding(ctx, deps);
    expect(calls.confirmMessages).toEqual([]);
    expect(log).toEqual([]);
  });

  it('is a silent no-op when the CWD is not a project', async () => {
    // workDir is empty — no package.json, no frontend files.
    const ctx = detectProjectContext(workDir, ['claude']);
    const { deps, calls } = buildDeps();
    await runOnboarding(ctx, deps);
    expect(calls.confirmMessages).toEqual([]);
  });
});

describe('runOnboarding — scan prompt', () => {
  it('skips the scan when the user declines', async () => {
    makeProjectDir(workDir);
    const ctx = detectProjectContext(workDir, ['claude']);
    const { deps, calls } = buildDeps();
    await runOnboarding(ctx, deps);
    expect(calls.confirmMessages[0]).toMatch(/what Deslint catches/i);
    expect(calls.ranScan).toBe(false);
  });

  it('runs the scan and prints the Design Health Score when the user accepts', async () => {
    makeProjectDir(workDir);
    const ctx = detectProjectContext(workDir, ['claude']);
    let firstPrompt = true;
    const { deps, log, calls } = buildDeps({
      confirm: async (msg) => {
        calls.confirmMessages.push(msg);
        if (firstPrompt) {
          firstPrompt = false;
          return true;
        }
        return false;
      },
      runScan: async () => {
        calls.ranScan = true;
        return dirtyScanSummary();
      },
    });
    await runOnboarding(ctx, deps);
    expect(calls.ranScan).toBe(true);
    const joined = log.join('\n');
    expect(joined).toMatch(/Design Health Score: 82\/100/);
    expect(joined).toMatch(/no-arbitrary-colors/);
  });

  it('renders the N/A banner when the scan returns a null score', async () => {
    makeProjectDir(workDir);
    const ctx = detectProjectContext(workDir, ['claude']);
    let firstPrompt = true;
    const { deps, log, calls } = buildDeps({
      confirm: async (msg) => {
        calls.confirmMessages.push(msg);
        if (firstPrompt) {
          firstPrompt = false;
          return true;
        }
        return false;
      },
      runScan: async () => ({ ...cleanScanSummary(), score: null, grade: 'skipped' }),
    });
    await runOnboarding(ctx, deps);
    expect(log.join('\n')).toMatch(/Design Health Score: N\/A/);
  });

  it('survives a scan crash and continues to the other prompts', async () => {
    makeProjectDir(workDir);
    // A Tailwind config so prompt 2 is live.
    writeFileSync(join(workDir, 'tailwind.config.js'), 'module.exports = {};');
    const ctx = detectProjectContext(workDir, ['claude']);
    let call = 0;
    const seen: string[] = [];
    const { deps } = buildDeps({
      confirm: async (msg) => {
        seen.push(msg);
        call++;
        return call === 1; // accept scan only
      },
      runScan: async () => {
        throw new Error('boom');
      },
    });
    await runOnboarding(ctx, deps);
    // Prompt 2 (Tailwind seed) must still fire after the scan failure.
    expect(seen.some((m) => /Tailwind/i.test(m))).toBe(true);
  });
});

describe('runOnboarding — .deslintrc.json seed prompt', () => {
  it('does not appear when Tailwind is absent', async () => {
    makeProjectDir(workDir);
    const ctx = detectProjectContext(workDir, ['claude']);
    const { deps, calls } = buildDeps();
    await runOnboarding(ctx, deps);
    expect(calls.confirmMessages.some((m) => /Tailwind/i.test(m))).toBe(false);
  });

  it('does not appear when .deslintrc.json already exists', async () => {
    makeProjectDir(workDir);
    writeFileSync(join(workDir, 'tailwind.config.js'), 'module.exports = {};');
    writeFileSync(join(workDir, '.deslintrc.json'), '{"rules":{}}');
    const ctx = detectProjectContext(workDir, ['claude']);
    const { deps, calls, log } = buildDeps();
    await runOnboarding(ctx, deps);
    expect(calls.confirmMessages.some((m) => /Tailwind/i.test(m))).toBe(false);
    expect(log.join('\n')).toMatch(/\.deslintrc\.json already present/i);
  });

  it('writes .deslintrc.json with the detected designSystem on accept', async () => {
    makeProjectDir(workDir);
    writeFileSync(join(workDir, 'tailwind.config.js'), 'module.exports = {};');
    const ctx = detectProjectContext(workDir, ['claude']);
    let call = 0;
    const { deps } = buildDeps({
      confirm: async () => {
        call++;
        return call === 2; // decline scan, accept Tailwind seed
      },
      importTokens: async () => ({
        colors: { primary: '#534AB7' },
      }),
    });
    await runOnboarding(ctx, deps);
    const rcPath = join(workDir, '.deslintrc.json');
    expect(existsSync(rcPath)).toBe(true);
    const rc = JSON.parse(readFileSync(rcPath, 'utf-8'));
    expect(rc.designSystem.colors.primary).toBe('#534AB7');
  });

  it('does not write .deslintrc.json when importTokens returns null (no tokens)', async () => {
    makeProjectDir(workDir);
    writeFileSync(join(workDir, 'tailwind.config.js'), 'module.exports = {};');
    const ctx = detectProjectContext(workDir, ['claude']);
    let call = 0;
    const { deps } = buildDeps({
      confirm: async () => {
        call++;
        return call === 2;
      },
      importTokens: async () => null,
    });
    await runOnboarding(ctx, deps);
    expect(existsSync(join(workDir, '.deslintrc.json'))).toBe(false);
  });
});

describe('runOnboarding — agent rules nudge prompt', () => {
  it('appends to CLAUDE.md when that file already exists', async () => {
    makeProjectDir(workDir);
    writeFileSync(join(workDir, 'CLAUDE.md'), '# Existing rules\n\nkeep this line.\n');
    const ctx = detectProjectContext(workDir, ['claude']);
    let call = 0;
    const { deps } = buildDeps({
      confirm: async () => {
        call++;
        return call === 2; // decline scan, accept nudge (no Tailwind = no prompt 2)
      },
    });
    await runOnboarding(ctx, deps);
    const content = readFileSync(join(workDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toMatch(/keep this line/);
    expect(content).toMatch(/Deslint design-quality checks/);
    expect(content).toMatch(/mcp__deslint__analyze_file/);
  });

  it('creates CLAUDE.md fresh when it does not exist', async () => {
    makeProjectDir(workDir);
    const ctx = detectProjectContext(workDir, ['claude']);
    let call = 0;
    const { deps } = buildDeps({
      confirm: async () => {
        call++;
        return call === 2;
      },
    });
    await runOnboarding(ctx, deps);
    expect(existsSync(join(workDir, 'CLAUDE.md'))).toBe(true);
    expect(readFileSync(join(workDir, 'CLAUDE.md'), 'utf-8')).toMatch(/Deslint design-quality checks/);
  });

  it('appends to .cursorrules for cursor agents', async () => {
    makeProjectDir(workDir);
    writeFileSync(join(workDir, '.cursorrules'), 'existing cursor rules\n');
    const ctx = detectProjectContext(workDir, ['cursor']);
    let call = 0;
    const { deps } = buildDeps({
      confirm: async () => {
        call++;
        return call === 2;
      },
    });
    await runOnboarding(ctx, deps);
    const content = readFileSync(join(workDir, '.cursorrules'), 'utf-8');
    expect(content).toMatch(/existing cursor rules/);
    expect(content).toMatch(/Deslint design-quality checks/);
  });

  it('writes once to each wired agent when multiple are configured', async () => {
    makeProjectDir(workDir);
    const ctx = detectProjectContext(workDir, ['claude', 'cursor']);
    let call = 0;
    const { deps } = buildDeps({
      confirm: async () => {
        call++;
        return call === 2;
      },
    });
    await runOnboarding(ctx, deps);
    expect(existsSync(join(workDir, 'CLAUDE.md'))).toBe(true);
    expect(existsSync(join(workDir, '.cursorrules'))).toBe(true);
  });
});

describe('appendAgentNudge', () => {
  it('is idempotent — a second run does not duplicate the nudge', () => {
    makeProjectDir(workDir);
    const first = appendAgentNudge(workDir, 'claude');
    expect(first?.mode).toBe('created');
    const second = appendAgentNudge(workDir, 'claude');
    expect(second?.mode).toBe('already-present');
    // File content contains the marker exactly once.
    const content = readFileSync(join(workDir, 'CLAUDE.md'), 'utf-8');
    const markerCount = content.split('<!-- deslint-mcp:nudge -->').length - 1;
    expect(markerCount).toBe(1);
  });

  it('routes each agent to its preferred primary rules file', () => {
    mkdirSync(join(workDir, 'claude-proj'));
    mkdirSync(join(workDir, 'cursor-proj'));
    mkdirSync(join(workDir, 'codex-proj'));
    mkdirSync(join(workDir, 'windsurf-proj'));
    appendAgentNudge(join(workDir, 'claude-proj'), 'claude');
    appendAgentNudge(join(workDir, 'cursor-proj'), 'cursor');
    appendAgentNudge(join(workDir, 'codex-proj'), 'codex');
    appendAgentNudge(join(workDir, 'windsurf-proj'), 'windsurf');
    expect(existsSync(join(workDir, 'claude-proj', 'CLAUDE.md'))).toBe(true);
    expect(existsSync(join(workDir, 'cursor-proj', '.cursorrules'))).toBe(true);
    expect(existsSync(join(workDir, 'codex-proj', 'AGENTS.md'))).toBe(true);
    expect(existsSync(join(workDir, 'windsurf-proj', '.windsurfrules'))).toBe(true);
  });

  it('prefers an existing secondary file over creating the primary', () => {
    mkdirSync(join(workDir, 'cursor-proj'));
    // For a cursor agent we prefer `.cursorrules` → `AGENTS.md`.
    // If only AGENTS.md exists, we append there rather than creating
    // `.cursorrules` from scratch.
    writeFileSync(join(workDir, 'cursor-proj', 'AGENTS.md'), '# existing agents\n');
    const result = appendAgentNudge(join(workDir, 'cursor-proj'), 'cursor');
    expect(result?.relPath).toBe('AGENTS.md');
    expect(result?.mode).toBe('appended');
    expect(existsSync(join(workDir, 'cursor-proj', '.cursorrules'))).toBe(false);
  });
});
