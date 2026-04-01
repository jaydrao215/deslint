import Link from 'next/link';

export default function DocsIndex() {
  return (
    <div>
      <h1>Vizlint Documentation</h1>
      <p className="text-lg text-gray-600">
        The design quality gate for AI-generated frontend code. ESLint plugin + CLI + MCP server.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 not-prose">
        <Link
          href="/docs/getting-started"
          className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-semibold text-[#1A5276]">Getting Started</h3>
          <p className="mt-2 text-sm text-gray-600">
            Install, configure, and run your first scan in under 2 minutes.
          </p>
        </Link>

        <Link
          href="/docs/configuration"
          className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-semibold text-[#1A5276]">Configuration</h3>
          <p className="mt-2 text-sm text-gray-600">
            .vizlintrc.json schema, profiles, design system tokens, and ignore patterns.
          </p>
        </Link>

        <Link
          href="/docs/rules"
          className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-semibold text-[#1A5276]">Rules Reference</h3>
          <p className="mt-2 text-sm text-gray-600">
            All 10 rules with examples, options, and auto-fix behavior.
          </p>
        </Link>
      </div>
    </div>
  );
}
