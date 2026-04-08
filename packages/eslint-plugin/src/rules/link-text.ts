import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';
import {
  createElementVisitor,
  getAttribute,
  type NormalizedElement,
} from '../utils/element-visitor.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [
  {
    /** Additional generic phrases to flag, beyond the built-in list. */
    additionalGenericTexts?: string[];
    /**
     * Custom component names that render anchors and should be checked
     * alongside `<a>`. JSX-only — case-sensitive (e.g. `Link`, `NextLink`).
     * Defaults to `['Link', 'NextLink']` to cover the dominant Next.js
     * idiom. Set to `[]` to check raw `<a>` only.
     */
    linkComponents?: string[];
  },
];

const DEFAULT_LINK_COMPONENTS = ['Link', 'NextLink'];

export type MessageIds = 'emptyLink' | 'genericLinkText';

/**
 * Generic anchor text we know is meaningless out of context. WCAG 2.4.4
 * (Link Purpose, In Context, Level A) requires a link's purpose be
 * determinable from its text alone or text + programmatically associated
 * context. None of these phrases satisfy that on their own.
 *
 * Comparison is case-insensitive and whitespace/punctuation normalized,
 * so "Read more →", "READ MORE", and "Read More." all match "read more".
 */
const GENERIC_LINK_TEXTS = new Set([
  'click here',
  'click',
  'here',
  'read more',
  'more',
  'more info',
  'more information',
  'learn more',
  'see more',
  'view more',
  'view',
  'this',
  'this link',
  'link',
  'this page',
  'details',
  'go',
  'continue',
]);

/** Normalize text for generic-phrase comparison: lowercase, strip non-alphanumerics from edges, collapse whitespace. */
function normalizeLinkText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Get the static text content of a normalized element. Returns:
 * - the concatenated text if all children are static text
 * - `''` if there are no children at all
 * - `null` if any child is dynamic or otherwise unknown — caller should
 *   give benefit of the doubt and skip
 *
 * This is intentionally per-framework — every parser models text children
 * differently and we want a single source of truth in this rule rather
 * than expanding the cross-rule visitor abstraction further.
 */
function getStaticTextContent(element: NormalizedElement): string | null {
  try {
    const node = element.node as any;

    switch (element.framework) {
      case 'jsx': {
        // Parent JSXElement holds .children; element.node is JSXOpeningElement.
        const parent: TSESTree.JSXElement | undefined = (
          node as TSESTree.JSXOpeningElement
        ).parent as TSESTree.JSXElement | undefined;
        if (!parent || parent.type !== 'JSXElement') return '';
        return collectJsxText(parent.children);
      }
      case 'vue':
        return collectVueText(node.children ?? []);
      case 'svelte':
        return collectSvelteText(node.children ?? []);
      case 'angular':
        return collectAngularText(node.children ?? []);
      case 'html':
        return collectHtmlText(node.children ?? []);
      default:
        return null;
    }
  } catch (err) {
    debugLog('link-text-getStaticTextContent', err);
    return null;
  }
}

function collectJsxText(children: readonly any[]): string | null {
  let out = '';
  for (const child of children) {
    if (!child) continue;
    if (child.type === 'JSXText') {
      out += child.value ?? '';
      continue;
    }
    if (child.type === 'Literal' && typeof child.value === 'string') {
      out += child.value;
      continue;
    }
    if (
      child.type === 'JSXExpressionContainer' &&
      child.expression?.type === 'Literal' &&
      typeof child.expression.value === 'string'
    ) {
      out += child.expression.value;
      continue;
    }
    if (child.type === 'JSXElement') {
      // Child element — recurse into its children. If anything returns
      // null we propagate null (unknown).
      const inner = collectJsxText(child.children ?? []);
      if (inner === null) return null;
      out += inner;
      continue;
    }
    // Dynamic expression, fragment, etc. — unknown.
    return null;
  }
  return out;
}

function collectVueText(children: readonly any[]): string | null {
  let out = '';
  for (const child of children) {
    if (!child) continue;
    if (child.type === 'VText' && typeof child.value === 'string') {
      out += child.value;
      continue;
    }
    if (child.type === 'VElement') {
      const inner = collectVueText(child.children ?? []);
      if (inner === null) return null;
      out += inner;
      continue;
    }
    return null;
  }
  return out;
}

function collectSvelteText(children: readonly any[]): string | null {
  let out = '';
  for (const child of children) {
    if (!child) continue;
    if (child.type === 'SvelteText' && typeof child.value === 'string') {
      out += child.value;
      continue;
    }
    if (child.type === 'SvelteElement') {
      const inner = collectSvelteText(child.children ?? []);
      if (inner === null) return null;
      out += inner;
      continue;
    }
    return null;
  }
  return out;
}

function collectAngularText(children: readonly any[]): string | null {
  let out = '';
  for (const child of children) {
    if (!child) continue;
    // Angular template parser uses Text/Text$3 for static text nodes.
    if (
      (child.type === 'Text' || child.type === 'Text$3') &&
      typeof child.value === 'string'
    ) {
      out += child.value;
      continue;
    }
    if (
      Array.isArray(child.children) &&
      typeof child.name === 'string'
    ) {
      const inner = collectAngularText(child.children);
      if (inner === null) return null;
      out += inner;
      continue;
    }
    return null;
  }
  return out;
}

function collectHtmlText(children: readonly any[]): string | null {
  let out = '';
  for (const child of children) {
    if (!child) continue;
    if (child.type === 'Text' && typeof child.value === 'string') {
      out += child.value;
      continue;
    }
    if (child.type === 'Tag' && Array.isArray(child.children)) {
      const inner = collectHtmlText(child.children);
      if (inner === null) return null;
      out += inner;
      continue;
    }
    return null;
  }
  return out;
}

export default createRule<Options, MessageIds>({
  name: 'link-text',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid empty anchors and generic anchor text like "click here" / "read more". Maps to WCAG 2.2 Success Criterion 2.4.4 (Link Purpose, In Context, Level A).',
    },
    schema: [
      {
        type: 'object',
        properties: {
          additionalGenericTexts: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Additional generic phrases to flag, beyond the built-in list ("click here", "read more", etc.).',
          },
          linkComponents: {
            type: 'array',
            items: { type: 'string' },
            description:
              'JSX component names (case-sensitive) that render anchors and should be checked alongside `<a>`. Defaults to ["Link","NextLink"]. Set to [] to disable.',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      emptyLink:
        '`<a>` has no accessible text. WCAG 2.4.4 (Link Purpose, A) requires every link to have descriptive text or an `aria-label`/`aria-labelledby`.',
      genericLinkText:
        '`<a>` text "{{text}}" is too generic to describe the link\'s destination. WCAG 2.4.4 (Link Purpose, A) requires link purpose be determinable from the link text. Replace with descriptive text like "Read the API reference" or add a clarifying `aria-label`.',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const extraGeneric = new Set(
      (options?.additionalGenericTexts ?? []).map((s) => normalizeLinkText(s)),
    );
    const allGeneric = new Set([...GENERIC_LINK_TEXTS, ...extraGeneric]);

    // JSX-only: case-sensitive set of component names treated as anchors.
    // Default covers the conventional Next.js `<Link>` and `<NextLink>` idioms.
    const linkComponents = new Set<string>(
      options?.linkComponents ?? DEFAULT_LINK_COMPONENTS,
    );

    function isAnchorLike(element: NormalizedElement): boolean {
      // Plain HTML element (any framework) — match <a> case-insensitively.
      if (element.tagName.toLowerCase() === 'a') return true;
      // JSX custom components — exact case-sensitive match.
      if (element.framework === 'jsx' && linkComponents.has(element.tagName)) {
        return true;
      }
      return false;
    }

    return createElementVisitor({
      // No tagNames filter — we lowercase-collide with `<link rel>` if we did.
      // Filter inside check() instead so JSX `<Link>` (PascalCase) is preserved.
      check(element) {
        try {
          if (!isAnchorLike(element)) return;
          if (element.hasSpread) return;

          // aria-labelledby is a programmatic association — give benefit of
          // the doubt (we can't follow the reference reliably).
          const labelledBy = getAttribute(element, 'aria-labelledby');
          if (labelledBy) return;

          // aria-label provides accessible name; if non-empty static value,
          // the link is fine. If dynamic, give benefit of the doubt.
          const ariaLabel = getAttribute(element, 'aria-label');
          if (ariaLabel) {
            if (ariaLabel.value === null) return; // dynamic — trust it
            if (ariaLabel.value.trim().length > 0) return; // non-empty static
            // Empty static aria-label — fall through to text-content checks.
          }

          // title attribute is a weak signal but accepted by WCAG 2.4.4
          // when other accessible name sources are absent.
          const titleAttr = getAttribute(element, 'title');
          if (titleAttr && titleAttr.value && titleAttr.value.trim().length > 0) {
            return;
          }

          const rawText = getStaticTextContent(element);
          // null = dynamic or unknown → benefit of the doubt
          if (rawText === null) return;

          const normalized = normalizeLinkText(rawText);

          if (normalized.length === 0) {
            context.report({
              node: element.node as TSESTree.Node,
              messageId: 'emptyLink',
            });
            return;
          }

          if (allGeneric.has(normalized)) {
            context.report({
              node: element.node as TSESTree.Node,
              messageId: 'genericLinkText',
              data: { text: rawText.trim() },
            });
          }
        } catch (err) {
          debugLog('link-text', err);
          return;
        }
      },
    });
  },
});
