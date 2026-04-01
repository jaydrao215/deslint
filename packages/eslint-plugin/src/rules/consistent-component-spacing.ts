import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { extractClassesFromString, parseClass } from '../utils/class-extractor.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://vizlint.dev/docs/rules/${name}`
);

export type Options = [
  {
    threshold?: number;
    ignoreSizeVariants?: boolean;
  },
];

export type MessageIds = 'inconsistentSpacing';

/**
 * Spacing utility prefixes — padding, margin, and gap patterns in Tailwind.
 * We group by category (padding, margin, gap) to compare like-for-like.
 */
const SPACING_CATEGORIES: Record<string, RegExp> = {
  padding: /^p([xytrblse])?-/,
  margin: /^(-)?m([xytrblse])?-/,
  gap: /^gap(-[xy])?-/,
};

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
 * Extract a spacing fingerprint from a className string.
 * Returns a map like: { padding: "p-4", margin: "m-2", gap: "gap-4" }
 * Only captures the FIRST match per category (padding direction is normalized).
 */
function extractSpacingFingerprint(classString: string): Record<string, string[]> {
  const classes = extractClassesFromString(classString);
  const fingerprint: Record<string, string[]> = {};

  for (const cls of classes) {
    const { baseClass, variants } = parseClass(cls);

    // Skip responsive/state variants — we compare base spacing only
    if (variants.length > 0) continue;

    for (const [category, pattern] of Object.entries(SPACING_CATEGORIES)) {
      if (pattern.test(baseClass)) {
        if (!fingerprint[category]) {
          fingerprint[category] = [];
        }
        fingerprint[category].push(baseClass);
      }
    }
  }

  // Sort arrays for stable comparison
  for (const key of Object.keys(fingerprint)) {
    fingerprint[key].sort();
  }

  return fingerprint;
}

/**
 * Serialize a spacing category's classes for comparison.
 */
function serializeSpacing(classes: string[]): string {
  return classes.join(' ');
}

interface ComponentInstance {
  node: TSESTree.Node;
  fingerprint: Record<string, string[]>;
  rawClasses: string;
}

export default createRule<Options, MessageIds>({
  name: 'consistent-component-spacing',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Detect inconsistent spacing patterns across similar components (e.g., Cards, Buttons). Reports the dominant pattern as the suggested standard.',
    },
    // NOT auto-fixable — choosing the "correct" spacing is a design decision
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
      inconsistentSpacing:
        '`{{componentName}}` uses {{category}} `{{actual}}` but {{count}} of {{total}} instances use `{{dominant}}`. Consider standardizing.',
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

          const fingerprint = extractSpacingFingerprint(classValue);

          // Only track components that actually have spacing classes
          if (Object.keys(fingerprint).length === 0) return;

          if (!componentMap.has(baseName)) {
            componentMap.set(baseName, []);
          }
          componentMap.get(baseName)!.push({
            node,
            fingerprint,
            rawClasses: classValue,
          });
        } catch {
          return;
        }
      },

      'Program:exit'() {
        try {
          for (const [componentName, instances] of componentMap) {
            if (instances.length < threshold) continue;

            // Check each spacing category independently
            for (const category of Object.keys(SPACING_CATEGORIES)) {
              // Collect all patterns for this category
              const patternCounts = new Map<string, number>();
              const patternInstances = new Map<string, ComponentInstance[]>();

              for (const instance of instances) {
                const spacingClasses = instance.fingerprint[category];
                if (!spacingClasses || spacingClasses.length === 0) continue;

                const key = serializeSpacing(spacingClasses);
                patternCounts.set(key, (patternCounts.get(key) ?? 0) + 1);
                if (!patternInstances.has(key)) {
                  patternInstances.set(key, []);
                }
                patternInstances.get(key)!.push(instance);
              }

              // Need at least 2 instances with this category to compare
              const totalWithCategory = [...patternCounts.values()].reduce(
                (a, b) => a + b,
                0,
              );
              if (totalWithCategory < threshold) continue;

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
                    messageId: 'inconsistentSpacing',
                    data: {
                      componentName,
                      category,
                      actual: pattern,
                      count: String(dominantCount),
                      total: String(totalWithCategory),
                      dominant: dominantPattern,
                    },
                  });
                }
              }
            }
          }
        } catch {
          return;
        }
      },
    };
  },
});
