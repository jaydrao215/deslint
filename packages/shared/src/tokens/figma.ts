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
 * A variable that made it through the initial filtering gauntlet.
 * Kept as an internal type so the multi-pass transform can share
 * pre-computed state (mode id, dtcg path) without recomputing.
 */
interface Candidate {
  id: string;
  variable: FigmaVariable;
  collection: FigmaVariableCollection;
  modeId: string;
  rawValue: FigmaVariableValue;
  dtcgPath: string;
  dtcgType: string;
}

/**
 * Transform a Figma Variables API response into a W3C DTCG tokens
 * document. Pure: no network, no filesystem, no globals.
 *
 * The transform runs in four explicit passes so that every reason a
 * variable can be dropped is classified into `skipped[]` and the
 * reported `tokenCount` exactly matches what's in the emitted tree:
 *
 *   1. Collect candidates: apply type/scope/visibility/mode filters.
 *   2. Dedupe paths: if two candidates slug to the same dtcg path,
 *      the first one wins and the loser is recorded as
 *      `slug_collision`. Without this step an alias targeting the
 *      loser would silently resolve to the winner's leaf.
 *   3. Reachability: walk alias chains. If any hop in the chain is
 *      missing from the deduped set, the head is dropped as
 *      `unresolved_alias`. Prevents emitting a leaf whose `{path}`
 *      reference points at nothing.
 *   4. Emit: call `setAtPath` for each reachable candidate. A path
 *      clash at an *intermediate* segment (e.g. variable A at
 *      `a.b.c` vs variable B at `a.b`) is still possible and reported
 *      as `intermediate_path_collision`.
 */
export function figmaVariablesToDTCG(
  response: FigmaVariablesResponse,
  options: FigmaTransformOptions = {},
): FigmaTransformResult {
  const excludeHidden = options.excludeHidden ?? true;
  const variables = response.meta?.variables ?? {};
  const collections = response.meta?.variableCollections ?? {};

  const dtcg: W3CTokensJson = {};
  const skipped: Array<{ name: string; reason: string }> = [];
  let tokenCount = 0;
  const collectionsSeen = new Set<string>();

  // ── Pass 1: collect candidates ───────────────────────────────────
  // A variable is a candidate if it has a known collection, a
  // supported resolved-type/scope combination, isn't hidden or remote
  // (unless the caller opts in), and has a value for the chosen mode.
  // Anything that fails here is recorded in `skipped` with a specific
  // reason so users can tell "BOOLEAN isn't supported" from "hidden".
  const rawCandidates: Candidate[] = [];
  for (const [id, variable] of Object.entries(variables)) {
    if (!variable || typeof variable !== 'object') continue;

    const collection = collections[variable.variableCollectionId];
    if (!collection) {
      skipped.push({ name: variable.name, reason: 'collection_missing' });
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

    // STRING fontFamily has an extra value-shape gate — a marketing
    // copy variable named "marketing/font-family-disclaimer" would
    // otherwise emit arbitrary text as a design token. We only let
    // it through if the value itself looks like a CSS font-family
    // list (comma-separated, or a single known generic).
    if (
      dtcgType === 'fontFamily' &&
      typeof rawValue === 'string' &&
      !looksLikeFontFamilyValue(rawValue)
    ) {
      skipped.push({
        name: variable.name,
        reason: 'unsupported_type:STRING',
      });
      continue;
    }

    rawCandidates.push({
      id,
      variable,
      collection,
      modeId,
      rawValue,
      dtcgPath: dtcgPath(collection.name, variable.name),
      dtcgType,
    });
  }

  // ── Pass 2: dedupe paths ─────────────────────────────────────────
  // First-come-first-served. The loser is classified as
  // `slug_collision` so users can see why their two Figma variables
  // merged into one.
  const pathByVariableId = new Map<string, string>();
  const winnerIdByPath = new Map<string, string>();
  const dedupedCandidates: Candidate[] = [];
  for (const cand of rawCandidates) {
    if (winnerIdByPath.has(cand.dtcgPath)) {
      skipped.push({ name: cand.variable.name, reason: 'slug_collision' });
      continue;
    }
    winnerIdByPath.set(cand.dtcgPath, cand.id);
    pathByVariableId.set(cand.id, cand.dtcgPath);
    dedupedCandidates.push(cand);
  }

  // ── Pass 3: alias chain reachability ─────────────────────────────
  // A candidate whose direct value is concrete is trivially
  // reachable. An alias is reachable only if the full chain ends at a
  // concrete value whose every hop is also a deduped candidate. We
  // walk the chain once per head, cycle-protected, and record any
  // head whose chain is broken as `unresolved_alias`.
  const reachable = new Set<string>();
  for (const cand of dedupedCandidates) {
    if (
      isAliasChainReachable(
        cand.id,
        variables,
        collections,
        pathByVariableId,
        options.mode,
        new Set(),
      )
    ) {
      reachable.add(cand.id);
    } else {
      skipped.push({ name: cand.variable.name, reason: 'unresolved_alias' });
    }
  }

  // ── Pass 4: emit ─────────────────────────────────────────────────
  // At this point a failure can only come from an intermediate-path
  // clash (candidate A sits at `a.b.c`, candidate B tries to sit at
  // `a.b`). We surface that as its own reason so it's debuggable.
  for (const cand of dedupedCandidates) {
    if (!reachable.has(cand.id)) continue;

    const dtcgValue = toDtcgValue(
      cand.rawValue,
      cand.variable,
      pathByVariableId,
      reachable,
    );
    if (dtcgValue === undefined) {
      // Defensive: reachability should have caught this.
      skipped.push({ name: cand.variable.name, reason: 'unresolved_alias' });
      continue;
    }

    const leaf = {
      $value: dtcgValue,
      $type: cand.dtcgType,
      ...(cand.variable.description
        ? { $description: cand.variable.description }
        : {}),
    };

    if (!setAtPath(dtcg, cand.dtcgPath, leaf)) {
      skipped.push({
        name: cand.variable.name,
        reason: 'intermediate_path_collision',
      });
      continue;
    }
    tokenCount++;
    collectionsSeen.add(cand.collection.name);
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
 * as plain objects on the way down. Returns `false` if any intermediate
 * segment is already occupied by a leaf, or if the tail already exists
 * — the caller surfaces those as `intermediate_path_collision` so users
 * can see why their Figma variable wasn't emitted.
 */
function setAtPath(
  doc: W3CTokensJson,
  path: string,
  leaf: { $value: unknown; $type: string; $description?: string },
): boolean {
  const segments = path.split('.').filter((s) => s.length > 0);
  if (segments.length === 0) return false;

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
      // Clash: a leaf (or other non-object) already sits at this
      // intermediate segment. Two Figma variables slugged to paths
      // where one is a prefix of the other.
      return false;
    }
  }

  const tail = segments[segments.length - 1]!;
  if (cursor[tail] !== undefined) return false;
  cursor[tail] = leaf;
  return true;
}

/**
 * Value-shape gate for STRING variables that claim to be font families.
 * We only trust the string if it looks like a CSS font-family list —
 * either comma-separated, wrapped in quotes, or a single well-known
 * generic. This prevents a marketing-copy variable from leaking into
 * the design token tree just because its name contains "font".
 */
const GENERIC_FONT_FAMILIES = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  'math',
  'emoji',
  'fangsong',
]);

function looksLikeFontFamilyValue(value: string): boolean {
  const v = value.trim();
  if (v.length === 0) return false;
  // CSS font-family list: at least one comma separating families.
  if (v.includes(',')) return true;
  // Single quoted family name, e.g. `"Inter"` or `'Helvetica Neue'`.
  if (/^["'].*["']$/.test(v)) return true;
  // Single well-known generic family.
  if (GENERIC_FONT_FAMILIES.has(v.toLowerCase())) return true;
  return false;
}

/**
 * Walk an alias chain from `headId` and return true only if the entire
 * chain terminates at a concrete value whose every hop is also present
 * in `pathByVariableId` (i.e. survived pass 2). Cycle-protected via the
 * `seen` set so a self-referential alias doesn't loop forever.
 */
function isAliasChainReachable(
  headId: string,
  variables: Record<string, FigmaVariable>,
  collections: Record<string, FigmaVariableCollection>,
  pathByVariableId: Map<string, string>,
  preferredMode: string | undefined,
  seen: Set<string>,
): boolean {
  if (seen.has(headId)) return false;
  if (!pathByVariableId.has(headId)) return false;

  const variable = variables[headId];
  if (!variable) return false;
  const collection = collections[variable.variableCollectionId];
  if (!collection) return false;

  const modeId = pickModeId(collection, preferredMode);
  const value = variable.valuesByMode[modeId];
  if (value === undefined) return false;

  if (!isAlias(value)) {
    // Concrete leaf — the chain terminates here.
    return true;
  }

  // Recurse with a cloned visited set so sibling chains don't interact.
  const nextSeen = new Set(seen);
  nextSeen.add(headId);
  return isAliasChainReachable(
    value.id,
    variables,
    collections,
    pathByVariableId,
    preferredMode,
    nextSeen,
  );
}
