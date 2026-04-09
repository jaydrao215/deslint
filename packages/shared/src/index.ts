export {
  SeveritySchema,
  RuleConfigSchema,
  DesignSystemSchema,
  IgnorePatternsSchema,
  ProfileSchema,
  QualityGateSchema,
  DeslintConfigSchema,
  parseConfig,
  safeParseConfig,
} from './config-schema.js';

export type {
  Severity,
  RuleConfig,
  DesignSystem,
  Profile,
  QualityGate,
  DeslintConfig,
} from './config-schema.js';

export { evaluateQualityGate, formatGateResult } from './quality-gate.js';
export type { GateScanSnapshot, GateResult, GateFailure, GateCategory } from './quality-gate.js';

export { RULE_EFFORT_MINUTES, DEFAULT_RULE_EFFORT_MINUTES, effortForRule } from './debt-table.js';

export { parseW3CTokens, loadW3CTokensFile, findW3CTokensFile } from './tokens/index.js';
export type { W3CToken, W3CParseResult } from './tokens/index.js';

export {
  WCAG_CRITERIA,
  WCAG_21_CRITERIA_IDS,
  evaluateCompliance,
  formatComplianceSummary,
} from './compliance.js';
export type {
  WcagLevel,
  WcagCriterion,
  CriterionResult,
  LevelSummary,
  ComplianceResult,
  ComplianceScanSnapshot,
} from './compliance.js';

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
