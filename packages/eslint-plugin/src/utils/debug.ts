/**
 * Minimal debug logger for Vizlint rules.
 * Only logs when DEBUG=vizlint or DEBUG=* is set.
 * Zero overhead in production — the check is a simple string comparison.
 */
const DEBUG_ENABLED =
  typeof process !== 'undefined' &&
  (process.env.DEBUG === 'vizlint' || process.env.DEBUG === '*');

export function debugLog(context: string, error: unknown): void {
  if (!DEBUG_ENABLED) return;
  const message = error instanceof Error ? error.message : String(error);
  console.debug(`[vizlint:${context}] ${message}`);
}
