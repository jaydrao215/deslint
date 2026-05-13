import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [
  {
    /** Extra identifier-name regexes to treat as mock-data declarations. */
    extraNames?: string[];
  },
];

export type MessageIds = 'mockNamedDeclaration' | 'placeholderEmail';

/**
 * Detect the "AI wrote the boilerplate, then forgot to remove the
 * fake data" antipattern. Two heuristics:
 *
 *   1. A variable / export with a name like `mockUsers`, `fakeData`,
 *      `dummyOrders`, `sampleUsers`, `placeholderItems`, `seedData`,
 *      whose initializer is a literal array or object. Test/fixture
 *      filenames are exempt by path.
 *
 *   2. Anywhere in production code (not just inside the declarations
 *      above): a string literal that looks like a textbook
 *      placeholder email — `john.doe@example.com`,
 *      `jane.smith@test.com`, `user@example.com`, etc. These
 *      routinely ship as the "default user" when an AI tool scaffolds
 *      a feature.
 *
 * The two arms surface different signals at different severities,
 * so they're separate messageIds.
 */

const MOCK_NAME_PATTERNS: ReadonlyArray<RegExp> = [
  /^mock([A-Z_]|s$|$)/,
  /^fake([A-Z_]|s$|$)/,
  /^dummy([A-Z_]|s$|$)/,
  /^placeholder([A-Z_]|s$|$)/,
  /^stub([A-Z_]|s$|$)/,
  /^seed([A-Z_]|s$|$)/,
  /^sample([A-Z_]|s$|$)/,
  /^test([A-Z_])/, // testUsers, but NOT plain `test`
  /^example([A-Z_])/,
];

const PLACEHOLDER_EMAIL_RE =
  /\b(?:john\.?doe|jane\.?(?:doe|smith)|test(?:user)?|user|admin|foo|bar|baz)@(?:example\.com|test\.com|test\.test|sample\.com|email\.com|domain\.com|foo\.bar|test\.local)\b/i;

function looksLikeMockName(name: string, extra: ReadonlyArray<RegExp>): boolean {
  for (const re of MOCK_NAME_PATTERNS) {
    if (re.test(name)) return true;
  }
  for (const re of extra) {
    if (re.test(name)) return true;
  }
  return false;
}

function isInsideTestPath(filename: string): boolean {
  if (!filename) return false;
  if (/\b(?:tests?|__tests__|specs?|fixtures?|mocks?|e2e|playwright|cypress|stories|storybook)\b/i.test(filename)) {
    return true;
  }
  if (/\.(?:test|spec|stories|story|mock|fixture)\.[jt]sx?$/.test(filename)) return true;
  return false;
}

function isLiteralCollection(node: TSESTree.Node | null | undefined): boolean {
  if (!node) return false;
  if (node.type === 'ArrayExpression') return true;
  if (node.type === 'ObjectExpression') return true;
  // `Object.freeze([...])` / `as const` wrappers are still mock data.
  if (node.type === 'CallExpression') {
    const callee = node.callee;
    if (
      callee.type === 'MemberExpression' &&
      callee.property.type === 'Identifier' &&
      callee.property.name === 'freeze' &&
      callee.object.type === 'Identifier' &&
      callee.object.name === 'Object'
    ) {
      const first = node.arguments[0];
      if (first && first.type !== 'SpreadElement') return isLiteralCollection(first as TSESTree.Node);
    }
  }
  if (node.type === 'TSAsExpression') return isLiteralCollection(node.expression as TSESTree.Node);
  return false;
}

export default createRule<Options, MessageIds>({
  name: 'no-mock-data-in-prod',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Flag variables named like fixtures (`mockUsers`, `fakeOrders`, `dummyData`, `seedData`, …) whose initializer is a literal array/object, plus placeholder emails (`john.doe@example.com`, `test@test.com`, …) — both common AI-tool artefacts from scaffolding sessions that get forgotten. Test/spec/fixture/story files are exempt by path.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          extraNames: {
            type: 'array',
            items: { type: 'string' },
            description: 'Additional identifier-name regex patterns (as strings) to treat as mock-data declarations.',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      mockNamedDeclaration:
        '`{{name}}` looks like fixture/mock data left in production code. Move it to a test file, a Storybook story, or a `.fixture.ts` module — or load real data at runtime.',
      placeholderEmail:
        'Placeholder email `{{email}}` in production source. AI tools scaffold these as "the default user"; real users never see them, but they ship anyway. Remove or load from a fixture.',
    },
  },
  defaultOptions: [{ extraNames: [] }],
  create(context, [options]) {
    const filename =
      (context as unknown as { physicalFilename?: string }).physicalFilename ??
      context.filename ??
      '';
    if (isInsideTestPath(filename)) return {};

    const extraRegexes = (options.extraNames ?? [])
      .map((p) => {
        try { return new RegExp(p); } catch { return null; }
      })
      .filter((r): r is RegExp => r !== null);

    function checkName(name: string, declNode: TSESTree.Node, initNode: TSESTree.Node | null): void {
      if (!looksLikeMockName(name, extraRegexes)) return;
      if (!isLiteralCollection(initNode)) return;
      context.report({ node: declNode, messageId: 'mockNamedDeclaration', data: { name } });
    }

    return {
      VariableDeclarator(node) {
        try {
          if (node.id.type !== 'Identifier') return;
          checkName(node.id.name, node, node.init ?? null);
        } catch (err) {
          debugLog('no-mock-data-in-prod', err);
        }
      },
      // `export const mockUsers = [...]` — the inner VariableDeclarator
      // case above already handles this; the export wrapper passes
      // through. No separate handler needed.

      Literal(node) {
        try {
          if (typeof node.value !== 'string') return;
          const m = PLACEHOLDER_EMAIL_RE.exec(node.value);
          if (!m) return;
          context.report({
            node,
            messageId: 'placeholderEmail',
            data: { email: m[0] },
          });
        } catch (err) {
          debugLog('no-mock-data-in-prod', err);
        }
      },
      TemplateLiteral(node) {
        try {
          if (node.expressions.length !== 0) return;
          const text = node.quasis.map((q) => q.value.cooked ?? '').join('');
          const m = PLACEHOLDER_EMAIL_RE.exec(text);
          if (!m) return;
          context.report({
            node,
            messageId: 'placeholderEmail',
            data: { email: m[0] },
          });
        } catch (err) {
          debugLog('no-mock-data-in-prod', err);
        }
      },
    };
  },
});
