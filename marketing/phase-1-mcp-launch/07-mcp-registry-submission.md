# Submission — MCP Registry

**Where:** https://github.com/modelcontextprotocol/registry
**Prerequisite:** the MCP server modernization branch
(`claude/audit-mcp-server-IeR8L`) is merged to `main` and
`@deslint/mcp` v0.5.0 is published to npm.
**Timing:** submit T-1 day (day before the Show HN launch). Registry
approval is manual and typically takes 1–3 days. Having the listing
live at launch gives you a second discovery channel; having it
pending means nothing breaks.

## Submission checklist (do in order)

### 1. Verify the server.json on main

The file must exist at `packages/mcp/server.json` and validate
against the current registry schema. The file already exists on
`claude/audit-mcp-server-IeR8L`. After the merge, verify:

```bash
cat packages/mcp/server.json
```

Expected content (the shape below is what we committed; double-check
no fields have drifted during merge):

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-07-09/server.schema.json",
  "name": "io.github.jaydrao215/deslint",
  "description": "Local-first MCP server for design-quality feedback: detects hardcoded colors, arbitrary spacing, missing a11y attributes, and more. Auto-fixes fixable violations and scores project design health. Zero network calls.",
  "status": "active",
  "repository": {
    "url": "https://github.com/jaydrao215/deslint",
    "source": "github",
    "subfolder": "packages/mcp"
  },
  "version": "0.5.0",
  "websiteUrl": "https://deslint.com",
  "packages": [
    {
      "registryType": "npm",
      "identifier": "@deslint/mcp",
      "version": "0.5.0",
      "transport": { "type": "stdio" },
      "runtimeHint": "npx",
      "runtimeArguments": [
        { "type": "positional", "value": "-y" },
        { "type": "positional", "value": "@deslint/mcp" },
        { "type": "positional", "value": "serve" }
      ]
    }
  ]
}
```

### 2. Verify the npm package is published

```bash
npm view @deslint/mcp version
```

Must return `0.5.0` (or whichever version matches `server.json`).
If it doesn't, publish first:

```bash
cd packages/mcp
pnpm build
npm publish --access public
```

### 3. Verify the package runs end-to-end

```bash
npx -y @deslint/mcp serve <<< '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"smoke-test","version":"0"}}}'
```

Expected: a JSON-RPC response including `serverInfo` and
`capabilities`. Any other output (stack traces, npm warnings) means
the package is broken and the registry submission will fail manual
review.

### 4. Submit to the registry

As of April 2026, the registry accepts submissions in one of two ways:

**Option A: Web form (preferred for first-time publishers)**

1. Go to https://registry.modelcontextprotocol.io
2. Sign in with the GitHub account that owns `jaydrao215/deslint`
3. Click "Publish server"
4. Enter the reverse-DNS name: `io.github.jaydrao215/deslint`
5. Point it at the repo URL: https://github.com/jaydrao215/deslint
6. The registry auto-detects `packages/mcp/server.json` in the
   `subfolder` you specified. Confirm the preview matches.
7. Submit.

**Option B: CLI / PR submission**

If the web form isn't available in your region, submit a PR to
https://github.com/modelcontextprotocol/registry adding your
`server.json` to `servers/io.github.jaydrao215/deslint/`. The PR
template asks for:

- Link to the published npm package
- Link to the GitHub repo
- Confirmation that the server has been tested end-to-end
- Confirmation that the server makes no network calls beyond what's
  documented (we make zero)

### 5. After approval

Once the submission is approved:

- The registry will show the server at
  `https://registry.modelcontextprotocol.io/servers/io.github.jaydrao215/deslint`
- Claude Desktop, Cursor, and other MCP-aware clients that browse the
  registry will surface it in their "Add server" UI
- Include the registry URL in all future marketing assets (update
  README, landing page footer, etc.)

## If the submission is rejected

The registry review team rejects submissions for three common reasons:

1. **Name doesn't match the GitHub repo owner.** Ours is
   `io.github.jaydrao215/deslint` matching owner `jaydrao215`. Fine.
2. **Description contains marketing fluff.** If rejected, shorten the
   description to a single technical sentence. Registry listings are
   indexed; SEO-keyword-stuffing gets flagged.
3. **Server doesn't actually run from the declared npm package.**
   Re-run the smoke test (step 3 above) and confirm the package
   version on npm matches the version in `server.json`.

Resubmit after fixing. Rejections are not permanent.

## Guideline compliance

- https://github.com/modelcontextprotocol/registry#guidelines
- Reverse-DNS naming convention followed.
- `status: active` set (not `experimental` — the server is production).
- `websiteUrl` points to a real product page, not a parked domain.
- `description` is factual, names the primary use case, mentions
  "zero network calls" (a differentiator), no marketing adjectives
  like "revolutionary" or "enterprise-grade".

## After listing is live

The registry listing is a passive discovery channel — it doesn't
drive traffic on its own, but MCP-curious users who browse the
registry will find Deslint when searching for "design", "lint",
"a11y", "wcag", or "tailwind".

To get the best indexing:

1. Make sure the npm package keywords list includes all relevant
   terms. Currently: update `packages/mcp/package.json` `keywords`
   field to include: `mcp`, `model-context-protocol`, `linter`,
   `design-system`, `a11y`, `wcag`, `tailwind`, `eslint`.
2. The `README.md` that ships with the npm package is what the
   registry previews. Keep the hero section under 100 lines so
   the preview isn't truncated.
3. Version bumps should be pushed to the registry via a new
   submission or PR. The registry does not auto-sync from npm.
