import { z } from 'zod';

// ── Severity ──────────────────────────────────────────────────────────
export const SeveritySchema = z.enum(['off', 'warn', 'error']);
export type Severity = z.infer<typeof SeveritySchema>;

// ── Rule Configuration (Control Level 2) ──────────────────────────────
export const RuleConfigSchema = z.union([
  SeveritySchema,
  z.tuple([SeveritySchema, z.record(z.unknown())]),
]);
export type RuleConfig = z.infer<typeof RuleConfigSchema>;

// ── Design System (Control Level 3) ──────────────────────────────────
export const DesignSystemSchema = z
  .object({
    colors: z
      .record(z.string())
      .optional()
      .describe('Named color tokens, e.g. { "brand-primary": "#1A5276" }'),
    fonts: z
      .object({
        body: z.string().optional(),
        heading: z.string().optional(),
        mono: z.string().optional(),
      })
      .catchall(z.string())
      .optional()
      .describe('Font family tokens'),
    spacing: z
      .record(z.string())
      .optional()
      .describe('Spacing scale tokens, e.g. { "sm": "0.5rem" }'),
    borderRadius: z
      .record(z.string())
      .optional()
      .describe('Border radius tokens, e.g. { "lg": "0.75rem" }'),
  })
  .strict()
  .describe('Design system tokens used to validate rules');

export type DesignSystem = z.infer<typeof DesignSystemSchema>;

// ── Ignore Patterns (Control Level 4) ────────────────────────────────
export const IgnorePatternsSchema = z
  .array(z.string())
  .describe('Glob patterns for files/folders to skip, e.g. ["**/generated/**"]');

// ── Severity Profiles (Control Level 5) ──────────────────────────────
export const ProfileSchema = z.object({
  rules: z.record(RuleConfigSchema),
});
export type Profile = z.infer<typeof ProfileSchema>;

// ── Root .vizlintrc.json Schema ──────────────────────────────────────
export const VizlintConfigSchema = z
  .object({
    $schema: z.string().optional().describe('JSON Schema URL for editor support'),
    rules: z
      .record(RuleConfigSchema)
      .optional()
      .describe('Rule severity and options'),
    designSystem: DesignSystemSchema.optional(),
    ignore: IgnorePatternsSchema.optional(),
    profiles: z
      .record(ProfileSchema)
      .optional()
      .describe('Named rule sets, e.g. { "strict": { rules: { ... } } }'),
  })
  .strict();

export type VizlintConfig = z.infer<typeof VizlintConfigSchema>;

/**
 * Validate a raw JSON object against the .vizlintrc.json schema.
 * Returns the parsed config on success or a ZodError on failure.
 */
export function parseConfig(raw: unknown): VizlintConfig {
  return VizlintConfigSchema.parse(raw);
}

/**
 * Safe version — returns `{ success, data, error }` instead of throwing.
 */
export function safeParseConfig(raw: unknown) {
  return VizlintConfigSchema.safeParse(raw);
}
