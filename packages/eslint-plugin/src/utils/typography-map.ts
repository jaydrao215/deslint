/**
 * Tailwind typography scale maps for the no-arbitrary-typography rule.
 * All pixel values use a 16px root (1rem = 16px).
 */

/** font-size scale: class name → px value */
export const TAILWIND_FONT_SIZE_SCALE: Record<string, number> = {
  'text-xs': 12,
  'text-sm': 14,
  'text-base': 16,
  'text-lg': 18,
  'text-xl': 20,
  'text-2xl': 24,
  'text-3xl': 30,
  'text-4xl': 36,
  'text-5xl': 48,
  'text-6xl': 60,
  'text-7xl': 72,
  'text-8xl': 96,
  'text-9xl': 128,
};

/** font-weight scale: class name → numeric weight */
export const TAILWIND_FONT_WEIGHT_SCALE: Record<string, number> = {
  'font-thin': 100,
  'font-extralight': 200,
  'font-light': 300,
  'font-normal': 400,
  'font-medium': 500,
  'font-semibold': 600,
  'font-bold': 700,
  'font-extrabold': 800,
  'font-black': 900,
};

/**
 * line-height scale.
 * Ratio-based values (leading-none, leading-tight, etc.) are mapped as
 * negative numbers for internal identification; actual comparison uses the
 * numeric helpers below.
 */
export const TAILWIND_LEADING_SCALE: Record<string, number> = {
  'leading-3': 12,
  'leading-4': 16,
  'leading-5': 20,
  'leading-6': 24,
  'leading-7': 28,
  'leading-8': 32,
  'leading-9': 36,
  'leading-10': 40,
};

/** Unitless leading tokens (ratio × 16px base to sort them into the scale) */
export const TAILWIND_LEADING_RATIO: Record<string, number> = {
  'leading-none': 1.0,
  'leading-tight': 1.25,
  'leading-snug': 1.375,
  'leading-normal': 1.5,
  'leading-relaxed': 1.625,
  'leading-loose': 2.0,
};

/** letter-spacing scale: class name → em value (×1000 for integer math) */
export const TAILWIND_TRACKING_SCALE: Record<string, number> = {
  'tracking-tighter': -50,
  'tracking-tight': -25,
  'tracking-normal': 0,
  'tracking-wide': 25,
  'tracking-wider': 50,
  'tracking-widest': 100,
};

/** Convert a CSS value string (px, rem, em) to pixels (16px root). */
export function toPxTypo(value: string): number | null {
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  if (value.endsWith('rem')) return num * 16;
  if (value.endsWith('px')) return num;
  if (value.endsWith('em')) return num * 16; // treat as rem for comparison
  return null;
}

/** Convert em string to integer milli-em (e.g. "-0.05em" → -50). */
export function toMilliEm(value: string): number | null {
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  if (value.endsWith('em')) return Math.round(num * 1000);
  return null;
}

/** Find nearest font-size class for a given pixel value. Smaller wins on tie. */
export function findNearestFontSize(px: number): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  for (const [name, val] of Object.entries(TAILWIND_FONT_SIZE_SCALE)) {
    const dist = Math.abs(val - px);
    if (dist < bestDist || (dist === bestDist && val < (TAILWIND_FONT_SIZE_SCALE[best!] ?? Infinity))) {
      best = name;
      bestDist = dist;
    }
  }
  return best;
}

/** Find nearest font-weight class for a given numeric weight. */
export function findNearestFontWeight(weight: number): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  for (const [name, val] of Object.entries(TAILWIND_FONT_WEIGHT_SCALE)) {
    const dist = Math.abs(val - weight);
    if (dist < bestDist || (dist === bestDist && val < (TAILWIND_FONT_WEIGHT_SCALE[best!] ?? Infinity))) {
      best = name;
      bestDist = dist;
    }
  }
  return best;
}

/**
 * Find nearest line-height class for a px value.
 * Checks fixed-px scale first; ratio classes are excluded (need font-size context).
 */
export function findNearestLeading(px: number): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  for (const [name, val] of Object.entries(TAILWIND_LEADING_SCALE)) {
    const dist = Math.abs(val - px);
    if (dist < bestDist || (dist === bestDist && val < (TAILWIND_LEADING_SCALE[best!] ?? Infinity))) {
      best = name;
      bestDist = dist;
    }
  }
  return best;
}

/** Find nearest tracking class for a milli-em value (e.g. -50 = -0.05em). */
export function findNearestTracking(milliEm: number): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  for (const [name, val] of Object.entries(TAILWIND_TRACKING_SCALE)) {
    const dist = Math.abs(val - milliEm);
    if (dist < bestDist || (dist === bestDist && val < (TAILWIND_TRACKING_SCALE[best!] ?? Infinity))) {
      best = name;
      bestDist = dist;
    }
  }
  return best;
}
