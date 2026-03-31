export function Cta() {
  return (
    <section className="bg-primary py-20 px-4">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold text-white mb-4">
          Start catching design drift today
        </h2>
        <p className="text-lg text-blue-200 mb-10">
          Drop into any Tailwind CSS project. Works with React, Vue, Svelte, Angular, and plain HTML.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="inline-flex items-center gap-3 rounded-xl bg-gray-900/60 px-6 py-4 font-mono text-sm text-gray-100 border border-gray-700">
            <span className="text-gray-500 select-none">$</span>
            <span className="text-pass">npm</span>
            <span className="text-white">install -D eslint-plugin-vizlint</span>
          </div>
        </div>

        <div className="mt-8">
          <a
            href="https://github.com/vizlint/vizlint"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-200 hover:text-white transition-colors"
          >
            View docs and source on GitHub →
          </a>
        </div>
      </div>
    </section>
  );
}
