/**
 * Style Dictionary → W3C DTCG transform.
 *
 * Style Dictionary is the most widely adopted design-token source format
 * in the wild (Amazon, Salesforce, Adobe, IBM all ship their tokens
 * through it). It predates DTCG and uses a sibling-but-not-identical
 * shape:
 *
 *   Style Dictionary leaf:   { "value": "#1A5276", "type": "color" }
 *   DTCG leaf:               { "$value": "#1A5276", "$type": "color" }
 *
 *   Style Dictionary group:  groups inherit `type` via `attributes` or
 *                            via a sibling `type` key on an intermediate
 *                            node — not via `$type` at the group level.
 *
 *   Style Dictionary alias:  "value": "{color.brand.primary}"   ← same
 *                            syntax as DTCG, so aliases round-trip for
 *                            free.
 *
 * This module accepts the legacy shape (recursively), normalises it into
 * DTCG, and hands the result back to the existing `parseW3CTokens` so
 * every improvement to the W3C pipeline benefits Style Dictionary for
 * free — identical layering to the Figma adapter.
 *
 * Scope: read-only. No file I/O, no merging, no Style Dictionary build
 * pipeline. Callers own the bytes; this is the pure transform.
 *
 * Type normalisation intentionally covers the legacy Style Dictionary
 * category list (`size`, `spacing`, `border-radius`, `font-family`,
 * etc.) — anything unknown is emitted without a `$type` so the W3C
 * parser's path-based inference kicks in downstream.
 */

import type { W3CTokensJson } from './figma.js';

export interface StyleDictionaryTransformOptions {
  /**
   * If true, `type: "size"` / `"spacing"` / `"border-radius"` / etc. are
   * normalised to the closest DTCG type. Default: true.
   */
  normalizeTypes?: boolean;
}

export interface StyleDictionaryTransformResult {
  /** DTCG document. Ready to pass to `parseW3CTokens`. */
  dtcg: W3CTokensJson;
  /** Count of leaves that made it through normalisation. */
  tokenCount: number;
  /**
   * Leaves dropped because their shape was ambiguous or empty.
   * Reported for CLI warnings, not errors.
   */
  skipped: Array<{ path: string; reason: string }>;
}

/**
 * Transform a Style Dictionary tokens tree into a W3C DTCG tokens
 * document. Pure: no network, no filesystem, no globals.
 *
 * The input may be a single Style Dictionary JSON document or the
 * already-merged result of many (callers merge deeply before calling).
 */
export function styleDictionaryToDTCG(
  raw: unknown,
  options: StyleDictionaryTransformOptions = {},
): StyleDictionaryTransformResult {
  const normalizeTypes = options.normalizeTypes ?? true;
  const out: W3CTokensJson = {};
  const skipped: Array<{ path: string; reason: string }> = [];
  let tokenCount = 0;

  if (raw == null || typeof raw !== 'object') {
    return { dtcg: out, tokenCount, skipped };
  }

  // Walk the source tree; for each leaf, write the DTCG-shaped
  // equivalent into `out` at the same path. Intermediate objects are
  // created lazily. Group-level DTCG metadata (`$type`, `$description`)
  // is copied so any inherited type annotations on the Style Dictionary
  // side survive the round-trip.
  walk(raw as Record<string, unknown>, [], {
    out,
    skipped,
    normalizeTypes,
    onLeaf: () => {
      tokenCount += 1;
    },
  });

  return { dtcg: out, tokenCount, skipped };
}

// ── Internal walker ──────────────────────────────────────────────────

interface WalkContext {
  out: W3CTokensJson;
  skipped: Array<{ path: string; reason: string }>;
  normalizeTypes: boolean;
  onLeaf: () => void;
}

function walk(
  node: Record<string, unknown>,
  pathParts: string[],
  ctx: WalkContext,
): void {
  // Style Dictionary treats `{ value: ..., type: ... }` or `{ $value:
  // ..., $type: ... }` as a leaf. A node is a leaf iff it has either
  // of those two keys set to a non-nullish value.
  if ('$value' in node && node.$value !== undefined) {
    // Already DTCG. Copy verbatim (with type normalisation for safety).
    writeLeaf(node, pathParts, ctx, /*sourceIsDTCG*/ true);
    return;
  }
  if ('value' in node && node.value !== undefined) {
    writeLeaf(node, pathParts, ctx, /*sourceIsDTCG*/ false);
    return;
  }

  // Group. Walk children. Skip Style Dictionary's meta keys (`attributes`
  // carries auto-derived hints used by the build pipeline — not tokens)
  // and DTCG-style group metadata (`$description`, `$extensions`).
  // Also skip top-level `$schema` (used by some v4 Style Dictionary
  // files for JSON Schema hints).
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    if (key === 'attributes' || key === 'filePath' || key === 'isSource') {
      // Style Dictionary build-time metadata — not a token.
      continue;
    }
    if (value == null || typeof value !== 'object') continue;
    walk(value as Record<string, unknown>, [...pathParts, key], ctx);
  }
}

function writeLeaf(
  node: Record<string, unknown>,
  pathParts: string[],
  ctx: WalkContext,
  sourceIsDTCG: boolean,
): void {
  const joinedPath = pathParts.join('.') || '(root)';
  const rawValue = sourceIsDTCG ? node.$value : node.value;

  // Pull type / description from whichever side of the Style Dictionary
  // / DTCG dialect the source used. Prefer explicit DTCG keys when both
  // are present (a file that's been partially migrated).
  const rawType =
    typeof node.$type === 'string'
      ? node.$type
      : typeof node.type === 'string'
        ? node.type
        : undefined;
  const rawDescription =
    typeof node.$description === 'string'
      ? node.$description
      : typeof node.description === 'string'
        ? node.description
        : typeof node.comment === 'string'
          ? node.comment
          : undefined;

  if (rawValue === null || rawValue === undefined) {
    ctx.skipped.push({ path: joinedPath, reason: 'empty_value' });
    return;
  }

  // A Style Dictionary `value` of type `object` is usually a composite
  // token (typography, shadow, gradient). Pass it through verbatim so
  // the W3C parser can classify it as `unmapped` without crashing. We
  // still count it as a token — the CLI surfaces unmapped tokens
  // separately.
  const leaf: Record<string, unknown> = { $value: rawValue };

  const dtcgType = normaliseType(rawType, ctx.normalizeTypes);
  if (dtcgType) leaf.$type = dtcgType;
  if (rawDescription) leaf.$description = rawDescription;

  setAtPath(ctx.out, pathParts, leaf);
  ctx.onLeaf();
}

// ── Type normalisation ───────────────────────────────────────────────

/**
 * Convert Style Dictionary's legacy `type` categories into DTCG
 * `$type` values. Anything unknown returns `undefined`, which lets the
 * W3C parser's path-based heuristic take over downstream.
 */
function normaliseType(
  raw: string | undefined,
  enabled: boolean,
): string | undefined {
  if (!raw) return undefined;
  if (!enabled) return raw;

  const key = raw.trim().toLowerCase().replace(/[-_\s]/g, '');
  switch (key) {
    case 'color':
      return 'color';
    // Dimensions: Style Dictionary splits `size`, `spacing`, `dimension`
    // and sometimes `length`. All map to DTCG `dimension`.
    case 'dimension':
    case 'size':
    case 'sizing':
    case 'spacing':
    case 'space':
    case 'length':
      return 'dimension';
    // Radius is a dimension in DTCG, but we tag it distinctly so the
    // W3C parser's path heuristic doesn't have to infer — path names
    // like `button.radius` still land in spacing without this.
    case 'borderradius':
    case 'radius':
    case 'radii':
      return 'dimension';
    case 'fontfamily':
    case 'fontfamilies':
    case 'font':
    case 'fonts':
    case 'typeface':
      return 'fontFamily';
    case 'fontweight':
    case 'fontweights':
    case 'weight':
      return 'fontWeight';
    case 'number':
      return 'number';
    case 'duration':
    case 'time':
      return 'duration';
    case 'cubicbezier':
    case 'easing':
    case 'timingfunction':
      return 'cubicBezier';
    case 'shadow':
    case 'boxshadow':
      return 'shadow';
    case 'typography':
    case 'textstyle':
      return 'typography';
    case 'border':
      return 'border';
    case 'gradient':
      return 'gradient';
    case 'transition':
      return 'transition';
    default:
      // Unknown → drop the `$type` so the W3C parser can infer from
      // path + value shape. Better than emitting a `$type` the parser
      // can't classify.
      return undefined;
  }
}

// ── Path helpers ─────────────────────────────────────────────────────

function setAtPath(
  root: W3CTokensJson,
  parts: string[],
  leaf: Record<string, unknown>,
): void {
  if (parts.length === 0) {
    // Degenerate: leaf at root. Copy keys onto the root object.
    Object.assign(root, leaf);
    return;
  }
  let cursor: Record<string, unknown> = root as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    const segment = parts[i]!;
    const next = cursor[segment];
    if (next == null || typeof next !== 'object' || Array.isArray(next)) {
      cursor[segment] = {};
    }
    cursor = cursor[segment] as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]!] = leaf;
}
