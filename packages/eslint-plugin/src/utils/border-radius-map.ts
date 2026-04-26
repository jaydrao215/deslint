/**
 * Tailwind default border-radius scale mapped to pixel values.
 * Scale: 1 unit = 0.25rem = 4px at 16px root.
 */
export const TAILWIND_RADIUS_SCALE: Record<string, number> = {
  'none': 0,
  'xs': 2,
  'sm': 4,
  'DEFAULT': 6,
  'md': 6,
  'lg': 8,
  'xl': 12,
  '2xl': 16,
  '3xl': 24,
};

/**
 * Convert a CSS value string to pixels for border-radius.
 * Accepts px, rem, em (16px root). Returns null otherwise.
 */
export function toPxRadius(value: string): number | null {
  const match = value.match(/^(\d+(?:\.\d+)?)(px|rem|em)$/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  switch (match[2]) {
    case 'px':
      return num;
    case 'rem':
    case 'em':
      return num * 16;
    default:
      return null;
  }
}

/**
 * Find nearest Tailwind radius key for a given pixel value.
 * Returns null beyond a 2px tolerance — radius choice is stylistically
 * deliberate, so noisy suggestions are worse than no suggestion.
 */
export function findNearestRadius(px: number): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  for (const [key, val] of Object.entries(TAILWIND_RADIUS_SCALE)) {
    if (key === 'DEFAULT') continue;
    const dist = Math.abs(px - val);
    if (dist < bestDist) {
      best = key;
      bestDist = dist;
    }
  }
  if (best && bestDist <= 2) return best;
  return null;
}

/**
 * Find nearest key inside a user-supplied custom scale.
 * Strict: returns best match regardless of distance, since an imported
 * design system is the source of truth — we *want* to snap to it.
 */
export function findNearestRadiusInScale(
  px: number,
  scale: Record<string, number>,
): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  for (const [key, val] of Object.entries(scale)) {
    const dist = Math.abs(px - val);
    if (dist < bestDist) {
      best = key;
      bestDist = dist;
    }
  }
  return best;
}
