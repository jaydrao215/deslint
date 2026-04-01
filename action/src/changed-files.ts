/**
 * Get the list of changed frontend files in a PR.
 * Filters by file extension patterns and excludes deleted files.
 */

import { minimatch } from 'minimatch';

type Octokit = {
  rest: {
    pulls: {
      listFiles: (params: {
        owner: string;
        repo: string;
        pull_number: number;
        per_page: number;
        page: number;
      }) => Promise<{
        data: Array<{
          filename: string;
          status: string;
        }>;
      }>;
    };
  };
};

/**
 * Fetch changed files from the PR and filter by frontend file patterns.
 */
export async function getChangedFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  patterns: string[],
): Promise<string[]> {
  const files: string[] = [];
  let page = 1;
  const perPage = 100;

  // Paginate through all changed files
  while (true) {
    const { data } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
      per_page: perPage,
      page,
    });

    if (data.length === 0) break;

    for (const file of data) {
      // Skip deleted files
      if (file.status === 'removed') continue;

      // Check if file matches any pattern
      const matches = patterns.some((pattern) =>
        minimatch(file.filename, pattern, { matchBase: true }),
      );

      if (matches) {
        files.push(file.filename);
      }
    }

    if (data.length < perPage) break;
    page++;
  }

  return files;
}
