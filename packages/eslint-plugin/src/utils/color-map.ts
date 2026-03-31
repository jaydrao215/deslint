/**
 * Tailwind default color palette mapped to hex values.
 * Used for suggesting nearest design tokens when arbitrary colors are detected.
 */

export const TAILWIND_COLOR_MAP: Record<string, string> = {
  // Slate
  'slate-50': '#f8fafc', 'slate-100': '#f1f5f9', 'slate-200': '#e2e8f0',
  'slate-300': '#cbd5e1', 'slate-400': '#94a3b8', 'slate-500': '#64748b',
  'slate-600': '#475569', 'slate-700': '#334155', 'slate-800': '#1e293b', 'slate-900': '#0f172a',
  // Red
  'red-50': '#fef2f2', 'red-100': '#fee2e2', 'red-200': '#fecaca',
  'red-300': '#fca5a5', 'red-400': '#f87171', 'red-500': '#ef4444',
  'red-600': '#dc2626', 'red-700': '#b91c1c', 'red-800': '#991b1b', 'red-900': '#7f1d1d',
  // Blue
  'blue-50': '#eff6ff', 'blue-100': '#dbeafe', 'blue-200': '#bfdbfe',
  'blue-300': '#93c5fd', 'blue-400': '#60a5fa', 'blue-500': '#3b82f6',
  'blue-600': '#2563eb', 'blue-700': '#1d4ed8', 'blue-800': '#1e40af', 'blue-900': '#1e3a8a',
  // Green
  'green-50': '#f0fdf4', 'green-100': '#dcfce7', 'green-200': '#bbf7d0',
  'green-300': '#86efac', 'green-400': '#4ade80', 'green-500': '#22c55e',
  'green-600': '#16a34a', 'green-700': '#15803d', 'green-800': '#166534', 'green-900': '#14532d',
  // Yellow
  'yellow-50': '#fefce8', 'yellow-100': '#fef9c3', 'yellow-200': '#fef08a',
  'yellow-300': '#fde047', 'yellow-400': '#facc15', 'yellow-500': '#eab308',
  // Purple / Violet
  'violet-50': '#f5f3ff', 'violet-100': '#ede9fe', 'violet-200': '#ddd6fe',
  'violet-300': '#c4b5fd', 'violet-400': '#a78bfa', 'violet-500': '#8b5cf6',
  'violet-600': '#7c3aed', 'violet-700': '#6d28d9', 'violet-800': '#5b21b6', 'violet-900': '#4c1d95',
  // White / Black
  'white': '#ffffff', 'black': '#000000',
};

/**
 * Convert hex to RGB for distance calculation.
 */
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Calculate Euclidean distance between two colors in RGB space.
 * Good enough for suggestions — CIELAB Delta-E is overkill for v0.1.
 */
function colorDistance(hex1: string, hex2: string): number {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

/**
 * Find the nearest Tailwind color token for a given hex value.
 * @param hex - The arbitrary hex color (e.g., "#3B82F6")
 * @param originalClass - The full class (e.g., "bg-[#3B82F6]") to extract the utility prefix
 * @returns The suggested Tailwind class (e.g., "bg-blue-500") or null if too distant
 */
export function findNearestColor(hex: string, originalClass: string): string | null {
  // Extract the utility prefix (bg, text, border, etc.)
  const prefixMatch = originalClass.match(/^([\w-]+?)-\[/);
  if (!prefixMatch) return null;
  const prefix = prefixMatch[1];

  let nearest: string | null = null;
  let minDistance = Infinity;

  for (const [name, value] of Object.entries(TAILWIND_COLOR_MAP)) {
    const dist = colorDistance(hex, value);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = name;
    }
  }

  // Only suggest if reasonably close (distance < 50 in RGB space)
  if (nearest && minDistance < 50) {
    return `${prefix}-${nearest}`;
  }

  return null;
}
