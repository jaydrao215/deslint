import type { DesignSystem } from '../config-schema.js';

/**
 * Regex to capture `@theme { ... }` blocks in CSS.
 * Handles multi-line content between the braces.
 */
const THEME_BLOCK_RE = /@theme\s*\{([^}]+)\}/g;

/**
 * Regex to capture individual CSS custom property declarations.
 * e.g.  --color-brand: #1E3A5F;
 */
const CSS_PROP_RE = /--([\w-]+)\s*:\s*([^;]+);/g;

/**
 * Parse Tailwind v4 `@theme` blocks from a CSS string
 * and extract design tokens into a DesignSystem shape.
 */
export function parseV4Theme(css: string): DesignSystem {
  const props = new Map<string, string>();

  // Extract all custom properties from @theme blocks
  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = THEME_BLOCK_RE.exec(css)) !== null) {
    const blockContent = blockMatch[1];
    let propMatch: RegExpExecArray | null;
    const propRe = new RegExp(CSS_PROP_RE.source, 'g');
    while ((propMatch = propRe.exec(blockContent)) !== null) {
      props.set(propMatch[1], propMatch[2].trim());
    }
  }

  return propsToDesignSystem(props);
}

/**
 * Map CSS custom property names to DesignSystem categories.
 *
 * Tailwind v4 conventions:
 *   --color-*      → colors
 *   --font-*       → fonts
 *   --spacing-*    → spacing
 *   --radius-*     → borderRadius
 */
export function propsToDesignSystem(props: Map<string, string>): DesignSystem {
  const ds: DesignSystem = {};
  const colors: Record<string, string> = {};
  const fonts: Record<string, string> = {};
  const spacing: Record<string, string> = {};
  const borderRadius: Record<string, string> = {};

  for (const [name, value] of props) {
    if (name.startsWith('color-')) {
      colors[name.slice('color-'.length)] = value;
    } else if (name.startsWith('font-')) {
      fonts[name.slice('font-'.length)] = value;
    } else if (name.startsWith('spacing-')) {
      spacing[name.slice('spacing-'.length)] = value;
    } else if (name.startsWith('radius-')) {
      borderRadius[name.slice('radius-'.length)] = value;
    }
  }

  if (Object.keys(colors).length > 0) ds.colors = colors;
  if (Object.keys(fonts).length > 0) ds.fonts = fonts;
  if (Object.keys(spacing).length > 0) ds.spacing = spacing;
  if (Object.keys(borderRadius).length > 0) ds.borderRadius = borderRadius;

  return ds;
}
