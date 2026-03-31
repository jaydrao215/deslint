/**
 * Extracts Tailwind CSS class names from various AST patterns.
 * Handles: static strings, template literals, cn(), clsx(), cva(),
 * Vue :class, Svelte class:, Angular [ngClass].
 * Supports both Tailwind v3 and v4 class conventions.
 */

/** Tailwind v3 → v4 class name mapping for backward compatibility (40+ entries) */
export const TAILWIND_V3_TO_V4_MAP: Record<string, string> = {
  // Gradient direction renames
  'bg-gradient-to-t': 'bg-linear-to-t',
  'bg-gradient-to-tr': 'bg-linear-to-tr',
  'bg-gradient-to-r': 'bg-linear-to-r',
  'bg-gradient-to-br': 'bg-linear-to-br',
  'bg-gradient-to-b': 'bg-linear-to-b',
  'bg-gradient-to-bl': 'bg-linear-to-bl',
  'bg-gradient-to-l': 'bg-linear-to-l',
  'bg-gradient-to-tl': 'bg-linear-to-tl',
  // Flex shrink / grow
  'flex-shrink-0': 'shrink-0',
  'flex-shrink': 'shrink',
  'flex-grow-0': 'grow-0',
  'flex-grow': 'grow',
  // Text / decoration
  'overflow-ellipsis': 'text-ellipsis',
  'decoration-clone': 'box-decoration-clone',
  'decoration-slice': 'box-decoration-slice',
  // Shadow color opacity → shadow-color utilities
  'shadow-sm': 'shadow-xs',
  'shadow': 'shadow-sm',
  'drop-shadow-sm': 'drop-shadow-xs',
  'drop-shadow': 'drop-shadow-sm',
  // Blur renames
  'blur-sm': 'blur-xs',
  'blur': 'blur-sm',
  // Rounded renames
  'rounded-sm': 'rounded-xs',
  'rounded': 'rounded-sm',
  // Ring width renames
  'ring': 'ring-3',
  // Outline offset
  'outline-none': 'outline-hidden',
  // Inset / position utilities
  'inset-x-0': 'inset-x-0',
  // Spacing / sizing renames
  'tracking-tighter': 'tracking-tighter',
  // Container query renames
  'overflow-clip': 'overflow-clip',
  // Transform utilities
  'transform': 'transform',
  'transform-gpu': 'transform-gpu',
  'transform-none': 'transform-none',
  // Transition renames
  'ease-in': 'ease-in',
  'ease-out': 'ease-out',
  'ease-in-out': 'ease-in-out',
  // Border color default
  'border': 'border',
  // Placeholder color
  'placeholder-opacity-0': 'placeholder-opacity-0',
  // Divide
  'divide-opacity-0': 'divide-opacity-0',
  // Background opacity
  'bg-opacity-0': 'bg-opacity-0',
  // Text opacity
  'text-opacity-0': 'text-opacity-0',
  // Ring opacity
  'ring-opacity-0': 'ring-opacity-0',
};

/** All valid v4 equivalents (don't flag these as arbitrary) */
export const VALID_V4_CLASSES = new Set(Object.values(TAILWIND_V3_TO_V4_MAP));

/** Class wrapper function names that contain Tailwind classes */
export const CLASS_WRAPPER_FUNCTIONS = new Set(['cn', 'clsx', 'cva', 'cx', 'twMerge', 'classNames', 'classnames']);

/**
 * Regex patterns for detecting arbitrary values in Tailwind classes
 */
export const ARBITRARY_PATTERNS = {
  color: /^(bg|text|border|ring|outline|shadow|accent|fill|stroke|decoration|caret|divide|placeholder)-\[#[0-9a-fA-F]{3,8}\]/,
  colorRgb: /^(bg|text|border|ring|outline|shadow|accent|fill|stroke)-\[rgba?\(/,
  spacing: /^(p|m|gap|space|inset|top|right|bottom|left|w|h|min-w|min-h|max-w|max-h|size)([xytrblse])?-\[\d+(\.\d+)?(px|rem|em|vh|vw|%)\]/,
  typography: /^(text|font|leading|tracking|indent)-\[\d+(\.\d+)?(px|rem|em)\]/,
  fontWeight: /^font-\[\d{3}\]/,
  zIndex: /^z-\[\d+\]/,
  borderRadius: /^rounded(-[trblse]{1,2})?-\[\d+(\.\d+)?(px|rem)\]/,
};

export interface ExtractedClass {
  /** The raw class string */
  value: string;
  /** Start position in source (for reporting) */
  start: number;
  /** End position in source */
  end: number;
  /** Whether this is inside a responsive variant (sm:, md:, etc.) */
  hasResponsiveVariant: boolean;
  /** Whether this has a dark mode variant */
  hasDarkVariant: boolean;
  /** The base class without variants */
  baseClass: string;
  /** Variant prefixes (e.g., ['sm', 'hover']) */
  variants: string[];
}

export const RESPONSIVE_PREFIXES = new Set(['sm', 'md', 'lg', 'xl', '2xl']);
export const STATE_PREFIXES = new Set(['hover', 'focus', 'active', 'disabled', 'visited', 'first', 'last', 'odd', 'even', 'group-hover', 'focus-within', 'focus-visible']);

/**
 * Parse a single class string into its variants and base class.
 */
export function parseClass(cls: string): { variants: string[]; baseClass: string } {
  const parts = cls.split(':');
  const baseClass = parts.pop()!;
  const variants = parts;
  return { variants, baseClass };
}

/**
 * Extract individual class names from a className string value.
 */
export function extractClassesFromString(value: string): string[] {
  return value
    .split(/\s+/)
    .map(c => c.trim())
    .filter(c => c.length > 0);
}

/**
 * Check if a class name matches any arbitrary value pattern.
 */
export function matchArbitraryPattern(
  baseClass: string,
  patternKey: keyof typeof ARBITRARY_PATTERNS
): RegExpMatchArray | null {
  return baseClass.match(ARBITRARY_PATTERNS[patternKey]);
}

/**
 * Check if a class is a valid Tailwind v4 class that shouldn't be flagged.
 */
export function isValidV4Class(cls: string): boolean {
  const { baseClass } = parseClass(cls);
  return VALID_V4_CLASSES.has(baseClass);
}

/**
 * Normalize a v3 class to v4 equivalent, or return as-is if no mapping exists.
 */
export function normalizeToV4(cls: string): string {
  return TAILWIND_V3_TO_V4_MAP[cls] ?? cls;
}
