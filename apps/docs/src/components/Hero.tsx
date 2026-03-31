export function Hero() {
  return (
    <section className="bg-white pt-24 pb-16 px-4 text-center">
      <div className="mx-auto max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-surface px-4 py-1.5 text-sm font-medium text-primary mb-6 border border-primary/20">
          <span className="h-2 w-2 rounded-full bg-pass" />
          ESLint plugin for Tailwind CSS
        </div>

        <h1 className="text-5xl font-bold tracking-tight text-gray-900 leading-tight mb-6">
          The design quality gate for{' '}
          <span className="text-primary">AI-generated</span> frontend code
        </h1>

        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          Catch arbitrary colors, inconsistent spacing, and broken responsive layouts before they
          ship. Drop-in ESLint plugin for any Tailwind CSS project.
        </p>

        <InstallCommand />

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <a
            href="https://www.npmjs.com/package/eslint-plugin-vizlint"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-light transition-colors"
          >
            npm install
          </a>
          <a
            href="https://github.com/vizlint/vizlint"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-surface transition-colors"
          >
            <StarIcon />
            Star on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}

function InstallCommand() {
  return (
    <div className="inline-flex items-center gap-3 rounded-xl bg-gray-900 px-6 py-4 font-mono text-sm text-gray-100 shadow-lg">
      <span className="text-gray-500 select-none">$</span>
      <span className="text-pass">npx</span>
      <span className="text-white">vizlint</span>
    </div>
  );
}

function StarIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
