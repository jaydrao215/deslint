import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type Framework = 'react' | 'vue' | 'svelte' | 'angular' | 'html' | 'unknown';

/**
 * Auto-detect the frontend framework from package.json dependencies.
 * Checks for framework-specific packages in dependencies and devDependencies.
 */
export async function detectFramework(projectRoot: string): Promise<Framework> {
  try {
    const raw = await readFile(join(projectRoot, 'package.json'), 'utf-8');
    const pkg = JSON.parse(raw);
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    if ('@angular/core' in allDeps) return 'angular';
    if ('svelte' in allDeps) return 'svelte';
    if ('vue' in allDeps) return 'vue';
    if ('react' in allDeps || 'next' in allDeps || 'react-dom' in allDeps) return 'react';

    return 'unknown';
  } catch {
    return 'unknown';
  }
}
