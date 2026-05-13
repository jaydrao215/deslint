import { ESLintUtils } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [
  {
    /** Extra methods to flag (default: log/debug/info/dir/trace). */
    forbiddenMethods?: string[];
    /** Methods to ALLOW even in production code. Default: ['error','warn']. */
    allowMethods?: string[];
  },
];

export type MessageIds = 'prodConsole';

/**
 * Differs from ESLint's stock `no-console` in three ways tuned for the
 * AI-coding case:
 *
 *   1. Test, spec, fixture, e2e, and tooling-script files are
 *      automatically exempt by filename — those are exactly the places
 *      `console.log` is the documented output channel.
 *   2. `console.error` and `console.warn` are allowed by default —
 *      they're how production code surfaces failures to log
 *      aggregators (Datadog / Sentry breadcrumbs / etc.).
 *   3. The default forbidden set targets the AI-tool artefacts:
 *      `log` / `debug` / `info` / `dir` / `trace`. These are the
 *      methods AI tools leave behind from "let me print this to
 *      understand what's happening" mid-build sessions.
 */

const DEFAULT_FORBIDDEN: ReadonlyArray<string> = [
  'log', 'debug', 'info', 'dir', 'trace', 'table', 'time', 'timeEnd', 'timeLog',
];

const DEFAULT_ALLOW: ReadonlyArray<string> = ['error', 'warn'];

/**
 * Files where `console.log` is the intended output channel — don't
 * fire on these. The path is matched against context.filename.
 */
function isToolingPath(filename: string): boolean {
  if (!filename) return false;
  if (/\b(?:tests?|__tests__|specs?|fixtures?|e2e|playwright|cypress)\b/i.test(filename)) return true;
  if (/\.(?:test|spec)\.[jt]sx?$/.test(filename)) return true;
  // CLI / build / migration scripts that run in a terminal. Match
  // either an absolute path segment (.../scripts/foo) or a relative
  // start-of-path segment (scripts/foo).
  if (/(?:^|[\\/])(?:scripts|bin|cli|tools|migrations|seeds)[\\/]/i.test(filename)) return true;
  return false;
}

export default createRule<Options, MessageIds>({
  name: 'no-prod-console',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Forbid `console.log`/`debug`/`info`/`dir`/`trace`/`table`/`time*` in production source. `console.error` and `console.warn` are allowed (they are production logging channels). Test/spec/fixture/e2e/script directories are exempted by filename.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          forbiddenMethods: {
            type: 'array',
            items: { type: 'string' },
            description: 'Methods to flag. Replaces the default set entirely.',
          },
          allowMethods: {
            type: 'array',
            items: { type: 'string' },
            description: 'Methods to allow. Replaces the default allow set.',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      prodConsole:
        '`console.{{method}}(...)` left in production source. AI coding tools sprinkle these in mid-build sessions. Replace with a structured logger (pino, winston, console.error) or remove it.',
    },
  },
  defaultOptions: [{ forbiddenMethods: undefined, allowMethods: undefined }],
  create(context, [options]) {
    const filename =
      (context as unknown as { physicalFilename?: string }).physicalFilename ??
      context.filename ??
      '';
    if (isToolingPath(filename)) return {};

    const forbidden = new Set<string>(options.forbiddenMethods ?? DEFAULT_FORBIDDEN);
    const allow = new Set<string>(options.allowMethods ?? DEFAULT_ALLOW);

    return {
      CallExpression(node) {
        try {
          if (node.callee.type !== 'MemberExpression') return;
          if (node.callee.object.type !== 'Identifier' || node.callee.object.name !== 'console') return;
          if (node.callee.property.type !== 'Identifier') return;
          const method = node.callee.property.name;
          if (allow.has(method)) return;
          if (!forbidden.has(method)) return;
          context.report({
            node,
            messageId: 'prodConsole',
            data: { method },
          });
        } catch (err) {
          debugLog('no-prod-console', err);
        }
      },
    };
  },
});
