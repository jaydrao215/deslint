import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';
import {
  createElementVisitor,
  getAttribute,
  getStaticAttributeValue,
  type NormalizedElement,
} from '../utils/element-visitor.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [];

export type MessageIds = 'missingLabel';

/**
 * Native form controls that need an associated label per WCAG 1.3.1 (Info
 * and Relationships) and 3.3.2 (Labels or Instructions).
 *
 * `button` is intentionally excluded — `<button>Submit</button>` carries its
 * accessible name from its text content, and `missing-states` already
 * handles button-specific concerns (focus, hover, disabled).
 */
const FORM_CONTROL_TAGS = new Set(['input', 'select', 'textarea']);

/**
 * `<input>` types that don't render a user-perceivable control and so
 * don't need an associated visible label. `submit`/`reset`/`button` use
 * the `value` attribute as their accessible name; `image` uses `alt`.
 */
const NON_LABELABLE_INPUT_TYPES = new Set([
  'hidden',
  'submit',
  'reset',
  'button',
  'image',
]);

interface CollectedControl {
  element: NormalizedElement;
  id: string | null;
  hasAriaLabel: boolean;
  hasAriaLabelledBy: boolean;
  hasTitle: boolean;
  type: string | null;
}

export default createRule<Options, MessageIds>({
  name: 'form-labels',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Every `<input>`, `<select>`, and `<textarea>` must have an associated label. Maps to WCAG 2.2 Success Criteria 1.3.1 (Info and Relationships, A) and 3.3.2 (Labels or Instructions, A).',
    },
    schema: [],
    messages: {
      missingLabel:
        '`<{{tag}}>` has no associated label. WCAG 1.3.1 + 3.3.2 require every form control to have an accessible name. Add a wrapping `<label>`, a `<label htmlFor="…">`, or an `aria-label`/`aria-labelledby` attribute.',
    },
  },
  defaultOptions: [],
  create(context) {
    // Cross-element state — flushed in onComplete.
    const controls: CollectedControl[] = [];
    const labelForIds = new Set<string>();
    // Underlying AST nodes of form controls that are nested inside a <label>.
    // Compared by reference identity against `controls[i].element.node`.
    const wrappedControlNodes = new WeakSet<object>();

    return createElementVisitor({
      check(element) {
        try {
          // JSX is case-sensitive: PascalCase tags are user components
          // (e.g. shadcn `<Input>`, MUI `<TextField>`) which we cannot
          // judge — they may render their own label internally. Only
          // lowercase JSX matches a native HTML element. Non-JSX frameworks
          // (HTML/Vue/Angular/Svelte) are case-insensitive in their grammar
          // so we lowercase for those.
          const isJsx = element.framework === 'jsx';
          const tag = isJsx
            ? element.tagName
            : element.tagName.toLowerCase();
          // For JSX skip anything that doesn't start lowercase — it's a
          // user component, not a native HTML element.
          if (isJsx && tag[0] !== tag[0]?.toLowerCase()) return;

          if (tag === 'label') {
            // Collect explicit `for` association (`htmlFor` in JSX).
            const forVal =
              getStaticAttributeValue(element, 'for') ??
              getStaticAttributeValue(element, 'htmlFor');
            if (forVal && forVal.trim().length > 0) {
              labelForIds.add(forVal.trim());
            }
            // Collect implicit (wrapping) association by walking descendants.
            collectWrappedFormControls(element, wrappedControlNodes);
            return;
          }

          if (!FORM_CONTROL_TAGS.has(tag)) return;
          // Spread props can carry aria-label / id we can't see — give the
          // control the benefit of the doubt.
          if (element.hasSpread) return;

          const type = getStaticAttributeValue(element, 'type');
          if (type && NON_LABELABLE_INPUT_TYPES.has(type.toLowerCase())) return;

          controls.push({
            element,
            id: getStaticAttributeValue(element, 'id'),
            hasAriaLabel: hasNonEmptyAttr(element, 'aria-label'),
            hasAriaLabelledBy: hasNonEmptyAttr(element, 'aria-labelledby'),
            hasTitle: hasNonEmptyAttr(element, 'title'),
            type,
          });
        } catch (err) {
          debugLog('form-labels-check', err);
        }
      },

      onComplete() {
        try {
          for (const c of controls) {
            // 1. aria-label / aria-labelledby provide the accessible name.
            if (c.hasAriaLabel || c.hasAriaLabelledBy) continue;

            // 2. <label for="x"> referencing this control by id.
            if (c.id && labelForIds.has(c.id)) continue;

            // 3. Wrapped inside a <label> ancestor (any framework).
            if (wrappedControlNodes.has(c.element.node as object)) continue;

            // 4. JSX-only fast path: walk parent JSX chain in case the
            //    label was processed AFTER this control or sat outside
            //    our descendant walk (e.g. fragment children).
            if (
              c.element.framework === 'jsx' &&
              hasJsxLabelAncestor(c.element.node as TSESTree.JSXOpeningElement)
            ) {
              continue;
            }

            // 5. `title` is a weak signal but accepted by accessible name
            //    computation; warn-but-don't-block if that's all there is.
            //    For now we still flag — title alone is below WCAG quality
            //    expectations and `link-text` likewise treats it as a
            //    fallback only.
            if (c.hasTitle) continue;

            context.report({
              node: c.element.node as TSESTree.Node,
              messageId: 'missingLabel',
              data: { tag: c.element.tagName },
            });
          }
        } catch (err) {
          debugLog('form-labels-onComplete', err);
        }
      },
    });
  },
});

/* ─────────────────── helpers ─────────────────── */

function hasNonEmptyAttr(element: NormalizedElement, name: string): boolean {
  const attr = getAttribute(element, name);
  if (!attr) return false;
  // Dynamic value → trust it.
  if (attr.value === null) return true;
  return attr.value.trim().length > 0;
}

/**
 * Walk up the JSX parent chain looking for a `<label>` ancestor. Works
 * because typescript-eslint sets `parent` on every JSX node.
 */
function hasJsxLabelAncestor(node: TSESTree.JSXOpeningElement): boolean {
  let current: TSESTree.Node | undefined = node.parent;
  while (current) {
    if (
      current.type === 'JSXElement' &&
      current.openingElement.name.type === 'JSXIdentifier' &&
      // Case-sensitive: only native lowercase `<label>` counts. PascalCase
      // `<Label>` is a custom component whose semantics we can't judge.
      current.openingElement.name.name === 'label'
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

/**
 * Recursively walk descendants of a `<label>` element and add the AST node
 * of every nested form control (`input`, `select`, `textarea`) to the given
 * WeakSet. Per-framework dispatch mirrors the children walkers in
 * `link-text.ts` because every parser models children differently.
 */
function collectWrappedFormControls(
  label: NormalizedElement,
  out: WeakSet<object>,
): void {
  try {
    const node = label.node as any;
    switch (label.framework) {
      case 'jsx': {
        const parent = (node as TSESTree.JSXOpeningElement)
          .parent as TSESTree.JSXElement | undefined;
        if (parent && parent.type === 'JSXElement') {
          walkJsxChildren(parent.children ?? [], out);
        }
        break;
      }
      case 'vue':
        walkVueChildren(node.children ?? [], out);
        break;
      case 'svelte':
        walkSvelteChildren(node.children ?? [], out);
        break;
      case 'angular':
        walkAngularChildren(node.children ?? [], out);
        break;
      case 'html':
        walkHtmlChildren(node.children ?? [], out);
        break;
    }
  } catch (err) {
    debugLog('form-labels-collectWrapped', err);
  }
}

function walkJsxChildren(children: readonly any[], out: WeakSet<object>): void {
  for (const child of children) {
    if (!child || child.type !== 'JSXElement') continue;
    const opening = child.openingElement;
    if (
      opening?.name?.type === 'JSXIdentifier' &&
      // Case-sensitive: only lowercase native HTML form controls.
      FORM_CONTROL_TAGS.has(String(opening.name.name))
    ) {
      out.add(opening as object);
    }
    walkJsxChildren(child.children ?? [], out);
  }
}

function walkVueChildren(children: readonly any[], out: WeakSet<object>): void {
  for (const child of children) {
    if (!child || child.type !== 'VElement') continue;
    const tagName: string =
      child.rawName ?? child.name ?? child.startTag?.name ?? '';
    if (FORM_CONTROL_TAGS.has(tagName.toLowerCase())) {
      out.add(child as object);
    }
    walkVueChildren(child.children ?? [], out);
  }
}

function walkSvelteChildren(
  children: readonly any[],
  out: WeakSet<object>,
): void {
  for (const child of children) {
    if (!child) continue;
    // Svelte nests element-like nodes via child.type === 'SvelteElement'
    if (child.type === 'SvelteElement') {
      const tagName: string =
        typeof child.name === 'string'
          ? child.name
          : typeof child.name?.name === 'string'
            ? child.name.name
            : '';
      if (FORM_CONTROL_TAGS.has(tagName.toLowerCase())) {
        out.add(child as object);
      }
      walkSvelteChildren(child.children ?? [], out);
    }
  }
}

function walkAngularChildren(
  children: readonly any[],
  out: WeakSet<object>,
): void {
  for (const child of children) {
    if (!child || typeof child.name !== 'string') continue;
    if (FORM_CONTROL_TAGS.has(child.name.toLowerCase())) {
      out.add(child as object);
    }
    if (Array.isArray(child.children)) {
      walkAngularChildren(child.children, out);
    }
  }
}

function walkHtmlChildren(
  children: readonly any[],
  out: WeakSet<object>,
): void {
  for (const child of children) {
    if (!child) continue;
    if (child.type !== 'Tag') continue;
    const tagName: string =
      typeof child.name === 'string'
        ? child.name
        : typeof child.rawName === 'string'
          ? child.rawName
          : '';
    if (FORM_CONTROL_TAGS.has(tagName.toLowerCase())) {
      out.add(child as object);
    }
    if (Array.isArray(child.children)) {
      walkHtmlChildren(child.children, out);
    }
  }
}
