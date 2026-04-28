import { effortForRule } from './debt-table.js';
import { WCAG_CRITERIA } from './compliance.js';

export interface FixPlanMessage {
  ruleId: string | null;
  severity: number | 'error' | 'warning';
  message: string;
  fix?: unknown;
}

export interface FixPlanInput {
  totalViolations: number;
  parseErrors?: number;
  byRule: Record<string, number>;
  messages?: FixPlanMessage[];
}

export interface FixPlanRuleSummary {
  ruleId: string;
  count: number;
  effortMinutes: number;
}

export interface FixPlan {
  hasWork: boolean;
  parseOnly: boolean;
  autoFixable: {
    count: number;
    rules: FixPlanRuleSummary[];
    command?: string;
  };
  tokenDecisions: {
    count: number;
    repeatedValues: number;
    rules: FixPlanRuleSummary[];
    command?: string;
  };
  accessibility: {
    count: number;
    errors: number;
    rules: FixPlanRuleSummary[];
  };
  topDebt: FixPlanRuleSummary[];
  recommendedCommands: string[];
}

const DEFAULT_FIXABLE_RULES = new Set([
  'deslint/no-arbitrary-colors',
  'deslint/no-arbitrary-spacing',
  'deslint/no-arbitrary-typography',
  'deslint/no-arbitrary-zindex',
  'deslint/no-magic-numbers-layout',
  'deslint/lang-attribute',
  'deslint/dark-mode-coverage',
  'deslint/prefers-reduced-motion',
  'deslint/icon-accessibility',
  'deslint/focus-trap-patterns',
  'deslint/responsive-image-optimization',
]);

const TOKEN_DECISION_RULES = new Set([
  'deslint/no-arbitrary-colors',
  'deslint/no-arbitrary-spacing',
  'deslint/no-arbitrary-typography',
  'deslint/no-magic-numbers-layout',
  'deslint/consistent-color-palette',
  'deslint/spacing-rhythm-consistency',
]);

const ACCESSIBILITY_RULES = new Set(
  WCAG_CRITERIA.flatMap((criterion) => criterion.rules),
);

export function buildFixPlan(input: FixPlanInput): FixPlan {
  const parseErrors = input.parseErrors ?? 0;
  const parseOnly = parseErrors > 0 && parseErrors === input.totalViolations;

  if (input.totalViolations === 0 || parseOnly) {
    return {
      hasWork: input.totalViolations > 0,
      parseOnly,
      autoFixable: { count: 0, rules: [] },
      tokenDecisions: { count: 0, repeatedValues: 0, rules: [] },
      accessibility: { count: 0, errors: 0, rules: [] },
      topDebt: [],
      recommendedCommands: [],
    };
  }

  const byRule = normalizeByRule(input.byRule);
  const messages = (input.messages ?? []).filter(
    (msg): msg is FixPlanMessage & { ruleId: string } =>
      typeof msg.ruleId === 'string' && msg.ruleId.startsWith('deslint/'),
  );

  const messagesComplete = messages.length >= input.totalViolations;
  const autoFixableByRule = countAutoFixable(byRule, messages, messagesComplete);
  const tokenByRule = countTokenDecisions(byRule, messages, messagesComplete);
  const a11yByRule = pickRules(byRule, ACCESSIBILITY_RULES);

  const autoFixable = summarizeRules(autoFixableByRule);
  const tokenRules = summarizeRules(tokenByRule);
  const accessibilityRules = summarizeRules(a11yByRule);
  const topDebt = summarizeRules(byRule).rules.slice(0, 3);

  const commands: string[] = [];
  if (autoFixable.count > 0) commands.push('npx deslint fix --all');
  if (tokenRules.count > 0) commands.push('npx deslint suggest-tokens .');
  if (accessibilityRules.count > 0) commands.push('npx deslint compliance');

  return {
    hasWork: true,
    parseOnly: false,
    autoFixable: {
      count: autoFixable.count,
      rules: autoFixable.rules,
      command: autoFixable.count > 0 ? 'npx deslint fix --all' : undefined,
    },
    tokenDecisions: {
      count: tokenRules.count,
      repeatedValues: countRepeatedTokenValues(messages),
      rules: tokenRules.rules,
      command: tokenRules.count > 0 ? 'npx deslint suggest-tokens .' : undefined,
    },
    accessibility: {
      count: accessibilityRules.count,
      errors: countAccessibilityErrors(messages, a11yByRule),
      rules: accessibilityRules.rules,
    },
    topDebt,
    recommendedCommands: commands,
  };
}

function normalizeByRule(byRule: Record<string, number>): Record<string, number> {
  const normalized: Record<string, number> = {};
  for (const [ruleId, count] of Object.entries(byRule)) {
    if (!ruleId.startsWith('deslint/')) continue;
    normalized[ruleId] = (normalized[ruleId] ?? 0) + count;
  }
  return normalized;
}

function countAutoFixable(
  byRule: Record<string, number>,
  messages: Array<FixPlanMessage & { ruleId: string }>,
  messagesComplete: boolean,
): Record<string, number> {
  if (messagesComplete) {
    const counts: Record<string, number> = {};
    for (const msg of messages) {
      if (!msg.fix) continue;
      counts[msg.ruleId] = (counts[msg.ruleId] ?? 0) + 1;
    }
    return counts;
  }
  return pickRules(byRule, DEFAULT_FIXABLE_RULES);
}

function countTokenDecisions(
  byRule: Record<string, number>,
  messages: Array<FixPlanMessage & { ruleId: string }>,
  messagesComplete: boolean,
): Record<string, number> {
  if (!messagesComplete) return pickRules(byRule, TOKEN_DECISION_RULES);

  const counts: Record<string, number> = {};
  for (const msg of messages) {
    if (!TOKEN_DECISION_RULES.has(msg.ruleId)) continue;
    if (msg.fix) continue;
    if (msg.message.includes('Suggested:')) continue;
    counts[msg.ruleId] = (counts[msg.ruleId] ?? 0) + 1;
  }
  return counts;
}

function countRepeatedTokenValues(
  messages: Array<FixPlanMessage & { ruleId: string }>,
): number {
  const counts = new Map<string, number>();
  for (const msg of messages) {
    if (!TOKEN_DECISION_RULES.has(msg.ruleId)) continue;
    if (msg.fix || msg.message.includes('Suggested:')) continue;
    const token = msg.message.match(/`([^`]+)`/)?.[1];
    if (!token) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts.values()].filter((count) => count > 1).length;
}

function countAccessibilityErrors(
  messages: Array<FixPlanMessage & { ruleId: string }>,
  a11yByRule: Record<string, number>,
): number {
  if (messages.length === 0) return 0;
  let count = 0;
  for (const msg of messages) {
    if (!a11yByRule[msg.ruleId]) continue;
    if (msg.severity === 2 || msg.severity === 'error') count++;
  }
  return count;
}

function pickRules(
  byRule: Record<string, number>,
  allow: ReadonlySet<string>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [ruleId, count] of Object.entries(byRule)) {
    if (allow.has(ruleId) && count > 0) out[ruleId] = count;
  }
  return out;
}

function summarizeRules(byRule: Record<string, number>): {
  count: number;
  rules: FixPlanRuleSummary[];
} {
  const rules = Object.entries(byRule)
    .filter(([, count]) => count > 0)
    .map(([ruleId, count]) => ({
      ruleId,
      count,
      effortMinutes: effortForRule(ruleId) * count,
    }))
    .sort((a, b) => b.effortMinutes - a.effortMinutes || b.count - a.count || a.ruleId.localeCompare(b.ruleId));

  return {
    count: rules.reduce((sum, rule) => sum + rule.count, 0),
    rules,
  };
}
