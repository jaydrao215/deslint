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
    /** Custom dialog component names beyond the defaults. */
    dialogComponents?: string[];
  },
];

export type MessageIds =
  | 'dialogMissingAriaModal'
  | 'dialogMissingRole'
  | 'dialogMissingLabel';

/**
 * Detect dialog/modal elements missing critical focus management attributes.
 *
 * WCAG 2.4.3 (Focus Order), 2.1.2 (No Keyboard Trap): When a dialog opens,
 * focus must move into it and be constrained until dismissal. The browser does
 * this automatically for `<dialog>` (with .showModal()), but custom divs with
 * role="dialog" need explicit management.
 *
 * This rule catches the structural signals:
 * - role="dialog" or role="alertdialog" without aria-modal="true"
 * - Elements that look like dialogs (common component names) without role
 * - Dialogs missing an accessible label (aria-label or aria-labelledby)
 */

const DIALOG_ROLES = new Set(['dialog', 'alertdialog']);

const DIALOG_COMPONENT_PATTERNS = [
  /^Modal$/i,
  /^Dialog$/i,
  /^Drawer$/i,
  /^Sheet$/i,
  /^Popover$/i,
  /^AlertDialog$/i,
  /^DialogContent$/i,
  /^ModalContent$/i,
  /^DrawerContent$/i,
  /^SheetContent$/i,
  /^PopoverContent$/i,
  /^Overlay$/i,
];

/** Insert a JSX attribute after the tag name. */
function makeJsxInsertFix(element: any, attrText: string) {
  if (element.framework !== 'jsx') return undefined;
  return (fixer: any) => {
    const jsxNode = element.node as TSESTree.JSXOpeningElement;
    const tagEnd = jsxNode.name.range[1];
    return fixer.insertTextAfterRange([tagEnd, tagEnd], ` ${attrText}`);
  };
}

export default createRule<Options, MessageIds>({
  name: 'focus-trap-patterns',
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description:
        'Require dialog and modal elements to have proper focus management attributes: role, aria-modal, and accessible labels (WCAG 2.4.3, 2.1.2).',
    },
    messages: {
      dialogMissingAriaModal:
        '`<{{ tag }}>` has role="{{ role }}" but is missing `aria-modal="true"`. Without it, screen readers may not constrain navigation to the dialog (WCAG 2.4.3).',
      dialogMissingRole:
        '`<{{ tag }}>` appears to be a dialog component but lacks `role="dialog"`. Add `role="dialog"` and `aria-modal="true"` for proper focus management.',
      dialogMissingLabel:
        '`<{{ tag }}>` with role="{{ role }}" is missing an accessible label. Add `aria-label` or `aria-labelledby` so screen readers can announce the dialog\'s purpose.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          dialogComponents: {
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
    const customDialogs = options.dialogComponents ?? [];

    function isDialogComponent(name: string): boolean {
      if (customDialogs.includes(name)) return true;
      return DIALOG_COMPONENT_PATTERNS.some((p) => p.test(name));
    }

    return createElementVisitor({
      check(element) {
        try {
          const tag = element.tagName;
          const tagLower = tag.toLowerCase();

          // Skip native <dialog> — it has built-in focus management
          if (tagLower === 'dialog') return;

          // Skip if element has spread (could contain role, aria-modal)
          if (element.hasSpread) return;

          const role = getStaticAttributeValue(element, 'role');
          const ariaModal = getStaticAttributeValue(element, 'aria-modal');
          const ariaLabel = getStaticAttributeValue(element, 'aria-label');
          const ariaLabelledby = getStaticAttributeValue(element, 'aria-labelledby');

          // Case 1: Element has role="dialog"/"alertdialog"
          if (role && DIALOG_ROLES.has(role)) {
            // Check for aria-modal
            if (ariaModal !== 'true') {
              context.report({
                node: element.node as any,
                messageId: 'dialogMissingAriaModal',
                data: { tag, role },
                fix: makeJsxInsertFix(element, 'aria-modal="true"'),
              });
            }

            // Check for accessible label
            const hasLabel =
              (ariaLabel !== null && ariaLabel.trim().length > 0) ||
              (ariaLabelledby !== null && ariaLabelledby.trim().length > 0);
            const titleAttr = getStaticAttributeValue(element, 'title');
            if (!hasLabel && !(titleAttr !== null && titleAttr.trim().length > 0)) {
              context.report({
                node: element.node as any,
                messageId: 'dialogMissingLabel',
                data: { tag, role },
                fix: makeJsxInsertFix(element, 'aria-label="Dialog"'),
              });
            }

            return;
          }

          // Case 2: Component name looks like a dialog but has no role
          if (tag[0] === tag[0].toUpperCase() && tag[0] !== tag[0].toLowerCase()) {
            if (isDialogComponent(tag) && !role) {
              context.report({
                node: element.node as any,
                messageId: 'dialogMissingRole',
                data: { tag },
                fix: makeJsxInsertFix(element, 'role="dialog" aria-modal="true"'),
              });
            }
          }
        } catch (err) {
          debugLog('focus-trap-patterns', err);
        }
      },
    });
  },
});
