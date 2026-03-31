import type { DesignSystem } from '../config-schema.js';

/**
 * Parse a Tailwind v3 config object (the resolved JS/TS export)
 * and extract design tokens into a DesignSystem shape.
 */
export function parseV3Config(config: Record<string, unknown>): DesignSystem {
  const ds: DesignSystem = {};
  const theme = (config.theme ?? {}) as Record<string, unknown>;
  const extend = (theme.extend ?? {}) as Record<string, unknown>;

  // Colors: merge base theme.colors + theme.extend.colors
  const baseColors = flattenColorMap(theme.colors);
  const extendColors = flattenColorMap(extend.colors);
  const allColors = { ...baseColors, ...extendColors };
  if (Object.keys(allColors).length > 0) {
    ds.colors = allColors;
  }

  // Fonts: theme.fontFamily / theme.extend.fontFamily
  const baseFonts = parseFontFamily(theme.fontFamily);
  const extendFonts = parseFontFamily(extend.fontFamily);
  const allFonts = { ...baseFonts, ...extendFonts };
  if (Object.keys(allFonts).length > 0) {
    ds.fonts = allFonts;
  }

  // Spacing: theme.spacing / theme.extend.spacing
  const baseSpacing = flattenStringRecord(theme.spacing);
  const extendSpacing = flattenStringRecord(extend.spacing);
  const allSpacing = { ...baseSpacing, ...extendSpacing };
  if (Object.keys(allSpacing).length > 0) {
    ds.spacing = allSpacing;
  }

  // Border radius: theme.borderRadius / theme.extend.borderRadius
  const baseBr = flattenStringRecord(theme.borderRadius);
  const extendBr = flattenStringRecord(extend.borderRadius);
  const allBr = { ...baseBr, ...extendBr };
  if (Object.keys(allBr).length > 0) {
    ds.borderRadius = allBr;
  }

  return ds;
}

/**
 * Flatten a potentially nested Tailwind color config into a flat record.
 * e.g. { brand: { primary: "#1A5276", dark: "#0E2A3D" } }
 * becomes { "brand-primary": "#1A5276", "brand-dark": "#0E2A3D" }
 */
function flattenColorMap(
  obj: unknown,
  prefix = '',
): Record<string, string> {
  if (obj == null || typeof obj !== 'object') return {};
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const fullKey = prefix ? `${prefix}-${key}` : key;
    if (typeof value === 'string') {
      result[fullKey] = value;
    } else if (typeof value === 'object' && value !== null) {
      // Handle DEFAULT key: brand: { DEFAULT: "#xxx", dark: "#yyy" }
      const nested = value as Record<string, unknown>;
      if (typeof nested.DEFAULT === 'string') {
        result[prefix ? `${prefix}-${key}` : key] = nested.DEFAULT;
      }
      Object.assign(result, flattenColorMap(value, fullKey));
    }
  }

  // Remove the "DEFAULT" suffix entries
  for (const k of Object.keys(result)) {
    if (k.endsWith('-DEFAULT')) {
      delete result[k];
    }
  }

  return result;
}

/**
 * Parse fontFamily config — arrays become comma-separated strings.
 */
function parseFontFamily(obj: unknown): Record<string, string> {
  if (obj == null || typeof obj !== 'object') return {};
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (typeof value === 'string') {
      result[key] = value;
    } else if (Array.isArray(value)) {
      result[key] = value.filter((v) => typeof v === 'string').join(', ');
    }
  }
  return result;
}

/**
 * Flatten a simple Record<string, string | number> to Record<string, string>.
 */
function flattenStringRecord(obj: unknown): Record<string, string> {
  if (obj == null || typeof obj !== 'object') return {};
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (typeof value === 'string') {
      result[key] = value;
    } else if (typeof value === 'number') {
      result[key] = String(value);
    }
  }
  return result;
}
