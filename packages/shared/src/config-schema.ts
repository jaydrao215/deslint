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

// ── Quality Gate (Phase 1, Moat 3) ───────────────────────────────────
//
// Quality gates enforce design quality thresholds in CI. Modeled after
// SonarQube quality gates, but applied to design metrics.
//
// IMPORTANT: `enforce` defaults to false. v0.1.0 users upgrading to v0.2.0
// see no behavior change unless they explicitly opt in.
export const QualityGateSchema = z
  .object({
    /**
     * When true, scan/Action exit non-zero if any condition fails.
     * When false (default), failures are reported but exit code is 0.
     */
    enforce: z.boolean().optional().default(false),
    /** Minimum overall Design Health Score required to pass (0-100). */
    minOverallScore: z.number().min(0).max(100).optional(),
    /** Per-category minimum scores. Missing keys are not enforced. */
    minCategoryScores: z
      .object({
        colors: z.number().min(0).max(100).optional(),
        spacing: z.number().min(0).max(100).optional(),
        typography: z.number().min(0).max(100).optional(),
        responsive: z.number().min(0).max(100).optional(),
        consistency: z.number().min(0).max(100).optional(),
      })
      .strict()
      .optional(),
    /** Maximum total violations allowed in the scan. */
    maxViolations: z.number().int().min(0).optional(),
    /** Maximum estimated remediation effort, in minutes. */
    maxDebtMinutes: z.number().int().min(0).optional(),
    /**
     * Maximum allowed score regression compared to the previous history
     * entry. e.g. 5 means "score can drop by at most 5 points per scan".
     */
    maxScoreRegression: z.number().min(0).max(100).optional(),
  })
  .strict();

export type QualityGate = z.infer<typeof QualityGateSchema>;

// ── Root .deslintrc.json Schema ──────────────────────────────────────
export const DeslintConfigSchema = z
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
    qualityGate: QualityGateSchema.optional().describe(
      'Quality gate thresholds. Opt-in: enforce defaults to false.',
    ),
  })
  .strict();

export type DeslintConfig = z.infer<typeof DeslintConfigSchema>;

/**
 * Validate a raw JSON object against the .deslintrc.json schema.
 * Returns the parsed config on success or a ZodError on failure.
 */
export function parseConfig(raw: unknown): DeslintConfig {
  return DeslintConfigSchema.parse(raw);
}

/**
 * Safe version — returns `{ success, data, error }` instead of throwing.
 */
export function safeParseConfig(raw: unknown) {
  return DeslintConfigSchema.safeParse(raw);
}
