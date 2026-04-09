/**
 * Shared element visitor factory — framework-agnostic element traversal.
 *
 * Normalizes element detection across:
 * - React / Preact / Solid: JSXOpeningElement
 * - Vue SFC: VElement inside Program.templateBody
 * - Angular templates: Element$1 (template-parser AST node)
 * - Svelte: SvelteElement
 * - Plain HTML: Tag (via @html-eslint/parser — wired up in sprint item S2)
 *
 * S2 lands HTML via @html-eslint/parser. The parser declares visitorKeys for
 * `Tag.children`, so ESLint auto-traverses the DOM and every `Tag(node)` fires.
 * See `normalizeHtml` for the concrete shape we consume.
 *
 * Every rule passes a single `check(element)` callback that receives a
 * `NormalizedElement` describing the tag, its attributes, whether there's a
 * spread, and the underlying AST node (for context.report).
 *
 * This is the day 1 deliverable for sprint item S1. Ports six JSX-only rules
 * (image-alt-text, missing-states, responsive-required, a11y-color-contrast,
 * consistent-border-radius, consistent-component-spacing) to cross-framework
 * become tractable once rules use this visitor instead of hand-rolling JSX
 * attribute helpers.
 *
 * Implementation pattern mirrors `class-visitor.ts` — see that file for the
 * same framework dispatch model applied to class-string extraction.
 */

import type { TSESTree } from '@typescript-eslint/utils';
import { debugLog } from './debug.js';

/** Source framework for a normalized element. */
export type Framework = 'jsx' | 'vue' | 'angular' | 'svelte' | 'html';

/**
 * A normalized attribute from any supported framework.
 *
 * `value` is null when the attribute is dynamic (e.g. JSX expression, Vue
 * binding, Angular bound attribute). Rules should treat null as "unknown —
 * give the benefit of the doubt" unless they have stronger evidence.
 */
export interface NormalizedAttribute {
  /** Attribute name as written (case-sensitive for JSX e.g. `className`, lowercase for HTML). */
  name: string;
  /** Static string value, or null if the value is dynamic / an expression. */
  value: string | null;
  /** Underlying AST node — used for `context.report({ node })`. */
  node: unknown;
  /** True for JSX spread (`{...props}`) and similar dynamic attribute containers. */
  isSpread: boolean;
}

/** A normalized element from any supported framework. */
export interface NormalizedElement {
  /** Tag name as written (e.g. `img`, `Button`, `ng-container`). */
  tagName: string;
  /** Normalized attributes. May be empty. Does NOT include spread entries — see `hasSpread`. */
  attributes: NormalizedAttribute[];
  /** True if the element has any spread / unknown-attribute container. */
  hasSpread: boolean;
  /** Underlying AST node for reporting. */
  node: unknown;
  /** Framework the element came from. */
  framework: Framework;
}

/** Callback invoked for every element a rule cares about. */
export type ElementCheckFn = (element: NormalizedElement) => void;

/**
 * Optional callback fired once per file after the visitor has finished
 * walking every element. Hooked to `Program:exit`, which ESLint runs after
 * all child nodes have been visited regardless of framework. Use this for
 * rules that need to evaluate the full collection of elements (e.g.
 * heading-hierarchy ordering, single-h1 enforcement).
 */
export type ElementCompleteFn = () => void;

/** Options for `createElementVisitor`. */
export interface ElementVisitorOptions {
  /** Called once per matched element. */
  check: ElementCheckFn;
  /**
   * Optional tag filter. If set, `check` only fires for elements whose
   * tag name (lowercased) is in this list. If omitted, all elements match.
   */
  tagNames?: readonly string[];
  /**
   * Optional finalize hook fired once at end-of-file (Program:exit). Use
   * this for cross-element rules that need the complete element set before
   * making decisions (e.g. heading-hierarchy collects then evaluates).
   */
  onComplete?: ElementCompleteFn;
}

/* ───────────────────────────────────────────────────────────────── */
/*  Helpers — exported so rule modules can use them on NormalizedElement      */
/* ───────────────────────────────────────────────────────────────── */

/**
 * Find an attribute by (case-insensitive) name. Returns `null` if not found.
 * Also checks kebab-case equivalents for camelCase JSX attributes
 * (e.g. `ariaLabel` → `aria-label`).
 */
export function getAttribute(
  element: NormalizedElement,
  name: string,
): NormalizedAttribute | null {
  const target = name.toLowerCase();
  for (const attr of element.attributes) {
    const attrName = attr.name.toLowerCase();
    if (attrName === target) return attr;
    // camelCase → kebab-case normalization (e.g. ariaLabel → aria-label)
    const kebab = attr.name.replace(/([A-Z])/g, '-$1').toLowerCase();
    if (kebab === target) return attr;
  }
  return null;
}

/**
 * Get the static string value of an attribute by name. Returns:
 * - the string value if the attribute exists and is a static string
 * - `''` if the attribute exists but is value-less (`<img alt />`)
 * - `null` if the attribute is missing OR the value is dynamic
 */
export function getStaticAttributeValue(
  element: NormalizedElement,
  name: string,
): string | null {
  const attr = getAttribute(element, name);
  if (!attr) return null;
  return attr.value;
}

/** True if the element has any spread attribute (`{...props}` etc.). */
export function hasSpreadAttribute(element: NormalizedElement): boolean {
  return element.hasSpread;
}

/* ───────────────────────────────────────────────────────────────── */
/*  Factory                                                                    */
/* ───────────────────────────────────────────────────────────────── */

/**
 * Create a framework-agnostic element visitor object. Returned value is an
 * ESLint visitor map (selector → handler) ready to spread into a rule's
 * `create()` return value.
 *
 * @example
 * ```ts
 * create(context) {
 *   return createElementVisitor({
 *     tagNames: ['img'],
 *     check(el) {
 *       const alt = getStaticAttributeValue(el, 'alt');
 *       if (alt === null && !el.hasSpread) {
 *         context.report({ node: el.node as any, messageId: 'missingAlt' });
 *       }
 *     },
 *   });
 * }
 * ```
 */
export function createElementVisitor(
  opts: ElementVisitorOptions,
): Record<string, (node: any) => void> {
  const tagFilter = opts.tagNames
    ? new Set(opts.tagNames.map((t) => t.toLowerCase()))
    : null;

  const dispatch = (element: NormalizedElement | null): void => {
    if (!element) return;
    if (tagFilter && !tagFilter.has(element.tagName.toLowerCase())) return;
    opts.check(element);
  };

  return {
    // ─── React / Preact / Solid ─────────────────────────────────────
    JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
      try {
        dispatch(normalizeJsx(node));
      } catch (err) {
        debugLog('element-visitor-jsx', err);
      }
    },

    // ─── Vue: walk templateBody manually ───────────────────────────────
    // vue-eslint-parser puts the template AST on Program.templateBody,
    // which ESLint's traverser does NOT walk. We walk it ourselves, matching
    // the pattern used in class-visitor.ts.
    Program(node: any) {
      try {
        if (node?.templateBody) {
          walkVueTemplate(node.templateBody, dispatch);
        }
      } catch (err) {
        debugLog('element-visitor-vue', err);
      }
    },

    // Selector fallback for parser environments that DO traverse templateBody
    // (e.g. vue-eslint-parser with defineTemplateBodyVisitor).
    VElement(node: any) {
      try {
        dispatch(normalizeVue(node));
      } catch (err) {
        debugLog('element-visitor-vue-selector', err);
      }
    },

    // ─── Svelte ───────────────────────────────────────────────────────
    SvelteElement(node: any) {
      try {
        dispatch(normalizeSvelte(node));
      } catch (err) {
        debugLog('element-visitor-svelte', err);
      }
    },

    // ─── Angular: Element$1 is the template-parser AST element type ──────
    'Element$1'(node: any) {
      try {
        dispatch(normalizeAngular(node));
      } catch (err) {
        debugLog('element-visitor-angular', err);
      }
    },
    // Some angular-eslint versions use plain `Element`. Register both for
    // compatibility.
    Element(node: any) {
      try {
        // Only handle Angular-shaped Element nodes (they have `inputs`/`outputs`).
        if (Array.isArray(node?.inputs) || Array.isArray(node?.outputs)) {
          dispatch(normalizeAngular(node));
        }
      } catch (err) {
        debugLog('element-visitor-angular', err);
      }
    },

    // ─── Plain HTML (via @html-eslint/parser) ───────────────────────────
    // html-eslint emits `Tag` nodes with visitorKeys on `children` so ESLint
    // auto-walks the DOM. Only true `Tag` nodes dispatch — `ScriptTag` /
    // `StyleTag` are distinct AST types and are intentionally ignored here
    // (script/style content is out of scope for element-visitor rules).
    Tag(node: any) {
      try {
        if (node?.type !== 'Tag') return;
        dispatch(normalizeHtml(node));
      } catch (err) {
        debugLog('element-visitor-html', err);
      }
    },

    // ─── End-of-file finalize hook ──────────────────────────────────
    // Program:exit fires after ESLint walks every node regardless of parser,
    // so it's the safe place to run cross-element evaluation (e.g.
    // heading-hierarchy needs the full ordered list before deciding).
    'Program:exit'() {
      if (!opts.onComplete) return;
      try {
        opts.onComplete();
      } catch (err) {
        debugLog('element-visitor-onComplete', err);
      }
    },
  };
}

/* ───────────────────────────────────────────────────────────────── */
/*  Per-framework normalizers                                                  */
/* ───────────────────────────────────────────────────────────────── */

/** Normalize a JSXOpeningElement into a NormalizedElement. */
function normalizeJsx(
  node: TSESTree.JSXOpeningElement,
): NormalizedElement | null {
  if (!node || node.type !== 'JSXOpeningElement') return null;

  const tagName = jsxTagName(node.name);
  if (!tagName) return null;

  const attributes: NormalizedAttribute[] = [];
  let hasSpread = false;

  for (const attr of node.attributes ?? []) {
    if (!attr) continue;
    if (attr.type === 'JSXSpreadAttribute') {
      hasSpread = true;
      continue;
    }
    if (attr.type !== 'JSXAttribute') continue;

    const name = jsxAttributeName(attr);
    if (!name) continue;

    attributes.push({
      name,
      value: jsxStaticAttributeValue(attr),
      node: attr,
      isSpread: false,
    });
  }

  return {
    tagName,
    attributes,
    hasSpread,
    node,
    framework: 'jsx',
  };
}

function jsxTagName(name: TSESTree.JSXTagNameExpression): string | null {
  if (name.type === 'JSXIdentifier') return name.name;
  if (name.type === 'JSXNamespacedName') {
    return `${name.namespace.name}:${name.name.name}`;
  }
  // JSXMemberExpression (e.g. `Foo.Bar`) — not a plain tag we can check
  return null;
}

function jsxAttributeName(attr: TSESTree.JSXAttribute): string | null {
  if (attr.name.type === 'JSXIdentifier') return attr.name.name;
  if (attr.name.type === 'JSXNamespacedName') {
    return `${attr.name.namespace.name}:${attr.name.name.name}`;
  }
  return null;
}

function jsxStaticAttributeValue(
  attr: TSESTree.JSXAttribute,
): string | null {
  // `<img alt />` — value-less boolean attribute
  if (attr.value === null || attr.value === undefined) return '';

  if (attr.value.type === 'Literal' && typeof attr.value.value === 'string') {
    return attr.value.value;
  }

  if (
    attr.value.type === 'JSXExpressionContainer' &&
    attr.value.expression.type === 'Literal' &&
    typeof attr.value.expression.value === 'string'
  ) {
    return attr.value.expression.value;
  }

  // Dynamic expression — unknown
  return null;
}

/** Normalize a Vue VElement into a NormalizedElement. */
function normalizeVue(node: any): NormalizedElement | null {
  if (!node) return null;
  const tagName: string | null =
    node.rawName ?? node.name ?? node.startTag?.name ?? null;
  if (typeof tagName !== 'string' || tagName.length === 0) return null;

  const attrNodes: any[] = Array.isArray(node.startTag?.attributes)
    ? node.startTag.attributes
    : [];

  const attributes: NormalizedAttribute[] = [];
  let hasSpread = false;

  for (const attr of attrNodes) {
    if (!attr) continue;
    // v-bind="..." with no argument is effectively a spread.
    // Shape: { directive: true, key: { name: { name: 'bind' }, argument: null } }
    if (
      attr.directive === true &&
      attr.key?.name?.name === 'bind' &&
      attr.key?.argument == null
    ) {
      hasSpread = true;
      continue;
    }

    // Static attribute: <img class="..." />
    if (attr.directive !== true && attr.key?.name) {
      attributes.push({
        name: String(attr.key.name),
        value:
          typeof attr.value?.value === 'string' ? attr.value.value : null,
        node: attr,
        isSpread: false,
      });
      continue;
    }

    // Bound attribute: :alt="expr" or v-bind:alt="expr"
    if (
      attr.directive === true &&
      attr.key?.name?.name === 'bind' &&
      attr.key?.argument?.name
    ) {
      const bound = String(attr.key.argument.name);
      const expr = attr.value?.expression;
      let value: string | null = null;
      if (expr?.type === 'Literal' && typeof expr.value === 'string') {
        value = expr.value;
      }
      attributes.push({ name: bound, value, node: attr, isSpread: false });
    }
  }

  return {
    tagName,
    attributes,
    hasSpread,
    node,
    framework: 'vue',
  };
}

/** Walk Vue's Program.templateBody to find every VElement. */
function walkVueTemplate(
  node: any,
  dispatch: (el: NormalizedElement | null) => void,
): void {
  if (!node || typeof node !== 'object') return;

  if (node.type === 'VElement') {
    dispatch(normalizeVue(node));
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) walkVueTemplate(child, dispatch);
  }
}

/** Normalize a SvelteElement into a NormalizedElement. */
function normalizeSvelte(node: any): NormalizedElement | null {
  if (!node) return null;
  const tagName: string | null =
    typeof node.name === 'string'
      ? node.name
      : typeof node.name?.name === 'string'
        ? node.name.name
        : null;
  if (!tagName) return null;

  const rawAttrs: any[] = Array.isArray(node.startTag?.attributes)
    ? node.startTag.attributes
    : Array.isArray(node.attributes)
      ? node.attributes
      : [];

  const attributes: NormalizedAttribute[] = [];
  let hasSpread = false;

  for (const attr of rawAttrs) {
    if (!attr) continue;
    if (attr.type === 'SvelteSpreadAttribute') {
      hasSpread = true;
      continue;
    }

    if (attr.type === 'SvelteAttribute' && typeof attr.name === 'string') {
      attributes.push({
        name: attr.name,
        value: svelteStaticAttributeValue(attr),
        node: attr,
        isSpread: false,
      });
    }
  }

  return {
    tagName,
    attributes,
    hasSpread,
    node,
    framework: 'svelte',
  };
}

function svelteStaticAttributeValue(attr: any): string | null {
  // Svelte attribute values are arrays of SvelteLiteral | SvelteMustacheTag.
  // A purely-literal array is a static string; anything with a mustache is
  // dynamic (return null).
  if (attr.value === true) return ''; // boolean attribute
  if (typeof attr.value === 'string') return attr.value;
  if (!Array.isArray(attr.value)) return null;

  let out = '';
  for (const chunk of attr.value) {
    if (chunk?.type === 'SvelteLiteral' && typeof chunk.value === 'string') {
      out += chunk.value;
    } else {
      return null; // mustache or unknown chunk — dynamic
    }
  }
  return out;
}

/** Normalize an Angular template Element node into a NormalizedElement. */
function normalizeAngular(node: any): NormalizedElement | null {
  if (!node || typeof node.name !== 'string') return null;

  const attributes: NormalizedAttribute[] = [];
  let hasSpread = false;

  // Static attributes: <img class="..." alt="..." />
  for (const attr of node.attributes ?? []) {
    if (!attr || typeof attr.name !== 'string') continue;
    attributes.push({
      name: attr.name,
      value: typeof attr.value === 'string' ? attr.value : null,
      node: attr,
      isSpread: false,
    });
  }

  // Bound inputs: [alt]="expr"
  for (const input of node.inputs ?? []) {
    if (!input || typeof input.name !== 'string') continue;
    attributes.push({
      name: input.name,
      value: null, // bound expressions are dynamic from the visitor's POV
      node: input,
      isSpread: false,
    });
  }

  // Angular doesn't have a true "spread" syntax, but *ngFor/*ngIf structural
  // directives can hide attributes on the host element. Treat their presence
  // as a weak signal we don't know the full attribute set.
  for (const tmpl of node.templateAttrs ?? []) {
    if (tmpl?.name?.startsWith?.('ng')) {
      // Not a spread per se, but flag so rules can opt out of hard errors.
      // Conservative rules should skip elements with structural directives.
      hasSpread = true;
      break;
    }
  }

  return {
    tagName: node.name,
    attributes,
    hasSpread,
    node,
    framework: 'angular',
  };
}

/**
 * Normalize a plain HTML tag (from `@html-eslint/parser`).
 *
 * AST shape (verified against @html-eslint/parser 0.59.x):
 *   Tag := { type: 'Tag', name: 'div', attributes: Attribute[], children: [], selfClosing: bool }
 *   Attribute := { type: 'Attribute', key: { value: 'class' }, value?: { value: 'foo' } }
 *
 * Notes:
 * - Tag names are lowercased by the parser — matches browser semantics.
 * - Boolean attributes (e.g. `<input disabled>`) have NO `value` property on
 *   the Attribute node. We normalize those to the empty string so they match
 *   the JSX `<img alt />` convention and rules can tell "present but empty"
 *   from "missing entirely" (null) from "dynamic" (null).
 * - Plain HTML has no spread syntax; `hasSpread` is always false.
 */
function normalizeHtml(node: any): NormalizedElement | null {
  if (!node || typeof node !== 'object') return null;
  const tagName: string | null =
    typeof node.name === 'string' ? node.name : null;
  if (!tagName) return null;

  const attributes: NormalizedAttribute[] = [];

  for (const attr of node.attributes ?? []) {
    if (!attr || typeof attr !== 'object') continue;
    const name =
      typeof attr.key?.value === 'string' ? attr.key.value : null;
    if (!name) continue;

    // Boolean attribute: value property is absent entirely (`<input disabled>`).
    // Empty-string value (`<input value="">`) is still a real value.
    const value: string | null =
      attr.value === undefined || attr.value === null
        ? ''
        : typeof attr.value.value === 'string'
          ? attr.value.value
          : null;

    attributes.push({ name, value, node: attr, isSpread: false });
  }

  return {
    tagName,
    attributes,
    hasSpread: false,
    node,
    framework: 'html',
  };
}
