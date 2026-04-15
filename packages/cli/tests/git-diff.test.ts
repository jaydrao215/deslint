import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { gitDiffAddedRanges } from '../src/git-diff.js';

const repos: string[] = [];

afterEach(() => {
  for (const repo of repos.splice(0)) {
    rmSync(repo, { recursive: true, force: true });
  }
});

describe('gitDiffAddedRanges', () => {
  it('uses the merge-base so unrelated changes on the base branch are not scoped into the feature branch', () => {
    const repo = makeRepo();

    writeFileSync(join(repo, 'index.html'), '<div>base</div>\n<p>same</p>\n');
    git(repo, 'add', 'index.html');
    git(repo, 'commit', '-m', 'base');
    git(repo, 'branch', '-m', 'main');
    git(repo, 'checkout', '-b', 'feature');

    git(repo, 'checkout', 'main');
    writeFileSync(join(repo, 'index.html'), '<div>main-only</div>\n<p>same</p>\n');
    git(repo, 'commit', '-am', 'main change');

    git(repo, 'checkout', 'feature');

    const scope = gitDiffAddedRanges('main', repo);
    expect(scope.files.size).toBe(0);
  });

  it('still captures the feature branch additions after the base branch moves', () => {
    const repo = makeRepo();

    writeFileSync(join(repo, 'index.html'), '<div>base</div>\n<p>same</p>\n');
    git(repo, 'add', 'index.html');
    git(repo, 'commit', '-m', 'base');
    git(repo, 'branch', '-m', 'main');
    git(repo, 'checkout', '-b', 'feature');

    git(repo, 'checkout', 'main');
    writeFileSync(join(repo, 'index.html'), '<div>main-only</div>\n<p>same</p>\n');
    git(repo, 'commit', '-am', 'main change');

    git(repo, 'checkout', 'feature');
    writeFileSync(join(repo, 'index.html'), '<div>base</div>\n<p>feature</p>\n');

    const scope = gitDiffAddedRanges('main', repo);
    const file = join(repo, 'index.html');
    expect(scope.files.get(file)).toEqual([[2, 2]]);
  });
});

function makeRepo(): string {
  const repo = mkdtempSync(join(tmpdir(), 'deslint-git-diff-'));
  repos.push(repo);
  git(repo, 'init');
  git(repo, 'config', 'user.email', 'test@example.com');
  git(repo, 'config', 'user.name', 'Deslint Test');
  return repo;
}

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}
