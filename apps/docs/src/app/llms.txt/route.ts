// /llms.txt — LLM-friendly site overview per llmstxt.org.
//
// Edit BODY below to keep this current. Keep claims factual: if a
// CLI command, MCP tool, or rule is listed here, it must exist in
// packages/cli, packages/mcp, or packages/eslint-plugin respectively.

const BODY = `# Deslint

> Deterministic design-system linter for AI-generated frontend code. Local ESLint plugin + CLI + Model Context Protocol (MCP) server. No cloud, no telemetry, no LLM in the check path.

Deslint ships as three npm packages:

- \`@deslint/eslint-plugin\` — 34 rules across colors, spacing, typography, responsive, accessibility, consistency, and motion.
- \`@deslint/cli\` — scanning, fixing, coverage reports, Design Health Score, budget enforcement, and compliance attestation.
- \`@deslint/mcp\` — stdio MCP server exposing the rules as tools that Claude Code, Cursor, Codex, Windsurf, and other MCP clients can call pre-commit.

All three run entirely on the user's machine. Source code never leaves the host.

## Product

- [Homepage](https://deslint.com/): product overview and positioning.
- [Pricing](https://deslint.com/pricing/): plans and an honest comparison against related tools.
- [Deslint vs Stylelint](https://deslint.com/compare/deslint-vs-stylelint/): scope, overlap, and when each is the right choice.

## Docs

- [Getting started](https://deslint.com/docs/getting-started/): install, configure, first scan.
- [Configuration](https://deslint.com/docs/configuration/): \`.deslintrc.json\`, design-system tokens, severity profiles, budgets, quality gates.
- [Rules index](https://deslint.com/docs/rules/): all 34 rules grouped by category.

## Rule categories

- [Colors](https://deslint.com/docs/rules/#colors): \`no-arbitrary-colors\`, \`a11y-color-contrast\`, \`dark-mode-coverage\`, \`consistent-color-palette\`.
- [Spacing](https://deslint.com/docs/rules/#spacing): \`no-arbitrary-spacing\`, \`no-magic-numbers-layout\`.
- [Typography](https://deslint.com/docs/rules/#typography): \`no-arbitrary-typography\`, \`heading-hierarchy\`.
- [Responsive](https://deslint.com/docs/rules/#responsive): \`responsive-required\`, \`touch-target-size\`, \`focus-visible-style\`.
- [Accessibility](https://deslint.com/docs/rules/#accessibility): \`image-alt-text\`, \`form-labels\`, \`autocomplete-attribute\`, \`aria-validation\`, \`link-text\`, \`lang-attribute\`, \`viewport-meta\`, \`prefer-semantic-html\`.
- [Consistency](https://deslint.com/docs/rules/#consistency): \`consistent-component-spacing\`, \`no-arbitrary-border-radius\`, \`consistent-border-radius\`, \`max-component-lines\`, \`missing-states\`, \`no-arbitrary-zindex\`, \`no-inline-styles\`, \`no-conflicting-classes\`, \`no-duplicate-class-strings\`, \`max-tailwind-classes\`.
- [Motion & Animation](https://deslint.com/docs/rules/#motion-animation): \`prefers-reduced-motion\`, \`icon-accessibility\`, \`focus-trap-patterns\`, \`responsive-image-optimization\`, \`spacing-rhythm-consistency\`.

## CLI commands

- \`deslint scan [dir]\` — scan a directory and report a Design Health Score. Supports \`--diff <ref>\` for diff-scoped scans, \`--budget <path>\` for budget enforcement, \`--profile <name>\` for named severity profiles, and \`--format text|json|sarif\`.
- \`deslint fix [dir]\` — apply fixable suggestions. Supports \`--all\`, \`--interactive\`, \`--dry-run\`.
- \`deslint coverage\` — measure design-token adoption across the codebase.
- \`deslint compliance\` — WCAG 2.2 compliance report.
- \`deslint attest\` — generate a signed scorecard suitable for attaching to a PR.
- \`deslint import-tokens\` — import tokens from Figma Variables, Style Dictionary, or Stitch into \`.deslintrc.json\`.
- \`deslint init\` — interactive setup.
- \`deslint suggest-tokens\` — propose new tokens based on observed arbitrary values.
- \`deslint trend\` — plot Design Health Score over time from history.
- \`deslint generate-config <target>\` — emit agent-facing configs for \`cursor\`, \`claude\`, or \`agents\`.
- \`deslint report\` — open the latest HTML report in your browser.

## MCP tools

Exposed by \`@deslint/mcp\` over stdio:

- \`analyze_file\` — lint a single file, return violations plus sub-score.
- \`analyze_project\` — scan an entire project, return the Design Health Score.
- \`analyze_and_fix\` — return corrected code for a specific file.
- \`compliance_check\` — WCAG 2.2 compliance evaluation.
- \`enforce_budget\` — evaluate a scan against \`.deslint/budget.yml\` and report breaches.
- \`get_rule_details\` — return full documentation for a rule id.
- \`suggest_fix_strategy\` — structured guidance for resolving a class of violation.

## MCP setup guides

- [Claude Code](https://deslint.com/mcp/claude-code/)
- [Cursor](https://deslint.com/mcp/cursor/)
- [OpenAI Codex](https://deslint.com/mcp/codex/)
- [Windsurf](https://deslint.com/mcp/windsurf/)

## Feeds and indexes

- [Blog](https://deslint.com/blog/): articles on design-system drift, AI coding agents, and deterministic linting.
- [RSS](https://deslint.com/blog/rss.xml): feed of the blog.
- [Sitemap](https://deslint.com/sitemap.xml): full canonical URL list.

## Posture

- 100% local execution. No network calls from the lint or MCP path.
- No telemetry.
- Open source: https://github.com/jaydrao215/deslint

## Optional

- [Coverage report](https://deslint.com/coverage/): design-token coverage analysis on the deslint codebase itself.
`;

export const dynamic = 'force-static';

export function GET() {
  return new Response(BODY, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
