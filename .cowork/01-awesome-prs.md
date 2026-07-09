# Cowork Task: Open 3 awesome-* Pull Requests (S9 items 9.1, 9.2, 9.3)

## What you are doing
Opening three pull requests to add Deslint to three community curated lists.
These are persistent, free, high-value distribution channels.
All three entries are pre-written below — do not rephrase them.

## Authentication required
- **GitHub** — you must be logged in at github.com in your browser before starting.
  If not logged in: go to github.com, sign in, then return here.

---

## PR #1 — awesome-eslint (9.1)

### Step 1 — Fork the repo
Open this URL in your browser and click the "Fork" button (top right):
https://github.com/dustinspecker/awesome-eslint

Fork to your personal GitHub account. Accept all defaults.

### Step 2 — Edit the file
In YOUR fork (github.com/YOUR-USERNAME/awesome-eslint), open `readme.md` for editing
(click the pencil icon).

Find the section:
```
## Code Quality
```

Locate the bullet that starts with `- [De Morgan]`. Insert the following NEW bullet
IMMEDIATELY AFTER the De Morgan line and BEFORE the `eslint-plugin-code-complete` line:

```
- [Deslint](https://github.com/jaydrao215/deslint) - The design quality gate for AI-generated frontend code. 20 rules covering arbitrary colors/spacing/typography, design-system drift, responsive coverage, and WCAG 2.2 / 2.1 AA accessibility across React, Vue, Svelte, Angular, and plain HTML.
```

### Step 3 — Commit the change
Commit message: `Add Deslint to Plugins → Code Quality`
Commit directly to the default branch of your fork.

### Step 4 — Open the PR
Click "Contribute" → "Open pull request" from your fork.

**PR title:**
```
Add Deslint to Plugins → Code Quality
```

**PR body (paste exactly):**
```
Adds [Deslint](https://github.com/jaydrao215/deslint) — an ESLint plugin for catching design-system drift and WCAG accessibility failures in AI-generated frontend code.

**Why it belongs in Code Quality:** it's a rule plugin (like SonarJS) that detects bugs, not a style formatter or framework-specific linter.

- 20 rules across 4 categories: design system (`no-arbitrary-colors`, `no-arbitrary-spacing`, `no-arbitrary-typography`, `no-arbitrary-zindex`, `consistent-component-spacing`, `consistent-border-radius`, `no-magic-numbers-layout`, `no-inline-styles`), responsive (`responsive-required`, `dark-mode-coverage`, `missing-states`), WCAG 2.2 accessibility (`a11y-color-contrast`, `image-alt-text`, `heading-hierarchy`, `form-labels`, `link-text`, `lang-attribute`, `viewport-meta`, `aria-validation`), and quality (`max-component-lines`).
- Framework-agnostic: same rule set works on React, Vue, Svelte, Angular, and plain HTML.
- ESLint v10+ flat-config only, Tailwind v3 + v4.
- 1,145 tests; validated on 4,061 files across 7 real projects with 0 false positives and 0 crashes.
- npm: https://www.npmjs.com/package/@deslint/eslint-plugin
- License: MIT

Contributing checklist:
- [x] Individual PR for a single suggestion
- [x] Inserted in alphabetical order within Code Quality
- [x] No duplicates (searched for "Deslint" and "design")
- [x] Spelling and grammar checked
```

Click "Create pull request".

**PAUSE — confirm PR is open, then move to PR #2.**

---

## PR #2 — awesome-mcp-servers (9.2)

### Step 1 — Fork the repo
Open this URL and click "Fork":
https://github.com/punkpeye/awesome-mcp-servers

### Step 2 — Edit the file
In YOUR fork, open `README.md` for editing.

Find the section for **Developer Tools** (look for `🛠️` or "Developer Tools" heading).
Scroll to the bottom of that section and add this new entry:

```
- [jaydrao215/deslint](https://github.com/jaydrao215/deslint) 📇 🏠 🍎 🪟 🐧 - Design quality MCP server for Cursor and Claude Code. Exposes `analyze_file`, `analyze_project`, and `analyze_and_fix` tools so AI coding agents can self-correct arbitrary colors, spacing drift, broken responsive layouts, and WCAG 2.2 accessibility failures in the same edit loop. 20 rules, cross-framework (React/Vue/Svelte/Angular/HTML), zero cloud, zero LLM calls.
```

Badge legend: 📇 TypeScript · 🏠 Local service · 🍎 macOS · 🪟 Windows · 🐧 Linux

### Step 3 — Commit the change
Commit message: `Add @deslint/mcp to Developer Tools`

### Step 4 — Open the PR
**PR title:**
```
Add @deslint/mcp (jaydrao215/deslint) to Developer Tools
```

**PR body (paste exactly):**
```
Adds [@deslint/mcp](https://www.npmjs.com/package/@deslint/mcp) — an MCP server that lets Cursor and Claude Code self-correct design-system drift and WCAG accessibility violations in AI-generated frontend code.

**Three tools exposed over stdio (JSON-RPC):**
- `analyze_file` — lint a single file, return violations + Design Health Score
- `analyze_project` — scan a whole project, return score + top violations
- `analyze_and_fix` — analyze and apply deterministic auto-fixes in one call (runs in a temp scratch dir, never touches the workspace file)

**Why it belongs here:**
- Local service, zero cloud, zero LLM calls. Pure AST analysis. Code never leaves the machine.
- Real self-correction loop. Not a prompt template — a live lint pass an agent calls as it writes.
- Cross-framework. Same 20 rules work on React, Vue, Svelte, Angular, and plain HTML.
- Demo client included: `packages/mcp/demo/self-correction-loop.mjs` — real JSON-RPC client, not choreography.

**Install:**
```
npx @deslint/mcp install cursor
npx @deslint/mcp install claude
```

- Repo: https://github.com/jaydrao215/deslint
- Package: https://www.npmjs.com/package/@deslint/mcp (v0.2.0 live)
- License: MIT
- Runs on: macOS, Linux, Windows (Node.js ≥ 20.19.0)
```

Click "Create pull request".

**PAUSE — confirm PR is open, then move to PR #3.**

---

## PR #3 — awesome-tailwindcss (9.3)

### Step 1 — Fork the repo
Open this URL and click "Fork":
https://github.com/aniftyco/awesome-tailwindcss

### Step 2 — Edit the file
In YOUR fork, open `readme.md` for editing.

Find the **Tools** section. Within it, find the group of entries that start with 🅰
(the typing/enforcement emoji group). Scroll to the bottom of the 🅰 group and
add this entry:

```
*   🅰 [Deslint](https://github.com/jaydrao215/deslint) - Enforces design-system discipline in Tailwind CSS by flagging arbitrary colors, spacing, typography, and z-index values across React, Vue, Svelte, Angular, and plain HTML — with auto-fix and a WCAG 2.2 accessibility rule set.
```

Note: the format uses `*` not `-`, and there are 3 spaces after `*`.

### Step 3 — Commit the change
Commit message: `add(tools): Deslint — design-system + a11y linter for Tailwind CSS`

### Step 4 — Open the PR
**PR title:**
```
add(tools): Deslint — design-system + a11y linter for Tailwind CSS
```

**PR body (paste exactly):**
```
Adds [Deslint](https://github.com/jaydrao215/deslint), a Tailwind-aware ESLint plugin that enforces design-system discipline on Tailwind CSS class usage and catches WCAG accessibility failures in AI-generated frontend code.

**What it catches in Tailwind class usage:**
- `no-arbitrary-colors` — `bg-[#FF0000]` → token (auto-fix)
- `no-arbitrary-spacing` — `p-[13px]` → scale (auto-fix)
- `no-arbitrary-typography` — arbitrary `text-[Npx]`, `leading-[N]`, `tracking-[N]` → scale (auto-fix)
- `no-arbitrary-zindex` — `z-[999]` → token (auto-fix)
- `no-magic-numbers-layout` — arbitrary grid/flex values (auto-fix)
- `consistent-component-spacing` / `consistent-border-radius` — drift across components
- `responsive-required` — fixed-width containers without responsive breakpoints
- `dark-mode-coverage` — elements missing `dark:` variants

**Plus 8 WCAG 2.2 / 2.1 AA accessibility rules** — 13 Success Criteria covered.

- Supports Tailwind CSS v3 and v4 (including `@theme` CSS parsing).
- Framework-agnostic: React, Vue, Svelte, Angular, plain HTML.
- 1,145 tests; 0 false positives across 4,061 files in 7 real projects.
- ESLint v10+ flat config only.
- npm: https://www.npmjs.com/package/@deslint/eslint-plugin
- License: MIT

Checklist:
- [x] Entry uses "Tailwind CSS" (not "Tailwind" or "TailwindCSS")
- [x] Description starts with a verb ("Enforces")
- [x] Description is capitalized and ends with a period
- [x] Added to bottom of the 🅰 emoji group in Tools
- [x] Conventional-commits PR title
```

Click "Create pull request".

---

## Done when
- [ ] PR open on dustinspecker/awesome-eslint
- [ ] PR open on punkpeye/awesome-mcp-servers
- [ ] PR open on aniftyco/awesome-tailwindcss

Record the three PR URLs somewhere for tracking.
