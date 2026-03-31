const FEATURES = [
  {
    icon: <SpacingIcon />,
    title: 'Spacing',
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    description:
      'Detects arbitrary spacing values (p-[13px], m-[7px]) and auto-fixes to the nearest Tailwind scale entry. Custom scales supported.',
    examples: ['p-[13px] → p-3', 'gap-[20px] → gap-5', 'm-[7px] → m-2'],
  },
  {
    icon: <TypographyIcon />,
    title: 'Typography',
    color: 'text-warn',
    bg: 'bg-warn/10',
    border: 'border-warn/20',
    description:
      'Flags arbitrary font sizes, line heights, and letter spacing. Enforces your type scale so headings stay consistent across the project.',
    examples: ['text-[18px] → text-lg', 'text-[13px] → text-sm', 'leading-[1.3] → leading-snug'],
  },
  {
    icon: <ColorsIcon />,
    title: 'Colors',
    color: 'text-fail',
    bg: 'bg-fail/10',
    border: 'border-fail/20',
    description:
      'Detects hex, rgb, hsl, and CSS variable arbitrary colors. Suggests the nearest design token. Works with Tailwind v3 and v4.',
    examples: ['bg-[#FF0000] → bg-red-500', 'text-[#1a5276] → text-primary', 'bg-[var(--random)] ⚠'],
  },
];

export function FeatureBlocks() {
  return (
    <section className="bg-white py-20 px-4">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Three rules. Zero drift.</h2>
          <p className="text-lg text-gray-500">
            Every rule ships with auto-fix, Tailwind v3+v4 support, and &lt;2ms performance.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className={`rounded-xl border ${f.border} p-6 hover:shadow-md transition-shadow`}
            >
              <div className={`inline-flex rounded-lg ${f.bg} p-3 mb-4`}>
                <span className={f.color}>{f.icon}</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 mb-4 leading-relaxed">{f.description}</p>
              <ul className="space-y-1">
                {f.examples.map((ex) => (
                  <li key={ex} className="text-xs font-mono text-gray-400 bg-surface rounded px-2 py-1">
                    {ex}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SpacingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 6H3" /><path d="M21 12H3" /><path d="M21 18H3" />
    </svg>
  );
}

function TypographyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  );
}

function ColorsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" /><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" /><circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" /><circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  );
}
