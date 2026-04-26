/**
 * Google Stitch / Material 3 tokens → W3C DTCG transform.
 *
 * Google Stitch (stitch.withgoogle.com) is Google's AI UI-generation
 * tool. When it emits a design-tokens file, the shape follows the
 * Material 3 tokens convention — keys are flat dotted paths and leaves
 * are the same `{ value, type }` legacy pattern Style Dictionary uses.
 *
 * Two idiomatic shapes show up in the wild:
 *
 *   Flat ("md-flat"):
 *     {
 *       "md.sys.color.primary":   { "value": "#6750A4", "type": "color" },
 *       "md.sys.color.secondary": { "value": "#625B71", "type": "color" }
 *     }
 *
 *   Nested ("md-nested"):
 *     {
 *       "md": { "sys": { "color": {
 *         "primary":   { "value": "#6750A4", "type": "color" }
 *       } } }
 *     }
 *
 * This module accepts either, expands flat keys into a nested tree,
 * then delegates to the Style Dictionary transform — whose leaf
 * normalisation is already identical to what Stitch emits. Keeping the
 * whole Stitch path as a thin shim over Style Dictionary means every
 * fix to that transform flows through here automatically.
 *
 * Scope: read-only, pure, no filesystem.
 */

import { styleDictionaryToDTCG } from './style-dictionary.js';
import type {
  StyleDictionaryTransformOptions,
  StyleDictionaryTransformResult,
} from './style-dictionary.js';

export interface StitchTransformOptions extends StyleDictionaryTransformOptions {
  /**
   * Restrict the import to a specific MD3 tier:
   *   - `sys`  — semantic tokens (md.sys.*)
   *   - `ref`  — reference palette (md.ref.*)
   *   - `comp` — component-specific (md.comp.*)
   * Omit to import everything. Most teams only want `sys` — the ref
   * palette is implementation detail behind the sys tokens.
   */
  tier?: 'sys' | 'ref' | 'comp';
}

export type StitchTransformResult = StyleDictionaryTransformResult;

/**
 * Transform a Stitch / Material 3 tokens document into a W3C DTCG
 * document. Pure: no network, no filesystem, no globals.
 */
export function stitchTokensToDTCG(
  raw: unknown,
  options: StitchTransformOptions = {},
): StitchTransformResult {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { dtcg: {}, tokenCount: 0, skipped: [] };
  }

  // 1. Normalise the shape. Flat dot-paths are expanded into a nested
  //    object; nested inputs pass through. Mixed shapes are tolerated —
  //    flat keys and nested groups can coexist (e.g. "md.sys.color":
  //    { primary: {…} } alongside "md.sys.color.secondary": {…}).
  const expanded = expandDottedKeys(raw as Record<string, unknown>);

  // 2. Apply the tier filter. MD3 paths always start with the "md"
  //    namespace, so we look under `md.<tier>` specifically. If the
  //    input doesn't use the `md` prefix we leave it alone — users
  //    sometimes flatten away the namespace before exporting.
  const filtered = options.tier
    ? filterByTier(expanded, options.tier)
    : expanded;

  // 3. Delegate to the Style Dictionary transform. The leaf shape is
  //    identical, so we get normalisation, alias preservation, and
  //    metadata stripping for free.
  return styleDictionaryToDTCG(filtered, {
    normalizeTypes: options.normalizeTypes,
  });
}

// ── Flat-key expansion ───────────────────────────────────────────────

/**
 * Expand any top-level keys that contain a `.` into a nested object
 * tree. Non-dotted keys keep their value. When a flat key and a nested
 * key contribute to the same path, the nested object wins on its own
 * keys and the flat leaf wins otherwise — an explicit leaf always
 * beats an empty group.
 */
function expandDottedKeys(
  input: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  // Two passes: first seed the non-dotted keys so they form the base
  // tree, then layer in dotted keys. This keeps write order
  // deterministic: two equivalent inputs produce byte-identical
  // expansions regardless of JSON.parse key order.
  for (const [key, value] of Object.entries(input)) {
    if (!key.includes('.')) {
      out[key] = deepClonePlain(value);
    }
  }
  for (const [key, value] of Object.entries(input)) {
    if (!key.includes('.')) continue;
    const parts = key.split('.').filter((p) => p.length > 0);
    if (parts.length === 0) continue;
    setAtPath(out, parts, value);
  }

  return out;
}

function setAtPath(
  root: Record<string, unknown>,
  parts: string[],
  value: unknown,
): void {
  let cursor: Record<string, unknown> = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const segment = parts[i]!;
    const next = cursor[segment];
    if (next == null || typeof next !== 'object' || Array.isArray(next)) {
      cursor[segment] = {};
    }
    cursor = cursor[segment] as Record<string, unknown>;
  }
  const leaf = parts[parts.length - 1]!;
  const existing = cursor[leaf];
  // If an existing nested group is already there (e.g. from a
  // non-dotted parent) and the new value is also an object, merge
  // keys so neither side clobbers the other. Otherwise write the new
  // value — an explicit flat leaf beats an empty group.
  if (
    existing &&
    typeof existing === 'object' &&
    !Array.isArray(existing) &&
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  ) {
    cursor[leaf] = { ...(existing as Record<string, unknown>), ...(value as Record<string, unknown>) };
  } else {
    cursor[leaf] = deepClonePlain(value);
  }
}

function deepClonePlain(value: unknown): unknown {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(deepClonePlain);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = deepClonePlain(v);
  }
  return out;
}

// ── Tier filter ──────────────────────────────────────────────────────

function filterByTier(
  tree: Record<string, unknown>,
  tier: 'sys' | 'ref' | 'comp',
): Record<string, unknown> {
  const md = tree.md;
  if (!md || typeof md !== 'object' || Array.isArray(md)) {
    // No `md` namespace — nothing to filter against. Return as-is so
    // flattened-namespace exports still import (tier filtering is a
    // no-op for them).
    return tree;
  }
  const picked = (md as Record<string, unknown>)[tier];
  if (picked === undefined) {
    return { md: {} };
  }
  return { md: { [tier]: picked } };
}
