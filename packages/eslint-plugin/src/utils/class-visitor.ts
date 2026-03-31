/**
 * Shared AST visitor factory for extracting class strings from:
 * - React/Preact/Solid: className="..." or class="..."
 * - Angular: class="...", [ngClass]="{'class': cond}", [class.name]="cond"
 * - Vue/Svelte/HTML: class="..."
 * - Utility wrappers: cn(), clsx(), cva(), cx(), twMerge(), classNames()
 *
 * Each rule passes its own `checkClassString(value, node)` callback.
 */

import type { TSESTree } from '@typescript-eslint/utils';

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
      } catch { return; }
    },

    // ─── Vue / Svelte / HTML: class="..." ───
    'VAttribute[key.name="class"]'(node: any) {
      try {
        if (node.value?.value && typeof node.value.value === 'string') {
          check(node.value.value, node.value);
        }
      } catch { return; }
    },

    // ─── Angular: BoundAttribute for [ngClass] and [class.*] ───
    // @angular-eslint/template-parser produces these AST nodes.
    'BoundAttribute[name="ngClass"]'(node: any) {
      try {
        visitAngularNgClass(node, check);
      } catch { return; }
    },

    // ─── Angular: TextAttribute for static class="..." ───
    'TextAttribute[name="class"]'(node: any) {
      try {
        if (typeof node.value === 'string') {
          check(node.value, node);
        }
      } catch { return; }
    },

    // ─── Angular: BoundAttribute for [class]="expr" ───
    'BoundAttribute[name="class"]'(node: any) {
      try {
        if (node.value?.type === 'ASTWithSource' || node.value?.ast) {
          const ast = node.value.ast ?? node.value;
          visitAngularExpression(ast, node, check);
        }
      } catch { return; }
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
