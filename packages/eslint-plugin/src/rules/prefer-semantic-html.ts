import { ESLintUtils } from '@typescript-eslint/utils';
import {
  createElementVisitor,
  getStaticAttributeValue,
  type NormalizedElement,
} from '../utils/element-visitor.js';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [
  {
    checkClickHandlers?: boolean;
    checkRoles?: boolean;
  },
];

export type MessageIds = 'divWithOnClick' | 'spanWithOnClick' | 'roleReplaceable' | 'divForNav';

/**
 * Map of role attribute values → semantic HTML elements that should be used
 * instead. Only includes roles that have a 1:1 HTML equivalent.
 */
const ROLE_TO_ELEMENT: Record<string, string> = {
  button: '<button>',
  link: '<a>',
  navigation: '<nav>',
  banner: '<header>',
  contentinfo: '<footer>',
  main: '<main>',
  complementary: '<aside>',
  list: '<ul> or <ol>',
  listitem: '<li>',
  heading: '<h1>–<h6>',
  img: '<img>',
  form: '<form>',
  search: '<search> or <form>',
  article: '<article>',
  region: '<section>',
  dialog: '<dialog>',
};

/** Click handler attribute names across frameworks. */
const CLICK_HANDLERS = new Set([
  'onclick',
  'onClick',      // React
  '@click',        // Vue
  'on:click',      // Svelte
  '(click)',        // Angular
]);

export default createRule<Options, MessageIds>({
  name: 'prefer-semantic-html',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer semantic HTML elements over generic <div>/<span> with click handlers or ARIA roles. Improves accessibility and reduces ARIA boilerplate.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          checkClickHandlers: {
            type: 'boolean',
            description:
              'Flag <div onClick> and <span onClick> (default: true). Suggest <button> instead.',
          },
          checkRoles: {
            type: 'boolean',
            description:
              'Flag elements with role="X" when a semantic element exists (default: true).',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      divWithOnClick:
        '`<div>` with a click handler should be a `<button>`. Buttons provide keyboard access and screen reader support for free.',
      spanWithOnClick:
        '`<span>` with a click handler should be a `<button>`. Buttons provide keyboard access and screen reader support for free.',
      roleReplaceable:
        '`role="{{role}}"` on `<{{tag}}>` should be replaced with the semantic element {{element}}.',
      divForNav:
        '`<div>` wrapping navigation links should be a `<nav>` element.',
    },
  },
  defaultOptions: [{ checkClickHandlers: true, checkRoles: true }],
  create(context, [options]) {
    const checkClickHandlers = options.checkClickHandlers ?? true;
    const checkRoles = options.checkRoles ?? true;

    function check(element: NormalizedElement) {
      try {
        const tag = element.tagName.toLowerCase();

        // ── Click handlers on non-interactive elements ──
        if (checkClickHandlers && (tag === 'div' || tag === 'span')) {
          const hasClick = element.attributes.some((attr) =>
            CLICK_HANDLERS.has(attr.name),
          );

          if (hasClick) {
            // Skip if it already has role="presentation" or role="none"
            const roleAttr = getStaticAttributeValue(element, 'role');
            if (roleAttr === 'presentation' || roleAttr === 'none') return;

            context.report({
              node: element.node as any,
              messageId: tag === 'div' ? 'divWithOnClick' : 'spanWithOnClick',
            });
            return;
          }
        }

        // ── Role attributes with semantic HTML equivalents ──
        if (checkRoles) {
          const role = getStaticAttributeValue(element, 'role');
          if (role && ROLE_TO_ELEMENT[role]) {
            // Only flag if the current element is NOT already the semantic element
            const semanticElement = ROLE_TO_ELEMENT[role];
            const isAlreadySemantic = semanticElement.includes(`<${tag}>`);
            if (!isAlreadySemantic) {
              context.report({
                node: element.node as any,
                messageId: 'roleReplaceable',
                data: {
                  role,
                  tag,
                  element: semanticElement,
                },
              });
            }
          }
        }
      } catch (err) {
        debugLog('prefer-semantic-html', err);
        return;
      }
    }

    return createElementVisitor({ check });
  },
});
