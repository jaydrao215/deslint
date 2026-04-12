import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseW3CTokens, type W3CParseResult } from './w3c-parser.js';

export { parseW3CTokens } from './w3c-parser.js';
export type { W3CToken, W3CParseResult } from './w3c-parser.js';

export { figmaVariablesToDTCG } from './figma.js';
export type {
  FigmaVariablesResponse,
  FigmaVariable,
  FigmaVariableCollection,
  FigmaVariableValue,
  FigmaVariableAlias,
  FigmaRgbaColor,
  FigmaTransformOptions,
  FigmaTransformResult,
  W3CTokensJson,
} from './figma.js';

/**
 * Load and parse a W3C DTCG tokens file from disk.
 * Returns undefined if the file does not exist.
 * Throws if the file exists but contains invalid JSON.
 */
export function loadW3CTokensFile(filePath: string, cwd: string = process.cwd()): W3CParseResult | undefined {
  const abs = resolve(cwd, filePath);
  if (!existsSync(abs)) return undefined;
  const raw = JSON.parse(readFileSync(abs, 'utf-8'));
  return parseW3CTokens(raw);
}

/**
 * Auto-discover a `.tokens.json` file in the project root.
 * Checks the standard filenames used by Style Dictionary and Tokens Studio.
 */
export function findW3CTokensFile(cwd: string = process.cwd()): string | undefined {
  const candidates = [
    'tokens.json',
    'design-tokens.json',
    'design.tokens.json',
    '.tokens.json',
    'tokens/tokens.json',
    'src/tokens.json',
  ];
  for (const name of candidates) {
    const abs = resolve(cwd, name);
    if (existsSync(abs)) return abs;
  }
  return undefined;
}
