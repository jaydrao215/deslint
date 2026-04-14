# @deslint/shared

Shared internal types, schemas, and utilities used across the [Deslint](https://github.com/jaydrao215/deslint) workspace.

> This package is an implementation detail of Deslint and is not intended for direct consumption. Most users want [`@deslint/eslint-plugin`](https://www.npmjs.com/package/@deslint/eslint-plugin) or [`@deslint/cli`](https://www.npmjs.com/package/@deslint/cli) instead.

## What's in here

- Config schema (Zod) for `deslint.config.*` files.
- Quality-gate and compliance types shared between the CLI, ESLint plugin, and MCP server.
- Tailwind design-token parsing helpers (v3 `tailwind.config.*` and v4 `@theme` CSS).
- Framework detection helpers used by the CLI to auto-configure projects.
- Design-debt table / Design Health Score types.

## Install

```bash
npm install @deslint/shared
```

You typically don't install this directly — it's pulled in transitively by the other `@deslint/*` packages.

## License

MIT — see [LICENSE](../../LICENSE) in the repo root.
