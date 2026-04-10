import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';
import {
  createElementVisitor,
  getStaticAttributeValue,
} from '../utils/element-visitor.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [
  {
    /** Component names treated as icons (default: common icon libraries). */
    iconComponents?: string[];
    /** Interactive wrapper elements to check (default: button, a). */
    interactiveElements?: string[];
  },
];

export type MessageIds = 'iconOnlyInteractive' | 'decorativeWithoutHidden';

/** Common icon component name patterns from popular libraries. */
const DEFAULT_ICON_PATTERNS = [
  /Icon$/i,        // FooIcon, BarIcon
  /^Icon/i,        // Icon, IconFoo
  /^Lucide/i,      // LucideCheck
  /^(Fa|Fi|Hi|Ri|Bi|Ai|Bs|Cg|Ci|Di|Fc|Gi|Go|Gr|Im|Io|Md|Pi|Si|Sl|Tb|Ti|Vsc|Wi)/,  // react-icons prefixes
  /^(ChevronRight|ChevronLeft|ChevronDown|ChevronUp|ArrowRight|ArrowLeft|ArrowDown|ArrowUp|X|Menu|Search|Plus|Minus|Check|Close|Settings|User|Mail|Phone|Star|Heart|Home|Edit|Trash|Copy|Download|Upload|Share|Filter|Sort|Calendar|Clock|Lock|Unlock|Eye|EyeOff|Bell|AlertCircle|Info|HelpCircle|ExternalLink|Link|Loader|Spinner|RefreshCw)$/,
];

const INTERACTIVE_TAGS = new Set(['button', 'a', 'summary']);

/** Attributes that provide an accessible name. */
const LABEL_ATTRIBUTES = ['aria-label', 'aria-labelledby', 'title'];

export default createRule<Options, MessageIds>({
  name: 'icon-accessibility',
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description:
        'Require accessible names on interactive elements containing only icons. Flag decorative icons missing aria-hidden.',
    },
    messages: {
      iconOnlyInteractive:
        'Interactive `<{{ tag }}>` contains only an icon (`<{{ icon }}>`) without an accessible name. Add `aria-label` to the {{ tag }} or `<span className="sr-only">` text so screen readers can announce the purpose.',
      decorativeWithoutHidden:
        'Decorative icon `<{{ icon }}>` adjacent to visible text should have `aria-hidden="true"` to prevent screen readers from announcing it twice.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          iconComponents: {
            type: 'array',
            items: { type: 'string' },
          },
          interactiveElements: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context) {
    const options = context.options[0] ?? {};
    const customIconNames = new Set(options.iconComponents ?? []);
    const customInteractive = options.interactiveElements ?? [];

    const interactiveTags = new Set([
      ...INTERACTIVE_TAGS,
      ...customInteractive.map((t) => t.toLowerCase()),
    ]);

    function isIcon(name: string): boolean {
      if (customIconNames.has(name)) return true;
      return DEFAULT_ICON_PATTERNS.some((p) => p.test(name));
    }

    return createElementVisitor({
      check(element) {
        try {
          const tag = element.tagName.toLowerCase();

          // Only check interactive elements
          if (!interactiveTags.has(tag)) return;

          // Skip if the interactive element itself has an accessible name
          for (const labelAttr of LABEL_ATTRIBUTES) {
            const val = getStaticAttributeValue(element, labelAttr);
            if (val !== null && val.trim().length > 0) return;
          }

          // Skip if element has spread (could contain aria-label)
          if (element.hasSpread) return;

          // Analyze JSX children to detect icon-only content
          // We check if the element's AST node has children that are ONLY icons
          const node = element.node as any;
          const children = getJSXChildren(node, element.framework);

          if (children.length === 0) return;

          // Check if ALL meaningful children are icons (no text content)
          let hasText = false;
          let hasIcon = false;
          let iconName = '';

          for (const child of children) {
            const childInfo = classifyChild(child, element.framework, isIcon);
            if (childInfo.type === 'text') {
              hasText = true;
            } else if (childInfo.type === 'icon') {
              hasIcon = true;
              iconName = childInfo.name;
            } else if (childInfo.type === 'sr-only') {
              // Screen reader text present — element is accessible
              return;
            } else if (childInfo.type === 'unknown') {
              // Dynamic content — give benefit of the doubt
              return;
            }
          }

          // Icon-only interactive: all children are icons, no text
          if (hasIcon && !hasText) {
            // Derive a readable label from the icon name:
            // "SearchIcon" → "Search", "ChevronRight" → "Chevron right"
            const label = deriveLabel(iconName || 'Icon');

            context.report({
              node: node,
              messageId: 'iconOnlyInteractive',
              data: {
                tag: element.tagName,
                icon: iconName || 'Icon',
              },
              fix:
                element.framework === 'jsx'
                  ? (fixer) => {
                      const jsxNode = element.node as TSESTree.JSXOpeningElement;
                      const tagEnd = jsxNode.name.range[1];
                      return fixer.insertTextAfterRange(
                        [tagEnd, tagEnd],
                        ` aria-label="${label}"`,
                      );
                    }
                  : undefined,
            });
          }
        } catch (err) {
          debugLog('icon-accessibility', err);
        }
      },
    });
  },
});

/**
 * Derive a human-readable aria-label from an icon component name.
 * "SearchIcon" → "Search", "ChevronRight" → "Chevron right",
 * "FaHeart" → "Heart", "X" → "Close"
 */
function deriveLabel(iconName: string): string {
  // Strip common suffixes/prefixes
  let name = iconName
    .replace(/Icon$/i, '')
    .replace(/^(Fa|Fi|Hi|Ri|Bi|Ai|Bs|Cg|Ci|Di|Fc|Gi|Go|Gr|Im|Io|Md|Pi|Si|Sl|Tb|Ti|Vsc|Wi|Lucide)/, '');

  if (name === 'X') return 'Close';
  if (!name) return iconName;

  // Split PascalCase into words: "ChevronRight" → "Chevron right"
  name = name.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// ── JSX Children Helpers ─────────────────────────────────────────────

interface ChildInfo {
  type: 'text' | 'icon' | 'sr-only' | 'element' | 'unknown';
  name: string;
}

function getJSXChildren(node: any, framework: string): any[] {
  if (framework === 'jsx') {
    // JSXElement → children array between opening and closing elements
    const parent = node.parent;
    if (parent?.type === 'JSXElement' && parent.children) {
      return parent.children;
    }
    return [];
  }
  // For other frameworks, return empty — we focus on JSX for now
  return [];
}

function classifyChild(child: any, framework: string, isIconCheck: (name: string) => boolean = isIconName): ChildInfo {
  if (!child) return { type: 'unknown', name: '' };

  // JSX text content
  if (child.type === 'JSXText') {
    const text = child.value?.trim() ?? '';
    if (text.length > 0) return { type: 'text', name: text };
    // Whitespace-only JSXText — not meaningful content, skip it
    return { type: 'element', name: '' };
  }

  // JSX element child
  if (child.type === 'JSXElement') {
    const opening = child.openingElement;
    if (!opening) return { type: 'unknown', name: '' };

    const name = getJSXElementName(opening);

    // Check for sr-only pattern: <span className="sr-only">
    if (name.toLowerCase() === 'span') {
      const classAttr = opening.attributes?.find(
        (a: any) =>
          a.type === 'JSXAttribute' &&
          (a.name?.name === 'className' || a.name?.name === 'class'),
      );
      if (classAttr?.value?.value?.includes('sr-only')) {
        return { type: 'sr-only', name: 'sr-only' };
      }
    }

    // Check if it's an icon component
    if (isIconCheck(name)) {
      return { type: 'icon', name };
    }

    // Regular element — could contain text
    if (child.children?.length > 0) {
      for (const grandchild of child.children) {
        const info = classifyChild(grandchild, framework, isIconCheck);
        if (info.type === 'text' || info.type === 'sr-only') return info;
      }
    }

    return { type: 'element', name };
  }

  // JSX expression container — dynamic, give benefit of doubt
  if (child.type === 'JSXExpressionContainer') {
    return { type: 'unknown', name: '' };
  }

  return { type: 'unknown', name: '' };
}

function getJSXElementName(opening: any): string {
  if (!opening?.name) return '';
  if (opening.name.type === 'JSXIdentifier') return opening.name.name;
  if (opening.name.type === 'JSXMemberExpression') {
    return `${opening.name.object?.name ?? ''}.${opening.name.property?.name ?? ''}`;
  }
  return '';
}

function isIconName(name: string): boolean {
  return DEFAULT_ICON_PATTERNS.some((p) => p.test(name));
}
