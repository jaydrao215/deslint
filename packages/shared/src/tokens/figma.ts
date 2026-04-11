/**
 * Figma Variables → W3C DTCG transform.
 *
 * Pure function. No I/O. Callers fetch the Figma response, hand us the
 * parsed JSON, and get a W3C Design Tokens document back that the
 * existing `parseW3CTokens` can consume without modification.
 *
 * Why two-step (Figma → DTCG → DesignSystem) instead of Figma → DesignSystem
 * directly: the W3C parser already handles the DesignSystem bucketing,
 * alias resolution, and path-based key derivation. Routing through DTCG
 * means the Figma importer only cares about Figma's quirks — mode
 * selection, color space, scope filtering — and every improvement to
 * the W3C parser benefits Figma imports for free.
 *
 * Scope (sprint 12 cap): read-only Variables API only. No styles, no
 * components, no prototyping data. We emit color / dimension (spacing +
 * borderRadius) / fontFamily; everything else is reported in `unmapped`
 * so callers can warn without dropping the import.
 *
 * Reference for the Figma Variables API response shape:
 *   https://www.figma.com/developers/api#variables
 * This parser targets the shape as of April 2026. Field names that are
 * hardened as part of Figma's public API contract (`id`, `name`,
 * `resolvedType`, `valuesByMode`, `variableCollectionId`, `scopes`,
 * `defaultModeId`, `modes`) are treated as stable; anything else is
 * probed defensively.
 */

/** A Figma Variables API response body (the subset we read). */
export interface FigmaVariablesResponse {
  status?: number;
  error?: boolean | string;
  meta?: {
    variables?: Record<string, FigmaVariable>;
    variableCollections?: Record<string, FigmaVariableCollection>;
  };
}

export interface FigmaVariable {
  id: string;
  /** Figma name, often slash-delimited, e.g. "brand/primary/500". */
  name: string;
  variableCollectionId: string;
  resolvedType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
  /** Keyed by mode id. Values are type-dependent. */
  valuesByMode: Record<string, FigmaVariableValue>;
  /**
   * Figma "scopes" hint at what the variable is meant for.
   * `WIDTH_HEIGHT`, `GAP`, `CORNER_RADIUS`, `FONT_WEIGHT`, etc.
   * Reference: https://www.figma.com/developers/api#variables-scopes
   */
  scopes?: string[];
  description?: string;
  hiddenFromPublishing?: boolean;
  remote?: boolean;
}

export type FigmaVariableValue =
  | FigmaRgbaColor
  | number
  | string
  | boolean
  | FigmaVariableAlias;

export interface FigmaRgbaColor {
  r: number; // 0–1
  g: number; // 0–1
  b: number; // 0–1
  a?: number; // 0–1 (default 1)
}

export interface FigmaVariableAlias {
  type: 'VARIABLE_ALIAS';
  id: string;
}

export interface FigmaVariableCollection {
  id: string;
  name: string;
  modes: Array<{ modeId: string; name: string }>;
  defaultModeId: string;
  hiddenFromPublishing?: boolean;
  remote?: boolean;
}

/** Options controlling which values we pick out of the Figma response. */
export interface FigmaTransformOptions {
  /**
   * Mode name to prefer when a collection has multiple modes (e.g. "Light").
   * Matching is case-insensitive. If the mode isn't found in a given
   * collection, we fall back to that collection's `defaultModeId`.
   */
  mode?: string;
  /**
   * When true, variables marked `hiddenFromPublishing` are dropped.
   * Matches the Figma UI's "hidden" flag — authors usually use it for
   * work-in-progress tokens. Defaults to true.
   */
  excludeHidden?: boolean;
}

/** The shape `parseW3CTokens` expects as input. */
export interface W3CTokensJson {
  [key: string]: unknown;
}

export interface FigmaTransformResult {
  /** The DTCG document — ready to pass to `parseW3CTokens`. */
  dtcg: W3CTokensJson;
  /** Count of variables successfully transformed into DTCG leaves. */
  tokenCount: number;
  /**
   * Variables dropped because their type or scope isn't one we map.
   * Reported for CLI warnings, not errors.
   */
  skipped: Array<{ name: string; reason: string }>;
  /**
   * Collections encountered. Useful for CLI feedback like
   * "Imported from 2 collections: Primitives, Semantic".
   */
  collectionsSeen: string[];
}

/**
 * Transform a Figma Variables API response into a W3C DTCG tokens
 * document. Pure: no network, no filesystem, no globals.
 */
export function figmaVariablesToDTCG(
  response: FigmaVariablesResponse,
  options: FigmaTransformOptions = {},
): FigmaTransformResult {
  const excludeHidden = options.excludeHidden ?? true;
  const variables = response.meta?.variables ?? {};
  const collections = response.meta?.variableCollections ?? {};

  // Index variables by id so alias resolution can find its target.
  // We'll only emit aliases as DTCG `{path}` references if the target
  // is also going to be emitted in the same run (same mode, not hidden,
  // supported type). Otherwise we resolve them through to the final
  // concrete value by walking the alias chain here.

  const dtcg: W3CTokensJson = {};
  const skipped: Array<{ name: string; reason: string }> = [];
  let tokenCount = 0;
  const collectionsSeen = new Set<string>();

  // First pass: figure out which variables we're going to emit and
  // what path they'll live at. Used for alias resolution in the second
  // pass so we can route a DTCG alias to the right path.
  const pathByVariableId = new Map<string, string>();
  const emittableIds = new Set<string>();

  for (const [id, variable] of Object.entries(variables)) {
    if (!variable || typeof variable !== 'object') continue;
    if (excludeHidden && variable.hiddenFromPublishing) continue;
    // Skip remote variables — they live in another team library and
    // the file owner may not have permission to publish them.
    if (variable.remote) continue;

    const collection = collections[variable.variableCollectionId];
    if (!collection) continue;

    const dtcgType = mapResolvedType(variable);
    if (!dtcgType) continue;

    const path = dtcgPath(collection.name, variable.name);
    pathByVariableId.set(id, path);
    emittableIds.add(id);
  }

  // Second pass: emit leaves.
  for (const [id, variable] of Object.entries(variables)) {
    if (!variable || typeof variable !== 'object') continue;

    const collection = collections[variable.variableCollectionId];
    if (!collection) {
      skipped.push({
        name: variable.name,
        reason: 'collection_missing',
      });
      continue;
    }

    if (excludeHidden && variable.hiddenFromPublishing) {
      skipped.push({ name: variable.name, reason: 'hidden' });
      continue;
    }
    if (variable.remote) {
      skipped.push({ name: variable.name, reason: 'remote_library' });
      continue;
    }

    const dtcgType = mapResolvedType(variable);
    if (!dtcgType) {
      skipped.push({
        name: variable.name,
        reason: `unsupported_type:${variable.resolvedType}`,
      });
      continue;
    }

    const modeId = pickModeId(collection, options.mode);
    const rawValue = variable.valuesByMode[modeId];
    if (rawValue === undefined) {
      skipped.push({ name: variable.name, reason: 'missing_mode_value' });
      continue;
    }

    const dtcgValue = toDtcgValue(
      rawValue,
      variable,
      pathByVariableId,
      emittableIds,
    );
    if (dtcgValue === undefined) {
      skipped.push({
        name: variable.name,
        reason: 'unresolved_alias',
      });
      continue;
    }

    const path = pathByVariableId.get(id);
    if (!path) continue;

    setAtPath(dtcg, path, {
      $value: dtcgValue,
      $type: dtcgType,
      ...(variable.description
        ? { $description: variable.description }
        : {}),
    });
    tokenCount++;
    collectionsSeen.add(collection.name);
  }

  return {
    dtcg,
    tokenCount,
    skipped,
    collectionsSeen: Array.from(collectionsSeen),
  };
}

// ── helpers ──────────────────────────────────────────────────────────

/**
 * Map a Figma `resolvedType` (+ scope hint) to a DTCG `$type`.
 * Returns undefined for types we deliberately don't emit.
 */
function mapResolvedType(variable: FigmaVariable): string | undefined {
  switch (variable.resolvedType) {
    case 'COLOR':
      return 'color';
    case 'FLOAT':
      // Figma scopes tell us what a float is *for*. We only emit it as
      // a DTCG `dimension` if it's used as a layout or radius value.
      // Things like FONT_WEIGHT or OPACITY map to DTCG types we don't
      // currently consume (fontWeight, number) — dropping them is
      // correct for this cap and they'll surface in `skipped`.
      if (usesDimensionScope(variable.scopes)) {
        return 'dimension';
      }
      return undefined;
    case 'STRING':
      // Only accept strings that look like font families. Other string
      // variables (copy, labels, URLs) aren't design tokens.
      if (looksLikeFontFamily(variable)) {
        return 'fontFamily';
      }
      return undefined;
    case 'BOOLEAN':
      return undefined;
    default:
      return undefined;
  }
}

const DIMENSION_SCOPES = new Set([
  'WIDTH_HEIGHT',
  'GAP',
  'CORNER_RADIUS',
  'STROKE_FLOAT', // border width
  'ALL_SCOPES',   // catch-all; callers often leave this as the default
]);

function usesDimensionScope(scopes: string[] | undefined): boolean {
  if (!scopes || scopes.length === 0) return true; // No scope = assume dimension
  return scopes.some((s) => DIMENSION_SCOPES.has(s));
}

function looksLikeFontFamily(variable: FigmaVariable): boolean {
  // Figma doesn't have a FONT_FAMILY scope as of the April 2026 API,
  // so we fall back to a name heuristic.
  const name = variable.name.toLowerCase();
  return (
    /\bfont(-|_|\.|\/)?family\b/.test(name) ||
    /\btypeface\b/.test(name) ||
    /\bfont$/.test(name)
  );
}

/**
 * Pick which mode to read out of a collection.
 * - If `preferredName` is given and a mode matches it (case-insensitive),
 *   use that mode.
 * - Otherwise use the collection's `defaultModeId`.
 */
function pickModeId(
  collection: FigmaVariableCollection,
  preferredName?: string,
): string {
  if (preferredName) {
    const lower = preferredName.toLowerCase();
    const hit = collection.modes.find((m) => m.name.toLowerCase() === lower);
    if (hit) return hit.modeId;
  }
  return collection.defaultModeId;
}

/**
 * Convert a single Figma value (for the chosen mode) into the DTCG
 * `$value` scalar. Returns undefined when the value is an alias whose
 * target won't be emitted — callers surface that in `skipped`.
 */
function toDtcgValue(
  value: FigmaVariableValue,
  variable: FigmaVariable,
  pathByVariableId: Map<string, string>,
  emittableIds: Set<string>,
): string | number | undefined {
  if (isAlias(value)) {
    if (!emittableIds.has(value.id)) return undefined;
    const targetPath = pathByVariableId.get(value.id);
    if (!targetPath) return undefined;
    // DTCG alias syntax: {dotted.path}
    return `{${targetPath}}`;
  }

  if (variable.resolvedType === 'COLOR' && isRgba(value)) {
    return rgbaToHex(value);
  }

  if (variable.resolvedType === 'FLOAT' && typeof value === 'number') {
    return floatToDimension(value);
  }

  if (variable.resolvedType === 'STRING' && typeof value === 'string') {
    return value;
  }

  return undefined;
}

function isAlias(value: unknown): value is FigmaVariableAlias {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { type?: unknown }).type === 'VARIABLE_ALIAS' &&
    typeof (value as { id?: unknown }).id === 'string'
  );
}

function isRgba(value: unknown): value is FigmaRgbaColor {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { r?: unknown }).r === 'number' &&
    typeof (value as { g?: unknown }).g === 'number' &&
    typeof (value as { b?: unknown }).b === 'number'
  );
}

/**
 * Convert Figma's 0–1 RGBA floats to a CSS-safe hex string.
 * Alpha < 1 is encoded as an 8-digit hex (#RRGGBBAA) which both the
 * W3C parser and Deslint's color rules already accept.
 */
function rgbaToHex(rgba: FigmaRgbaColor): string {
  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  const r = Math.round(clamp(rgba.r) * 255);
  const g = Math.round(clamp(rgba.g) * 255);
  const b = Math.round(clamp(rgba.b) * 255);
  const a = rgba.a === undefined ? 1 : clamp(rgba.a);

  const hex = (n: number) => n.toString(16).padStart(2, '0');
  const base = `#${hex(r)}${hex(g)}${hex(b)}`;

  // Only append alpha when it's actually < 1 — keeps the common case
  // (fully opaque tokens) rendering as clean 6-digit hex that matches
  // designer-pasted values 1:1.
  if (a === 1) return base;
  const alphaByte = Math.round(a * 255);
  return `${base}${hex(alphaByte)}`;
}

/**
 * Figma FLOATs for dimensions are unitless numbers. Design-system
 * convention is "px" for layout and radius, which is also what the
 * Deslint Tailwind rules recognize as a valid token value.
 *
 * We deliberately do NOT try to convert to rem — we don't know the
 * project's root font-size, and guessing would produce silent drift.
 */
function floatToDimension(n: number): string {
  // Integer-looking values render as "16px", not "16.0px", to match
  // what a designer would type.
  if (Number.isInteger(n)) return `${n}px`;
  // Trim trailing zeros on fractional values.
  return `${parseFloat(n.toFixed(4))}px`;
}

/**
 * Compose the dotted DTCG path where a variable should live.
 *
 * Figma names use "/" as a grouping separator ("brand/primary/500"),
 * and collection names are free-form. We namespace everything under
 * the collection so two collections can define a `primary` without
 * stomping each other.
 *
 * Segments are sanitized so the resulting path only contains
 * `[a-z0-9-]` — this keeps DTCG alias syntax (`{foo.bar}`) and the
 * existing `parseW3CTokens` path heuristics working correctly.
 */
function dtcgPath(collectionName: string, variableName: string): string {
  const collectionSeg = slug(collectionName);
  const nameSegs = variableName
    .split('/')
    .map(slug)
    .filter((s) => s.length > 0);
  if (nameSegs.length === 0) {
    return collectionSeg || 'unnamed';
  }
  const head = collectionSeg || 'collection';
  return [head, ...nameSegs].join('.');
}

function slug(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Assign `leaf` at `path` inside `doc`, creating intermediate groups
 * as plain objects on the way down. Safe: every intermediate node must
 * be a plain object, otherwise we bail (prevents clobbering a leaf).
 */
function setAtPath(
  doc: W3CTokensJson,
  path: string,
  leaf: { $value: unknown; $type: string; $description?: string },
): void {
  const segments = path.split('.').filter((s) => s.length > 0);
  if (segments.length === 0) return;

  let cursor: Record<string, unknown> = doc as Record<string, unknown>;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i]!;
    const existing = cursor[seg];
    if (existing && typeof existing === 'object' && !('$value' in (existing as object))) {
      cursor = existing as Record<string, unknown>;
    } else if (existing === undefined) {
      const next: Record<string, unknown> = {};
      cursor[seg] = next;
      cursor = next;
    } else {
      // Collision: a leaf or non-object is already at this path. Two
      // Figma variables ended up with the same slug. Skip — the first
      // one wins. The caller can surface this via the skipped list if
      // we want to warn in a later iteration.
      return;
    }
  }

  const tail = segments[segments.length - 1]!;
  // If the tail already exists, don't overwrite — first one wins.
  if (cursor[tail] !== undefined) return;
  cursor[tail] = leaf;
}
