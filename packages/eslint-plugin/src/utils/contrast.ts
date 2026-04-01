/**
 * WCAG 2.1 contrast ratio calculator.
 * Implements the W3C relative luminance and contrast ratio formulas.
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */

import { hexToRgb } from './color-map.js';

/**
 * Calculate the relative luminance of an sRGB color.
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
export function relativeLuminance(rgb: [number, number, number]): number {
  const [rs, gs, bs] = rgb.map((c) => {
    const srgb = c / 255;
    return srgb <= 0.04045
      ? srgb / 12.92
      : Math.pow((srgb + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate WCAG 2.1 contrast ratio between two colors.
 * Returns a value between 1:1 and 21:1.
 */
export function contrastRatio(
  rgb1: [number, number, number],
  rgb2: [number, number, number],
): number {
  const l1 = relativeLuminance(rgb1);
  const l2 = relativeLuminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Calculate contrast ratio between two hex colors.
 */
export function contrastRatioHex(hex1: string, hex2: string): number {
  return contrastRatio(hexToRgb(hex1), hexToRgb(hex2));
}

/**
 * WCAG AA minimum contrast requirements.
 */
export const WCAG_AA = {
  normalText: 4.5,
  largeText: 3.0,
};

/**
 * Check if a contrast ratio meets WCAG AA for the given text size.
 */
export function meetsWcagAA(ratio: number, isLargeText: boolean): boolean {
  return ratio >= (isLargeText ? WCAG_AA.largeText : WCAG_AA.normalText);
}
