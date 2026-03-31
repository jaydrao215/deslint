export {
  SeveritySchema,
  RuleConfigSchema,
  DesignSystemSchema,
  IgnorePatternsSchema,
  ProfileSchema,
  VizlintConfigSchema,
  parseConfig,
  safeParseConfig,
} from './config-schema.js';

export type {
  Severity,
  RuleConfig,
  DesignSystem,
  Profile,
  VizlintConfig,
} from './config-schema.js';

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
