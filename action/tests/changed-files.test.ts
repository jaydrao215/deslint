import { describe, it, expect, vi } from 'vitest';
import { getChangedFiles } from '../src/changed-files.js';

function makeMockOctokit(files: Array<{ filename: string; status: string }>) {
  return {
    rest: {
      pulls: {
        listFiles: vi.fn().mockResolvedValue({ data: files }),
      },
    },
  };
}

describe('getChangedFiles', () => {
  it('returns frontend files matching patterns', async () => {
    const octokit = makeMockOctokit([
      { filename: 'src/App.tsx', status: 'modified' },
      { filename: 'src/utils.ts', status: 'modified' },
      { filename: 'src/Page.vue', status: 'added' },
      { filename: 'README.md', status: 'modified' },
    ]);

    const files = await getChangedFiles(
      octokit,
      'owner',
      'repo',
      1,
      ['**/*.tsx', '**/*.vue'],
    );

    expect(files).toEqual(['src/App.tsx', 'src/Page.vue']);
  });

  it('excludes deleted files', async () => {
    const octokit = makeMockOctokit([
      { filename: 'src/Old.tsx', status: 'removed' },
      { filename: 'src/New.tsx', status: 'added' },
    ]);

    const files = await getChangedFiles(
      octokit,
      'owner',
      'repo',
      1,
      ['**/*.tsx'],
    );

    expect(files).toEqual(['src/New.tsx']);
  });

  it('returns empty array when no frontend files changed', async () => {
    const octokit = makeMockOctokit([
      { filename: 'package.json', status: 'modified' },
      { filename: 'README.md', status: 'modified' },
    ]);

    const files = await getChangedFiles(
      octokit,
      'owner',
      'repo',
      1,
      ['**/*.tsx', '**/*.jsx'],
    );

    expect(files).toEqual([]);
  });

  it('handles multiple file patterns', async () => {
    const octokit = makeMockOctokit([
      { filename: 'src/App.tsx', status: 'modified' },
      { filename: 'src/page.html', status: 'modified' },
      { filename: 'src/Component.svelte', status: 'added' },
    ]);

    const files = await getChangedFiles(
      octokit,
      'owner',
      'repo',
      1,
      ['**/*.tsx', '**/*.html', '**/*.svelte'],
    );

    expect(files).toEqual(['src/App.tsx', 'src/page.html', 'src/Component.svelte']);
  });

  it('returns empty for empty PR', async () => {
    const octokit = makeMockOctokit([]);

    const files = await getChangedFiles(
      octokit,
      'owner',
      'repo',
      1,
      ['**/*.tsx'],
    );

    expect(files).toEqual([]);
  });
});
