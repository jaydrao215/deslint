import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [
  {
    maxLines?: number;
    ignoreComments?: boolean;
    ignoreBlankLines?: boolean;
  },
];

export type MessageIds = 'tooManyLines';

/**
 * Checks if a line is a comment-only line.
 */
function isCommentLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.endsWith('*/');
}

export default createRule<Options, MessageIds>({
  name: 'max-component-lines',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Flag single-file components exceeding a configurable line count threshold. Large components should be decomposed for maintainability.',
    },
    // NOT auto-fixable — decomposition requires human design decisions
    schema: [
      {
        type: 'object',
        properties: {
          maxLines: {
            type: 'number',
            description: 'Maximum lines allowed per component (default: 300)',
          },
          ignoreComments: {
            type: 'boolean',
            description: 'Exclude comment-only lines from the count (default: false)',
          },
          ignoreBlankLines: {
            type: 'boolean',
            description: 'Exclude blank lines from the count (default: false)',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      tooManyLines:
        'Component `{{name}}` has {{actual}} lines (max {{max}}). Consider decomposing into smaller components.',
    },
  },
  defaultOptions: [
    {
      maxLines: 300,
      ignoreComments: false,
      ignoreBlankLines: false,
    },
  ],
  create(context, [options]) {
    const maxLines = options.maxLines ?? 300;
    const ignoreComments = options.ignoreComments ?? false;
    const ignoreBlankLines = options.ignoreBlankLines ?? false;

    /**
     * Count effective lines in a range, optionally excluding comments and blanks.
     */
    function countLines(startLine: number, endLine: number): number {
      if (!ignoreComments && !ignoreBlankLines) {
        return endLine - startLine + 1;
      }

      const sourceCode = context.sourceCode;
      let count = 0;

      for (let i = startLine; i <= endLine; i++) {
        const lineText = sourceCode.lines[i - 1] ?? '';

        if (ignoreBlankLines && lineText.trim().length === 0) continue;
        if (ignoreComments && isCommentLine(lineText)) continue;

        count++;
      }

      return count;
    }

    /**
     * Extract component name from a function/class declaration or variable declaration.
     */
    function getComponentName(node: TSESTree.Node): string | null {
      // function MyComponent() {}
      if (
        (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') &&
        node.id?.name
      ) {
        return node.id.name;
      }

      // const MyComponent = () => {} or const MyComponent = function() {}
      if (node.parent?.type === 'VariableDeclarator' && node.parent.id?.type === 'Identifier') {
        return node.parent.id.name;
      }

      // export default function() {} — anonymous default export
      if (node.parent?.type === 'ExportDefaultDeclaration') {
        return 'default export';
      }

      // class MyComponent {}
      if (node.type === 'ClassDeclaration' && node.id?.name) {
        return node.id.name;
      }

      return null;
    }

    /**
     * Check if a function body contains JSX (making it a React component).
     */
    function containsJSX(node: TSESTree.Node): boolean {
      if (node.type === 'JSXElement' || node.type === 'JSXFragment') return true;

      // Walk children
      for (const key of Object.keys(node)) {
        if (key === 'parent') continue;
        const child = (node as any)[key];
        if (child && typeof child === 'object') {
          if (Array.isArray(child)) {
            for (const item of child) {
              if (item && typeof item.type === 'string' && containsJSX(item)) return true;
            }
          } else if (typeof child.type === 'string') {
            if (containsJSX(child)) return true;
          }
        }
      }
      return false;
    }

    /**
     * Check if a name looks like a component (PascalCase).
     */
    function isComponentName(name: string | null): boolean {
      if (!name || name === 'default export') return true; // assume default exports could be components
      return /^[A-Z]/.test(name);
    }

    function checkNode(node: TSESTree.FunctionDeclaration | TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression | TSESTree.ClassDeclaration) {
      try {
        const name = getComponentName(node);
        if (!isComponentName(name)) return;

        // For functions, check if they return JSX
        if (node.type !== 'ClassDeclaration') {
          const body = node.body;
          if (!body) return;
          if (!containsJSX(body)) return;
        }

        const startLine = node.loc.start.line;
        const endLine = node.loc.end.line;
        const lineCount = countLines(startLine, endLine);

        if (lineCount > maxLines) {
          context.report({
            node,
            messageId: 'tooManyLines',
            data: {
              name: name ?? 'Anonymous',
              actual: String(lineCount),
              max: String(maxLines),
            },
          });
        }
      } catch (err) {
        debugLog('max-component-lines', err);
        return;
      }
    }

    return {
      FunctionDeclaration: checkNode,
      ArrowFunctionExpression: checkNode,
      FunctionExpression: checkNode,
      ClassDeclaration(node: TSESTree.ClassDeclaration) {
        try {
          // Class components: check if they extend React.Component or similar
          if (!node.id?.name || !isComponentName(node.id.name)) return;

          const startLine = node.loc.start.line;
          const endLine = node.loc.end.line;
          const lineCount = countLines(startLine, endLine);

          if (lineCount > maxLines) {
            context.report({
              node,
              messageId: 'tooManyLines',
              data: {
                name: node.id.name,
                actual: String(lineCount),
                max: String(maxLines),
              },
            });
          }
        } catch (err) {
          debugLog('max-component-lines', err);
          return;
        }
      },
    };
  },
});
