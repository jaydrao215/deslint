import type { DesignSystem } from '../config-schema.js';
import { propsToDesignSystem } from './parse-v4-theme.js';

/**
 * Regex to capture `:root { ... }` blocks in CSS.
 */
const ROOT_BLOCK_RE = /:root\s*\{([^}]+)\}/g;

/**
 * Regex to capture individual CSS custom property declarations.
 */
const CSS_PROP_RE = /--([\w-]+)\s*:\s*([^;]+);/g;

/**
 * Parse `:root` blocks from a CSS string and extract design tokens.
 * Uses the same property-name conventions as Tailwind v4 @theme
 * (--color-*, --font-*, --spacing-*, --radius-*).
 */
export function parseCssVars(css: string): DesignSystem {
  const props = new Map<string, string>();

  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = ROOT_BLOCK_RE.exec(css)) !== null) {
    const blockContent = blockMatch[1];
    let propMatch: RegExpExecArray | null;
    const propRe = new RegExp(CSS_PROP_RE.source, 'g');
    while ((propMatch = propRe.exec(blockContent)) !== null) {
      props.set(propMatch[1], propMatch[2].trim());
    }
  }

  return propsToDesignSystem(props);
}
