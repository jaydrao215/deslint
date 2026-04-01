import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { extractClassesFromString, parseClass } from '../utils/class-extractor.js';
import { toPx } from '../utils/spacing-map.js';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://vizlint.dev/docs/rules/${name}`
);

export type Options = [
  {
    requiredBreakpoints?: string[];
    iconSizeThreshold?: number;
    ignoredPrefixes?: string[];
  },
];

export type MessageIds = 'missingResponsive';

/**
 * Matches fixed-width arbitrary values: w-[Npx], w-[Nrem].
 * Also catches non-arbitrary fixed widths that are large layout containers
 * (w-full, w-screen are fine; w-8 at 32px is fine for icons).
 */
const FIXED_WIDTH_ARBITRARY = /^w-\[(\d+(?:\.\d+)?(?:px|rem))\]$/;

/** Standard responsive breakpoints in Tailwind */
const STANDARD_BREAKPOINTS = new Set(['sm', 'md', 'lg', 'xl', '2xl']);


export default createRule<Options, MessageIds>({
  name: 'responsive-required',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require responsive breakpoints on fixed-width layout containers to prevent broken mobile layouts.',
    },
    // NOT auto-fixable — adding responsive variants requires design decisions
    schema: [
      {
        type: 'object',
        properties: {
          requiredBreakpoints: {
            type: 'array',
            items: { type: 'string' },
            description: 'Breakpoints that must be present (default: ["sm", "md"])',
          },
          iconSizeThreshold: {
            type: 'number',
            description: 'Max px below which fixed widths are ignored as icon/avatar sizing (default: 64)',
          },
          ignoredPrefixes: {
            type: 'array',
            items: { type: 'string' },
            description: 'Class prefixes to ignore (e.g. ["max-w-"])',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      missingResponsive:
        '`{{className}}` sets a fixed width of {{px}}px without responsive breakpoints ({{missing}}). Consider adding `sm:w-full` or `md:w-auto` for responsive behavior.',
    },
  },
  defaultOptions: [
    {
      requiredBreakpoints: ['sm', 'md'],
      iconSizeThreshold: 64,
      ignoredPrefixes: [],
    },
  ],
  create(context, [options]) {
    const requiredBreakpoints = options.requiredBreakpoints ?? ['sm', 'md'];
    const iconThreshold = options.iconSizeThreshold ?? 64;
    const ignoredPrefixes = new Set(options.ignoredPrefixes ?? []);

    /**
     * Collect all classes in a JSX element (its own className + all children).
     * We need sibling/child responsive classes to decide if a fixed width is covered.
     */
    function collectElementClasses(node: TSESTree.JSXOpeningElement): Set<string> {
      const result = new Set<string>();

      function visitJSXAttr(attr: TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute) {
        if (attr.type !== 'JSXAttribute') return;
        const name = attr.name.type === 'JSXIdentifier' ? attr.name.name : null;
        if (name !== 'className' && name !== 'class') return;
        const val = attr.value;
        if (!val) return;
        let raw: string | null = null;
        if (val.type === 'Literal' && typeof val.value === 'string') {
          raw = val.value;
        } else if (val.type === 'JSXExpressionContainer') {
          const expr = val.expression;
          if (expr.type !== 'JSXEmptyExpression') {
            raw = context.sourceCode.getText(expr).replace(/^['"`]|['"`]$/g, '');
          }
        }
        if (raw) {
          for (const cls of extractClassesFromString(raw)) {
            result.add(cls);
          }
        }
      }

      for (const attr of node.attributes) {
        visitJSXAttr(attr);
      }

      return result;
    }

    function hasResponsiveCoverage(classes: Set<string>, bps: string[]): string[] {
      const missing: string[] = [];
      for (const bp of bps) {
        if (!STANDARD_BREAKPOINTS.has(bp)) continue;
        const covered = [...classes].some(
          (cls) => cls.startsWith(`${bp}:w-`) || cls.startsWith(`${bp}:max-w-`) || cls.startsWith(`${bp}:min-w-`)
        );
        if (!covered) missing.push(`${bp}:w-*`);
      }
      return missing;
    }

    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        try {
          const allClasses = collectElementClasses(node);

          for (const cls of allClasses) {
            const { baseClass, variants } = parseClass(cls);

            // Skip if already has a breakpoint prefix (it IS a responsive variant)
            if (variants.some((v) => STANDARD_BREAKPOINTS.has(v))) continue;

            // Skip explicitly ignored prefixes
            if ([...ignoredPrefixes].some((p) => baseClass.startsWith(p))) continue;

            const match = baseClass.match(FIXED_WIDTH_ARBITRARY);
            if (!match) continue;

            const px = toPx(match[1]);
            if (px === null) continue;

            // Ignore icon/avatar sizing below threshold
            if (px < iconThreshold) continue;

            const missing = hasResponsiveCoverage(allClasses, requiredBreakpoints);
            if (missing.length === 0) continue;

            // Find the JSX attribute node for accurate reporting location
            const attrNode = node.attributes.find((attr) => {
              if (attr.type !== 'JSXAttribute') return false;
              const name =
                attr.name.type === 'JSXIdentifier' ? attr.name.name : null;
              if (name !== 'className' && name !== 'class') return false;
              const val = attr.value;
              if (!val) return false;
              const src = context.sourceCode.getText(val);
              return src.includes(cls);
            }) ?? node;

            context.report({
              node: attrNode,
              messageId: 'missingResponsive',
              data: {
                className: cls,
                px: String(Math.round(px)),
                missing: missing.join(', '),
              },
            });
          }
        } catch (err) {
          debugLog('responsive-required', err);
          return;
        }
      },
    };
  },
});

