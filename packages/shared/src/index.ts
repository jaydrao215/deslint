export {
  SeveritySchema,
  RuleConfigSchema,
  DesignSystemSchema,
  IgnorePatternsSchema,
  ProfileSchema,
  QualityGateSchema,
  VizlintConfigSchema,
  parseConfig,
  safeParseConfig,
} from './config-schema.js';

export type {
  Severity,
  RuleConfig,
  DesignSystem,
  Profile,
  QualityGate,
  VizlintConfig,
} from './config-schema.js';

export { evaluateQualityGate, formatGateResult } from './quality-gate.js';
export type { GateScanSnapshot, GateResult, GateFailure, GateCategory } from './quality-gate.js';

export { RULE_EFFORT_MINUTES, DEFAULT_RULE_EFFORT_MINUTES, effortForRule } from './debt-table.js';

export {
  parseV3Config,
  parseV4Theme,
  parseCssVars,
  mergeDesignSystems,
  importTailwindConfig,
} from './tailwind/index.js';

export type { ImportResult } from './tailwind/index.js';

export { detectFramework } from './detect-framework.js';
export type { Framework } from './detect-framework.js';
