'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

/**
 * Copy-ready MCP config block. Same JSON shape every MCP-compatible
 * agent accepts (Claude Code, Claude Desktop, Cursor, Codex, Windsurf).
 */
const CONFIG = `{
  "mcpServers": {
    "deslint": {
      "command": "npx",
      "args": ["-y", "@deslint/mcp"]
    }
  }
}`;

interface Props {
  /** Optional label above the snippet (e.g. "Cursor · ~/.cursor/mcp.json"). */
  label?: string;
}

export function McpConfigSnippet({ label }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CONFIG);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div>
      {label && (
        <p className="text-xs font-mono text-gray-500 mb-2">{label}</p>
      )}
      <div className="relative rounded-xl bg-gray-950 text-gray-200 font-mono text-sm overflow-hidden">
        <button
          type="button"
          onClick={copy}
          aria-label="Copy MCP config"
          className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-md bg-gray-800/80 hover:bg-gray-700 px-2.5 py-1 text-xs text-gray-300 motion-safe:transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-pass" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </button>
        <pre className="px-5 py-4 overflow-x-auto leading-relaxed">
          <code>{CONFIG}</code>
        </pre>
      </div>
    </div>
  );
}
