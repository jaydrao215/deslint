import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';
import {
  createElementVisitor,
  type NormalizedElement,
} from '../utils/element-visitor.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [];

export type MessageIds = 'invalidRole' | 'invalidAriaAttribute' | 'misspelledAria';

/**
 * Valid ARIA roles per WAI-ARIA 1.2.
 *
 * Source: https://www.w3.org/TR/wai-aria-1.2/#role_definitions
 *
 * Includes: abstract roles are EXCLUDED (they cannot be used in author
 * code per spec). Document structure, landmark, live region, widget, and
 * window roles are all included.
 */
const VALID_ARIA_ROLES = new Set<string>([
  // Widget roles
  'button', 'checkbox', 'gridcell', 'link', 'menuitem', 'menuitemcheckbox',
  'menuitemradio', 'option', 'progressbar', 'radio', 'scrollbar', 'searchbox',
  'separator', 'slider', 'spinbutton', 'switch', 'tab', 'tabpanel', 'textbox',
  'treeitem', 'combobox', 'grid', 'listbox', 'menu', 'menubar', 'radiogroup',
  'tablist', 'tree', 'treegrid',
  // Document structure roles
  'application', 'article', 'blockquote', 'caption', 'cell', 'columnheader',
  'definition', 'deletion', 'directory', 'document', 'emphasis', 'feed',
  'figure', 'generic', 'group', 'heading', 'img', 'insertion', 'list',
  'listitem', 'mark', 'math', 'meter', 'none', 'note', 'paragraph',
  'presentation', 'row', 'rowgroup', 'rowheader', 'separator', 'strong',
  'subscript', 'superscript', 'table', 'term', 'time', 'toolbar', 'tooltip',
  // Landmark roles
  'banner', 'complementary', 'contentinfo', 'form', 'main', 'navigation',
  'region', 'search',
  // Live region roles
  'alert', 'log', 'marquee', 'status', 'timer',
  // Window roles
  'alertdialog', 'dialog',
]);

/**
 * Valid ARIA states and properties per WAI-ARIA 1.2.
 *
 * Source: https://www.w3.org/TR/wai-aria-1.2/#state_prop_def
 */
const VALID_ARIA_ATTRIBUTES = new Set<string>([
  // Widget attributes
  'aria-autocomplete', 'aria-checked', 'aria-disabled', 'aria-errormessage',
  'aria-expanded', 'aria-haspopup', 'aria-hidden', 'aria-invalid',
  'aria-label', 'aria-level', 'aria-modal', 'aria-multiline',
  'aria-multiselectable', 'aria-orientation', 'aria-placeholder',
  'aria-pressed', 'aria-readonly', 'aria-required', 'aria-selected',
  'aria-sort', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow',
  'aria-valuetext',
  // Live region attributes
  'aria-atomic', 'aria-busy', 'aria-live', 'aria-relevant',
  // Drag-and-drop attributes
  'aria-dropeffect', 'aria-grabbed',
  // Relationship attributes
  'aria-activedescendant', 'aria-colcount', 'aria-colindex', 'aria-colspan',
  'aria-controls', 'aria-describedby', 'aria-description', 'aria-details',
  'aria-flowto', 'aria-labelledby', 'aria-owns', 'aria-posinset',
  'aria-rowcount', 'aria-rowindex', 'aria-rowspan', 'aria-setsize',
  // Global states (also widget-applicable)
  'aria-current', 'aria-keyshortcuts', 'aria-roledescription',
]);

/**
 * Common LLM and human typos that map to a real ARIA attribute. We use
 * this to give a more helpful error message ("did you mean…?") instead
 * of just "unknown attribute".
 */
const COMMON_ARIA_TYPOS: Record<string, string> = {
  'aria-labelby': 'aria-labelledby',
  'aria-labeledby': 'aria-labelledby',
  'aria-label-by': 'aria-labelledby',
  'aria-labeled-by': 'aria-labelledby',
  'aria-discribedby': 'aria-describedby',
  'aria-describby': 'aria-describedby',
  'aria-describe': 'aria-describedby',
  'aria-checkbox': 'aria-checked',
  'aria-toggled': 'aria-pressed',
  'aria-show': 'aria-hidden',
  'aria-shown': 'aria-hidden',
  'aria-expand': 'aria-expanded',
  'aria-collapsed': 'aria-expanded',
  'aria-required-fields': 'aria-required',
  'aria-readyonly': 'aria-readonly',
  'aria-readolny': 'aria-readonly',
  'aria-livre': 'aria-live',
  'aria-controlledby': 'aria-controls',
  'aria-haspop': 'aria-haspopup',
  'aira-label': 'aria-label',
  'aria-labe': 'aria-label',
  'aira-labelledby': 'aria-labelledby',
};

export default createRule<Options, MessageIds>({
  name: 'aria-validation',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid invalid ARIA roles and unknown `aria-*` attributes. Maps to WCAG 2.2 Success Criterion 4.1.2 (Name, Role, Value, Level A).',
    },
    schema: [],
    messages: {
      invalidRole:
        '`role="{{role}}"` is not a valid WAI-ARIA 1.2 role. WCAG 4.1.2 (Name, Role, Value) requires roles to be programmatically determinable; assistive tech ignores unknown roles.',
      invalidAriaAttribute:
        '`{{attr}}` is not a valid WAI-ARIA 1.2 attribute. Unknown `aria-*` attributes are silently ignored by assistive tech.',
      misspelledAria:
        '`{{attr}}` is not a valid WAI-ARIA 1.2 attribute — did you mean `{{suggestion}}`?',
    },
  },
  defaultOptions: [],
  create(context) {
    return createElementVisitor({
      check(element) {
        try {
          if (element.hasSpread) return;

          for (const attr of element.attributes) {
            const name = attr.name;
            // JSX expresses attributes camelCase or kebab-case. WAI-ARIA
            // attributes are always kebab-case in the spec; we normalize
            // for comparison but report the original.
            const normalized = name.toLowerCase();

            // ─── role="..." ────────────────────────────────────────────
            if (normalized === 'role') {
              if (attr.value === null) continue; // dynamic
              // Allow space-separated role lists per spec.
              const roles = attr.value.trim().split(/\s+/).filter(Boolean);
              for (const role of roles) {
                if (role.length === 0) continue;
                if (!VALID_ARIA_ROLES.has(role.toLowerCase())) {
                  context.report({
                    node: (attr.node ?? element.node) as TSESTree.Node,
                    messageId: 'invalidRole',
                    data: { role },
                  });
                }
              }
              continue;
            }

            // ─── aria-* attributes ─────────────────────────────────────
            // Match both kebab-case `aria-label` and camelCase `ariaLabel`,
            // but NOT non-aria attributes like `aria` or anything else.
            if (!isAriaAttribute(name)) continue;

            const kebab = toKebabCase(name);
            if (VALID_ARIA_ATTRIBUTES.has(kebab)) continue;

            const suggestion = COMMON_ARIA_TYPOS[kebab];
            if (suggestion) {
              context.report({
                node: (attr.node ?? element.node) as TSESTree.Node,
                messageId: 'misspelledAria',
                data: { attr: name, suggestion },
              });
            } else {
              context.report({
                node: (attr.node ?? element.node) as TSESTree.Node,
                messageId: 'invalidAriaAttribute',
                data: { attr: name },
              });
            }
          }
        } catch (err) {
          debugLog('aria-validation', err);
        }
      },
    });
  },
});

/**
 * True if the attribute name looks like an ARIA attribute. Accepts both
 * `aria-*` (HTML/Vue/Angular/Svelte/HTML) and `aria*` camelCase variants
 * that some JSX libraries use, plus the common-typo `aira-*` form so we
 * can give a misspelling hint instead of silently ignoring it.
 */
function isAriaAttribute(name: string): boolean {
  const lower = name.toLowerCase();
  if (lower.startsWith('aria-')) return true;
  // Catch the common typo "aira-" so we can suggest the fix.
  if (lower.startsWith('aira-')) return true;
  // camelCase `ariaLabel`, `ariaLabelledby` etc. Also matches a bare
  // `aria` which we'll detect as invalid further down.
  if (lower.startsWith('aria') && /[A-Z]/.test(name.slice(4))) return true;
  return false;
}

/**
 * Normalize an attribute name to kebab-case. Handles:
 * - already-kebab `aria-label` → `aria-label`
 * - JSX camelCase `ariaLabel` → `aria-label`
 * - mixed `aria-Labelled-By` → `aria-labelled-by`
 * - common typo `aira-label` → `aira-label` (so the typo table can fire)
 */
function toKebabCase(name: string): string {
  return name
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '')
    .replace(/-+/g, '-');
}

// Avoid `unused export` lint warnings — used by tests indirectly.
export { VALID_ARIA_ROLES, VALID_ARIA_ATTRIBUTES };
// element-visitor type re-export hint to keep imports tidy in tests
export type { NormalizedElement };
