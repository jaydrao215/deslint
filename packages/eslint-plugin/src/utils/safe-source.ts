import type { TSESTree } from '@typescript-eslint/utils';
import type { SourceCode } from '@typescript-eslint/utils/ts-eslint';

/**
 * Safe wrapper around `sourceCode.getText(node)`.
 *
 * Angular template parser (`@angular-eslint/template-parser`) produces AST nodes
 * with `loc` but NOT `range`. ESLint's `getText()` requires `range`, so it throws
 * on Angular template nodes.
 *
 * This helper falls back to extracting text via line/column from the full source.
 * Returns `null` if the text cannot be extracted.
 */
export function safeGetText(sourceCode: SourceCode, node: TSESTree.Node): string | null {
  // Fast path: node has range (React/Vue/Svelte via default parser)
  if ((node as any).range) {
    return sourceCode.getText(node);
  }

  // Fallback: reconstruct from loc using the full source text
  const loc = (node as any).loc;
  if (!loc?.start || !loc?.end) return null;

  const lines = sourceCode.getText().split('\n');
  const startLine = loc.start.line - 1; // ESLint loc is 1-based
  const endLine = loc.end.line - 1;

  if (startLine === endLine) {
    return lines[startLine]?.slice(loc.start.column, loc.end.column) ?? null;
  }

  // Multi-line node
  const parts: string[] = [];
  for (let i = startLine; i <= endLine; i++) {
    if (i === startLine) {
      parts.push(lines[i]?.slice(loc.start.column) ?? '');
    } else if (i === endLine) {
      parts.push(lines[i]?.slice(0, loc.end.column) ?? '');
    } else {
      parts.push(lines[i] ?? '');
    }
  }
  return parts.join('\n');
}

/**
 * Compute a [start, end] character-offset range from a node's loc.
 *
 * Angular template parser nodes have `loc` but NOT `range`. ESLint's
 * `fixer.replaceText(node, text)` requires `node.range` — but
 * `fixer.replaceTextRange([start, end], text)` only needs character offsets,
 * which we can derive from loc + the full source string.
 *
 * Returns `null` if range cannot be computed (no loc data).
 */
export function safeGetRange(
  sourceCode: SourceCode,
  node: TSESTree.Node,
): [number, number] | null {
  // Fast path: node already has range
  if (Array.isArray((node as any).range)) {
    return (node as any).range as [number, number];
  }

  const loc = (node as any).loc;
  if (!loc?.start || !loc?.end) return null;

  const fullText = sourceCode.getText();
  const lines = fullText.split('\n');

  // Sum line lengths (+1 for each \n) up to the target line, then add column offset
  function toOffset(line1based: number, column: number): number {
    let offset = 0;
    for (let i = 0; i < line1based - 1; i++) {
      offset += (lines[i]?.length ?? 0) + 1; // +1 for the \n character
    }
    return offset + column;
  }

  const start = toOffset(loc.start.line, loc.start.column);
  const end = toOffset(loc.end.line, loc.end.column);
  return [start, end];
}

/**
 * @deprecated Angular template nodes are now supported via safeGetRange().
 * Kept for backwards compatibility — always returns true.
 */
export function nodeSupportsAutofix(_node: TSESTree.Node): boolean {
  return true;
}
