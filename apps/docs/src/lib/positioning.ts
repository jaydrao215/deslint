// Single source of truth for Deslint's positioning copy.
//
// Changing a string here propagates to the homepage, pricing page, MCP hub,
// per-agent pages, docs intro, layout metadata, and the OG image. READMEs and
// package.json descriptions are markdown / JSON and must be updated by hand
// in the same PR — see CLAUDE.md.
//
// Positioning is durable: features expand, these strings do not. Every new
// feature must slot under one of the three pillars without editing `h1`.

export const POSITIONING = {
  /** Hero H1, split into two parts for the gradient treatment. */
  h1Lead: 'Verify the code',
  h1Accent: 'your AI just wrote.',
  h1Full: 'Verify the code your AI just wrote.',

  /** One-sentence sub-line. Runs under the H1 on marketing pages. */
  sub:
    'Deslint is the verification layer for AI-generated code. Deterministic rules. Reproducible attestations. Runs inside the agent loop and at the merge gate.',

  /** Short tagline for dense surfaces (docs index, READMEs, package descriptions). */
  tagline: 'The verification layer for AI-generated code.',

  /** Local-first promise. Stays on the hero — it is part of the thesis, not a feature bullet. */
  zeroLlm: 'Zero LLM in the hot path. Zero code leaves your machine.',

  /** Inline chip above the H1 on marketing pages. */
  chip: 'Local · Deterministic · Runs inside the agent loop',

  /** Three proof pillars. Feature additions slot underneath; pillar labels stay stable. */
  pillars: [
    {
      title: 'Verify against your standards',
      body:
        'Design tokens, accessibility, consistency, and your own rules — deterministic, never an LLM judgement.',
    },
    {
      title: "Prove it, don't claim it",
      body:
        'Reproducible scores, signed-ready attestations, and a commit trailer the merge gate re-verifies against the repo.',
    },
    {
      title: 'Works where AI writes',
      body:
        'MCP server in the agent loop, CLI on your machine, GitHub Action at the merge gate.',
    },
  ],

  /** Meta title and description used by layout metadata and share cards. */
  metaTitle:
    'Deslint — The Verification Layer for AI-Generated Code',
  metaDescription:
    'Deslint is the verification layer for AI-generated code. Deterministic design-system and accessibility rules. Reproducible attestations. Runs inside the agent loop (MCP) and at the merge gate (GitHub Action). Local. No LLM. Zero code egress.',
} as const;

export type Pillar = (typeof POSITIONING.pillars)[number];
