# Contributing to Vizlint

## Development Setup

### Prerequisites
- Node.js >= 20.19.0 (see `.nvmrc`)
- pnpm 9.x

### Getting Started

```bash
# Clone the repo
git clone https://github.com/vizlint/vizlint.git
cd vizlint

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Typecheck
pnpm typecheck
```

### Monorepo Structure

```
packages/
  eslint-plugin/  — ESLint rules + configs (npm: @vizlint/eslint-plugin)
  cli/            — Commander.js CLI (npm: @vizlint/cli)
  mcp/            — MCP server for Cursor/Claude Code (npm: @vizlint/mcp)
  shared/         — Shared types, schemas, and utilities
```

### Adding a New Rule

1. Create `packages/eslint-plugin/src/rules/your-rule-name.ts`
2. Use `createClassVisitor()` from `utils/class-visitor.ts` for framework-agnostic class extraction
3. Wrap the rule body in try/catch — never crash linting
4. Set `fixable: 'code'` and implement auto-fix
5. Register in `packages/eslint-plugin/src/index.ts`
6. Write tests in `packages/eslint-plugin/tests/rules/your-rule-name.test.ts`
7. Run `pnpm test` to verify

### Code Style

- TypeScript strict mode everywhere
- `const` over `let`, never `var`
- Rule names: kebab-case (`no-arbitrary-colors`)
- Utility names: camelCase (`extractClassesFromString`)

### Testing

Every rule needs: valid cases, invalid cases, autofix tests, edge case tests.

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter @vizlint/eslint-plugin test

# Watch mode
pnpm --filter @vizlint/eslint-plugin test:watch
```
