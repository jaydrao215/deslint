import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { extractClassesFromString, parseClass } from '../utils/class-extractor.js';
import { toPx } from '../utils/spacing-map.js';
import { debugLog } from '../utils/debug.js';
import {
  createElementVisitor,
  type NormalizedElement,
} from '../utils/element-visitor.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
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
 * Matches fixed-width arbitrary values: w-[Npx], w-[Nrem], max-w-[Npx], min-w-[Npx].
 * Captures: (1) prefix (w, max-w, min-w), (2) numeric value, (3) unit (px|rem)
 *
 * These are layout-affecting constraints that can break mobile layouts when
 * set without responsive variants.
 */
const FIXED_WIDTH_ARBITRARY = /^(w|max-w|min-w)-\[(\d+(?:\.\d+)?)(px|rem)\]$/;

/** Standard responsive breakpoints in Tailwind */
const STANDARD_BREAKPOINTS = new Set(['sm', 'md', 'lg', 'xl', '2xl']);

/**
 * Collect all classes attached to an element's class/className attribute,
 * across any framework.
 *
 * For JSX, we additionally read expression-container source text as a
 * fallback so that `className={cn("w-[800px]", ...)}` still reports. For
 * other frameworks, we use the normalized static attribute value; dynamic
 * bindings (`:class="var"`, `[ngClass]="expr"`) are treated as unknown and
 * skipped — consistent with the conservative "benefit of the doubt" posture.
 */
function collectElementClasses(
  element: NormalizedElement,
  sourceCode: { getText: (node: any) => string } | null,
): Set<string> {
  const result = new Set<string>();

  for (const attr of element.attributes) {
    const lower = attr.name.toLowerCase();
    if (lower !== 'class' && lower !== 'classname') continue;

    if (typeof attr.value === 'string' && attr.value.length > 0) {
      for (const cls of extractClassesFromString(attr.value)) {
        result.add(cls);
      }
      continue;
    }

    // JSX-only fallback: read raw source of the expression container
    // (handles className={cn("bg-red-500", ...)}).
    if (
      attr.value === null &&
      element.framework === 'jsx' &&
      sourceCode
    ) {
      const attrNode = attr.node as TSESTree.JSXAttribute;
      if (attrNode?.value?.type === 'JSXExpressionContainer') {
        const expr = attrNode.value.expression;
        if (expr.type !== 'JSXEmptyExpression') {
          const raw = sourceCode
            .getText(expr)
            .replace(/^['"`]|['"`]$/g, '');
          for (const cls of extractClassesFromString(raw)) {
            result.add(cls);
          }
        }
      }
    }
  }

  return result;
}

function hasResponsiveCoverage(classes: Set<string>, bps: string[]): string[] {
  const missing: string[] = [];
  for (const bp of bps) {
    if (!STANDARD_BREAKPOINTS.has(bp)) continue;
    // Covered if any responsive variant of the same prefix family exists
    // e.g. max-w-[800px] is covered by sm:max-w-full, sm:max-w-[600px], sm:w-full, etc.
    const covered = [...classes].some(
      (cls) =>
        cls.startsWith(`${bp}:w-`) ||
        cls.startsWith(`${bp}:max-w-`) ||
        cls.startsWith(`${bp}:min-w-`),
    );
    if (!covered) missing.push(`${bp}:*`);
  }
  return missing;
}

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
        '`{{className}}` sets a fixed {{prefix}} of {{px}}px without responsive breakpoints ({{missing}}). Add `sm:w-full` or `sm:{{prefix}}-full` to prevent broken mobile layouts.',
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

    return createElementVisitor({
      check(element) {
        try {
          const allClasses = collectElementClasses(
            element,
            element.framework === 'jsx' ? context.sourceCode : null,
          );

          if (allClasses.size === 0) return;

          for (const cls of allClasses) {
            const { baseClass, variants } = parseClass(cls);

            // Skip if already has a breakpoint prefix (it IS a responsive variant)
            if (variants.some((v) => STANDARD_BREAKPOINTS.has(v))) continue;

            // Skip explicitly ignored prefixes
            if ([...ignoredPrefixes].some((p) => baseClass.startsWith(p))) continue;

            const match = baseClass.match(FIXED_WIDTH_ARBITRARY);
            if (!match) continue;

            const prefix = match[1]; // 'w', 'max-w', or 'min-w'
            const rawValue = match[2] + match[3]; // e.g. '800px' or '1.5rem'
            const px = toPx(rawValue);
            if (px === null) continue;

            // Ignore small sizing (icons, avatars) — only flag layout-scale widths
            // max-w always flags regardless of threshold (any fixed max-w can break mobile)
            if (prefix === 'w' && px < iconThreshold) continue;
            if (prefix === 'min-w' && px < iconThreshold) continue;

            const missing = hasResponsiveCoverage(allClasses, requiredBreakpoints);
            if (missing.length === 0) continue;

            // Report on the element itself. For JSX, try to find the specific
            // className attribute for a more accurate location; fall back to
            // the element node otherwise.
            let reportNode: unknown = element.node;
            if (element.framework === 'jsx') {
              const attr = element.attributes.find((a) => {
                const lower = a.name.toLowerCase();
                return lower === 'class' || lower === 'classname';
              });
              if (attr) reportNode = attr.node;
            }

            context.report({
              node: reportNode as TSESTree.Node,
              messageId: 'missingResponsive',
              data: {
                className: cls,
                prefix,
                px: String(Math.round(px)),
                missing: missing.map((m) => `${m.replace('*', `${prefix}-*`)}`).join(', '),
              },
            });
          }
        } catch (err) {
          debugLog('responsive-required', err);
          return;
        }
      },
    });
  },
});
