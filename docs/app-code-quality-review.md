# Docs App Code Quality Review (April 9, 2026)

Scope reviewed:

- `apps/docs/src/app/layout.tsx`
- `apps/docs/src/app/page.tsx`
- `apps/docs/src/app/docs/layout.tsx`
- `apps/docs/src/app/docs/page.tsx`
- `apps/docs/src/app/docs/getting-started/page.tsx`
- `apps/docs/src/app/docs/configuration/page.tsx`
- `apps/docs/src/app/docs/rules/page.tsx`

## Executive summary

The docs app is in a good functional state and passes lint + typecheck, but it has maintainability and performance risks that should be addressed before calling it fully production-grade.

## Key findings

### 1) TSX-only pages are expected in Next.js

Having no separate `.html` files is normal for Next.js App Router. HTML is defined in TSX via layouts/pages.

### 2) Large visual components increase maintenance cost

Some components are very large (e.g., `McpFlowMockup.tsx`) and combine orchestration + rendering + visual primitives in one file.

**Recommendation:** Split into smaller modules:

- `McpFlowMockup.tsx` (orchestrator)
- `mcp-flow/EditorPane.tsx`
- `mcp-flow/McpServerPane.tsx`
- `mcp-flow/FlowConnector.tsx`
- `mcp-flow/tokens.tsx`

### 3) Docs layout is entirely client-side

`apps/docs/src/app/docs/layout.tsx` is marked `'use client'`. This can increase hydration JS for largely static docs pages.

**Recommendation:** Keep root docs layout as server component and isolate client behavior into a small client subcomponent for mobile sidebar toggle.

### 4) Repeated static content blocks

Documentation pages repeat many styled `<pre>` blocks and long static content directly in TSX.

**Recommendation:** Move docs content to MDX or structured content files and keep TSX components for rendering/styling.

### 5) Mobile nav accessibility hardening

The mobile sidebar overlay works visually but should be hardened for a11y with focus trap and Escape-key close behavior.

**Recommendation:** Add:

- focus trap when sidebar opens
- Escape handling
- `aria-expanded` + `aria-controls` on toggle button
- initial focus target inside drawer

## Validation commands run

- `pnpm --filter @deslint/docs lint`
- `pnpm --filter @deslint/docs typecheck`

Both passed at review time.
