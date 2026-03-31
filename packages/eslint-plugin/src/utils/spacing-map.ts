/**
 * Tailwind default spacing scale mapped to pixel values.
 * Used for suggesting nearest design tokens when arbitrary spacing is detected.
 *
 * Scale: 1 unit = 0.25rem = 4px (at default 16px root font size).
 */

export const TAILWIND_SPACING_SCALE: Record<string, number> = {
  '0': 0,
  'px': 1,
  '0.5': 2,
  '1': 4,
  '1.5': 6,
  '2': 8,
  '2.5': 10,
  '3': 12,
  '3.5': 14,
  '4': 16,
  '5': 20,
  '6': 24,
  '7': 28,
  '8': 32,
  '9': 36,
  '10': 40,
  '11': 44,
  '12': 48,
  '14': 56,
  '16': 64,
  '20': 80,
  '24': 96,
  '28': 112,
  '32': 128,
  '36': 144,
  '40': 160,
  '44': 176,
  '48': 192,
  '52': 208,
  '56': 224,
  '60': 240,
  '64': 256,
  '72': 288,
  '80': 320,
  '96': 384,
};

/**
 * Convert a CSS value string to pixels.
 * Supports: px, rem, em (assumes 16px root).
 * Returns null if the value can't be converted.
 */
export function toPx(value: string): number | null {
  const match = value.match(/^(\d+(?:\.\d+)?)(px|rem|em)$/);
  if (!match) return null;

  const num = parseFloat(match[1]);
  const unit = match[2];

  switch (unit) {
    case 'px': return num;
    case 'rem': return num * 16;
    case 'em': return num * 16;
    default: return null;
  }
}

/**
 * Find the nearest Tailwind spacing class for a pixel value.
 * If equidistant between two values, prefers the smaller one.
 *
 * @returns The Tailwind scale key (e.g., "3" for 12px) or null if too distant.
 */
export function findNearestSpacing(px: number): string | null {
  let nearest: string | null = null;
  let minDistance = Infinity;

  for (const [key, scalePx] of Object.entries(TAILWIND_SPACING_SCALE)) {
    const dist = Math.abs(px - scalePx);
    if (dist < minDistance || (dist === minDistance && scalePx < TAILWIND_SPACING_SCALE[nearest!])) {
      minDistance = dist;
      nearest = key;
    }
  }

  // Only suggest if reasonably close (within 4px / 1 spacing unit)
  if (nearest && minDistance <= 4) {
    return nearest;
  }
  return null;
}
