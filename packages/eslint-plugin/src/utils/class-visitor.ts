/**
 * Shared AST visitor factory for extracting class strings from:
 * - React/Preact/Solid: className="..." or class="..."
 * - Angular: class="...", [ngClass]="{'class': cond}", [class.name]="cond"
 * - Vue: class="...", :class="...", v-bind:class="..."
 * - Svelte: class="...", class:name={expr}
 * - HTML: class="..."
 * - Utility wrappers: cn(), clsx(), cva(), cx(), twMerge(), classNames()
 *
 * Each rule passes its own `checkClassString(value, node)` callback.
 */

import type { TSESTree } from '@typescript-eslint/utils';
import { debugLog } from './debug.js';

/** Class wrapper function names that contain Tailwind classes */
const CLASS_WRAPPERS = new Set([
  'cn', 'clsx', 'cva', 'cx', 'twMerge', 'classNames', 'classnames',
]);

type CheckFn = (value: string, node: TSESTree.Node) => void;

/**
 * Creates an ESLint visitor object that extracts class strings
 * from all supported frameworks and passes them to `check`.
 */
export function createClassVisitor(check: CheckFn): Record<string, (node: any) => void> {
  return {
    // ─── React / Preact / Solid: className="..." or class="..." ───
    JSXAttribute(node: TSESTree.JSXAttribute) {
      try {
        const name = node.name.type === 'JSXIdentifier' ? node.name.name : null;
        if (name !== 'className' && name !== 'class') return;

        if (node.value?.type === 'Literal' && typeof node.value.value === 'string') {
          check(node.value.value, node.value);
        }

        if (node.value?.type === 'JSXExpressionContainer') {
          visitExpression(node.value.expression, check);
        }
      } catch (err) { debugLog('class-visitor', err); return; }
    },

    // ─── Vue: static class="..." (vue-eslint-parser VAttribute) ───
    'VAttribute[key.name="class"]'(node: any) {
      try {
        if (node.value?.value && typeof node.value.value === 'string') {
          check(node.value.value, node.value);
        }
      } catch (err) { debugLog('class-visitor', err); return; }
    },

    // ─── Vue: :class binding (VExpressionContainer) ───
    // Handles: :class="'bg-red-500 p-4'" (string literal)
    // Handles: :class="{'bg-red-500': isActive}" (object syntax)
    // Handles: :class="['bg-red-500', 'p-4']" (array syntax)
    'VAttribute[directive=true][key.name.name="bind"][key.argument.name="class"]'(node: any) {
      try {
        visitVueClassBinding(node, check);
      } catch (err) { debugLog('class-visitor', err); return; }
    },

    // ─── Svelte: class="..." (static attribute) ───
    // svelte-eslint-parser produces SvelteAttribute nodes
    'SvelteAttribute[name="class"]'(node: any) {
      try {
        visitSvelteClassAttribute(node, check);
      } catch (err) { debugLog('class-visitor', err); return; }
    },

    // ─── Svelte: class:name={expr} directive ───
    // Reports the directive name as a class (e.g., class:active → "active")
    'SvelteDirective[kind="Class"]'(node: any) {
      try {
        if (node.key?.name && typeof node.key.name === 'string') {
          check(node.key.name, node);
        }
      } catch (err) { debugLog('class-visitor', err); return; }
    },

    // ─── Angular: BoundAttribute for [ngClass] and [class.*] ───
    // @angular-eslint/template-parser produces these AST nodes.
    'BoundAttribute[name="ngClass"]'(node: any) {
      try {
        visitAngularNgClass(node, check);
      } catch (err) { debugLog('class-visitor', err); return; }
    },

    // ─── Angular: TextAttribute for static class="..." ───
    'TextAttribute[name="class"]'(node: any) {
      try {
        if (typeof node.value === 'string') {
          check(node.value, node);
        }
      } catch (err) { debugLog('class-visitor', err); return; }
    },

    // ─── Angular: BoundAttribute for [class]="expr" ───
    'BoundAttribute[name="class"]'(node: any) {
      try {
        if (node.value?.type === 'ASTWithSource' || node.value?.ast) {
          const ast = node.value.ast ?? node.value;
          visitAngularExpression(ast, node, check);
        }
      } catch (err) { debugLog('class-visitor', err); return; }
    },
  };
}

function visitExpression(expr: any, check: CheckFn): void {
  if (!expr) return;

  // String literal: className={"bg-[#FF0000]"}
  if (expr.type === 'Literal' && typeof expr.value === 'string') {
    check(expr.value, expr);
  }

  // Template literal: className={`bg-[#FF0000] ${var}`}
  if (expr.type === 'TemplateLiteral') {
    for (const quasi of expr.quasis) {
      if (quasi.value.raw) {
        check(quasi.value.raw, quasi);
      }
    }
  }

  // Wrapper call: className={cn("bg-[#FF0000]", "p-4")}
  if (
    expr.type === 'CallExpression' &&
    expr.callee.type === 'Identifier' &&
    CLASS_WRAPPERS.has(expr.callee.name)
  ) {
    for (const arg of expr.arguments) {
      if (arg.type === 'Literal' && typeof arg.value === 'string') {
        check(arg.value, arg);
      }
      if (arg.type === 'TemplateLiteral') {
        for (const quasi of arg.quasis) {
          if (quasi.value.raw) {
            check(quasi.value.raw, quasi);
          }
        }
      }
    }
  }
}

/**
 * Extract class strings from Vue :class bindings.
 * Handles string literals, object syntax, and array syntax.
 */
function visitVueClassBinding(node: any, check: CheckFn): void {
  const expr = node.value?.expression;
  if (!expr) return;

  // :class="'bg-red-500 p-4'" — string literal
  if (expr.type === 'Literal' && typeof expr.value === 'string') {
    check(expr.value, node);
    return;
  }

  // :class="{'bg-red-500': isActive, 'p-4': true}" — object expression
  if (expr.type === 'ObjectExpression') {
    for (const prop of expr.properties ?? []) {
      if (prop.type === 'Property' && prop.key) {
        if (prop.key.type === 'Literal' && typeof prop.key.value === 'string') {
          check(prop.key.value, node);
        } else if (prop.key.type === 'Identifier' && prop.key.name) {
          check(prop.key.name, node);
        }
      }
    }
    return;
  }

  // :class="['bg-red-500', 'p-4']" — array expression
  if (expr.type === 'ArrayExpression') {
    for (const el of expr.elements ?? []) {
      if (el?.type === 'Literal' && typeof el.value === 'string') {
        check(el.value, node);
      }
    }
    return;
  }

  // :class="someVariable" — try to extract from raw source text as fallback
  const raw = node.value?.expression?.type === 'Identifier' ? null : (node.value?.rawValue ?? null);
  if (typeof raw === 'string' && raw.length > 0) {
    check(raw, node);
  }
}

/**
 * Extract class strings from Svelte class="..." attribute.
 * Svelte attributes can have mixed text and expression chunks.
 */
function visitSvelteClassAttribute(node: any, check: CheckFn): void {
  // Simple string value
  if (node.value === true) return; // Boolean attribute, no class value

  // SvelteAttribute value is an array of SvelteLiteral and SvelteMustacheTag
  if (Array.isArray(node.value)) {
    for (const chunk of node.value) {
      // SvelteLiteral: static text
      if (chunk.type === 'SvelteLiteral' && typeof chunk.value === 'string') {
        check(chunk.value, chunk);
      }
      // SvelteMustacheTag: {expression} — extract string literals from it
      if (chunk.type === 'SvelteMustacheTag' && chunk.expression) {
        if (chunk.expression.type === 'Literal' && typeof chunk.expression.value === 'string') {
          check(chunk.expression.value, chunk);
        }
        // Template literal inside mustache
        if (chunk.expression.type === 'TemplateLiteral') {
          for (const quasi of chunk.expression.quasis ?? []) {
            if (quasi.value?.raw) {
              check(quasi.value.raw, chunk);
            }
          }
        }
      }
    }
    return;
  }

  // Fallback: simple string value (some parser versions)
  if (typeof node.value === 'string') {
    check(node.value, node);
  }
}

/**
 * Extract class strings from Angular [ngClass] bound attribute.
 * Handles: [ngClass]="{'bg-[#FF0000]': isActive, 'p-4': true}"
 */
function visitAngularNgClass(node: any, check: CheckFn): void {
  // The value from angular-eslint is the raw template expression string.
  // For object syntax: "{'class1': cond, 'class2': cond}"
  const raw = node.value?.source ?? node.sourceSpan?.toString() ?? '';
  if (typeof raw !== 'string') return;

  // Extract keys from object literal syntax: {'key': value}
  const keyPattern = /['"]([^'"]+)['"]\s*:/g;
  let match: RegExpExecArray | null;
  while ((match = keyPattern.exec(raw)) !== null) {
    check(match[1], node);
  }
}

/**
 * Visit Angular expression AST for [class]="expr" bindings.
 */
function visitAngularExpression(ast: any, reportNode: any, check: CheckFn): void {
  // Handle string literal: [class]="'bg-red-500 p-4'"
  if (ast.type === 'LiteralPrimitive' && typeof ast.value === 'string') {
    check(ast.value, reportNode);
  }
}
