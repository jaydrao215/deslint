const BEFORE_CODE = `// AI-generated code — design issues hidden in plain sight
const Card = () => (
  <div className="bg-[#1a5276] p-[13px] rounded-[6px]">
    <h2 className="text-[#fff] text-[18px] m-[7px]">
      Dashboard
    </h2>
    <p className="text-[#aaaaaa] gap-[20px]">
      Welcome back
    </p>
  </div>
);`;

const AFTER_CODE = `// After Vizlint — clean, consistent, design-system aligned
const Card = () => (
  <div className="bg-primary p-3 rounded-md">
    <h2 className="text-white text-lg m-2">
      Dashboard
    </h2>
    <p className="text-gray-400 gap-5">
      Welcome back
    </p>
  </div>
);`;

const LINT_ERRORS = [
  { line: 3, col: 15, type: 'error', rule: 'no-arbitrary-colors', message: 'bg-[#1a5276] → bg-primary' },
  { line: 3, col: 35, type: 'warn', rule: 'no-arbitrary-spacing', message: 'p-[13px] → p-3' },
  { line: 4, col: 15, type: 'error', rule: 'no-arbitrary-colors', message: 'text-[#fff] → text-white' },
  { line: 4, col: 29, type: 'warn', rule: 'no-arbitrary-spacing', message: 'm-[7px] → m-2' },
  { line: 6, col: 15, type: 'error', rule: 'no-arbitrary-colors', message: 'text-[#aaaaaa] → text-gray-400' },
  { line: 6, col: 32, type: 'warn', rule: 'no-arbitrary-spacing', message: 'gap-[20px] → gap-5' },
];

export function BeforeAfter() {
  return (
    <section className="bg-surface py-20 px-4">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">See it in action</h2>
          <p className="text-lg text-gray-500">
            Vizlint catches what code review misses — arbitrary values that break your design system.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Before */}
          <div className="rounded-xl border border-fail/30 overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 bg-fail/10 px-4 py-2.5 border-b border-fail/20">
              <span className="h-3 w-3 rounded-full bg-fail" />
              <span className="text-sm font-semibold text-fail">Before — 6 violations</span>
            </div>
            <pre className="p-5 text-xs font-mono text-gray-300 bg-gray-900 overflow-x-auto leading-relaxed">
              <code>{BEFORE_CODE}</code>
            </pre>
            <div className="bg-gray-950 px-4 py-3 space-y-1.5 border-t border-gray-800">
              {LINT_ERRORS.map((err, i) => (
                <div key={i} className="flex items-start gap-2 text-xs font-mono">
                  <span className={err.type === 'error' ? 'text-fail' : 'text-warn'}>
                    {err.type === 'error' ? '✕' : '⚠'}
                  </span>
                  <span className="text-gray-400">
                    {err.line}:{err.col}
                  </span>
                  <span className="text-gray-300">{err.message}</span>
                </div>
              ))}
            </div>
          </div>

          {/* After */}
          <div className="rounded-xl border border-pass/30 overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 bg-pass/10 px-4 py-2.5 border-b border-pass/20">
              <span className="h-3 w-3 rounded-full bg-pass" />
              <span className="text-sm font-semibold text-pass">After — auto-fixed</span>
            </div>
            <pre className="p-5 text-xs font-mono text-gray-300 bg-gray-900 overflow-x-auto leading-relaxed">
              <code>{AFTER_CODE}</code>
            </pre>
            <div className="bg-gray-950 px-4 py-3 border-t border-gray-800">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-pass">✓</span>
                <span className="text-gray-300">No violations — all auto-fixed by Vizlint</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
