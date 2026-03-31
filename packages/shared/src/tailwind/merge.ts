import type { DesignSystem } from '../config-schema.js';

/**
 * Deep-merge two DesignSystem objects.
 * `override` values take precedence over `base` values (manual wins over auto-imported).
 */
export function mergeDesignSystems(base: DesignSystem, override: DesignSystem): DesignSystem {
  return {
    colors: mergeRecords(base.colors, override.colors),
    fonts: mergeRecords(base.fonts, override.fonts),
    spacing: mergeRecords(base.spacing, override.spacing),
    borderRadius: mergeRecords(base.borderRadius, override.borderRadius),
  };
}

function mergeRecords(
  base: Record<string, string> | undefined,
  override: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!base && !override) return undefined;
  if (!base) return override;
  if (!override) return base;
  return { ...base, ...override };
}
