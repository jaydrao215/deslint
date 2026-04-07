/**
 * W3C Design Tokens Community Group (DTCG) parser.
 *
 * Spec: https://tr.designtokens.org/format/ (Oct 2025 draft)
 *
 * A design token file is a JSON document where leaf objects contain
 * `$value` and optionally `$type`. Tokens can be nested in groups
 * (ordinary object keys), and values may reference other tokens via
 * `{group.subgroup.token}` alias syntax.
 *
 * This parser:
 *   1. Walks the tree, collecting every token with its dotted path.
 *   2. Resolves `{...}` aliases (iteratively, up to MAX_DEPTH hops).
 *   3. Groups tokens by `$type` into the flat DesignSystem shape that
 *      the rest of Vizlint understands (colors, spacing, fonts,
 *      borderRadius).
 *
 * Design decision: we DO NOT try to round-trip every DTCG type. Only
 * the subset that maps to design quality rules (color, dimension,
 * fontFamily, fontWeight) is emitted. Unrecognized `$type` values are
 * returned in `unmapped` so callers can warn without crashing.
 */

import type { DesignSystem } from '../config-schema.js';

/** A single flattened token extracted from a DTCG document. */
export interface W3CToken {
  /** Dotted path, e.g. "colors.brand.primary" */
  path: string;
  /** Resolved final value after alias resolution. */
  value: string;
  /** DTCG `$type`, if set. */
  type?: string;
  /** Inline description from `$description`, if set. */
  description?: string;
  /** Whether this token was originally an alias to another token. */
  aliased: boolean;
}

export interface W3CParseResult {
  /** All resolved tokens, in insertion order. */
  tokens: W3CToken[];
  /** DesignSystem shape ready to merge into a Vizlint config. */
  designSystem: DesignSystem;
  /** Token paths whose `$type` wasn't recognized by the mapper. */
  unmapped: string[];
  /** Alias targets that could not be resolved. */
  unresolvedAliases: string[];
}

/** Max alias hops we'll follow before giving up (cycle protection). */
const MAX_ALIAS_DEPTH = 10;

/**
 * Parse a DTCG JSON document into a structured result.
 *
 * Pure function — no I/O. Callers read the file and pass the parsed
 * JSON object in. That keeps this testable in Node/browser and
 * unaffected by filesystem semantics.
 */
export function parseW3CTokens(raw: unknown): W3CParseResult {
  const flat = new Map<string, { value: unknown; type?: string; description?: string }>();

  walk(raw, [], flat);

  // Resolve aliases.
  const resolved: W3CToken[] = [];
  const unresolvedAliases: string[] = [];
  for (const [path, rawToken] of flat) {
    const seen = new Set<string>();
    let currentValue = rawToken.value;
    let currentType = rawToken.type;
    let wasAliased = false;

    for (let depth = 0; depth < MAX_ALIAS_DEPTH; depth++) {
      const alias = extractAlias(currentValue);
      if (!alias) break;
      wasAliased = true;
      if (seen.has(alias)) {
        // Cycle detected — bail.
        break;
      }
      seen.add(alias);
      const target = flat.get(alias);
      if (!target) {
        unresolvedAliases.push(`${path} → ${alias}`);
        currentValue = null;
        break;
      }
      currentValue = target.value;
      if (!currentType && target.type) currentType = target.type;
    }

    if (currentValue == null) continue;

    resolved.push({
      path,
      value: stringifyValue(currentValue),
      type: currentType,
      description: rawToken.description,
      aliased: wasAliased,
    });
  }

  const { designSystem, unmapped } = toDesignSystem(resolved);

  return {
    tokens: resolved,
    designSystem,
    unmapped,
    unresolvedAliases,
  };
}

/** Recursively walk a DTCG tree, populating the flat map. */
function walk(
  node: unknown,
  pathParts: string[],
  out: Map<string, { value: unknown; type?: string; description?: string }>,
  inheritedType?: string,
): void {
  if (node == null || typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;

  // Group-level type inherited by children (DTCG `$type` on a group).
  const groupType = typeof obj.$type === 'string' ? obj.$type : inheritedType;

  // Leaf: has $value.
  if ('$value' in obj) {
    const path = pathParts.join('.');
    out.set(path, {
      value: obj.$value,
      type: typeof obj.$type === 'string' ? obj.$type : inheritedType,
      description: typeof obj.$description === 'string' ? obj.$description : undefined,
    });
    return;
  }

  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('$')) continue; // Skip metadata keys
    walk(value, [...pathParts, key], out, groupType);
  }
}

/** Return the referenced path if `value` is a DTCG alias, else undefined. */
function extractAlias(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const m = value.match(/^\{(.+)\}$/);
  return m ? m[1] : undefined;
}

/** Stringify a resolved token value into a CSS-ready string. */
function stringifyValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  // Composite values (typography, shadow, etc.) — serialize opaquely.
  return JSON.stringify(value);
}

/** Bucket resolved tokens into the Vizlint DesignSystem shape. */
function toDesignSystem(tokens: W3CToken[]): {
  designSystem: DesignSystem;
  unmapped: string[];
} {
  const colors: Record<string, string> = {};
  const spacing: Record<string, string> = {};
  const borderRadius: Record<string, string> = {};
  const fonts: Record<string, string> = {};
  const unmapped: string[] = [];

  for (const token of tokens) {
    const key = tokenKey(token.path);
    const type = token.type?.toLowerCase();

    // DTCG types: color, dimension, fontFamily, fontWeight, duration,
    // cubicBezier, number, strokeStyle, border, transition, shadow,
    // gradient, typography
    if (type === 'color') {
      colors[key] = token.value;
    } else if (type === 'dimension') {
      // Heuristic: dimensions under a "radius"/"borderRadius" group go
      // to borderRadius, everything else is spacing. This matches how
      // most DTCG files we've seen organize things (Style Dictionary
      // output, Tokens Studio export).
      if (/(^|\.)(border[-_]?radius|radius|radii)(\.|$)/i.test(token.path)) {
        borderRadius[key] = token.value;
      } else {
        spacing[key] = token.value;
      }
    } else if (type === 'fontfamily') {
      fonts[key] = token.value;
    } else if (type === 'fontweight' || type === 'number' || type === 'duration' ||
               type === 'cubicbezier' || type === 'strokestyle' || type === 'border' ||
               type === 'transition' || type === 'shadow' || type === 'gradient' ||
               type === 'typography') {
      // Known DTCG types we don't currently map to a Vizlint rule input.
      unmapped.push(token.path);
    } else if (type === undefined) {
      // Untyped token — try a path-based heuristic so Style Dictionary
      // output without explicit $type still works.
      inferAndBucket(token, colors, spacing, borderRadius, fonts, unmapped);
    } else {
      unmapped.push(token.path);
    }
  }

  return {
    designSystem: {
      colors: Object.keys(colors).length > 0 ? colors : undefined,
      spacing: Object.keys(spacing).length > 0 ? spacing : undefined,
      borderRadius: Object.keys(borderRadius).length > 0 ? borderRadius : undefined,
      fonts: Object.keys(fonts).length > 0 ? fonts : undefined,
    },
    unmapped,
  };
}

function inferAndBucket(
  token: W3CToken,
  colors: Record<string, string>,
  spacing: Record<string, string>,
  borderRadius: Record<string, string>,
  fonts: Record<string, string>,
  unmapped: string[],
): void {
  const path = token.path.toLowerCase();
  const key = tokenKey(token.path);
  const value = token.value;

  // Color-ish value shape
  if (/^#[0-9a-f]{3,8}$/i.test(value) || /^(rgba?|hsla?)\(/i.test(value)) {
    colors[key] = value;
    return;
  }
  // Dimension-ish shape
  if (/^-?\d*\.?\d+(px|rem|em|%)$/i.test(value)) {
    if (/(border[-_]?radius|radii|radius)/i.test(path)) {
      borderRadius[key] = value;
    } else {
      spacing[key] = value;
    }
    return;
  }
  // Font-ish path
  if (/(font[-_]?family|typeface)/i.test(path)) {
    fonts[key] = value;
    return;
  }
  unmapped.push(token.path);
}

/**
 * Derive a DesignSystem key from a token path. We prefer the tail
 * segment (e.g. "colors.brand.primary" → "brand-primary") so that the
 * emitted keys look like the Tailwind-style tokens rule authors expect.
 */
function tokenKey(path: string): string {
  const parts = path.split('.');
  // Drop the first segment if it's a well-known category bucket.
  const categoryPrefixes = new Set([
    'color', 'colors',
    'spacing', 'space', 'size', 'sizes',
    'radius', 'radii', 'borderradius', 'border-radius',
    'font', 'fonts', 'fontfamily', 'font-family', 'typography',
  ]);
  const head = parts[0]?.toLowerCase();
  const tail = head && categoryPrefixes.has(head) ? parts.slice(1) : parts;
  return tail.join('-') || path;
}
