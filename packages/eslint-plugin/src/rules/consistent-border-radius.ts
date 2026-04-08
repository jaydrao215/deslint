import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { extractClassesFromString, parseClass } from '../utils/class-extractor.js';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [
  {
    threshold?: number;
    ignoreSizeVariants?: boolean;
  },
];

export type MessageIds = 'inconsistentBorderRadius';

/**
 * Regex to match all border-radius Tailwind classes.
 * Matches: rounded, rounded-sm, rounded-md, rounded-lg, rounded-xl, rounded-2xl, rounded-3xl,
 * rounded-full, rounded-none, directional variants (rounded-t-*, rounded-tl-*, etc.),
 * arbitrary values (rounded-[8px]), and Tailwind v4 equivalents (rounded-xs).
 */
const BORDER_RADIUS_PATTERN = /^rounded(-[trblse]{1,2})?(-(?:none|xs|sm|md|lg|xl|2xl|3xl|full|\[.+\]))?$/;

/**
 * Detects component name from a JSX element tag.
 * Returns null for HTML elements (lowercase tags like div, span).
 * For PascalCase tags, returns the base name stripped of size suffixes.
 */
function getComponentBaseName(
  node: TSESTree.JSXOpeningElement,
  ignoreSizeVariants: boolean,
): string | null {
  const tag = node.name;

  let name: string | null = null;

  if (tag.type === 'JSXIdentifier') {
    // Skip HTML elements (lowercase first char)
    if (/^[a-z]/.test(tag.name)) return null;
    name = tag.name;
  } else if (tag.type === 'JSXMemberExpression') {
    // e.g., UI.Card → "Card"
    if (tag.property.type === 'JSXIdentifier') {
      name = tag.property.name;
    }
  }

  if (!name) return null;

  if (ignoreSizeVariants) {
    // Strip common size suffixes: CardSm, CardLg, CardXl, ButtonSmall, ButtonLarge
    name = name.replace(/(Xs|Sm|Md|Lg|Xl|XXl|Small|Medium|Large|ExtraLarge)$/, '');
  }

  return name;
}

/**
 * Extract a border-radius fingerprint from a className string.
 * Returns sorted array of border-radius classes (without responsive/state variants).
 */
function extractBorderRadiusFingerprint(classString: string): string[] {
  const classes = extractClassesFromString(classString);
  const radiusClasses: string[] = [];

  for (const cls of classes) {
    const { baseClass, variants } = parseClass(cls);

    // Skip responsive/state variants — we compare base border-radius only
    if (variants.length > 0) continue;

    if (BORDER_RADIUS_PATTERN.test(baseClass)) {
      radiusClasses.push(baseClass);
    }
  }

  // Sort for stable comparison
  radiusClasses.sort();

  return radiusClasses;
}

/**
 * Serialize border-radius classes for comparison.
 */
function serializeBorderRadius(classes: string[]): string {
  return classes.join(' ');
}

interface ComponentInstance {
  node: TSESTree.Node;
  radiusClasses: string[];
  rawClasses: string;
}

export default createRule<Options, MessageIds>({
  name: 'consistent-border-radius',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Detect inconsistent border-radius patterns across similar components (e.g., Cards, Buttons). Reports the dominant pattern as the suggested standard.',
    },
    // NOT auto-fixable — choosing the "correct" border-radius is a design decision
    schema: [
      {
        type: 'object',
        properties: {
          threshold: {
            type: 'number',
            description:
              'Minimum number of same-type components before checking for consistency (default: 2)',
          },
          ignoreSizeVariants: {
            type: 'boolean',
            description:
              'Treat CardSm, CardLg as different from Card (default: true). When true, size suffixes are stripped and all variants compared.',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      inconsistentBorderRadius:
        '`{{componentName}}` uses `{{actual}}` but {{count}} of {{total}} instances use `{{dominant}}`. Consider standardizing.',
    },
  },
  defaultOptions: [
    {
      threshold: 2,
      ignoreSizeVariants: true,
    },
  ],
  create(context, [options]) {
    const threshold = options.threshold ?? 2;
    const ignoreSizeVariants = options.ignoreSizeVariants ?? true;

    // Accumulate component instances across the file
    const componentMap = new Map<string, ComponentInstance[]>();

    /**
     * Extract className value from a JSX element.
     */
    function getClassNameValue(node: TSESTree.JSXOpeningElement): string | null {
      for (const attr of node.attributes) {
        if (attr.type !== 'JSXAttribute') continue;
        const name = attr.name.type === 'JSXIdentifier' ? attr.name.name : null;
        if (name !== 'className' && name !== 'class') continue;

        const val = attr.value;
        if (!val) return null;

        if (val.type === 'Literal' && typeof val.value === 'string') {
          return val.value;
        }
        if (val.type === 'JSXExpressionContainer') {
          const expr = val.expression;
          if (expr.type === 'Literal' && typeof expr.value === 'string') {
            return expr.value;
          }
          // For template literals and wrapper calls, extract the text
          if (expr.type !== 'JSXEmptyExpression') {
            const text = context.sourceCode.getText(expr);
            // Strip outer quotes/backticks
            return text.replace(/^['"`]|['"`]$/g, '');
          }
        }
      }
      return null;
    }

    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        try {
          const baseName = getComponentBaseName(node, ignoreSizeVariants);
          if (!baseName) return;

          const classValue = getClassNameValue(node);
          if (!classValue) return;

          const radiusClasses = extractBorderRadiusFingerprint(classValue);

          // Only track components that actually have border-radius classes
          if (radiusClasses.length === 0) return;

          if (!componentMap.has(baseName)) {
            componentMap.set(baseName, []);
          }
          componentMap.get(baseName)!.push({
            node,
            radiusClasses,
            rawClasses: classValue,
          });
        } catch (err) {
          debugLog('consistent-border-radius', err);
          return;
        }
      },

      'Program:exit'() {
        try {
          for (const [componentName, instances] of componentMap) {
            if (instances.length < threshold) continue;

            // Collect all border-radius patterns
            const patternCounts = new Map<string, number>();
            const patternInstances = new Map<string, ComponentInstance[]>();

            for (const instance of instances) {
              const key = serializeBorderRadius(instance.radiusClasses);
              patternCounts.set(key, (patternCounts.get(key) ?? 0) + 1);
              if (!patternInstances.has(key)) {
                patternInstances.set(key, []);
              }
              patternInstances.get(key)!.push(instance);
            }

            const totalWithRadius = [...patternCounts.values()].reduce(
              (a, b) => a + b,
              0,
            );
            if (totalWithRadius < threshold) continue;

            // All same pattern — no inconsistency
            if (patternCounts.size <= 1) continue;

            // Find the dominant pattern
            let dominantPattern = '';
            let dominantCount = 0;
            for (const [pattern, count] of patternCounts) {
              if (count > dominantCount) {
                dominantCount = count;
                dominantPattern = pattern;
              }
            }

            // Report all non-dominant instances
            for (const [pattern, patternInstanceList] of patternInstances) {
              if (pattern === dominantPattern) continue;

              for (const instance of patternInstanceList) {
                context.report({
                  node: instance.node,
                  messageId: 'inconsistentBorderRadius',
                  data: {
                    componentName,
                    actual: pattern,
                    count: String(dominantCount),
                    total: String(totalWithRadius),
                    dominant: dominantPattern,
                  },
                });
              }
            }
          }
        } catch (err) {
          debugLog('consistent-border-radius', err);
          return;
        }
      },
    };
  },
});
